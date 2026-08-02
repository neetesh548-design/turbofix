# Implementation Plan — 2nd August Audit & Polish

Based on [`PLAN_OF_2ND_AUGUST.md`](file:///Users/nkumarsoni/TurboFix/docs/PLAN_OF_2ND_AUGUST.md), this plan outlines the systematic audit, cleanup, and verification of post-login pages (`Machines.jsx`, `Tickets.jsx`, `QRGateway.jsx`, `AdminPortal.jsx`) to eliminate hardcoded fake data, fix static role badges, enforce role-based access control, and complete visual QA.

## User Review Required

> [!IMPORTANT]
> - **Git Commit Permission**: Task 0 recommends staging and committing current working tree changes. We will proceed with staging clean project files when ready.
> - **Data Integrity Rule**: All fake/decorative charts and static role text will either be wired to real data utilities (`ticketSla.js`, `dashboardMetrics.js`, `roles.js`, `inventoryMetrics.js`) or rendered with clean empty/zero states (`0`, `'—'`).

## Proposed Changes

---

### Task 0: Working Tree Verification & Cleanup

Check current git tree status and ensure baseline builds and test suites (`npm run build` & `npx vitest run`) remain 100% green before proceeding.

---

### Task 1: Audit & Polish `src/pages/Machines.jsx`

#### [MODIFY] [Machines.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Machines.jsx)

- Scan for hardcoded demo arrays or fake chart data (`StitchDonutChart`, `StitchBarChart`, `StitchPieChart`).
- Audit static role badge elements (`View</span>`) and replace with standard `getRoleLabel(user?.role)` calls.
- Align machine KPI summary tiles with `CmmsKpiStrip` calculations to avoid metric discrepancies.
- Verify `AdvancedFeaturesDrilldown` wrapper and capability gates (`CAPABILITIES`).

---

### Task 2: Deepen `src/pages/Tickets.jsx` & Component Audit

#### [MODIFY] [Tickets.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Tickets.jsx)
#### [MODIFY] [TicketKpiBar.jsx](file:///Users/nkumarsoni/TurboFix/src/components/tickets/TicketKpiBar.jsx)
#### [MODIFY] [TicketToolbar.jsx](file:///Users/nkumarsoni/TurboFix/src/components/tickets/TicketToolbar.jsx)
#### [MODIFY] [TicketRow.jsx](file:///Users/nkumarsoni/TurboFix/src/components/tickets/TicketRow.jsx)
#### [MODIFY] [TicketDetailPanel.jsx](file:///Users/nkumarsoni/TurboFix/src/components/tickets/TicketDetailPanel.jsx)

- Perform fake-data audit on `Tickets.jsx` and child ticket components under `src/components/tickets/`.
- Ensure `TicketKpiBar` metrics strictly derive from `summarizeTickets()` in `src/utils/ticketSla.js`.
- Verify role-gated bulk actions and assignment controls using `can(role, CAPABILITIES.*)`.

---

### Task 3: Audit `src/pages/QRGateway.jsx` & `src/pages/AdminPortal.jsx`

#### [MODIFY] [QRGateway.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/QRGateway.jsx)
#### [MODIFY] [AdminPortal.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/AdminPortal.jsx)

- Audit `QRGateway.jsx` for fake scan queues or un-wired demo charts.
- Audit `AdminPortal.jsx` to ensure cross-company metrics, tenant counts, and usage stats reflect actual database/system query results.
- Replace static role headers with dynamic `getRoleLabel` calls.

---

### Task 4: Visual QA & Theme Validation

- Run `scripts/capture-light-theme-visuals.js` / visual inspection.
- Check 375px mobile viewport rendering for `CmmsKpiStrip`, `ActionBoard`, and modified pages.
- Ensure light (`[data-theme="light"]`) and dark theme contrast compliance.

---

## Verification Plan

### Automated Tests
- `npm run build`: Verify Vite production bundle compiles with 0 errors.
- `npx vitest run`: Verify all 1,192 tests across 39 test files continue to pass without regressions.

### Manual Verification
- Sign in across multiple demo personas (`maintenance_head`, `technician`, `owner`).
- Verify no console errors on `machines.html`, `tickets.html`, `qr-gateway.html`, and `admin.html`.
- Confirm role labels dynamically reflect logged-in user role.
