# TurboFix Security & Access

## Goal

Keep each company’s data private and make sure only the right people can do the right actions.

## Roles

- Owner
- Maintenance head
- Maintenance engineer
- Supervisor
- Technician
- Operator / reporter

## Simple rules

- Show each role only what it needs.
- Keep risky actions behind confirmation or verification.
- Hide actions that do not apply.
- Let the backend decide access, not just the browser.

## Company isolation

- Every user belongs to one company.
- Users only see their own company’s data.
- Machine, ticket, record, and team data must stay filtered by company.

## Login and access

- Use Supabase Auth.
- Expired sessions should send people back to login.
- Only the backend should handle privileged actions.

## Data safety

- Do not expose tokens in URLs.
- Keep raw files, voice, images, and approvals separate.
- Log only what is needed for traceability.

## Permission Assertions & RBAC Helpers

To enforce strict security constraints without relying solely on client-side routing, the codebase uses explicit, testable backend assertion methods (Community 0):
- **`.assert_can_close_ticket(user, ticket)`**: Validates that only the assigned technician, the original reporting operator, or a supervisor can mark a ticket closed. Enforces company boundaries.
- **`.assert_can_manage_escalation(user, ticket)`**: Checks if the user is a Supervisor or Maintenance Head before letting them change delegation tiers or trigger outsourced work.
- **`.assert_can_upload_machine_records(user, machine)`**: Restricts raw documentation uploads and AI review approvals to Supervisors and the Maintenance Head. Operators are blocked.

## Multi-Tenant Isolation & RLS Policies

1. **JWT & `CurrentUser` Claims**: Supabase auth JWT payload contains the `company_id` and `role`. The backend maps this to a `CurrentUser` model for tenant context.
2. **Row-Level Security (RLS)**: Enforced on all tables in Supabase:
   - `public.tickets`, `public.machines`, `public.machine_records`, `public.custom_kpi_entries`, `public.technician_work`.
   - Each table has a policy: `USING (company_id = auth.jwt() ->> 'company_id')`.
   - Prevents cross-tenant leakages at the database level even if application filters fail.
3. **Storage Access**: Google Drive (`DriveFileStorage`) and local directories are partitioned strictly under directory stems corresponding to the user's `company_code`.

## Approval & Verification Flows

- **AI Feedback & Drafts**: Raw PDF/CSV records uploaded to `machine_records` do not get parsed into the active knowledge base until a supervisor or maintenance head reviews the AI-generated draft.
- **Verified Closure**: Repair verification is final only when a closure photo or supervisor validation check is uploaded and written. Direct bypasses are flagged in the `audit_trail` table.

## Security checks

- Company isolation works.
- RLS is enabled on maintenance tables.
- Expired sessions are handled cleanly.
- Tokens are not leaked in links.
- Privileged work stays server-side.
- Evidence stays separate from approvals.
