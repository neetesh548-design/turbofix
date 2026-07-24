# TurboFix Technical Architecture

## Simple view

TurboFix is a React frontend on top of Supabase. Supabase stores the data, handles login, keeps files, and runs backend functions. Analytics calculates the numbers. TurboFix shows the workflow and decisions.

## Main Components & Graphify God Nodes

The architecture is built around clean boundaries defined by core **Repository Interfaces (God Nodes)**. These interfaces run in **Dual-Mode** (falling back to Local Excel/Google Sheets for development/testing, and using Supabase + Google Drive in production):

1. **`MachineRepository`**: Manages machine profiles, active loop state (`has_open_ticket`), PM schedules, parts, and consumables.
   - *Local*: `backend/local/machine_repo.py` (openpyxl)
   - *Sheets*: `backend/sheets/ticket_repo.py`
   - *Supabase*: `backend/supabase/machine_repo.py`
2. **`TicketRepository`**: Manages the end-to-end work order lifecycle (breakdown tickets, evidence media, verification, and closure).
   - *Local*: `backend/local/ticket_repo.py`
   - *Sheets*: `backend/sheets/ticket_repo.py`
   - *Supabase*: `backend/supabase/ticket_repo.py`
3. **`UserRepository` & `CurrentUser`**: Resolves identity, RBAC checks, and strict tenant company isolation.
   - *Local*: `backend/local/user_repo.py`
   - *Supabase*: `backend/supabase/user_repo.py`
4. **`DocumentRepository` & `FileStorage`**: Handles uploading raw machine documents, compiling review drafts, and saving approved knowledge.
   - *Local*: `backend/local/document_repo.py` and `LocalFileStorage` (disk)
   - *Supabase/Production*: `backend/supabase/document_repo.py` and `DriveFileStorage` (Google Drive API)
5. **`PartsRepository`**: Tracks spare parts, consumables, and automated reorder loops.
6. **`CustomKpiRepository`**: Accesses daily metrics, backlog velocity, and cost ratios.

## Integration & Communication Channels

- **Supabase Edge Functions**: Host-privileged, secure operations and AI pipelines (located under `supabase/functions/`):
  - `ai_assistant`: Maintenance Q&A using approved machine records context.
  - `ai_diagnostics`: Automated root-cause analysis based on photo evidence and history.
  - `whatsapp_webhook`: Entry point for operators reporting issues over WhatsApp.
- **WhatsApp CRM Integration (`backend/wacrm_client.py`)**: Thin client with automatic exponential backoff retry to route template notifications (e.g. `turbofix_escalation`, `turbofix_new_ticket`) through WaCRM/Meta.

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
