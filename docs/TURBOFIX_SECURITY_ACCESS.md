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

## Approval rules

- AI drafts are not trusted until reviewed.
- Records become machine knowledge only after approval.
- Closure may need verification before it is final.
- Direct closure should be the exception.

## Security checks

- Company isolation works.
- RLS is enabled on maintenance tables.
- Expired sessions are handled cleanly.
- Tokens are not leaked in links.
- Privileged work stays server-side.
- Evidence stays separate from approvals.
