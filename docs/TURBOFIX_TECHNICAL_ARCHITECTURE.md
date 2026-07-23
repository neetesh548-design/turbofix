# TurboFix Technical Architecture

## Simple view

TurboFix is a React frontend on top of Supabase. Supabase stores the data, handles login, keeps files, and runs backend functions. Analytics calculates the numbers. TurboFix shows the workflow and decisions.

## Main parts

- Frontend: React + Vite
- Backend: Supabase
- Analytics: existing plant logic and summaries
- Knowledge: approved machine records and machine history

## Main screens

- Public pages
- Login
- Dashboard
- Machines
- Tickets
- Technician
- Support
- Records
- QR Gateway
- Team
- Settings
- Shutdown Planner
- Assistant

## Main data groups

- Machines: identity, status, people, PM, parts, consumables, history
- Tickets: issue, stage, urgency, evidence, verification, closure
- Team: user, role, company, responsibility
- Records: uploads, drafts, approvals, trusted knowledge
- Support: exceptions, approvals, escalations
- Audit: important state changes

## How data moves

1. User signs in.
2. The app loads the company and role.
3. Dashboard shows the plant overview.
4. Machines shows the current machine and its loop.
5. QR Gateway captures the issue and creates a work order.
6. Technician repairs and adds evidence.
7. Support verifies exceptions if needed.
8. Records turns approved files into machine knowledge.
9. Analytics uses the approved data for future insight.

## Frontend rules

- Keep the main UI simple.
- Keep drilldowns on the same page when possible.
- Reuse the same controls and patterns across pages.
- Do not move important decisions out of the workflow.

## Backend rules

- Supabase stores the source of truth.
- RLS keeps each company’s data separate.
- Edge functions handle privileged work and AI tasks.
- Storage keeps uploads and evidence.

## Safety rules

- Review AI output before it becomes trusted.
- Keep raw uploads and approved knowledge separate.
- Do not put privileged logic in the browser.
- Fail safely if an external service is unavailable.

## Closed loop

Detect → Understand → Prioritize → Assign → Execute → Verify → Close → Learn

## Deployment

- Frontend: static host
- Backend: Supabase
- Secrets: environment variables
