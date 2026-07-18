# TurboFix Product Quality Checklist

Use this checklist before completing every TurboFix change. Review the affected element and its connected workflows, not only the edited line or screen.

## Product principles

- Keep the end-user experience simple; do not add unnecessary typing, tracking, or duplicate work.
- Empower people to resolve machine problems and root causes; do not rank, score, or monitor individuals.
- Show the next useful action clearly for each role.
- Keep machine, company, and historical context connected across the product.
- Require explicit human approval where safety, closure, external knowledge, or business authority is involved.

## Every visible element

- Confirm every number, tile, badge, status, image, label, button, link, tab, table row, empty state, and error message is accurate.
- Make summary numbers clickable and show the underlying filtered content.
- Do not expose internal UUIDs, database fields, raw errors, secrets, or implementation terminology to end users.
- Use clear English and familiar maintenance terminology; preserve Hindi/Marathi usability where supported.
- Show useful empty states instead of blank areas.
- Ensure owner-editable business data has an obvious edit action and safe validation.
- Ensure read-only information is visibly identified as read-only.

## Roles and permissions

- Verify the view and actions for Owner, Maintenance Head, Engineer, Supervisor, and Technician.
- Restrict edits to the correct company and authorized role on the server, not only in the UI.
- Protect owner accounts from accidental role removal or cross-company reassignment.
- Keep contact information masked until an authorized user explicitly reveals it.
- Keep approvals and interventions focused on resolving the machine issue, not tracking a person.

## Data and consistency

- Persist shared information in Supabase; use local storage only for preferences or offline fallback.
- Confirm data appears consistently across browsers, devices, refreshes, and related pages.
- Check database migrations, RLS/service-role boundaries, storage paths, and Edge Functions together.
- Never ignore a failed database write and then show a success message.
- Preserve existing user data and unrelated worktree changes.

## Machine workflow

- Verify machine identity, photo, location, condition, maintenance dates, response team, documents, records, parts, consumables, calendar, QR, tickets, and track record.
- Ensure machine photos and records are shared across browsers.
- Ensure ticket counts, recent failures, resolved work, last issue, and maintenance due dates match source data.
- Ensure voice, picture, and typed input remain available where users provide operational evidence.

## Team workflow

- Verify onboarding, editing, reporting hierarchy, role, contact masking/reveal, portal access, and alert availability.
- Confirm newly added or edited members appear immediately and across browsers.
- Do not display internal user IDs.

## Performance and resilience

- Keep route loading, fonts, CSS, images, and database requests efficient.
- Avoid duplicate network requests and unnecessary large assets.
- Provide actionable messages for network, authentication, permission, and validation failures.
- Verify direct-file misuse shows guidance instead of a blank page.

## Accessibility and responsive layout

- Verify keyboard access, focus states, labels, button semantics, and readable contrast.
- Test desktop, tablet, and mobile layouts.
- Respect reduced-motion preferences and avoid interaction that depends only on color.

## Verification before handoff

- Read this checklist and inspect all affected elements and connected pages.
- Run the production build and `git diff --check`.
- Test the primary success path, empty state, unauthorized role, invalid input, refresh, and cross-browser persistence as applicable.
- Deploy required database migrations and Edge Functions before calling the feature complete.
- Push only after verification when deployment is requested or implied by the task.
