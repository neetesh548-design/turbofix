# Post-Login Audit — Flaws & Duplication Report

**Date:** 2026-07-12
**Scope:** All authenticated pages (Dashboard, Machines, Tickets, Team, Settings, Vault) plus the static assets and legacy code that support them.
**Method:** Static code audit + live browser verification on the dev server.

---

## 1. Executive Summary

The post-login area currently contains **three parallel implementations of the same product**:

1. **React pages** (`src/pages/Machines.jsx`, `Tickets.jsx`, `Team.jsx`, `Settings.jsx`) — the "new" way.
2. **Legacy DOM scripts injected into React** (`Vault.jsx` and `Dashboard.jsx` render raw HTML via `dangerouslySetInnerHTML` and load `public/assets/vault.js` / `vault-dashboard.js`) — the "old" way running *inside* the new way.
3. **A full legacy site copy** in `legacy/` (~150 KB of standalone HTML/JS/CSS that duplicates everything again).

Because #1 and #2 ship together, users see **duplicate UI chrome after login** (two logout buttons, two user/company headers), and the same features (machine management, documents, spare parts, consumables, supervisor management) exist as two live, divergent code paths. Most cross-cutting logic (API base URL, token expiry, roles, escalation) is copy-pasted 2–6 times.

**Counts:** 16 duplication findings (D1–D16), 12 functional flaws (F1–F12), prioritized fixes in §4.

---

## 2. Duplication Catalog

### D1 — API base URL resolution: 6 copies
The same expression is repeated verbatim in every data page and both legacy scripts:

```js
const apiBase = localStorage.getItem('tf_api_base') || (['localhost','127.0.0.1'].includes(window.location.hostname) ? 'http://127.0.0.1:8000' : 'https://turbofix-backend-ehxb.onrender.com');
```

| Location | Line |
|---|---|
| `src/pages/Team.jsx` | 21 |
| `src/pages/Tickets.jsx` | 12 |
| `src/pages/Machines.jsx` | 54 |
| `src/pages/Settings.jsx` | 26 |
| `public/assets/vault.js` | 10–18 (slightly different logic!) |
| `public/assets/vault-dashboard.js` | 1 (adds a `?backend=` query param source the others don't have) |

The three variants **do not agree** — vault-dashboard.js honors a `?backend=` URL param, vault.js has special local-host fallback logic, and the React pages have neither. Changing the backend URL requires touching 6 files.

**Fix:** one `src/lib/api.js` exporting `apiBase` + an authorized `fetch` wrapper.

### D2 — `isTokenExpired()`: 3 identical copies
- `src/components/AppShell.jsx:12`
- `public/assets/vault.js:130`
- `public/assets/vault-dashboard.js:8`

Same base64/JWT-decode function, byte-for-byte. A bug fix in one will be forgotten in the others.

### D3 — Default roles list: 2 copies
`defaultRoles` (5 roles, value+label) duplicated at `src/pages/Team.jsx:23` and `src/pages/Settings.jsx:28`. Adding a role means editing both (and the backend).

### D4 — `getRoleLabel()`: 2 copies
Identical helper at `Team.jsx:104` and `Settings.jsx:72`.

### D5 — Success banner: 6 hand-rolled copies
The literal inline style `background:#065f46; color:#d1fae5; padding:12px 16px; border-radius:8px…` appears at:
- `Team.jsx:138`, `Tickets.jsx:156`, `Machines.jsx:594`
- `Vault.jsx:84`, `Vault.jsx:145`, `Vault.jsx:216` (inside HTML strings)

Settings.jsx was already migrated to the shadcn `<Alert>`; the other five should use the same component.

### D6 — Error banner: 5 copies
`<div className="vault-error show" style={{marginBottom:'16px'}}>` repeated in Team/Tickets/Machines plus multiple `vault-error` divs inside Vault.jsx's HTML string. Same fix as D5.

### D7 — Duplicate app chrome after login (user-visible!)
`AppShell` renders a left rail (with logout) and a topbar (with company name, user, role badge). But:
- **Dashboard.jsx:52–55** renders a *second* header inside the content: company name, user role, a "Document Vault" button, and a **second Log out button** (`#logoutBtn`, wired by vault-dashboard.js).
- **Vault.jsx:124–134** renders a *third* userbar: `whoName`/`whoCompany`/`whoRole` plus a "Dashboard" button and **another Log out button**.

So on Dashboard and Vault the user sees the same identity/navigation information twice and two different-looking logout buttons that go through different code paths (D9/F9). This is the most visible "duplicacy" after login.

### D8 — `vault.css` loaded twice
- `AppShell.jsx:52–56` injects `<link href="assets/vault.css">` on every authenticated page.
- `Vault.jsx:24–27` and `Dashboard.jsx:19–22` inject the **same stylesheet again**.

On Vault/Dashboard the browser holds two copies of the same 431-line stylesheet.

### D9 — Three logout implementations
1. `AppShell.logout()` — clears storage, dispatches `authChanged`, redirects to `vault.html`.
2. `vault.js logout()` (line 149) — its own clear + reload.
3. Dashboard's `#logoutBtn` handler in vault-dashboard.js.

They behave slightly differently (event dispatch vs reload), so shell state can desync depending on which button was clicked.

### D10 — Machine/document/parts/consumables management: 2 full implementations
The **entire machine workspace** exists twice:
- Legacy: `vault.js` (1,008 lines) + Vault.jsx HTML — machine picker, add/edit machine, QR tag, document upload/list/delete, spare parts table, consumables table.
- React: `Machines.jsx` (1,065 lines) — machine list, onboarding form, docs/parts/consumables tabs, QR tab, calendar.

Both are reachable in the UI today (rail → Machines, rail/dashboard → Document Vault). They call the same endpoints with different validation and different field sets (e.g. vault.js consumables form has burn-rate/buffer fields the React form names differently). Data entered in one renders differently in the other.

### D11 — Supervisor/team management: 2 implementations
- Legacy: vault.js "Manage Supervisors" card (create/delete supervisor, dropdown, lines 197–246 + 636–760).
- React: `Team.jsx` onboarding form (`/auth/supervisors` POST).

Two divergent forms for the same backend records; the legacy one supports delete, the React one doesn't.

### D12 — Escalation logic: 3 partial copies
- `Settings.jsx` — fetches `/vault/escalation`, computes `totalHours`.
- `Tickets.jsx:89–109` — fetches it again, implements `getCurrentEscalationLevel()` threshold walk.
- `Machines.jsx:81, 415+` — fetches it again, re-derives per-role display.

The threshold-accumulation algorithm lives only in Tickets; if Settings changes semantics (e.g. null terminal threshold), Tickets/Machines can drift.

### D13 — `legacy/` folder: a whole second site
`legacy/index.html` (56 KB), `dashboard.html` (27 KB), `vault.html` (19 KB), plus its own `assets/` — a complete pre-React copy of the product. It's dead weight in the repo and shows up in searches, confusing every future change.

### D14 — QR code generation: 3 different mechanisms
1. `vault.js renderQrInto()` (line 300) — local rendering.
2. `Machines.jsx:1039` — external `api.qrserver.com` image URL (see F4).
3. `QRGenerator.jsx` page — its own generator flow.

### D15 — Page-header pattern: inline styles ×3 vs shadcn ×1
Team/Tickets/Machines each hand-roll the `h1 Rajdhani uppercase + subtitle` header with inline styles; Settings now uses Tailwind/shadcn. Same for empty states and loading states ("Loading team directory..." / "Loading tickets..." / spinner in Settings). Needs one shared `PageHeader` + `LoadingState` + `EmptyState`.

### D16 — Build script: 10 hardcoded HTML copies
`package.json` build: `cp dist/index.html dist/404.html && cp … why-turbofix.html && … (×10)`. Every new route requires editing this chain; a miss = 404 on GitHub Pages deep links. Should be a small node script or Vite plugin iterating the route list.

---

## 3. Functional Flaws

### F1 — No auth guard: logged-out users see broken pages instead of login (verified in browser)
`AppShell` renders children "bare" when unauthenticated, but Machines/Tickets/Team/Settings **still fire their API calls** with `Authorization: Bearer null`. Result (reproduced): a shell-less page showing "Failed to load machines/tickets/team list". Legacy vault-dashboard.js does this correctly (`requireAuth()` → redirect to vault.html). React pages need the same redirect.

### F2 — No 401/expiry handling in React pages
Token is read once at render; no page inspects response status. When a session expires mid-use, every action just shows "Failed to load…" forever. vault.js even has `safeFetch` with retry + expiry redirect (line 39–63, 995) — the React pages got none of it.

### F3 — Hardcoded calendar date in Machines
`Machines.jsx:50–51`: `useState(2026)` / `useState(6) // July`. The Replenishment Calendar opens on July 2026 forever — wrong starting next month. Should be `new Date().getFullYear()` / `.getMonth()`.

### F4 — Machine QR codes generated via third-party service
`Machines.jsx:1039` builds `https://api.qrserver.com/v1/create-qr-code/?data=<machine payload>`. Internal machine IDs/names are sent to an external service, tags break offline/if the service dies, and it's inconsistent with vault.js which renders QR locally. Use one local QR library everywhere.

### F5 — Token embedded in document download URLs
`Machines.jsx:820`: `href={.../download?token=${token}}`. The bearer token leaks into browser history, server access logs, and anything the user copies/shares. Downloads should use an Authorization header (fetch + blob) or short-lived signed URLs.

### F6 — Dashboard polling timer never stops
`vault-dashboard.js:215` re-arms `pollTimer = setTimeout(...)` to refresh KPIs. `Dashboard.jsx`'s cleanup (lines 29–33) removes the `<script>` tag only — **the timer keeps polling the backend after the user navigates to Machines/Tickets/etc.**, and returning to Dashboard injects the script again, stacking a second loop (double requests, doubled error toasts).

### F7 — Global script + `dangerouslySetInnerHTML` architecture (Vault & Dashboard)
Beyond F6: vault.js/vault-dashboard.js attach listeners by element ID on `DOMContentLoaded`-style init, define globals (`state`, `BACKEND_URL`), and assume full page ownership. Mounted inside a React SPA this risks double-initialization on remount, orphaned globals, and it bypasses React Router (all links are `href` full-page loads).

### F8 — Light-theme badge palette on dark theme
`Team.jsx:199–206` role badges use pastel light-mode colors (`#D1FAE5`, `#FEF3C7`, `#DBEAFE`, `#F3E8FF`, `#E2E8F0`) that clash with the dark UI (same class of bug as the pink `vault-error` fixed earlier). `Tickets.jsx:192` repeats the pattern for urgency badges. Should be the shadcn `<Badge>` with theme tokens.

### F9 — Inconsistent navigation & logout behavior
All rail links and legacy buttons are full-page `href` navigations (`dashboard.html`, `machines.html`…), so every click reloads the whole SPA. Combined with D9's three logout paths, back/forward and auth-state behavior differs by page.

### F10 — Silently swallowed API failures
Secondary fetches ignore failures without any user signal — e.g. escalation fetch in `Tickets.jsx:25–28` and `Machines.jsx:81`, custom-roles fetch in `Team.jsx:52`. If they fail, features quietly disappear (escalation column shows "—") with no error.

### F11 — Dead code: `src/supabaseClient.js` + double Supabase loading
`supabaseClient.js` creates a client that **no file imports**. Meanwhile `index.html` loads Supabase from CDN *and* `@supabase/supabase-js` is an npm dependency, and `Vault.jsx`/`Dashboard.jsx` each re-inject `window.supabaseConfig`. Pick one delivery mechanism; delete the dead module.

### F12 — Project identity leftovers
`package.json` name is `temp-frontend`; `index.html` `<title>temp-frontend</title>` shows in the browser tab even after login. Cosmetic but user-visible.

**Note (local hygiene, not in git):** `google key/` in the project root holds a Google service-account JSON. It is correctly gitignored — keep it out of the repo, but consider moving it out of the project tree entirely.

---

## 4. Recommended Fix Order

### P0 — Correctness & security (small, high value)
1. **Auth guard**: in `AppShell`, when `!authed` on a protected page, redirect to `vault.html` instead of rendering bare children (fixes F1).
2. **Central API client** (`src/lib/api.js`): apiBase resolution + fetch wrapper that attaches the token and redirects on 401 (fixes D1, F2, F10 — one place to handle errors).
3. **Stop the dashboard timer leak** (F6): expose a `window.__tfDashStop()` from vault-dashboard.js and call it in Dashboard.jsx cleanup (stopgap until P1.2).
4. **Remove token from download URLs** (F5).
5. **Fix calendar date** (F3) — two lines.

### P1 — Kill the duplication
1. **Decide the winner: React.** Rebuild Vault (login/register + document vault) and Dashboard as real React pages using the API client and shadcn components; delete `vault.js`, `vault-dashboard.js`, the `dangerouslySetInnerHTML` blobs, and the duplicate chrome (D7, D8, D9, D10, D11, F7).
2. **Shared domain module** (`src/lib/roles.js`, `src/lib/escalation.js`): one roles list, one `getRoleLabel`, one escalation-level algorithm (D3, D4, D12).
3. **Delete `legacy/`** (D13) — it's in git history if ever needed.
4. **One QR utility** using a local library (D14, F4).

### P2 — Consistency polish
1. Migrate Team/Tickets/Machines to shadcn components like Settings (D5, D6, D15, F8).
2. Use React Router `<Link>` in the rail; single logout in AppShell only (F9).
3. Replace the build-script copy chain with a script over the route list (D16).
4. Rename `temp-frontend` → `turbofix`, set a real `<title>` (F12).

---

## 5. Duplication Heat Map (quick reference)

| Concern | Copies | Files |
|---|---|---|
| API base URL | 6 | Team, Tickets, Machines, Settings, vault.js, vault-dashboard.js |
| Token expiry check | 3 | AppShell, vault.js, vault-dashboard.js |
| Logout | 3 | AppShell, vault.js, vault-dashboard.js |
| Machine/docs/parts/consumables CRUD UI | 2 | Machines.jsx, vault.js+Vault.jsx |
| Supervisor management | 2 | Team.jsx, vault.js+Vault.jsx |
| Roles list + label helper | 2 | Team.jsx, Settings.jsx |
| Escalation fetch/logic | 3 | Settings, Tickets, Machines |
| Success/error banners | 6+ | Team, Tickets, Machines, Vault (×3) |
| QR generation | 3 | vault.js, Machines.jsx, QRGenerator.jsx |
| App chrome (user/logout header) | 3 | AppShell, Dashboard HTML, Vault HTML |
| vault.css injection | 2× per page | AppShell + Vault/Dashboard |
| Entire site | 2 | `src/` vs `legacy/` |
