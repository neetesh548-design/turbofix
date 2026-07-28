# Phase 0 Release Baseline

Phase 0 freezes the shape of the release before layout, auth, and workflow fixes begin. It is intentionally small: align on the product spine, the role journeys, and the checks every later phase must pass.

## Release Spine

TurboFix is a maintenance workflow app for factories. The release should make four loops reliable before adding more surface area:

1. Report an issue from a machine.
2. Turn the report into an assigned work order.
3. Repair, verify, and close the work order with evidence.
4. Feed approved machine records back into future decisions.

Anything that does not support those loops is secondary for this release.

## Architecture Baseline

- React and Vite stay as the frontend.
- Supabase remains the production source of truth for auth, company data, tickets, records, storage, and edge functions.
- FastAPI/local repositories stay available for demos and development, but production behavior must not depend on local-only state.
- The browser should have one auth reader, one token-expiry rule, and one protected-route behavior.
- `.html` compatibility routes may remain for static hosting, but each route should map to one React screen and one navigation label.
- AI features stay contextual: reports, summaries, extraction, and suggestions. Core workflows must still have clear fallback states when AI is unavailable.

## Core Journeys

These are the first journeys to preserve during all later changes:

| Role | Entry | Success state |
| --- | --- | --- |
| Operator | Scan QR or open quick report | Work order created with machine, issue, evidence, and next owner |
| Technician | Open assigned work | Checklist updated, evidence added, repair submitted for verification |
| Supervisor | Review exceptions | Blocked, escalated, delegated, or closure-pending work is acted on |
| Maintenance Head | Approve closure or records | Repair closure or machine knowledge is approved/rejected with reason |
| Owner | Open dashboard | Plant health, cost, high-risk work, and approvals are visible without hunting |
| Support reviewer | Open support/records queue | Data quality issues and approval drafts are resolved |

## Layout Baseline

- Protected app pages use one shell and one navigation model.
- Marketing content does not compete with signed-in workflows.
- Dashboard first screen shows only plant health, urgent work, approvals, and cost/risk signals.
- Machine detail starts with current state: open work, ownership, risk, PM, parts, and history.
- Forms use one primary action, plain labels, short errors, and clear empty/loading/saved states.
- Repeated UI patterns should come from shared components before page-specific styling is added.

## Viewport And Accessibility Bar

Every core journey must pass these viewports:

| Viewport | Target |
| --- | --- |
| Mobile | 390 x 844 |
| Tablet | 768 x 1024 |
| Desktop | 1440 x 900 |

Acceptance rules:

- No horizontal overflow.
- No incoherent text overlap.
- Primary controls are at least 44 x 44 px on touch layouts.
- Keyboard focus is visible.
- Dialogs trap focus and can close without losing work.
- Buttons and icon-only controls have accessible names.

## Functional Acceptance Bar

- Demo login must either enter a working protected role or clearly say the role is unavailable.
- Invalid/expired sessions must always return to login with a safe same-origin redirect.
- Unknown routes must show an explicit not-found state.
- QR reporting must end in a work order number and assigned owner, not a placeholder.
- Ticket status changes must be visible from both ticket and machine context.
- Closure requires evidence and approval for critical work.
- Records approval must keep raw uploads, review drafts, and approved knowledge separate.
- AI unavailable/error states must leave the manual workflow usable.

## Test Baseline

Keep the test suite focused on release confidence:

- One smoke test for each core role journey.
- One auth test for demo login, expired session, and unknown route.
- One mobile layout check for the QR/reporting flow.
- One records approval test proving approved knowledge is separate from raw uploads.
- Build and lint must run without hiding new failures behind known warnings.

## Out Of Scope For This Release

- New ERP features.
- New design system replacement.
- New AI chat surface.
- New dependency for navigation, forms, or layout unless an existing dependency cannot cover the need.
- More demo roles unless they can actually enter protected screens.

## Phase Exit Criteria

Phase 0 is complete when this baseline is accepted and the later implementation phases can be judged against it. The next phase should fix auth/navigation first because broken entry points make every layout and workflow test noisy.
