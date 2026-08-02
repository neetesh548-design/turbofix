# Implementation Plan — Mobile Responsiveness & Layout Optimization

This plan outlines the systematic mobile UI optimization across all web app pages in TurboFix (`src/pages/*.jsx` and `src/components/*.jsx`) without altering any text, feature, or content.

## User Review Required

> [!IMPORTANT]
> - **Zero Content Alteration**: All text, buttons, fields, metrics, icons, and workflow steps remain 100% identical. Only layout presentation, grid/flex wrapping, touch target sizing, overflow management, and CSS breakpoints (`@media (max-width: 768px)` and `@media (max-width: 480px)`) will be updated.
> - **Touch Ergonomics & Accessibility**: Interactive elements (buttons, inputs, select fields, tabs) will enforce a minimum 44px touch height on mobile devices to prevent accidental mis-taps.

---

## Proposed Changes

### Core & Global Styling

#### [MODIFY] [index.css](file:///Users/nkumarsoni/TurboFix/src/index.css)
- Add mobile viewport resets (`box-sizing: border-box`, `max-width: 100vw`, `overflow-x: hidden` on root page wrappers).
- Enforce minimum touch target heights (`min-height: 44px`) for inputs, buttons, and select dropdowns under `@media (max-width: 768px)`.
- Implement responsive table wrappers (`.tf-table-responsive`) with `-webkit-overflow-scrolling: touch` to prevent viewport horizontal scrolling.

#### [MODIFY] [AppShell.jsx](file:///Users/nkumarsoni/TurboFix/src/components/AppShell.jsx)
- Ensure top navigation header, role badge, and navigation drawer render cleanly on mobile viewports (375px–430px width).
- Optimize mobile sidebar overlay and bottom action navigation bar.

---

### Page-by-Page Mobile Layout Optimizations

#### [MODIFY] [Dashboard.css](file:///Users/nkumarsoni/TurboFix/src/pages/Dashboard.css) / [Dashboard.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Dashboard.jsx)
- `CmmsKpiStrip`: Stack KPI tiles into 2-column or single-column responsive grids on screens `< 640px`.
- `ActionBoard`: Adapt ticket kanban lanes into touch-swipeable or stacked accordions for single-column mobile viewports.
- `OperationsBoard`: Convert multi-column metrics and fleet activity feeds into responsive single-column stacks.

#### [MODIFY] [Machines.css](file:///Users/nkumarsoni/TurboFix/src/pages/Machines.css) / [Machines.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Machines.jsx)
- Convert machine grid cards (`.machine-card-grid`) to single-column responsive layout (`1fr`) under `< 768px`.
- Responsive filter toolbar (`MachineFilterBar`) with touch-friendly select dropdowns and search inputs.
- Full-width mobile detail drawer overlay with fixed bottom CTA buttons.

#### [MODIFY] [Tickets.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Tickets.jsx) & [TicketKpiBar.jsx](file:///Users/nkumarsoni/TurboFix/src/components/tickets/TicketKpiBar.jsx)
- `TicketKpiBar`: Convert horizontal KPI cards to touch scroll container or 2-column grid under `< 640px`.
- Ticket table / card view: Wrap bulk action toolbar and list rows in touch-responsive cards with clear tap areas.

#### [MODIFY] [Inventory.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Inventory.jsx) & [Kaizen.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Kaizen.jsx)
- Wrap inventory parts tables and stock health summary cards in responsive touch-scroll containers.
- Stack Kaizen category pills and idea submission forms for single-column mobile viewports.

#### [MODIFY] [RCA.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/RCA.jsx), [ReportBreakdown.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/ReportBreakdown.jsx) & [QRGateway.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/QRGateway.jsx)
- Adapt 5-Why analysis step cards and fishbone diagram displays for vertical mobile reading.
- Optimize voice report microphone button, photo upload preview, and camera viewports for handheld mobile use.

#### [MODIFY] [AdminPortal.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/AdminPortal.jsx), [Settings.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Settings.jsx) & [Records.jsx](file:///Users/nkumarsoni/TurboFix/src/pages/Records.jsx)
- Responsive layout for multi-tenant control room tables, company quota cards, and settings forms.

---

## Verification Plan

### Automated Build & Test Verification
- `npm run build`: Confirm zero Vite compilation errors.
- `npx vitest run`: Confirm 100% pass rate across all 1,192 unit tests.

### Responsive Visual Inspection
- Execute visual audit script on mobile viewport dimensions (375px × 812px iPhone X/12/13/14 and 412px × 915px Pixel 7).
- Verify zero horizontal page scrolling or clipped text across all routes.
- Confirm touch target dimensions (>= 44px) across interactive buttons and form inputs.
