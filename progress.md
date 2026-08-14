> **UPDATE 2026-08-13 (later same day):** at the user's request ("go ahead with all open items"), every item in the Next Steps list below except the credential leak (user handling directly) has been fixed, tested, and verified — see **REMEDIATION STATUS** at the very top of this file for the full outcome, what's still open, and what requires the user's own action (deploying, setting new secrets, applying the migration). The findings sections below are left exactly as originally written — a historical record of what was found — with outcome notes added inline.

# TurboFix — Full Codebase Audit Progress

**Started:** 2026-08-13
**Scope:** Entire repo — frontend (React/Vite), Supabase (edge functions + migrations + RLS), backend (FastAPI), CI/CD, dependencies/secrets.
**Method:** graphify-oriented exploration per project rules, phase by phase. Findings logged below with severity, file:line, and status. This file is the live tracker — update status/findings as each phase completes, don't wait until the end.

Legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low · ⚪ Info

---

## REMEDIATION STATUS (2026-08-13, same-day follow-up)

Every code fix below was made directly in the working tree, then verified with the most rigorous check available for that layer (Deno type-check + a runtime crypto/logic test for edge functions, pytest with new regression assertions for backend, `npm run build`/`test:unit`/lint for frontend). **Nothing has been committed, pushed, or deployed** — these are uncommitted local changes. Several fixes also require the user to configure new secrets or review a new migration before they take effect live; called out explicitly below.

### 🔴 Critical — Fixed
- **`admin_portal` auth bypass** — rewrote `verifyToken()`/`createAdminToken()` in `supabase/functions/admin_portal/index.ts` to use real HMAC-SHA256-signed, expiring tokens (new `signHmacSha256`/`timingSafeEqualString` helpers added to `_shared/security.ts`), removed the `demo:admin` backdoor, the unverified `tf_admin_session_` prefix check, and the unsigned-JWT-payload trust. **Also found and fixed a second, undocumented bug in the same file while testing:** the login handler had a hardcoded fallback password (`'TurboFixAdmin2026!'`) baked into the public source that worked regardless of the real `ADMIN_PASSWORD` secret — removed. Verified with 9 passing runtime tests (valid/expired/tampered/wrong-secret/forged tokens, old backdoor strings, password comparison). **Action needed:** the Supabase project must have `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET_KEY` set as function secrets before this deploys — login fails closed (503) if either is missing, which is correct but means admin login won't work until you set them.
- **WhatsApp ticket-closure workflow silently broken** — deleted the 6 no-op stub functions in `backend/app/services/escalation_service.py` that shadowed the real implementations, plus a 7th shadowing bug of the same shape in `backend/app/services/intelligence_service.py` (`check_repeat_failure`) found while fixing this. Rewrote `backend/tests/test_escalation_service.py`'s 5 closure-flow tests and `test_intelligence_service.py`'s 5 repeat-failure tests — they previously called the stub signatures and asserted only `result is True`/a bare bool, which is why they never caught this; they now mock the repository layer and assert the real methods are actually called with the right arguments. 12/12 and 19/19 passing respectively.
- **WhatsApp AI Assistant fabricated data** — fixed `whatsapp_chat_service.py`'s `_build_role_context` to call the real `get_company_tickets`/`get_company_machines` repository methods (were calling nonexistent `get_open_by_company`/`list()`), added error logging, and refactored the offline fallback (`_fallback_role_response`) to use the same live snapshot instead of hardcoded fake numbers (₹12,500, 95.8%, invented technician names). Added 3 new regression tests to `test_whatsapp_chat_and_digests.py`, all passing (9/9 total in that file).
- **Self-registration silently fails** — `Login.jsx`'s `handleRegister` now calls the backend's real `POST /auth/register` (rate-limited, password-strength-checked, duplicate-checked) instead of direct Supabase writes that RLS was silently blocking. Verified via clean build.

### 🔴/🟠 Other edge function fixes
- **`iot_telemetry_webhook`** — added `requireServiceRole()` gating (was fully open). 4/4 runtime tests passing.
- **`ticket_gateway`** — removed the "first machine/factory in the table" cross-tenant fallback (now returns 404 instead of guessing); added a machine-ownership check to `update_ticket`/`get_ticket` (was letting any valid QR session read/write any ticket on the platform by id) plus a field allow-list on `patches` (was accepting any column, mass-assignment); removed the unauthenticated, unused `get_factory_id` action entirely; tightened `get_machine_details`'s lookup to id/asset_code only (dropped free-text name matching, which widened enumeration surface). Updated `QRGateway.jsx` to send the new required `machine_id` field. Verified via Deno type-check (0 new errors).
- **`inbound_email_receiver`** — added a shared-secret token check (`INBOUND_EMAIL_WEBHOOK_SECRET`, query-param based since SendGrid/Mailgun don't share one signature scheme) since the provider's webhook has no unified HMAC standard; scoped machine resolution to the sender's own company (was searching every machine on the platform). 4/4 runtime tests passing. **Action needed:** set `INBOUND_EMAIL_WEBHOOK_SECRET` as a function secret and add `?token=<secret>` to whatever URL is configured in the email provider's dashboard — fails closed (503) until set.

### 🟠 High — Fixed
- **SEO canonical/www mismatch** — `SITE_URL` in `src/data/seoMeta.js`, plus hardcoded URLs in `index.html`, `public/sitemap.xml`, `public/robots.txt`, all switched from `www.turbofix.co.in` (redirects away) to `turbofix.co.in` (the real serving host). Verified in built `dist/index.html` output.
- **Hero image / LCP** — `public/turbofix-hero-banner.png` (4096×1364, 3.05MB) resized to 2400×799 and re-encoded as WebP (129KB, ~96% smaller) with a JPEG fallback (403KB) via `<picture>` in `Home.jsx`; added explicit `width`/`height` (fixes the CLS 0.153 Lighthouse flagged), `fetchpriority="high"`, `loading="eager"`, and a `<link rel="preload">` in `index.html` so the image is discoverable before React even hydrates. Verified with a local Lighthouse run: total byte weight 3,780 KiB → 924 KiB, CLS 0.153 → 0, LCP-discovery's `requestDiscoverable` flipped false→true. (Absolute LCP-seconds numbers from the local run aren't comparable to the original live-site numbers — local `vite preview` isn't representative of the real CDN-backed hosting — but every asset-level metric directly attributable to this fix is verified.)
- **Frontend crash bugs** — `MachineDetailDrawer.jsx` was missing `onOpenPersonnelMatrix`/`onOpenCapexEscalation` from its destructured props (two fully-built features — Personnel Matrix, CapEx Escalation modals — were 100% unreachable, crashing on click); `AdminPortal.jsx` was missing the `Key` icon import (crashed the "Copy Credentials" admin action); `QRGateway.jsx` referenced an undeclared `searchParams` (dead fallback, removed rather than wired up, since `machine.id` already covers what it was trying to do). All three confirmed fixed by re-running `oxlint` with `no-undef`/`react/jsx-no-undef` enabled — zero remaining violations. **Also made permanent:** added these two rules to the project's real `.oxlintrc.json` (with scoped overrides for Deno globals in `supabase/functions/**` and Vitest globals in `src/__tests__/**`) so this exact bug class — the same shape as the original Records.jsx incident — is caught in CI going forward. Verified `npm run lint` runs clean (0 errors) with the new rules active.
- **npm audit** — ran `npm audit fix`; all 4 high-severity vulnerabilities (nanoid, postcss, react-router/react-router-dom) resolved, 0 remaining. Verified: full build passes, all 1,192 unit tests still pass.
- **CI edge-function deploy coverage** — added 13 of the 16 previously-undeployed functions to `deploy.yml` (`admin_portal`, `whatsapp_webhook`, `billing_webhook`, `inbound_email_receiver`, `iot_telemetry_webhook`, `ai_diagnostics`, `verify_repair_photo`, `check_schedules`, `check_inventory`, `monthly_report`, `send_notifications`, `asset-service`, `ticket-service`). Deliberately excluded `notification-service`/`reporting`/`user-provisioning` (confirmed dead scaffolds/explicitly unused — not worth exposing live). **Caveat, please verify:** the `--no-verify-jwt` flag choices (applied to `admin_portal`, `whatsapp_webhook`, `billing_webhook`, `inbound_email_receiver` — functions with non-Supabase-JWT callers) are inferred from each function's own code, not confirmed against the live Supabase dashboard's current per-function setting, since I have no access to it. YAML syntax validated; the actual deploy itself has not run (would require pushing to `main`).

### 🟡 Partial / follow-up needed
- **Stale RLS policies** — new migration `supabase/migrations/20260813120000_drop_remaining_stale_factory_policies.sql` written and reasoned through carefully (drops the confirmed-redundant stale `parts`/`consumables` policies, fixes the `maintenance_interventions` role-enum bug, additively adds a `machine_qr_codes` company_id policy) but **deliberately does not touch `tickets`' INSERT/UPDATE policies or `suppliers`** — those need either a verified-in-staging policy swap (tickets is the highest-traffic table; dropping its only working policy without a tested replacement risks breaking all ticket creation) or a real schema change (suppliers has no company_id/machine_id column to scope by at all). **This migration has NOT been applied** (`supabase db push` not run) — needs review, then the user's own deploy step.
- **e2e CI coverage** — investigated widening `e2e-tests.yml` beyond the 2 QR-gateway specs it currently runs. Found and load-tested two safe (mocked/demo-mode, no live-data risk) candidate spec files — **14 of their 20 tests are currently failing** (e.g. `role-dashboards.spec.js` expects a `getByTestId('owner-dashboard')` element that no longer exists on the page). This is a real, newly-surfaced problem — either the Dashboard component's structure has drifted from what these tests expect, or there's a genuine rendering regression — but debugging 14 individual UI test failures is a separate, larger investigation than "wire the tests into CI," and blindly enabling them would just turn CI red without fixing anything. **Left un-added to CI; flagging as a new follow-up item**, not resolved.

## FOLLOW-UP (2026-08-13, second pass — "continue with pending items")

### e2e test investigation — resolved differently than expected
Investigated the 14 failing tests flagged above. Two distinct, unrelated root causes, neither a security/correctness bug:

1. **`role-dashboards.spec.js` (9 tests) — tests a retired UI architecture, not a regression.** `Dashboard.jsx` only imports and renders `LimbleCmmsDashboard` (the rebuild from commit `743d0b6`/`046335f`) — the `OwnerDashboard`/`SpecialistDashboard`/`MasterTabbedDashboard` components this spec's testids (`owner-dashboard`, `technician-dashboard`, etc.) target are never rendered anywhere; they're dead code from before that rebuild (matches the ~20 orphaned components already found in Phase 8). Confirmed the current architecture already has its own dedicated, passing test coverage: ran `dashboard-framework.spec.js` + `lay-owner-dashboard.spec.js` directly — 5/5 pass. **Conclusion: `role-dashboards.spec.js` is safe to retire, not fix — the coverage gap it appeared to represent doesn't actually exist.** Left as-is (not deleted) pending the user's own call on formally retiring it.
2. **`settings-role-boundary.spec.js` (5 tests) — one real stale-string bug (fixed), four reveal a genuine but ambiguous product inconsistency (not fixed, needs your call).**
   - Fixed: line 59 checked for a tab labeled `'Smart Modules'`, which was renamed to `'AI & Machine Data'` (already correctly checked two lines earlier in the same test — this was a leftover duplicate, not a second tab). Replaced with a check for the previously-untested `'Activity Audit Log'` tab. Re-ran: **the "owner sees every section" test now passes.**
   - Not fixed — needs a product decision: the other 4 tests use role names (`'technician'`, `'support'`, `'guest'`) that don't exist in the current role catalog (`src/lib/roles.js`'s `ROLE_NAV`, which now has `operator`/`maintenance_technician`/`maintenance_engineer`/`supervisor`/`maintenance_head`/`owner`/`quality_inspector`/`safety_officer`/`vendor`). Under the current `ROLE_NAV`, only `owner`/`supervisor`/`maintenance_head` are allowed into the `settings` workspace at all — everyone else hits `AppShell.jsx`'s access gate ("This workspace is not part of your role view.") before Settings.jsx ever renders. But `Settings.jsx`'s own `getVisibleSettingTabs()` function *still has a live branch for a `role === 'support'` value* — a role that doesn't exist in `ROLE_NAV` and can therefore never actually reach this code. **This is either dead code that should be deleted, or a real oversight where a role that's supposed to have restricted Settings access was never added to `ROLE_NAV`'s `settings` list** — I don't have enough product context to know which, and picking the wrong one either deletes intended functionality or leaves dead code in place. Flagging rather than guessing.

### Tickets RLS — safe additive follow-up
Per the deferred item above, added `supabase/migrations/20260813130000_additive_company_id_ticket_policies.sql` — adds company_id-scoped INSERT/UPDATE policies for `tickets` **alongside** (not replacing) the existing factory_id-scoped ones. The UPDATE policy exactly mirrors the existing policy's role restriction (only the scoping mechanism changes), so this can only widen correctness for cases where the legacy `get_auth_factory_id()` identity-fallback might mis-scope a multi-factory company — it cannot grant access to a role that couldn't already get it. Does **not** solve the underlying performance/hygiene issue (the expensive legacy policy still runs on every query, since nothing was dropped) — that still needs a staging-verified follow-up. **Not applied to production** — same as the other migration, needs review then your own `supabase db push`.

## SECOND FOLLOW-UP (2026-08-14 — "address all open issues first")

Went through every remaining open item from the audit's findings sections (not just the two explicitly flagged last time). Full verification after every change: `npm run build`, `npm run test:unit` (1,192 tests), `npm run lint`, and the full backend pytest suite. **Nothing committed, pushed, or deployed.**

### 🟠 HIGH — Fixed
- **`ai_assistant`'s include-list** — replaced `ALLOWED_AI_ROLES` with an exclude-based `EXCLUDED_AI_ROLES = {'vendor'}`. Verified via the WhatsApp AI Assistant (a different channel, same feature) already treating `technician` as a first-class supported role — the web version's exclusion of technician/quality_inspector/safety_officer/operator was inconsistent with the product's own established pattern, not intentional.
- **`check_inventory`'s broken auth check** — replaced the "only rejects if no auth header AND has x-forwarded-for" logic (never validated the header's actual value) with `requireServiceRole()`, matching every other internal/cron function.
- **`whatsapp_webhook`'s fail-open HMAC check** — now fails closed (503) when `WHATSAPP_APP_SECRET` is unset, instead of silently accepting unsigned payloads.
- **Duplicate urgency metadata** (`breakdownRouter.js` vs `ticketMeta.js`) — extracted the shared rank/label/color/responseMinutes/hint values into a new `src/utils/urgencyLevels.js`; both files now derive from it while keeping their own function signatures and (intentionally different) fallback behavior unchanged. Zero call sites elsewhere needed to change. Verified: all 1,192 unit tests still pass, values confirmed identical to the pre-refactor originals.
- **Dashboard.jsx fabricated KPI fallback** — removed the `fetchDashboardData().catch(() => fallback)` that silently showed hardcoded fake numbers on any real fetch failure; the rejection now reaches the existing (already-correct) outer catch, which sets `error` and shows the UI's own "safe empty-state" banner. Added the missing `console.error`.
- **`Machines.jsx` `handleAddKaizen`** — no longer silently adds a fake, ID-less local-only entry on insert failure; logs and shows a real error instead.
- **`Records.jsx` demo-fallback gating** — the catch-block fallback to `DEMO_MACHINES`/`DEMO_RECORDS` now only fires for signed-out/no-company sessions; a real company whose fetch fails sees an honest error instead of fabricated sample data.

### 🟡 MEDIUM — Fixed
- **`Machines.jsx` `uploadMachinePhoto`** — added the missing `console.error` (the local-storage fallback itself is a real, working offline-reconciliation feature via `syncLocalMachinePhotos`, not a bug — only the silent-about-why part was wrong).
- **`Machines.jsx` `handleDeleteKaizen`** — was an empty `catch {}` that also never checked Supabase's `error` field on a non-throwing failed delete (RLS-denied deletes don't throw), so a denied delete still showed "deleted" locally. Now checks the error field and shows/logs real failures.
- **`ticket-service` mass-assignment** — added a field allow-list (`status`, `urgency`, `issue_text`, `root_cause`, `repair_action`, `ai_summary`) to the PATCH handler; confirmed zero frontend callers (this function is unused internally, likely intended as a public API surface — hardening it matters more, not less, for that reason).
- **`asset-service`** — fixed a genuine functional bug alongside the security one: it inserted into `machines.organization_id`, a column that doesn't exist (real column is `company_id`) — every POST failed outright regardless of the security concern. Fixed the column name and resolved `company_id` from the caller's own session instead of trusting the client-supplied value.
- **`kpi_router.py` / `contact_access_service.py` include-lists** — unlike `ai_assistant`, found no equivalent internal evidence for what a wider correct set should be (KPI configuration and contact-reveal are both more sensitive, management-level decisions than an informational AI query). Left the actual role boundaries unchanged, extracted each to one named constant instead of duplicated inline checks, with a comment explaining why this wasn't widened — a real structural improvement without guessing at a business decision.
- **`MachineRepository.get()`/`TicketRepository.get()`** — added explicit warning docstrings (caller must verify ownership; no query-level backstop). Widening the interface to require company_code would touch every call site across routers/services — flagged as a larger follow-up, not attempted blind.
- **`onboard_team_member`'s role collapse** — confirmed this is a required workaround, not a bug: `profiles.role` is a Postgres ENUM (`owner`/`supervisor`/`technician` only) that structurally cannot hold any other value. Documented the real root cause and what a proper fix would require (a schema migration touching every RLS policy keyed off `get_auth_role()`'s return type) rather than attempting it blind.
- **Notification recipient lists** — added `maintenance_head` to 3 of 4 locations (`whatsapp_webhook`, `monthly_report`, `send_notifications`), each querying the free-text `users`-adjacent role field... **then reverted all 3 on closer inspection**: they actually query `profiles.role`, the same ENUM-constrained column from the `onboard_team_member` finding above — `maintenance_head` can never appear there (it's stored as `'supervisor'`), so the addition was a no-op that would have misled a future reader. `check_schedules`'s equivalent queries were correctly left untouched for the same reason. Added a comment to all 3 files explaining why, so this isn't re-attempted.
- **`eval()` RCE landmine in `dashboard_service.py`** — actually fixed, not just documented: replaced the bypassable `eval(formula, {"__builtins__": None}, scope)` with a real AST-based arithmetic evaluator (`_safe_eval_formula`) that only permits numeric constants, variable lookups, and `+ - * / ** %` — structurally incapable of executing a function call, attribute access, or subscript, regardless of scope contents. Verified: normal formulas compute correctly; `().__class__.__base__.__subclasses__()`, `__import__("os").system(...)`, and `open("/etc/passwd").read()` all correctly raise instead of executing.

### 🔵 LOW — Fixed
- **Dead code cleanup**: deleted 24 confirmed-zero-reference files — `MachinesRefactored.jsx` + its `featureFlags.ts` rollout system, `demoInventory.js`, and 21 orphaned components (`DashboardWidget.jsx`, `LanguageSwitcher.jsx`, 4 AntD-migration-era components, 6 `components/dashboard/` role-view variants superseded by `LimbleCmmsDashboard`, 9 `components/marketing/` components). Re-verified zero references immediately before deleting (didn't just trust the original audit's list). Build, all 1,192 unit tests, and lint all still pass clean after removal. Left the smaller individual dead *exports* within otherwise-live files (`accessibility.js`, `dashboardLayout.js`, `machineHealth.js`, `mttrMetrics.js`, `retry.js`'s `OfflineQueue`) as lower-value/lower-risk remaining cleanup, not done this pass.
- **`AdminPortal.jsx` / `Login.jsx` "misleading error message" findings** — re-checked directly against current code: both already correctly branch on the real HTTP status code (`res.status === 401 || 403`, `err.status === 401 || 403`) rather than blanket-labeling every failure. Already fixed, verified, no change needed — noting this so it isn't re-flagged as still-open.

### 🟡 Explicitly not fixed (flagged, not guessed)
- **`billing_webhook`'s `notes.factory_id` trust** — searched the entire repo for any Razorpay order/checkout-creation code that would set this field; found none. Can't verify whether it's genuinely server-authoritative (safe) or client-influenced somewhere outside this codebase (e.g. a manually-configured Payment Link) without that visibility — fixing blind risks breaking a real payment flow this repo can't show me.
- **`'support'` role ambiguity — actually resolved**, not left open: traced every use of the string `'support'` in the frontend and found it's used as a role value in exactly one place (`Settings.jsx`'s `getVisibleSettingTabs`) versus every other occurrence being the *workspace* named "Support & Decisions" — confirmed dead/vestigial code, not a missed `ROLE_NAV` entry. Rewrote `tests/settings-role-boundary.spec.js`'s 4 stale tests (which used role names — `technician`, `support`, `guest` — that predate the current, more granular role system and its `ROLE_NAV` workspace gate) to test real, current behavior instead. All 5 tests in that file now pass; wired into CI (`e2e-tests.yml`) alongside `dashboard-framework.spec.js`/`lay-owner-dashboard.spec.js`. Retired `role-dashboards.spec.js` (9 tests against dashboard components confirmed never rendered since an earlier architecture rebuild — equivalent real coverage already exists and passes).
- **`tickets`' legacy factory_id INSERT/UPDATE policies** — still not dropped (same reasoning as the first follow-up: no staging access to verify a replacement first). Did add the safe, additive company_id-scoped policies in `20260813130000_additive_company_id_ticket_policies.sql` (mirrors the existing UPDATE policy's exact role restriction, so it cannot widen access beyond what's already granted — only fixes the correctness gap in the legacy scoping function).

### Bonus finds while verifying
- **`conftest.py`'s `TRACKER_SOURCE` path bug recurred in 2 more test files** (`test_store_local.py`, `test_webhook.py`) — same off-by-one `.parent.parent.parent` vs `.parent.parent` copy-pasted independently rather than importing the shared constant. Fixed both. This alone took the backend suite from 233 passed/1 failed/27 errors to **260 passed, 1 failed, 0 errors** — the whole `test_webhook.py` (14 tests) and `test_store_local.py` (10 tests) suites are now running for the first time in an unknown span of time.
- **The one remaining backend test failure** (`test_machine_records.py::test_supervisor_can_upload_and_company_isolation_is_enforced`) turned out to be about the *committed seed data* in `TurboFix-Tracker.xlsx` itself (pre-existing rows for the test company that violate this specific test's "exactly one record" assumption), not a code bug — editing shared binary test fixture data blind, without knowing how many other tests depend on its exact current contents, was judged too risky for this pass. Flagged, not fixed.

### Untouched by design
- Credential leak (`docs/SK_PVT_LTD_CREDENTIALS_AND_ONBOARDING.md`) — user chose to handle directly.
- Everything logged only as Medium/Low/Info across all phases (e.g. the remaining unlogged catch blocks, dead components, `kpi_router.py`/`contact_access_service.py` include-lists, the `organizations`/`factories` table split, `check_inventory`'s broken auth check, `ai_assistant`'s include-list, `whatsapp_webhook`/`billing_webhook`'s narrower gaps) — not modified in this pass; still valid, still in the findings sections below, ranked lower than everything above.

## THIRD FOLLOW-UP (2026-08-14, same day — secrets, push, UAT suite, backend isolation, QRGateway E2E)

- **Live secrets set and verified.** `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET_KEY`, `INBOUND_EMAIL_WEBHOOK_SECRET` were missing from Supabase function secrets, causing the (now correctly-secured) `admin_portal` to 503. Set via `supabase secrets set`; confirmed live via curl that the admin console now authenticates correctly instead of 503ing.
- **All local commits pushed to `origin/main`**; confirmed both `Backend CI` and the main deploy pipeline green on GitHub Actions after the push (verified via the Actions API, not assumed).
- **Backend test fixture isolation gap — actually fixed, not just flagged.** The `test_machine_records.py` failure noted as "flagged, not fixed" in the Second Follow-up above turned out to have a real, fixable root cause after all: `conftest.py`'s `autouse=True` fixture wasn't isolating `TRACKER_XLSX_PATH` for tests using a module-level `TestClient(app)` (only the opt-in `vault_client` fixture did), so 6 tests across 4 files were bleeding into shared state or hitting a nonexistent CI path. Extended the autouse fixture to cover this, and separately loosened one over-strict assertion in `test_machine_records.py` that assumed the seed company started with zero records (it legitimately has 2 pre-existing seeded ones). Backend suite now **261/261 passing**, matching CI exactly.
- **A separate, unrelated UAT smoke-test suite (`tests/uat/`) appeared committed and pushed without my involvement** — reviewed it at the user's request rather than assuming it was safe. Found and fixed 2 real locator bugs (`LoginPage.ts`'s ambiguous "Sign In" locator; `MachinesPage.ts`'s `openFirstMachine()` bypassing the detail drawer) and one false-positive console-error filter gap. In the process of fixing the locator bugs, also found and fixed 2 real product bugs the improved locators newly exposed: `maintenance_head` was missing from `ROLE_NAV`'s escalation-handling `support` entry (every sibling escalation role had it), and `Login.jsx`'s form inputs were missing `htmlFor`/`id` pairs (a real accessibility bug, not just a test-locator issue).
- **QRGateway E2E suite (`tests/qr-gateway.spec.ts`, `tests/qr-gateway-tickets.spec.js`) — fully fixed, 27/27 passing** (previously 0/27, then 2/27 after the `greetUser` crash fix below). Two distinct, independent root causes, found in sequence:
  1. **The crash**: `src/pages/QRGateway.jsx` had `const greetUser = useCallback(...)` declared *after* a `useEffect` that referenced it in its dependency array — a temporal-dead-zone `ReferenceError` that crashed the entire page on every mount, with no error boundary catching it. This is a real product bug (any real user hitting `/qr-gateway.html` would see a blank crashed page), not a test bug. Fixed by moving the declaration above its first use.
  2. **The test/product drift**: fixing the crash revealed the actual reason 25 of 27 tests still failed — the phone gate had been upgraded from a single "Proceed" button to a full WhatsApp OTP send/verify flow (`handleSendOTP`/`handleVerifyOTP`, backed by the `otp_gateway` edge function) at some earlier point, but `tests/qr-gateway.spec.ts` was never updated and still clicked a "Proceed" button that no longer exists — every test hung until Playwright's 30s timeout, closing the page mid-wait. Since OTP mechanics already have dedicated coverage elsewhere (`tests/whatsapp-otp-edgecases.spec.js`, `tests/qr-session-30day.spec.js`, `backend/tests/test_otp_auth.py`, `test_fast2sms_otp.py`), the 22 tests that only care about the *post-gate* reporting flow (voice/text capture, offline queueing, photo upload, etc.) now bypass the gate the same way the app itself does for a returning user — pre-seeding `tf_qr_session_token`/`tf_qr_session_expiry` in `localStorage` via `addInitScript`, not a test-only hack. The 3 tests that actually exercise gate mechanics (phone format validation, back-button-at-the-gate, phone-persists-across-reload) were moved to their own `test.describe` block without the bypass and rewritten against the real OTP flow (mocking the `otp_gateway` edge function for the reload-persistence test, since that one needs a full send+verify round-trip to be deterministic in a test environment with no live WhatsApp backend). Getting past the gate for the first time also surfaced two independent latent test bugs that had simply never been reached before: a missing `await` on an assertion (silently not blocking, corrupting a sibling test's run via an unhandled rejection) and an assertion checking for an `h4:has-text("Review")` element that never existed in the review panel at all (the review panel's only conditional `h4` is for the *duplicate-ticket-found* state; the correct "reached review" signal, already used correctly by 3 sibling tests, is `.qr-gateway-review textarea` becoming visible). Verified stable over 2 consecutive full runs (27/27 both times) plus a spot-check that the 3 CI-wired specs (`settings-role-boundary`, `dashboard-framework`, `lay-owner-dashboard`) and `npm run build` are still unaffected.

---

## Phase status

| # | Phase | Status | Owner |
|---|-------|--------|-------|
| 0 | Secrets & credential scan | ✅ Done (1 critical finding, flagged to user) | Direct |
| 1 | Multi-tenancy / RLS scoping (frontend) | ✅ Done (0 new critical/high — no live leak found; 2 medium robustness gaps) | Agent A (retry) |
| 2 | Supabase migrations audit (55 files) — orphaned policies, collisions | ✅ Done (2 critical, 2 high, 1 medium, 1 low) | Agent B |
| 3 | Edge functions audit (22 functions) — permissions, validation | ✅ Done (4 critical, 3 high, 4 medium, 3 low) | Agent C |
| 4 | Error handling / silent-catch audit (frontend) | ✅ Done (106/139 catch blocks unlogged; ~10 dangerous) | Agent D |
| 5 | Auth & session audit (Login.jsx, auth.js, dual-session) | ✅ Done (1 critical finding) | Direct |
| 6 | Backend FastAPI audit (`backend/app`) | ✅ Done (2 critical, 2 high; routers themselves are solid, services layer is not) | Agent E (+ direct spot-check of admin/auth routers already logged above) |
| 7 | CI/CD & build config audit (workflows, env parity) | ✅ Done (1 high, 1 low finding) | Direct |
| 8 | Frontend code health (dead imports, unused code, like the missing-apiFetch-import class of bug) | ✅ Done (1 critical, 2 high, ~20 orphaned components) | Agent F |
| 9 | Test coverage audit (unit + Playwright vs. actual surface area) | ✅ Done — coverage is inverted vs. risk | Agent G |
| 10 | Dependency audit (npm/pip, known vulns, outdated) | ✅ Done (4 high npm, pip clean) | Direct |
| 11 | SEO audit (Lighthouse + robots/sitemap/canonical checks) vs. live turbofix.co.in — user-requested add-on | ✅ Done (2 high, 1 medium) | Direct |

---

## Findings log

### 🔴 CRITICAL — Committed credentials in public repo
- **File:** `docs/SK_PVT_LTD_CREDENTIALS_AND_ONBOARDING.md`
- **Issue:** Tracked in git and pushed to `github.com/neetesh548-design/turbofix`, confirmed **public**. Contains real names, emails, phone numbers, and a shared temporary password (`SkPvtLtd@2026!`) for 17 real people at pilot customer SK Pvt Ltd, plus their machine inventory.
- **Why it slipped through:** `.gitignore` has `*_CREDENTIALS.md`, which matches the untracked root-level `SK_PVT_LTD_CREDENTIALS.md` but NOT this file (`..._AND_ONBOARDING.md` doesn't end in `_CREDENTIALS.md`).
- **Status:** Flagged to user 2026-08-13. User chose to handle remediation themselves (not touched by this audit). Recommend: rotate all 17 passwords in Supabase, then decide on git-history scrub separately.
- See [[LESSONS_LEARNED.md]] — worth adding as its own category once resolved.

*(Further findings appended below as each phase reports back.)*

### 🔴 CRITICAL — Self-registration flow is completely broken and lies to the user
- **File:** `src/pages/Login.jsx:157-245` (`handleRegister`)
- **Issue:** The "Register Company" tab never calls the backend's own `POST /auth/register` endpoint (verified: `grep -rn "auth/register" src/` → zero matches anywhere in the frontend). Instead it writes directly from the browser to Supabase: `supabase.from('companies').insert(...)`, then `supabase.from('users').insert(...)`, then `supabase.auth.signUp(...)`.
- **Root cause:** `supabase/migrations/20260711131850_init_schema.sql:93-94` enables RLS on both `public.companies` and `public.users` but only ever adds **SELECT** policies for them (`"Users can view their own company"`, `"Users can view users in same company"`). Verified across all 55 migration files (`grep` every `CREATE POLICY ... FOR INSERT`) — the only INSERT policy touching either table is `"Owners can onboard users in their company"` (`20260718234000_owner_team_onboarding.sql`), which requires an *already-authenticated existing owner*, not applicable to a brand-new anonymous signup. **There is no INSERT policy on `public.companies` anywhere in the repo.**
- **Effect:** With RLS enabled and no matching policy, Postgres denies the insert by default. Both `companies.insert` and `users.insert` in `handleRegister` silently fail — the code only does `console.warn(...)` on each and continues (lines 202-204, 216-218) rather than aborting. `supabase.auth.signUp()` (a GoTrue endpoint, not gated by table RLS) may succeed, creating an orphaned Auth identity with no matching `companies`/`users` row. The UI then **unconditionally shows** "Your company registration request... has been submitted to the admin for approval!" (line 237) regardless of whether any row was actually written.
- **Business impact:** Every real prospect who tries to self-register on turbofix.co.in today gets told their signup succeeded and is "pending admin approval" — approval that can never happen because there's no company row to approve. This is the same bug *class* as the marketing lead-form failure already fixed in commit `1646894` ("dropped leads"), but on the actual product signup path, and currently still live. The backend's properly-validated `/auth/register` endpoint (`backend/app/routers/auth_router.py:95-141` — rate-limited, password-strength-checked, duplicate email/phone checked, correctly creates company+owner via `UserRepository`) is fully built and correct but **entirely dead code from the live product's perspective**.
- **Fix direction (not yet applied — flagging for user decision):** point `handleRegister` at `apiFetch('/auth/register', ...)` instead of the direct Supabase writes, matching the pattern `handleLogin` already uses for its primary path.
- **Severity:** Critical — blocks new customer acquisition silently, with a misleading success message.

### ⚪ Info — Admin-approval bypass (commit `1ca047e`) verified still fixed on the one path that works
- Traced the full login flow in `Login.jsx`/`backend/app/routers/auth_router.py`/`backend/app/repositories/supabase_repo.py`. For any account that *does* exist in `public.users` with a real GoTrue identity, the backend's `verify_credentials()` → `_company_approved()` gate correctly blocks pending companies with a 403, and `Login.jsx` correctly treats `err.status === 403` as a hard stop (not falling through to the Supabase-fallback path). This part of the previously-fixed bug is solid — the *new* critical finding above is a different failure mode (registration never completing at all), not a regression of the original fix.

### 🟠 HIGH — Most edge functions have no automated deployment
- **File:** `.github/workflows/deploy.yml` `deploy-edge-functions` job
- **Issue:** Only 5 of the repo's 21 real edge functions are deployed by CI: `ai_assistant`, `ai_translation`, `ticket_gateway`, `otp_gateway`, `onboard_team_member`. The other 16 — including **`whatsapp_webhook`**, the function at the core of the product's entire value proposition, plus `billing_webhook`, `check_schedules`, `check_inventory`, `send_notifications`, `verify_repair_photo`, `admin_portal`, `ai_diagnostics`, `asset-service`, `inbound_email_receiver`, `iot_telemetry_webhook`, `monthly_report`, `notification-service`, `reporting`, `ticket-service`, `user-provisioning` — have no CI deploy step at all.
- **Effect:** Any code change to these 16 functions merged to `main` does **not** reach production automatically. Either someone remembers to run `supabase functions deploy <name>` manually every time (drift risk — repo state and prod state silently diverge, exactly the pattern that caused the week-long unnoticed migration backlog in commit `6362638`), or some of these are simply not live at all despite existing in the repo.
- **Status:** Needs the user to confirm which of these 16 are actually deployed/current in the Supabase dashboard vs. stale — this audit can't check live Supabase state.
- **Severity:** High.

### 🔵 Low — Redundant frontend build in CI
- `.github/workflows/deploy.yml`'s `test-and-build` job runs `npm run build` (with env vars) but, per its own comment, no longer deploys anything — `pages.yml` does an independent full `npm ci && npm run build` and deploys. Two full builds run on every push to `main` for no functional reason (the first one's `dist/` output is discarded). Cosmetic/cost inefficiency, not a correctness bug.

### ⚪ Info — Env var parity confirmed correct (no regression of commit `1646894`)
- Both `pages.yml` and `deploy.yml` inject identical `VITE_BACKEND_URL`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` into their respective build steps. The bug fixed in `1646894` (pages.yml missing these vars) has not regressed.

## Phase 3 (edge functions) — CRITICAL findings

### 🔴 CRITICAL — `admin_portal`: full authentication bypass into the platform admin console
- **File:** `supabase/functions/admin_portal/index.ts:39-57` (gate at 322-347)
- **Issue:** `verifyToken()` accepts (a) the literal string `demo:admin`, (b) ANY bearer token merely starting with `tf_admin_session_` (no lookup, no signature, no expiry — `createAdminToken()` just concatenates `Date.now()+Math.random()`), or (c) any 3-part string shaped like a JWT, whose payload is `atob()`-decoded and trusted **with no signature verification**. Anyone can self-mint `{"role":"platform_admin"}` and get full cross-tenant read/write over every company on the platform (`/companies`, `/companies/provision`, `/machines/provision`, `/machines/status`, `/tickets`).
- **Severity:** Critical — this is the single worst finding in the audit so far.
- **CONFIRMED LIVE, NOT DEAD CODE (added during backend audit):** `src/pages/AdminPortal.jsx` — the actual admin console UI staff use — calls `ADMIN_EDGE_URL = 'https://wcqgbleppiaddgfjrnpq.supabase.co/functions/v1/admin_portal'` exclusively (every action: login, list companies/machines/tickets, approve/pause/resume/reject company, change quota, provision company/machine, resolve ticket — all hit this same broken edge function). Meanwhile `backend/app/routers/admin_router.py` has a **properly built, parallel admin API** — `secrets.compare_digest()` password check, real signed JWT via `create_admin_token()`/`get_current_admin()` using a dedicated `ADMIN_JWT_SECRET_KEY`, rate-limited 3/minute — but it is **never called by the frontend at all**. The secure implementation exists in the repo and is completely orphaned; the live product runs entirely on the broken one. This is the highest-confidence, highest-severity finding in this audit — an unauthenticated path to full cross-tenant admin control that is the actual production admin console today.

### 🔴 CRITICAL — `iot_telemetry_webhook`: zero authentication, blind trust of `machine_id`
- **File:** `supabase/functions/iot_telemetry_webhook/index.ts:7-18`
- **Issue:** No signature/HMAC check, no service-role check, no bearer check at all. `machine_id` from the raw POST body is used directly to create tickets for that machine. Anyone on the internet can spam ticket creation against any machine of any company.

### 🔴 CRITICAL — `ticket_gateway`: cross-tenant "first row in table" fallback + no ownership check on protected actions
- **File:** `supabase/functions/ticket_gateway/index.ts:163-174` (fallback), `:383-394` (`get_factory_id`, fully unauthenticated), `:323-341,372-381` (`update_ticket`/`get_ticket`)
- **Issue:** When a machine can't be resolved, falls back to "grab the first machine in the entire table" and stamps it onto a new ticket — cross-tenant, matches [[LESSONS_LEARNED.md]] §1 exactly. Separately, `update_ticket`/`get_ticket` require a valid QR session but never check the session's `company_id` against the target ticket's company before reading/mutating it, and `.update(patches)` has no field allow-list (mass-assignment) — any valid QR session for ANY company can rewrite arbitrary fields of any ticket by ID.

### 🔴 CRITICAL — `inbound_email_receiver`: spoofable sender + cross-tenant machine matching
- **File:** `supabase/functions/inbound_email_receiver/index.ts:14-99`
- **Issue:** No provider signature/HMAC verification on the inbound-parse webhook; sender authorization relies purely on the trivially-spoofable `From:` header. Fallback machine resolution (lines 85-99) searches every machine in the entire table with no company filter and matches by name/id substring — a spoofed or misrouted email can file a ticket against another company's machine.

### 🟠 HIGH — `ai_assistant`: include-based role allow-list (recurrence of an already-fixed bug class)
- **File:** `supabase/functions/ai_assistant/index.ts:54-56,436-447` — `ALLOWED_AI_ROLES` hardcoded set. Same anti-pattern already fixed once in `onboard_team_member` (`09fc021`) and `Team.jsx` (`4cc3402`), not applied here. Any newly added role (Operator, Quality Inspector, custom roles) is silently 403'd from the AI Assistant.

### 🟠 HIGH — `check_inventory`: auth check doesn't actually check anything
- **File:** `supabase/functions/check_inventory/index.ts:24-29` — only rejects requests with no `Authorization` header AND an `x-forwarded-for` header; never validates the header's value against anything. Any request with any `Authorization` value bypasses it and reaches a service-role client that writes purchase orders.

### 🟠 HIGH — `ticket_gateway`: unauthenticated cross-tenant machine lookup
- **File:** `supabase/functions/ticket_gateway/index.ts:98-129` — `get_machine_details` not in `protectedActions`; anyone can enumerate any machine's name/location/technician across the whole platform with zero auth.

### 🟡 MEDIUM
- `whatsapp_webhook:839-856` — HMAC verification only runs `if (WHATSAPP_APP_SECRET)` is set; fails **open** (accepts unsigned payloads) if the secret env var is ever unset, instead of failing closed.
- `billing_webhook:49,81` — HMAC check itself is correct, but the `factory_id` used to update subscriptions/invoices is trusted directly from `payload.notes.factory_id` with no independent verification it's server-set (vs. client-influenced at Razorpay checkout).
- `ticket-service`/`asset-service` — rely 100% on RLS with no ownership check in application code; `ticket-service`'s PATCH does `.update(body)` with no field allow-list (mass-assignment); `asset-service` trusts `body.organization_id` directly on machine creation.
- `onboard_team_member:334-336` — new/custom roles silently collapse to `'technician'` in `profiles.role`, quietly under-scoping their RLS access rather than rejecting (the `canGrantRole` check itself is correctly exclude-based/fixed).

### 🔵 LOW
- Hardcoded include-lists deciding notification *recipients* (not access control) in `whatsapp_webhook`, `check_schedules`, `monthly_report`, `send_notifications` — same rot risk, lower stakes.
- `notification-service` — unauthenticated but explicitly marked `[UNUSED]`; flag before it's ever wired up live.
- `reporting`, `user-provisioning` — unimplemented Supabase boilerplate scaffolds, no logic to audit yet.

### ⚪ Clean
`_shared/security.ts` HMAC helper, `ai_diagnostics`, `verify_repair_photo` (correctly `requireServiceRole`-gated), `otp_gateway` (hashed OTPs, rate-limited, attempt-capped — this is the auth primitive and it's solid), `check_schedules`/`monthly_report` (properly tenant-scope before role filtering).

---

## Phase 2 (migrations) findings

### 🔴 CRITICAL — `parts` and `consumables` still carry the exact dual-policy bug already fixed once on `tickets`/`machines`
Both tables have a `company_id`-based SELECT policy (`20260711131850_init_schema.sql`) **and** an un-dropped legacy `factory_id`/`get_auth_factory_id()`-based policy (`20260711171614_add_tenancy_and_roles.sql`) still active side by side — the identical pattern that caused the 8-second `tickets` timeout fixed in commit `1cf4819`, never backported to these two tables.

### 🔴 CRITICAL — `maintenance_interventions` UPDATE policy references role values its own type system can't produce
`20260718150000_support_interventions.sql:44` checks `get_auth_role()::text IN (..., 'maintenance_technician','maintenance_engineer','maintenance_head', ...)`, but `user_role` enum (`20260711171614`) only ever holds `owner`/`supervisor`/`technician` — identical bug class to the already-fixed `20260728000100_shift_rosters.sql` incident, but never backported here. Real users with these roles are silently locked out of updating maintenance interventions.

### 🟠 HIGH — `suppliers` and `machine_qr_codes` run exclusively on the expensive legacy `get_auth_factory_id()` model
No `company_id` policy ever added for either table — same expensive function proven to cause multi-second timeouts elsewhere, unaudited since.

### 🟠 HIGH — `tickets` INSERT policy still on the legacy factory model
`"Technicians can insert tickets"` (factory_id-based) was never dropped when the SELECT policy was migrated to company_id — every ticket insert still pays the expensive lookup and authorizes off a superseded model.

### 🟡 MEDIUM
- `tickets` UPDATE policy (`20260729130000`) still gates on `factory_id = get_auth_factory_id()` even though SELECT moved to company_id — the identity-fallback majority-vote in that function can mis-authorize updates for any company whose machines span more than one legacy factory_id.
- `organizations`/`factories` table split: `20260721120000` renamed `factories`→`organizations`, then `20260722173000` recreated a brand-new, independent `public.factories` table (fresh UUID space). `kaizen_opportunities`/`shift_rosters` reference the new table; everything else references `organizations`. A real company's pre-rename factory_id is not guaranteed to exist in the new table — worth a follow-up grep for actual writes to confirm exploitability.

### 🔵 LOW — `20260727_seed_demo_users.sql` uses a bare-date filename prefix (no time component), the same inconsistency class that caused the real collision fixed in `6362638`. No actual collision today, but worth normalizing.

### ⚪ Clean
No filename collisions currently exist (the `6362638` fix holds). No hand-inserted `auth.users` rows remain (the `20260727120000` fix holds). `documents`, `pm_schedules`, `pm_logs`, `rca_reports`, `capa_actions`, `work_order_parts` all have single-generation, company_id-only policies.

---

## Phase 4 (error handling) findings

**Scale:** 139 total catch blocks across `src/pages`/`src/components`/`src/utils`/`src/lib`; **106 have no logging at all** (most still show `err.message` to the user, so not literally invisible — but leave no console/telemetry trace, violating the LESSONS_LEARNED rule).

### 🟠 HIGH — `Dashboard.jsx:274` — any real user's dashboard silently shows fabricated KPIs on error
`Promise.all([..., fetchDashboardData().catch(() => fallback)])` — any exception (network error, typo, missing import — literally the Records.jsx failure shape) is swallowed with zero logging and replaced by a **hardcoded fake KPI object** (`machines_down: 6, urgent_open: 111, open_tickets: 219, plant_health_pct: 14`, from `src/lib/dashboardData.js:20-147`). Not gated by demo/signed-out status — runs for any real signed-in user whose fetch throws.

### 🟠 HIGH — `Machines.jsx:1490` (`handleAddKaizen`) — silent, invisible data loss
On any insert failure: no logging, no user-facing error, the new Kaizen idea is added to local React state only, form closes as if saved successfully. Lost on refresh with zero trace.

### 🟡 MEDIUM
- `Machines.jsx:933-948` (`uploadMachinePhoto`) — no logging; on any failure, silently falls back to a localStorage-only base64 image and tells the user "updated locally," masking a real cloud-upload failure.
- `Records.jsx:579-592` — the explicit demo path is correctly gated, but the catch-block fallback to `DEMO_MACHINES`/`DEMO_RECORDS` fires on **any** thrown exception for a real signed-in user, not only demo/signed-out sessions — same shape as the already-fixed d86bf3c bug, just via a different trigger condition (fetch failure vs. fetch-empty).
- `retry.js:56-65` (`OfflineQueue.flush`) — no logging when a queued request fails; can fail forever with zero visibility.
- `retry.js:33-39` (`OfflineQueue.loadQueue`) — silently discards a corrupt/unparseable queue with no log.
- `AdminPortal.jsx:122-123` — reports ANY non-2xx login response as "Invalid platform password," without checking status code (same false-attribution shape as the already-fixed `c768817` "quota exceeded" bug).
- `Login.jsx:130-132` — Supabase-fallback catch reports any `signInError` (network/rate-limit/5xx included) as "Invalid credentials," without inspecting the error's actual code.

### 🔵 LOW / structural risk
- `demoDashboard.js`'s `shouldUseDemoTeam`/`shouldUseDemoReliability` check emptiness only, with no internal account-type check — currently safe because both call sites externally gate on `demoSession &&` first, but fragile if reused elsewhere without that guard.
- Heavy unlogged-catch concentration (display error to user, never log) in `AdminPortal.jsx` (9), `Machines.jsx` (18), plus `Technician.jsx`, `Settings.jsx`, `ResetPassword.jsx`.
- Minor blank catches in `QRGateway.jsx` (MediaRecorder/localStorage cleanup — low impact).

### ⚪ Correctly fixed / no issue
`Dashboard.jsx` `fetchRoleSources()` correctly gates demo fallback on `isRealFactoryUser()`. `AdminPortal.jsx:156` and `Machines.jsx:1113-1126` (`formatSupabaseError`) correctly verify the actual condition before asserting a specific cause — the `c768817` fix pattern applied correctly there.

---

## Phase 11 (SEO — user-requested add-on) findings

**Method:** Lighthouse (mobile, throttled) run against the live homepage (`https://turbofix.co.in`), plus manual checks of `robots.txt`, `sitemap.xml`, and canonical/redirect behavior across the `www`/non-`www` hosts. Full report: `audit-seo/home.report.html`. The other two tools the user linked (`seo-audits-toolkit`, `site-audit-seo`) were not run this pass — they'd add a full multi-page crawl, which is a reasonable follow-up but wasn't necessary to find the issues below; flagging as a deliberate scope call, not an oversight.

### 🟠 HIGH — Canonical URL, Open Graph, and structured data all point at a host that immediately redirects away
- **Files:** `src/data/seoMeta.js:7` (`export const SITE_URL = 'https://www.turbofix.co.in'`), `index.html:36,47,49,88-147` (canonical, OG, JSON-LD all hardcoded to `www.turbofix.co.in`)
- **Issue:** Verified live: `https://www.turbofix.co.in/` returns **HTTP 301 → `https://turbofix.co.in/`** (non-www is the real serving host, confirmed via response headers). But every page's `<link rel="canonical">`, Open Graph `og:url`, and all JSON-LD `@id`/`url` fields declare `www.turbofix.co.in` as canonical — a URL that never actually serves content, it only redirects. `sitemap.xml` also lists every URL under the `www` host. This tells search engines "the authoritative URL is one that immediately bounces elsewhere," which is the opposite of correct canonicalization and can cause Google to index the wrong host or split ranking signals between the two.
- **Fix direction:** change `SITE_URL` in `seoMeta.js` to `https://turbofix.co.in` (no www) so `scripts/apply-seo-meta.mjs` propagates the correct canonical/OG to every built route, and update `index.html`'s hardcoded JSON-LD block (not generated by that script) to match. Sitemap generation should follow the same source.
- **Severity:** High — affects every single page on the site, not just the homepage.

### 🟠 HIGH — Homepage Largest Contentful Paint is 21.7s (target: <2.5s), driven by one 3MB hero image
- **Lighthouse scores (mobile, live):** Performance **52**, Accessibility **90**, Best Practices **100**, SEO **100**.
- **Root cause, confirmed via Lighthouse's LCP breakdown:** the hero image `turbofix-hero-banner.png?v=3` is **3,057,608 bytes (~3 MB)** and is the LCP element (`lcp-breakdown-insight`: resourceLoadDelay 1,986ms + resourceLoadDuration 1,197ms + elementRenderDelay 644ms, on top of a 491ms TTFB). It's also not discoverable early (`lcp-discovery-insight`: `requestDiscoverable: false`, `priorityHinted: false` — no `fetchpriority="high"`, not eagerly discoverable in the initial HTML). This traces directly to the git history's repeated "upscale hero banner to 4K/3x" commits (`5d91b964`, `1169360e`) — each increased visual resolution without ever adding compression, a modern format (WebP/AVIF), or responsive `srcset` sizing for the ~412px-wide mobile viewport it's actually displayed at.
- **Secondary contributor:** `render-blocking-insight` — a single Google Fonts `<link>` loading **9 font families across dozens of weights** (Inter, JetBrains Mono, Outfit, Rajdhani, Montserrat, Noto Sans JP, Noto Sans SC, Noto Naskh Arabic, Noto Sans Devanagari — the full i18n language set from Phase 4, see [[LESSONS_LEARNED.md]] §7) is render-blocking and costs ~2,749ms by itself, loaded synchronously regardless of the visitor's actual language.
- **Total page weight:** 3,780 KiB, of which the hero image alone is ~81%.
- **Severity:** High — this is a real-money problem (Google's own performance-cost framing) and directly affects conversion on the marketing site that's the whole top-of-funnel for sales.

### 🟡 MEDIUM — Accessibility gaps (score 90/100)
- `color-contrast` — background/foreground colors fail WCAG contrast ratio in at least one spot.
- `heading-order` — heading elements are not in sequentially-descending order (skipped heading levels).
- `label` — form elements without associated `<label>`s.
- Not yet mapped to specific files/components — would need Lighthouse's DOM node references cross-referenced against source, not done this pass.

### ⚪ Clean
- `robots.txt` is well-structured (explicit allow rules for Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, etc., correct `Sitemap:` directive).
- `sitemap.xml` exists, is reachable (200), and lists all public marketing routes with reasonable `lastmod`/`priority`/`changefreq`.
- SEO category score is 100/100 in Lighthouse itself (which doesn't catch the www/non-www canonical mismatch above — that's a crawl-level issue Lighthouse's single-page audit can't see).
- No `unused-css-rules`/`unused-javascript` issue is severe on its own (183 KiB / 80 KiB respectively) — worth cleaning up but dwarfed by the hero-image problem.

---

## Phase 10 (dependencies) findings

### 🟠 HIGH — 4 known high-severity vulnerabilities in npm production dependencies
`npm audit --omit=dev`:
- `nanoid` ≤3.3.16 — non-secure generators can loop indefinitely with negative/zero size ([GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8))
- `postcss` ≤8.5.22 — path traversal in sourcemap auto-loading, arbitrary `.map` file disclosure ([GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849), [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp))
- `react-router` / `react-router-dom` 7.12.0–7.18.1 — RSC Mode CSRF bypass allows action execution before a 400 response ([GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2))
- All 4 have a fix available via `npm audit fix` (not run — leaving dependency changes to the user's judgment/testing).

### ⚪ Clean — Python backend
`pip-audit -r backend/requirements.txt`: **no known vulnerabilities found.**

---

## Phase 9 (test coverage) findings

**Headline: test coverage is inverted relative to risk.** The layers where this audit found its worst live bugs have zero automated tests; the layer with 100% test coverage is largely dead/orphaned code the live product doesn't use.

### Coverage by category
| Category | Tested | Notes |
|---|---|---|
| Backend routers (9) | **100%** | Thorough, including negative-auth + fuzzing — but tests `admin_router`/`/auth/register`, the **orphaned** parallel API the frontend never calls. |
| Supabase edge functions (21 real) | **0%** | No `Deno.test`, no fixtures anywhere. Every Phase 3 critical finding (admin_portal bypass, `iot_telemetry_webhook`, `ticket_gateway`, `inbound_email_receiver`) sits in completely untested code. |
| Supabase migrations/RLS (55) | **0%** | No test instantiates a real Postgres/Supabase client. The `parts`/`consumables` dual-policy bug, the `maintenance_interventions` enum mismatch — all invisible to the suite even in principle. |
| Frontend pages (24) | ~75% referenced by *some* test file, but see CI gap below | Zero coverage at all: `Assistant.jsx`, `DemoLogin.jsx`, `MachinesRefactored.jsx`, `QRGenerator.jsx`, `ResetPassword.jsx`, `ShutdownPlanner.jsx`. `Login.jsx`'s `handleRegister` (the broken registration flow): **zero** coverage. |

### 🟠 HIGH — None of this audit's critical findings could ever have been caught by the existing test suite
- **Registration bug:** no test drives `Login.jsx`'s "Register Company" tab at all. The one register-flow test suite that exists (`backend/tests/test_vault_signup.py`, 5 tests) thoroughly covers the backend's `/auth/register` — the dead path the frontend never calls. The actually-broken path has zero coverage.
- **admin_portal bypass:** zero references to `admin_portal`/`ADMIN_EDGE_URL` in any test file. The two specs that do exercise admin login (`tests/admin-portal.spec.js`, `tests/admin-portal-prod.spec.js`) are pure happy-path (correct password → dashboard loads) and are never wired into CI anyway (see below). The backend's own negative-auth admin tests test the orphaned `admin_router.py`, not the live edge function.
- **RLS/tenant isolation:** `src/__tests__/tenantIsolation.test.js` — the file whose name most directly promises "multi-tenancy is safe" — has one `describe` block testing a `filterTenantRecords` function **defined inline in the test file itself** (not imported from any app source, tests nothing real), and a second block that legitimately unit-tests `tenant.js` helpers against in-memory arrays. No test anywhere instantiates a real Supabase client or asserts an RLS policy actually blocks anything.

### 🟠 HIGH — ~44 of 46 Playwright spec files never run in CI
`.github/workflows/e2e-tests.yml` only runs `npm run test:qr`/`test:qr:mobile`, which resolve to a substring filter matching exactly 2 files (`qr-gateway-tickets.spec.js`, `qr-gateway.spec.ts`, confirmed via `npx playwright test qr-gateway --list`). Everything else — `admin-portal.spec.js`, `role-dashboards.spec.js`, `settings-role-boundary.spec.js`, the entire `tests/ux-audit/` directory (a11y, visual-regression with dozens of committed baseline PNGs, dark-mode, responsive, performance, design-guidelines) — exists, is runnable locally, and provides **zero actual regression-catching value today**. Real engineering effort sitting idle — same "undocumented code isn't a green field" pattern from [[LESSONS_LEARNED.md]] §6, applied to tests instead of features.

### ⚪ What is solid
- `backend-ci.yml` runs the full 40-file pytest suite on every backend push/PR.
- `deploy.yml`'s `test-and-build` runs the full 40-file Vitest unit suite on every push/PR to main.
- Unit tests are genuinely good for pure calculation logic (MTTR/SLA/financial-impact/escalation math).
- Backend pytest suite includes real negative-auth and fuzzing tests (`test_worst_case_robustness.py`) — good practice, just aimed at the wrong (orphaned) surface.

---

## Phase 8 (frontend code health) findings

**Method:** `oxlint` run with `no-undef`/`react/jsx-no-undef` enabled (not in the project's default `.oxlintrc.json`) across `src/pages`+`src/components`, cross-referenced against `src/App.jsx`'s route table and every `src/utils`/`src/lib` export's call sites. This one lint config change found all 3 crash bugs below — none turned up in a comparable amount of manual review.

### 🔴 CRITICAL — Two fully-built features are 100% unreachable: `MachineDetailDrawer.jsx` never destructures the callback props that trigger them
- **File:** `src/components/machines/MachineDetailDrawer.jsx:267,276` — `onOpenPersonnelMatrix`/`onOpenCapexEscalation` are used as bare identifiers in `onClick` handlers but never appear in the component's destructured props (lines 33-49), even though `src/pages/Machines.jsx:3658-3659` passes both. The `?.` optional-chain does **not** save this — it only guards a bound-but-nullish value, not an unbound identifier; every click throws `ReferenceError` immediately.
- **Effect:** `MachinePersonnelMatrixModal` ("Shift & Department Personnel Matrix") and `CapexEscalationModal` ("CapEx Machine Replacement Proposal") are real, fully-implemented modal components with working save handlers — and are completely unreachable, since these are their only trigger points anywhere in the codebase. No error boundary wraps `Machines.jsx`, so it's a hard crash, not a silent failure.
- **Severity:** Critical — exact same bug shape as the Records.jsx incident (`e6e6a54`), just a missing prop instead of a missing import.

### 🟠 HIGH — `AdminPortal.jsx:1359` — unimported `<Key>` icon crashes the "Copy Credentials" admin action
- Rendered in the credentials-copy button after provisioning a new company; `Key` is missing from the `lucide-react` import block. Given `AdminPortal.jsx` is confirmed the live admin console, this crashes a core admin workflow. No local error boundary.

### 🟡 MEDIUM — `QRGateway.jsx:2247` — `searchParams` referenced but never declared
Same "unbound identifier" root cause, narrower blast radius — only reachable when the QR scan hasn't resolved a machine yet (both preceding `||` operands are falsy). The file's real query-param mechanism elsewhere is `decryptUrlParams()`, a different pattern entirely.

### 🟠 HIGH — Two independent, drifting implementations of ticket urgency metadata
`src/utils/breakdownRouter.js` (`URGENCY_META`/`urgencyMeta()`) and `src/utils/ticketMeta.js` (separate same-named `URGENCY_META`/`urgencyMeta()`) both model the same concept with different shapes and different fallback behavior for unrecognized urgency (silently "Medium" in one, "Unrated" in the other) — both are live, imported by different parts of the app (QuickReportDialog/IssueCapture/ReportBreakdown vs. TicketRow). No mechanism keeps them in sync.

### Orphaned/dead code (built, never wired in)
- **`MachinesRefactored.jsx`** — confirmed not in `App.jsx`'s route table; its entire feature-flag rollout system (`src/utils/featureFlags.ts`) has zero call sites anywhere — dead infrastructure gating a dead page.
- **~20 orphaned components, ~3,485 lines**, zero references anywhere: `DashboardWidget.jsx`, `LanguageSwitcher.jsx`, `AntDModalsAndFeedback.jsx`, `AntDPerformanceOptimizations.jsx`, `AntDNavigationLayout.jsx`, `ClosedLoopControlCard.jsx`, plus 6 files in `components/dashboard/` (`MaintenanceHeadDashboard.jsx`, `SpecialistDashboard.jsx`, `CmmsKpiStrip.jsx`, `ShiftHeroLeaderboard.jsx`, `DigitalAndonBoard.jsx`, `AdvancedAnalyticsBoard.jsx` — this one alone is 703 real lines) and 9 in `components/marketing/`. Reads as two abandoned mid-integration initiatives (a dashboard role-view expansion, a marketing component set), not stubs.
- Downstream dead-code chains: `CmmsKpiStrip.jsx` is the only consumer of `mttrMetrics.js`'s richer functions (`computeMTTR`/`computeMTBF`/`computeDowntimeCost`) — dead in production, exercised only by its own test. `DashboardWidget.jsx` is the only consumer of `dashboardLayout.js`'s layout-persistence exports — the dashboard-widget-customization feature is dead end-to-end.
- `src/utils/demoInventory.js` — entire file unused; `Inventory.jsx` has **no demo-data gate of any kind**. Given [[LESSONS_LEARNED.md]] §1's demo-leak history, this reads as an abandoned safeguard rather than an active risk, but worth noting.
- `src/utils/retry.js`'s `OfflineQueue` class (and `retryWithBackoff`) — never imported by any real page/component, only by its own test. **Recontextualizes the Phase 4 finding** about `retry.js`'s unlogged catch blocks: that code currently never runs for a real user, so it should rank lower priority than the other Phase 4 findings.

### 🔵 LOW
18 confirmed dead exports across `src/utils`/`src/lib` (zero call sites anywhere) — see agent detail. 126 unused-import warnings across 36 files (mostly unused `lucide-react` icons) — cosmetic/bundle-size only.

### Recommendation
Add `no-undef`/`react/jsx-no-undef` (scoped to browser/node globals) to the project's real `.oxlintrc.json` — this single config change is what found all 3 crash bugs above and would catch this entire bug class in CI going forward, the same class that already shipped once as the Records.jsx incident.

---

## Phase 6 (backend FastAPI) findings

**Headline: the routers are genuinely solid (correct auth gating, correct company-scoping from authenticated identity everywhere, `webhook_router.py`'s HMAC verification is fail-closed and actually better than the Supabase edge function equivalent) — the damage is one directory over, in the services layer.**

### 🔴 CRITICAL — WhatsApp ticket-closure workflow (approve/reject/delegate/outsource) is fully non-functional, and silently reports false success
- **File:** `backend/app/services/escalation_service.py` — Python allows a later top-level `def` to silently overwrite an earlier same-named one in the same module. Six business-critical functions are each defined **twice**: a real implementation, then a no-op stub below it that wins:

| Function | Real impl (shadowed, dead) | Stub that actually runs |
|---|---|---|
| `submit_closure` | `:204-228` — attaches evidence, pauses escalation, notifies maintenance head | `:382-383` — `return True`, no-op |
| `approve_ticket_closure` | `:231-239` — calls repo's `approve_closure()` | `:366-367` — `return True`, never touches the repo |
| `reject_ticket_closure` | `:242-271` — reopens ticket, resumes timer, notifies technician | `:370-371` — `return True`, no-op |
| `delegate_to_colleague` | `:276-297` — reassigns ticket, resets timer | `:374-375` — `return True`, no-op |
| `mark_outsourced` | `:300-307` — records outsourcing | `:378-379` — `return True`, no-op |
| `initialize_part_request_escalation` | `:188-199` — sets first escalation timer | `:353-354` — fabricated `{"status":"success"}` dict, sets no timer |

- **Live production impact (all 6 called from `ticket_service.py`, reached via the confirmed-live `webhook_router.py` WhatsApp flow):** a technician submits closure evidence over WhatsApp → nothing attaches to the ticket, it never reaches `pending_approval`, the maintenance head is never notified — but the technician is told it worked (`log.info("closure_evidence.submitted")` fires regardless). If a ticket ever does reach approval and a maintenance head replies "approve" → the stub returns `True` → the system **broadcasts a "ticket closed" WhatsApp message to every stakeholder** — while the database status never actually changed. Reject/delegate/outsource are the same shape.
- **Why this is worse than a silent catch:** it's a false-success signal at *every* layer simultaneously — logs, WhatsApp confirmations to the technician, and broadcast notifications to stakeholders — while the underlying data never moves. This makes the entire WhatsApp ticket-closure-approval loop, the core mechanic of the product's stated value proposition, non-functional today with zero error trail.
- **Fix direction:** delete the 6 stub redefinitions at `escalation_service.py:353-383` — dead scaffolding left over after the real implementations above them were written.
- **Severity:** Critical — arguably the most damaging functional-correctness bug in this entire audit, since it silently defeats the core product loop while actively telling technicians and stakeholders it worked.

### 🔴 CRITICAL — WhatsApp AI Assistant always sees zero live data; its offline fallback fabricates fake plant data to real customers
- **File:** `backend/app/services/whatsapp_chat_service.py:82-129` (`_build_role_context`) calls `tickets_repo.get_open_by_company(...)`/`.list(status="open")` and `machines_repo.list()` — **none of these methods exist** on the actual `TicketRepository`/`MachineRepository` interfaces (real methods: `get_company_tickets`, `get_company_machines`, `load` — verified in `repositories/base.py`). Every call raises `AttributeError`, caught by a bare `except Exception: ... = []` with **zero logging** — so live ticket/machine counts are always 0, for every company, on every WhatsApp AI query.
- **Compounding:** `_fallback_role_response` (`:170-200`), which fires whenever Gemini is unavailable/misconfigured/errors, returns **hardcoded fabricated data** ("Estimated Downtime Cost Today: ₹12,500", "Fleet Availability Rate: 95.8%", specific fake technician names) presented to a real owner/maintenance head as their company's actual live status. Same bug class as [[LESSONS_LEARNED.md]] §1/§3, now live in the WhatsApp AI Assistant.
- **Severity:** Critical.

### 🟠 HIGH — Same shadowed-function bug silently breaks repeat-failure auto-escalation
`intelligence_service.py`'s `check_repeat_failure` is also defined twice — the real dict-returning version at `:138-164`, shadowed by a bool-returning, argument-mismatched version at `:362-384` that always hits its own bare `except: tickets = []`. The caller (`check_and_flag_on_creation`, dispatched as a background task on every new ticket) then does `result["is_repeat_failure"]` on a bool → `TypeError`, crashing silently outside the request/response cycle (background tasks run after the response is sent). Repeat-failure detection and its auto-escalation alert never fire for any machine, any company.

### 🟠 HIGH — OTP code returned directly in the API response if two independent integrations are ever both unconfigured
`auth_router.py:420,517` — `otp_debug` is returned in the JSON response when `TESTING` is true **or** when both WhatsApp and Fast2SMS are unconfigured — but not gated on `config.ENVIRONMENT != "production"` the way the codebase's own webhook-secret checks are elsewhere. A plausible (not hypothetical) production misconfiguration — both third-party integrations unset — turns this into an unauthenticated account-takeover oracle: request an OTP for any phone, read the code back in the response, reset that account's password immediately.

### 🔵 LOW — Latent `eval()` RCE landmine in custom KPI formulas
`dashboard_service.py:197` — `eval(formula, {"__builtins__": None}, eval_scope)`; `{"__builtins__": None}` is a well-known bypassable sandbox. Verified currently unreachable (no schema/endpoint ever produces a `"formula"` key), but the `kpi_type` field already exists as an extension point for exactly this — a landmine for whoever wires up formula-based KPIs next without revisiting this line.

### ⚪ Clean
- Every endpoint in `vault_router.py`, `technician_router.py`, `machine_records_router.py`, `kpi_router.py`, `dashboard_router.py`, `report_router.py`, and `admin_router.py` (beyond login) is correctly auth-gated and company-scoped from the authenticated identity — no client-supplied company/technician ID is ever trusted unverified.
- `vault_router.py` document access returns generic 404 (not 403) on cross-company access — correctly prevents both leakage and ID-enumeration. Model pattern for the rest of the codebase.
- `webhook_router.py` — confirmed live and materially richer than the Supabase edge function equivalent; HMAC-verified, fails closed when secrets are missing (the correct version of the bug already found failing *open* in the edge function). **Open question for the user:** is this FastAPI endpoint or the Supabase edge function actually registered as the live Meta webhook callback? If both are simultaneously reachable, inbound WhatsApp messages could double-process into duplicate tickets — this audit can't check the Meta dashboard config.
- `fanout_service.py`, `consumables_service.py`, `machine_record_service.py` (including its ZIP-import path — zip-slip protection, size caps, company-scoped validation all correct) — properly scoped and logged, model examples.

### 🟡 MEDIUM (minor, noted for completeness)
- `MachineRepository.get()`/`TicketRepository.get()` fetch by bare `id` with no company filter at the query level — every current caller correctly post-checks ownership, but there's no query-level backstop if a future caller forgets (the exact shape that caused 3 prior leaks per LESSONS_LEARNED §1).
- `kpi_router.py:78,111` and `contact_access_service.py:95-96` — two more include-based role allow-lists (same rot-prone pattern as elsewhere), both fail closed (safer than historical instances) but will misbehave the moment a new custom role needs this access.
- `dashboard_service.py`'s `get_dashboard_data`/`build_dashboard_overview`/etc. are stub functions returning empty data, confirmed unreachable/dead — harmless today, worth deleting before an accidental future wire-up.

---

## Phase 1 (frontend tenancy/RLS) findings

**Headline — the one phase in this audit with no new Critical/High finding.** Every genuinely unscoped `.from()` call site across `Kaizen.jsx`, `RCA.jsx`, `ShutdownPlanner.jsx`, `Support.jsx`, `Assistant.jsx`, and `dashboardData.js` was checked directly against the actual RLS policy SQL (not just Phase 2's summary), and in every case the backstopping policy is single-generation and correctly `company_id`-scoped for the specific tables touched. `Team.jsx`, `QRGenerator.jsx`, `QRGateway.jsx`, `AdminPortal.jsx` make no direct tenant-relevant Supabase calls at all — their only exposure is the edge-function traffic already covered in Phase 3. `src/components/{machines,tickets,inventory,kaizen,breakdown,dashboard}` are pure presentational components with zero Supabase references.

### 🟡 MEDIUM — `Kaizen.jsx` has zero defense-in-depth if its RLS policy is ever weakened
`src/pages/Kaizen.jsx:96-97,200,221` — fully unscoped `kaizen_opportunities`/`machines` queries with no `.eq('company_id',...)` and no client-side tenant filter anywhere in the file (unlike every sibling page in this phase, which derives its data from an independently-verified source). Currently backstopped entirely by a correct, single-generation RLS policy — not an active leak — but `parts`/`consumables` prove this exact "single point of RLS failure" pattern has already broken twice in this codebase (Phase 2). Worth adding a query-level `company_id` filter as defense-in-depth even though nothing is broken today.

### 🟡 MEDIUM — `Support.jsx`/`maintenance_interventions`: another table on the legacy, expensive `factory_id` RLS model
`src/pages/Support.jsx:40,89` — confirmed via direct RLS inspection that `maintenance_interventions` runs exclusively on `factory_id = get_auth_factory_id()` (not `company_id`), the same superseded, expensive model Phase 2 already flagged as High-severity tech debt for `suppliers`/`machine_qr_codes`. Still correctly scoped to the caller's own company (traced the fallback chain), so not a leak — but adds this table to the list worth batching into a future company_id migration pass. (This table was already separately flagged in Phase 2 for an unrelated role-enum mismatch on its UPDATE policy.)

### ⚪ Info — `public.events` table: RLS enabled, zero policies defined anywhere (fail-closed dead feature, not a leak)
Noticed adjacent to `Assistant.jsx:97-102`'s `events` query: `public.events` has `ENABLE ROW LEVEL SECURITY` but no `CREATE POLICY` exists for it in any of the 55 migrations — default-deny means this query silently returns empty for every real user. Functional dead-feature bug (same shape as several Phase 4/8 findings), not a tenant-isolation issue — noted for completeness, not counted in the phase severity tally.

### Test coverage
Confirms Phase 9: none of `Kaizen.jsx`, `RCA.jsx`, `ShutdownPlanner.jsx`, `Support.jsx`, `Assistant.jsx`, or `dashboardData.js` have any test coverage, tenant-related or otherwise.

---

## AUDIT COMPLETE — Executive Summary

All 12 phases in this tracker are done. Total: **9 critical, 8 high, ~14 medium, ~10 low/info findings** across the codebase. Nothing has been fixed — every finding below is exactly as found, for the user to triage and decide on.

### The 3 most severe, in order of business impact
1. **`admin_portal` edge function — full authentication bypass, and confirmed to be the actual live admin console** (Phase 3 + Phase 6 cross-check). Anyone can self-mint an unsigned token and get full cross-tenant read/write over every company on the platform. The secure alternative (`backend/app/routers/admin_router.py`) exists but is never called by the frontend.
2. **WhatsApp ticket-closure workflow (approve/reject/delegate/outsource) is fully non-functional and silently reports false success** (Phase 6) — shadowed function definitions in `escalation_service.py` mean the real logic never runs, while WhatsApp confirmations and stakeholder broadcasts claim it did. This defeats the core mechanic of the product's stated value proposition.
3. **Self-registration flow silently fails and lies to users** (Phase 5) — no INSERT policy exists on `public.companies`, so every signup attempt is denied by RLS, swallowed with a `console.warn`, and reported to the prospect as successful.

Close behind: 3 more unauthenticated/under-authenticated Supabase edge functions (`iot_telemetry_webhook`, `ticket_gateway`, `inbound_email_receiver`), the WhatsApp AI Assistant showing fabricated fake plant data to real customers, a committed credential leak in the public repo (user is handling remediation directly), and a homepage LCP of 21.7s from a single 3MB unoptimized hero image.

### Structural pattern across nearly every phase
The same few bug shapes recur at every layer — unscoped/under-scoped tenant queries, include-based role allow-lists that silently reject new roles, errors caught with no logging and a fabricated fallback shown instead, and now (new this session) silently-shadowed function redefinitions. [[LESSONS_LEARNED.md]] already documented most of these as historical incidents; this audit found each pattern recurring in code that was never touched by the original fix. Test coverage is inverted relative to risk — the two layers with the worst live bugs (edge functions, RLS/migrations) have zero automated tests, while the best-tested layer (`backend/app/routers`) is mostly orphaned code the live product doesn't use.

### What's solid (don't lose this in the noise)
Backend FastAPI routers' auth-gating and company-scoping discipline is genuinely good. `webhook_router.py`'s HMAC verification is correct and fails closed. `vault_router.py`'s document access control is a model pattern. Migration hygiene, while uneven, is self-correcting where it's been burned before (the fixes that exist have unusually good forensic commit messages). `robots.txt`/`sitemap.xml` are well-structured. Python/pip dependencies are clean.

---

## Next steps (for the user — nothing in this audit has modified code)
1. Decide on remediation for the credential leak (Phase 0) — still flagged as open, user chose to handle directly.
2. Fix `admin_portal`'s `verifyToken()` (Phase 3/6) — either point `AdminPortal.jsx` at the already-correct `backend/app/routers/admin_router.py` instead, or properly secure the edge function. This is the top-priority item regardless of what else gets picked up.
3. Delete the six shadowing stub functions in `escalation_service.py:353-383` (Phase 6) to restore the WhatsApp ticket-closure workflow.
4. Fix `whatsapp_chat_service.py`'s wrong repository method names (Phase 6) so the AI Assistant sees real data and stops falling back to fabricated numbers.
5. Point `Login.jsx`'s `handleRegister` at the backend's existing `/auth/register` endpoint instead of the direct-to-Supabase writes that RLS silently blocks (Phase 5).
6. Triage the remaining edge-function findings (Phase 3): `iot_telemetry_webhook`, `ticket_gateway`, `inbound_email_receiver`.
7. Everything else (SEO canonical fix, hero image compression, stale RLS policies on `parts`/`consumables`, `MachineDetailDrawer.jsx` missing props, npm audit fix, CI edge-function deploy coverage, test-suite CI wiring) is lower urgency — prioritize by severity column above.
