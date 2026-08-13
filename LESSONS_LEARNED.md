# TurboFix — Lessons Learned

Consolidated from project memory and git history. Each entry is a real incident (with commit/date where known), the root cause, and the rule going forward. Update this file when a new non-obvious lesson surfaces — don't let it live only in a commit message.

---

## 1. Multi-tenancy & data isolation

**Cross-tenant data leak in machine registration and inventory/tickets** (`3807615`)
Machine inserts never stamped `company_id` (only a stale `factory_id` from an old tenancy model). Inventory/Dashboard/Tickets fetched parts/tickets/suppliers **unscoped**, then stamped the signed-in user's own `company_code` onto every row *after* fetching — turning the "tenant filter" into a no-op. Every company was seeing every other company's data.
→ **Rule:** scope the query itself (`WHERE company_id = ...`), never filter client-side after an unscoped fetch. An unscoped `.from()` call in a multi-tenant app is a leak by default, not a performance shortcut.

**Same leak recurred twice more** in Settings/Records (`10cdaf8`) and PM/parts/consumables add-flows (`c768817`) — plain `supabase.from('machines').select(...)` with no company filter, and dead `factories.select('id').limit(1)` lookups stamping an arbitrary "first factory in the table" onto new rows.
→ **Rule:** when a scoping bug is found in one file, grep for the same unscoped-select pattern across the whole codebase in the same session — it's never just the one call site.

**Demo/sample data leaking into real empty accounts** (`d86bf3c`) — a newly onboarded company with zero real machines saw fabricated ticket/cost KPIs from `DEMO_MACHINES`/`buildDemoTickets()` because the fallback-to-demo-data logic only checked "is the table empty," not "is this a real signed-in company."
→ **Rule:** demo/sample fallbacks must gate on account type (demo/TFDEMO or signed-out), never on "table happened to be empty." An honest empty state ("0 machines") is correct; a fabricated non-zero one reads exactly like a cross-tenant leak even when no real data is involved.

**Stale RLS policies stack silently** (`1cf4819`) — a legacy `factory_id`-based RLS policy on `tickets` was never dropped when its `company_id`-based replacement was added. Postgres ORs every permissive policy together, so every query paid for both, including an expensive `get_auth_factory_id()` aggregate — causing an 8+ second statement timeout that looked like a frontend bug (empty dropdown) but was 100% database.
→ **Rule:** when a tenancy model migrates (factory→company), the migration that adds the new policy must also drop the old one in the same change. Orphaned RLS policies don't error — they just silently tax every query on that table forever.

---

## 2. Authentication & sessions

**Two auth systems, only one populated** (`3912e16`) — login only stored the backend's own JWT (`tf_token`) and never established a real Supabase Auth session on the browser's Supabase client. Anything calling Supabase directly (`functions.invoke()`, RLS-scoped `.from()` reads) authenticated off that separate, empty session and silently fell back to the anon key — producing "Your session has expired" on the very first page load after a login that worked fine from the user's point of view.
→ **Rule:** when a codebase has two auth surfaces (custom backend JWT + Supabase Auth), a successful login must establish *both* sessions, not just the one the login form directly calls.

**Auth call bundled into `Promise.all` raced and lost** (`8500afb`) — `supabase.functions.invoke()` was fired as one of five concurrent requests in a `Promise.all`; it consistently failed with a 401 seconds after a verified-valid login, while the identical call succeeded reliably when awaited standalone elsewhere in the same codebase (`Team.jsx`).
→ **Rule:** don't bundle an auth-sensitive call into a `Promise.all` with plain data queries just because "it's technically parallelizable" — if a sibling file already awaits it standalone successfully, match that pattern rather than re-optimizing.

**Admin-approval bypass via two stacked bugs** (`1ca047e`) — `apiFetch()` collapsed every 403 into one generic message, discarding the backend's actual detail text; `Login.jsx`'s dead 403-handler then string-matched on `'pending approval'`, which didn't match the backend's real wording (`'pending TurboFix admin approval'`). The check silently never fired, so login fell through to a Supabase-direct fallback with **no concept of company approval at all** — any self-registered, unapproved company could log straight in.
→ **Rule:** never gate security-relevant branching on a substring match against a human-readable message. Attach and check the actual HTTP status code (`err.status === 403`); message text is for display, not control flow. Also: don't let a generic error-handling layer discard status/detail that a caller further up the stack needs to make a correct decision.

---

## 3. Error handling & observability

**Silently swallowed errors hid a total feature failure** (`e6e6a54`, `bf700ca`) — `Records.jsx` called `apiFetch()` in 8 places but never imported it. Every real call threw `ReferenceError` immediately, was caught silently, and fell back to hardcoded demo data — so the page "worked" (showed data) while being completely non-functional for every real user, for an unknown period before it was caught.
→ **Rule:** a catch block that swallows the error and shows a fallback is the single most effective way to hide a total breakage indefinitely. Log the actual error (`console.error`) even when a graceful fallback is shown — the fix in this incident was adding the log first, which immediately surfaced the real bug on the next investigation.

**Misleading error messages send people chasing the wrong cause** (`c768817`) — an RLS rejection on machine insert was always reported as "quota exceeded, upgrade your plan," even when the account was nowhere near quota (reproduced at 0/5). The real cause of an under-quota RLS rejection is almost always a broken account↔company linkage.
→ **Rule:** an error message should only claim a specific cause when the code has actually verified that cause is true (e.g., check current/quota counts before saying "quota exceeded"). A wrong specific message is worse than a vague honest one — it actively misdirects debugging (by the user *and* by future Claude sessions).

**Debugging methodology that worked repeatedly:** when a fix doesn't resolve a reported bug, the next step is not to guess again — it's to add visibility (log the actual error object) and reproduce live, not just locally. Three separate incidents (`57881d8`→`8500afb`, `bf700ca`→`e6e6a54`, `1cf4819`) followed this exact pattern: first attempt didn't work, second attempt added logging, the log immediately revealed the real (often unrelated) root cause.

---

## 4. Deployment, CI & environment drift

**Env vars present in one workflow, missing in a sibling one** (`1646894`) — `deploy.yml` had `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; `pages.yml` (the one actually building production) didn't. Production silently fell back to a hardcoded Supabase URL with no build error.
→ **Rule:** when there are multiple CI/CD workflow files that can each build/deploy, a config value added to one must be checked against all of them — silent env-var fallbacks mean a missing var produces no error, just wrong behavior in production only.

**Debug instrumentation shipped to production** (`1646894`) — leftover agent-debug code (`PublicSiteDebugMonitor`, extra fetch calls) fired failed requests to a hardcoded `localhost` endpoint on every real visitor's page load.
→ **Rule:** debug/instrumentation code added during a session must be removed before the session's changes are considered done, not left "temporarily" — it ships.

**Missing devDependency invisible locally, fatal on CI** (`0b528ba`) — three test files imported `@testing-library/react`/`user-event`; neither was in `package.json`. Locally, Node's module resolution happened to find a stray copy in the developer's home-directory `node_modules`, masking the bug for weeks. `npm ci` on a clean CI runner has no such stray copy and failed every time.
→ **Rule:** "passes locally" is not proof when a devDependency might be resolving from outside the project's own `node_modules`. Periodically verify with `rm -rf node_modules && npm ci` (matching CI's runner/Node version) rather than trusting a long-running local install.

**A blocked CI job silently blocked unrelated deploys for weeks** (`0b528ba`) — because `deploy-edge-functions` had `needs: test-and-build`, the broken test suite above silently blocked every edge-function deploy, including an unrelated role-check fix that had already been pushed and looked "done" in git but was never actually live.
→ **Rule:** when a fix "isn't taking effect" in production despite being merged, check whether a *different*, unrelated CI job is failing and gating the deploy — don't assume the fix itself is wrong.

**Hardcoded local absolute path in a test** (`3d9a8e7`) — a test hardcoded `/Users/nkumarsoni/TurboFix/...` instead of using the portable `path.resolve(__dirname, ...)` constant already defined in the same file. Always passed locally, always failed on the GitHub Actions runner.
→ **Rule:** never hardcode a filesystem path in a test; use a path constant relative to the file/module. If a similar portable pattern already exists in the same file, use it rather than inventing a new hardcoded one.

**Migration version-number collisions silently corrupt migration history** (`6362638`) — two pairs of migrations shared identical version prefixes (`20260727`, `20260729100000`), and a batch of 9 migrations sat unpushed in the repo for about a week without anyone noticing the schema drift. One migration also hand-inserted `auth.users` rows with a fixed column list that didn't satisfy the current schema's `NOT NULL` columns, and another referenced a role enum value (`'maintenance_head'`) that the DB's role function could never actually produce.
→ **Rule:** check `git log origin/main` / `supabase migration list` for unpushed migrations periodically — schema drift this size can sit invisible for a week. Give every migration a unique, sufficiently precise timestamp version. Never hand-write rows into Supabase-managed tables (`auth.users`) with an explicit column list — schema requirements vary by Postgres/GoTrue version.

---

## 5. Permissions & role logic

**Hardcoded per-role allow-lists silently drop new roles** (`4cc3402`, `09fc021`) — both the Team invite dropdown and the `onboard_team_member` edge function's role check used a fixed allow-list of 4-7 built-in role names. Any role added later (Operator, Quality Inspector, Safety Officer, Vendor, or any custom role from Settings) was never in the list, so it silently never appeared / was always rejected with a 403 — even though the rest of the UI already offered it.
→ **Rule:** for anything role-based that must stay in sync with a growing/custom role set, use an **exclude-based** rule ("everyone except owner, and maintenance_head only from owner/director") rather than an **include-based** allow-list. Include-lists silently rot as new roles are added; exclude-lists degrade safely.
→ Also: when the same allow-list bug exists on both the frontend (dropdown) and a backend edge function independently, fixing only one leaves the other broken — the frontend can offer a role the backend still 403s on.

---

## 6. Process & session discipline

**Generated deliverables must be saved to the real project folder, verified on disk** — an earlier session built a pitch deck, landing page, QR generator, architecture diagram, and build-plan PDF, all logged as "✅ Done" in `README.md`/`progress.md`. None were ever saved into `/Users/nkumarsoni/TurboFix/` — they only existed in that session's ephemeral workspace and were gone by the next session. Only a partial manual iCloud backup survived.
→ **Rule:** write every deliverable directly into the real project directory, not a scratchpad/tmp/tool default location. Before claiming something is "done" (in chat or in a progress doc), verify it's actually present on disk — don't trust a prior session's status log at face value.

**The inverse also happens — undocumented code already on disk isn't a green field.** A "new" Document Vault feature session found `auth.py`, `documents_store.py`, `file_storage.py`, `parts_store.py`, `users_store.py` already fully written, real, substantial — but untracked in git, unwired into `main.py`, missing dependencies, untested, never mentioned in progress docs.
→ **Rule:** before starting a "new" feature, `ls`/grep the relevant directory and check `git status` first. Once a deliverable is confirmed good in a git-tracked subproject, commit it — uncommitted-but-present-on-disk is still one `git clean` away from being lost again.

**Concurrent sessions can bundle your uncommitted work into an unrelated commit** — another session (or an auto-commit) pushed a commit that swept up unrelated uncommitted working-tree changes and ran `db push` on them.
→ **Rule:** `git fetch` and check `git log origin/main`, and check whether a migration is already applied, before redoing work that might already be live.

**Live/production tests that send real messages need explicit user go-ahead** — the single remaining gap before a provable pilot (one real WhatsApp message → ticket → technician notified) has been deliberately left untested across multiple sessions because triggering it means sending a real message to a real number, which is not a reversible, side-effect-free action.
→ **Rule:** don't run a test that has an irreversible real-world side effect (sending a message, charging a card, etc.) without the user's explicit go-ahead first, even when it's the obvious "next logical step" to close out a task.

---

## 7. Scope discipline (build-out phases)

Several large "phase" builds (i18n/localization, developer portal/webhooks, real-time/WebSocket features, performance optimization) were built as **client-side-only, localStorage-backed** infrastructure ahead of any backend to support them (no real WebSocket server, no real webhook delivery, no real API behind the "API key manager"). Each phase's own memory notes this candidly ("ready to integrate with a backend at any time — no backend changes required for full functionality with localStorage").
→ **Rule:** this is a legitimate incremental-build strategy (ship the UI/UX shell, wire it to a real backend later), but it means "Phase N complete" in these areas means *frontend scaffold complete*, not *feature functionally live*. Don't conflate the two when reporting status — a phase being "production-ready" for a UI shell with no live backend behind it is a different claim than a feature actually working end-to-end (contrast with the Dashboard rebuild in `743d0b6`/`046335f`, which was verified against 100% real computed metrics and a full E2E test suite before being called done).
