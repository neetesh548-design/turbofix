# Plan of 2nd August

**Audience:** Any AI coding agent working in this repo (Claude, GPT, etc.) with file read/write and shell access.
**Written:** 2026-08-02
**Do not confuse with:** `docs/POST_LOGIN_AUDIT.md` — that is a much older (2026-07-12) audit about a legacy `Vault.jsx`/`vault.js` duplication problem that has since been resolved. This plan is current and supersedes it for anything it overlaps with.

---

## 0. Read this first — required context

### 0.1 What this repo is
TurboFix is a React + Vite web app (deployed to GitHub Pages) for factory maintenance management. Post-login pages live in `src/pages/*.jsx` and are wrapped by `src/components/AppShell.jsx`. Data comes from Supabase; demo/offline sessions fall back to hand-written demo data in `src/utils/demo*.js`.

### 0.2 The rule that drove every fix in this plan's predecessor work
**Never let a page show fabricated numbers dressed up as live plant data.** Earlier in this project's history, several pages had decorative charts/buttons built from hardcoded arrays (fake work-order IDs like `WO-8041`, invented employee names, invented ₹ figures) that were never wired to `props`/`state`/Supabase. These were found and removed from `Dashboard.jsx`, `Inventory.jsx`, `Kaizen.jsx`, `RCA.jsx`, `ReportBreakdown.jsx`, and `Settings.jsx`. **The same pattern may still exist in files this plan asks you to check** (`Machines.jsx`, `Tickets.jsx`, `QRGateway.jsx`, `AdminPortal.jsx`) — nobody has audited those yet.

**How to recognize the anti-pattern (checklist — apply to every file you touch):**
1. Search for chart/widget components: `grep -n "StitchDonutChart\|StitchBarChart\|StitchPieChart" <file>`. For every match, read ~20 lines around it. If the `data=` / `items=` prop is a literal JS array of objects (not built from a variable that traces back to `props`, `state`, or a Supabase query result), **it is fake**.
2. Search for suspicious hardcoded arrays near the top of the file: names that read like real people (`'Rajesh Kumar'`, `'Priya Sharma'`), IDs with a plausible-looking prefix (`WO-8041`, `SP-402`), or ₹ amounts with no computation (`45000`, `85000`) sitting in a `const X = [ {...}, {...} ]` that nothing else in the file mutates or fetches.
3. Search for a fallback pattern like `value={metrics?.someField || 14}` — if `someField` does not actually exist anywhere in the metrics-building utility it claims to come from, the `|| 14` is a permanent fake number, not a real fallback. Confirm by grepping the exporting util file for that field name.
4. A static role badge that never changes regardless of who is logged in, e.g. `<span>Inventory & Purchase Manager View</span>` with no `{variable}` interpolation. (This exact issue was already fixed on 8 pages — see §0.4 — but double-check any file you touch doesn't have a fresh copy of it.)

**What to do when you find it:** delete the fake widget entirely if it adds no real signal, OR wire it to real data using an existing utility (see §0.3) if the *concept* is worth keeping. Never invent a "less fake" fallback number — use `0` or `'—'` and let the UI show an honest empty state.

### 0.3 Real data utilities already built — use these, do not reinvent them
| Need | Function | File |
|---|---|---|
| SLA state, breach, age of a ticket | `computeSla(ticket, now)`, `isTicketClosed`, `isTicketInProgress`, `normalizeUrgency`, `ticketAgeHours` | `src/utils/ticketSla.js` |
| Fleet-wide ticket rollup (open/breached/atRisk/resolvedToday) | `summarizeTickets(tickets)` | `src/utils/ticketSla.js` |
| MTTR / MTBF / downtime cost | `computeMTTR`, `computeMTBF`, `computeDowntimeCost`, `computeMttrSummary` | `src/utils/mttrMetrics.js` |
| Role → dashboard metrics (cost, value-at-risk, fleet health) | `buildRoleMetrics(role, {machines, tickets, team, pmLogs, user})` | `src/utils/dashboardMetrics.js` |
| Stock status per part (critical/at-risk/healthy/overstocked/obsolete) + rollup | `stockHealthSummary(items)`, `buildInventoryMetrics(role, {items, pos, suppliers})` | `src/utils/inventoryMetrics.js` |
| Kaizen savings/impact rollup | `buildKaizenMetrics(...)` | `src/utils/kaizenMetrics.js` |
| Human-readable role label from a role string | `getRoleLabel(roleVal, customRoles?)` | `src/lib/roles.js` |
| Normalize a role string (aliases → canonical) | `normalizeRole(role)` | `src/lib/roles.js` |
| Capability check (can this role see cost / assign tickets / etc.) | `can(role, CAPABILITIES.X)` | `src/lib/roles.js` |
| Which nav workspaces a role can see | `canViewWorkspace(role, workspaceKey)` | `src/lib/roles.js` |

### 0.4 What is already done (do not redo it)
- Dashboard.jsx: fake "Command Center" mock CMMS tab removed, role-switcher removed (was a financial-data leak), duplicate fleet-metrics tab removed. Real `CmmsKpiStrip` (Availability/MTTR/MTBF/Open-WO/Cost) and real `ActionBoard` (ticket kanban by real SLA/lifecycle state) added.
- `Inventory.jsx`, `Kaizen.jsx`, `RCA.jsx`, `ReportBreakdown.jsx`, `Records.jsx`, `Settings.jsx`, `Technician.jsx`, `ShutdownPlanner.jsx`: fake charts/buttons removed or fixed to real data.
- All 8 of the above pages plus role-badge text now use `getRoleLabel(user?.role)` instead of a hardcoded department name.
- `Tickets.jsx` now defaults its landing queue filter by role (`technician` → "mine", `maintenance_head`/`supervisor` → "breached", else "open").
- `DemoLogin.jsx` now has a Maintenance Head persona (`role: 'maintenance_head'`), 6 personas total.
- **`Machines.jsx`, `Tickets.jsx` (beyond the default-filter fix), `QRGateway.jsx`, `AdminPortal.jsx`, `Team.jsx` have NOT been audited for the fake-data pattern.** This is the main work left — see Tasks 1–3 below.

### 0.5 Standing verification workflow — run after every task, not just at the end
```bash
npm run build          # must complete with 0 errors
npx vitest run          # all existing tests must still pass; do not skip or delete a failing test to "fix" it — find out why it failed
```
Then start the dev server and manually click through the page(s) you changed:
- This project uses a Vite dev server. If your tooling has a browser/preview tool, start it against the `vite-dev` launch config (`npx vite --host`, port 5173) and open `http://localhost:5173/demo-login.html` to sign in as a demo persona, then navigate to the page you changed.
- Check the browser console for errors after every page load.
- If you don't have browser tooling, at minimum confirm `npm run build` produces no warnings referencing the file you changed, and re-read your diff once for typos in JSX attribute names (a common silent-failure source).

**Definition of Done for every task in this plan:**
1. `npm run build` — 0 errors.
2. `npx vitest run` — same pass count as before your change, or higher (never lower).
3. No new browser console errors on the page(s) you touched, checked for at least 2 different roles if the page is role-aware.
4. Every number/name/ID shown on screen either comes from Supabase/demo-data, or is computed by one of the utilities in §0.3 — nothing hardcoded that looks like plant data.
5. Nothing genuinely functional was deleted — only decorative, fake, or duplicate content. If you're unsure whether something is "real" (e.g., it might be wired to a Supabase table you can't query from this sandbox), leave it and note it in your summary rather than deleting it.
6. Do not run `git commit` unless Task 0 explicitly tells you to, or the human operator asks.

---

## Task 0 — Commit the current working tree

**Why:** All work from the previous session (see §0.4) is uncommitted on `main`. It has been build-tested and unit-tested already. Leaving it uncommitted risks loss for no benefit.

**Steps:**
1. `git status` — review every changed/new/deleted file. Confirm nothing unexpected is staged (no `.env`, no credentials, no accidental `node_modules`).
2. `git diff --stat` — sanity-check the shape of the change matches "several `src/pages/*.jsx` edits + 2–3 new files under `src/components/dashboard/` + 2 deleted files under `src/components/cmms/`".
3. Stage the relevant files explicitly (avoid a blanket `git add -A` if `git status` shows unrelated files you don't recognize — ask the human operator about those first rather than guessing).
4. Commit with a message describing the *why*, e.g.:
   ```
   Polish post-login dashboard and role-aware content

   Replace fake demo-data widgets (mock CMMS command center, fake charts,
   static role banners) with real Supabase-backed data across Dashboard,
   Inventory, Kaizen, RCA, ReportBreakdown, Records, Settings, Technician,
   ShutdownPlanner, and Tickets. Add a real Availability/MTTR/MTBF/Open-WO/
   Cost KPI strip and a real ticket action board to Dashboard. Add a
   Maintenance Head demo persona.
   ```
5. Do **not** push unless explicitly asked.

**Test case:**
- `git status` afterward shows a clean tree (or only the files you deliberately left out, with a note why).
- `git log -1 --stat` shows the commit with the expected file list.

---

## Task 1 — Audit and polish `src/pages/Machines.jsx` (~3,700 lines)

**Why:** This is the single largest, most-used post-login page and has never been checked for the fake-data anti-pattern (§0.2) or the static-role-badge pattern (§0.4). It also has an existing MVP/advanced drill-down pattern (`AdvancedFeaturesDrilldown` component) — don't break that.

**Steps:**
1. Apply the full checklist in §0.2 to this file:
   ```bash
   grep -n "StitchDonutChart\|StitchBarChart\|StitchPieChart" src/pages/Machines.jsx
   grep -n "View</span>" src/pages/Machines.jsx
   ```
   For each hit, read context and classify as real/fake per §0.2. (As of this writing, an earlier check found **no** `Stitch*Chart` usage in this file — if that's still true, this sub-step may return nothing, which is fine; move on.)
2. Separately, scan for hardcoded demo-looking arrays that aren't in a `demo*.js` util file (those are legitimate, intentional fallbacks) — i.e. arrays defined *inline in Machines.jsx itself* with plausible fake machine/part/WO data not imported from `src/utils/demoMachines.js` or similar.
3. Check whether `Machines.jsx` has any of its own KPI/summary tiles at the top of the page that duplicate what `CmmsKpiStrip` on the Dashboard already shows (fleet count, availability %, etc.) using *different, possibly stale* numbers. If a duplicate exists, prefer keeping the one that's more contextually useful on this page (e.g. a machines-page fleet-status tile is legitimate — it doesn't need removing just because Dashboard also has one — but the two should not compute the number two different, disagreeing ways. If they disagree, make Machines.jsx call the same underlying data/utility Dashboard uses.)
4. Confirm the existing MVP/advanced drilldown (`import AdvancedFeaturesDrilldown from '../components/AdvancedFeaturesDrilldown'`) still wraps the correct "advanced" sections and hasn't been circumvented by any fix you make.
5. Check role-awareness: does every user regardless of role see the exact same Machines page, or does content/actions vary appropriately (e.g., should an Operator be able to edit a machine's replacement cost? Check against `src/lib/roles.js` `CAPABILITIES` and `ROLE_CAPABILITIES` — if an action has no capability gate and probably should (financial edits, deletion), flag it, don't silently add a gate without understanding the current access model first).

**Test cases:**
- `grep -n "StitchDonutChart\|StitchBarChart\|StitchPieChart" src/pages/Machines.jsx` → any real hits are wired to state/props, none are literal hardcoded arrays.
- `grep -n "View</span>" src/pages/Machines.jsx` → zero hits, or any hit found uses `{getRoleLabel(...)}` interpolation, not a literal string.
- `npm run build` → 0 errors.
- `npx vitest run` → same or higher pass count.
- Manual: sign in as Owner (demo login → "Plant VP") and as Technician (demo login → "Lead Technician"), open `machines.html`, confirm page loads with no console errors and all visible numbers look plausible for the demo fleet (5 demo machines).

---

## Task 2 — Deepen the `src/pages/Tickets.jsx` audit (~1,200 lines)

**Why:** Task done so far only changed the *default landing filter* by role. The rest of the page (1,197 lines) has not been checked against the fake-data checklist.

**Steps:**
1. Run the same checklist as Task 1, step 1–2, against `Tickets.jsx`.
2. Check `src/components/tickets/TicketKpiBar.jsx`, `TicketToolbar.jsx`, `TicketRow.jsx`, `TicketDetailPanel.jsx` (imported by Tickets.jsx) for the same anti-pattern — these are separate files and were not covered by any prior audit in this project.
3. Confirm the KPI numbers shown in `TicketKpiBar` (open / breached / in-progress / resolved-today / avg-resolution, per the file's own doc-comment) come from `summarizeTickets()` (§0.3) and not a separate, possibly-inconsistent computation.
4. Verify bulk actions, assignment, and priority-change controls are gated by the `permissions` object already built in this file (`can(signedInUser?.role, CAPABILITIES.X)`) — spot check that a Technician demo login cannot see "Assign" or "Bulk close" controls that only a Supervisor/Maintenance Head should have.

**Test cases:**
- Same grep checks as Task 1, applied to `Tickets.jsx` and the four `src/components/tickets/*.jsx` files.
- `npm run build` and `npx vitest run` pass per §0.5.
- Manual: sign in as Technician, confirm no bulk-select checkboxes or "Assign" buttons are visible/enabled. Sign in as Maintenance Head, confirm they are.
- Manual: confirm the "SLA breached" count shown in the KPI bar matches the count of tickets in the "SLA breached" quick-filter chip (they must never disagree — if they do, find which one uses stale/duplicate logic and make both call `summarizeTickets`/`computeSla`).

---

## Task 3 — Sweep `src/pages/QRGateway.jsx` (~2,300 lines) and `src/pages/AdminPortal.jsx` (~1,500 lines)

**Why:** Neither file has been opened during any prior audit pass in this project. Given how consistently the fake-data pattern turned up elsewhere, these are the highest-remaining-risk files by size.

**Steps:**
1. Apply the §0.2 checklist to both files (`Stitch*Chart` usage, inline hardcoded arrays, fake fallback numbers, static role badges).
2. `AdminPortal.jsx` is a super-admin surface (per its routes: `/admin`, `/superadmin`, `/control-room`) — confirm any data shown there (company lists, usage stats, billing figures) comes from a real Supabase query, not a placeholder. This page is higher-stakes than the others because it likely shows cross-company data an admin would act on.
3. `QRGateway.jsx` handles QR-code-triggered breakdown reporting — check that any "recent scans" or "queue" list shown is built from real submitted reports, not a seeded demo list presented as live.
4. If either file is too large to review in one pass, split it: read in ~500-line chunks, run the grep checklist first to jump straight to suspicious sections rather than reading linearly.

**Test cases:**
- Same grep checklist as Task 1, applied to both files.
- `npm run build` and `npx vitest run` pass per §0.5.
- Manual: as Owner, open `admin.html` (or the relevant admin route) and `qr-gateway.html`; confirm no console errors and that empty/zero states render honestly when there's no real data (rather than showing a plausible-looking fake number).

---

## Task 4 — Visual QA pass (mobile + light theme)

**Why:** Every change so far has only been verified in a desktop-width dev preview. This repo already has a `artifacts/visual-audit/` screenshot suite and a `scripts/capture-light-theme-visuals.js` capture script, meaning visual regressions matter to this project and there's existing tooling for it — use it rather than inventing a new process.

**Steps:**
1. Read `scripts/capture-light-theme-visuals.js` to understand how it's invoked (what pages/roles/viewports it captures).
2. Run it (or the equivalent `npm` script if one wraps it — check `package.json` `scripts` block) against the current branch.
3. Compare the new screenshots in `artifacts/visual-audit/light-theme/` against what's there now (many of these files already show as modified in `git status` from before this plan — check if that's stale output from an old run or genuinely current).
4. Specifically check, at minimum:
   - Dashboard's new `CmmsKpiStrip` (5 tiles) and `ActionBoard` (4-lane kanban) at mobile width (`resize_window` to 375×812 if your tooling supports it, or check the CSS media queries added: `.dashboard-view-tabs`, `.rd-action-board` in `src/pages/Dashboard.css` already include mobile breakpoints at 1024px and 640px — confirm they actually look right, don't just trust the CSS was written correctly).
   - Every page touched in Tasks 1–3, in both light and dark theme, at mobile and desktop width.
5. If you find a genuine layout break, fix the CSS (prefer adjusting existing `--md-*` custom-property-based rules over introducing new hardcoded colors/spacing — check `src/pages/Dashboard.css` for the existing token names).

**Test cases:**
- No horizontal scroll/overflow on any touched page at 375px width.
- Text in KPI tiles and action-board cards doesn't visibly clip or overlap at mobile width.
- Colors/contrast are correct in both `[data-theme="light"]` and the dark default — spot check by toggling the theme switcher in the app header, not just by reading CSS.
- Screenshots captured by the existing script are saved/updated in `artifacts/visual-audit/` (or wherever the script writes them) so the next person has current references.

---

## Suggested execution order

Task 0 (commit) → Task 1 (Machines.jsx) → Task 2 (Tickets.jsx deep audit) → Task 3 (QRGateway/AdminPortal) → Task 4 (visual QA).

Commit again after each task (or batch 1–3 together if they're done in one sitting) rather than holding a giant uncommitted diff — re-apply Task 0's process each time.

If at any point a task reveals something ambiguous (e.g., you can't tell whether a number is real because the Supabase table isn't queryable from your environment, or a role's access to a feature seems intentionally broad and you're not sure it's a bug), **stop and describe the ambiguity instead of guessing** — this mirrors how every fake-data issue in this project was confirmed before being touched: by tracing the exact prop/state chain, not by assumption.
