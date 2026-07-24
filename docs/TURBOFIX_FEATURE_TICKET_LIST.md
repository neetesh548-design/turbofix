# TurboFix Feature Ticket List

## Main work streams

### 1. Closed-Loop Maintenance (Community 7 & 9)
- **Ticket Interface**: `TicketRepository` (Supabase vs local Sheets).
- **QR Gateway wizard**: `src/pages/QRGateway.jsx` with audio player.
- **Technician checklists & photos**: `src/pages/Technician.jsx`.
- **Closed loop analytics hooks**: Capture downtime cost and duration at closure.

### 2. Machine Knowledge (Community 2 & 40)
- **Record Repository**: `MachineRecordRepository` and `DocumentRepository`.
- **File System/Drive storage**: Partitioned under `DriveFileStorage`.
- **Draft Reviews**: Page and API to preview AI-generated records draft before approval.

### 3. Service Integrations & Webhooks (Community 1 & 4)
- **WhatsApp Gateway client**: `backend/wacrm_client.py` templates and retry loops.
- **AI Diagnostics edge function**: `supabase/functions/ai_diagnostics/index.ts`.
- **Shift handovers & schedulers**: `check_schedules` and `pm_scheduler` routines.

### 4. Dashboard & KPI Drilldowns (Community 16 & 17)
- **KPI Repository**: `CustomKpiRepository` data logs.
- **Drill-down views**: Interactive overlay panels to inspect backlog velocity.

### 5. Machine Page Clarity (Community 34)
- **Machine Repository**: `MachineRepository` data fields.
- **Active loops visualization**: Visual timeline showing PMs, parts stock, and team assignments.

### 6. Security & Multi-Tenancy (Community 0 & 10)
- **Isolation Checks**: Validate RLS policies on all tables.
- **Permission Helpers**: Code reviews and test assertions using `.assert_can_close_ticket()`, `.assert_can_manage_escalation()`.

### 7. Reliability
- Better transcription flow
- Re-record support
- Mic permission recovery
- Mobile-friendly QR Gateway
- Typed fallback when needed

### 8. Data and analytics
- Keep analytics as the engine
- Keep TurboFix as the workflow layer
- Reduce manual entry
- Keep review and correction

## Ticket template

Each ticket should include:

- Title
- User story
- Problem
- Acceptance criteria
- Dependencies
- Priority
- Owner role
- Pages affected

## Suggested order

1. Dashboard drilldowns
2. Machine page loop clarity
3. QR Gateway hardening
4. Technician evidence and verification
5. Records approval flow
6. Security / RLS review
7. Copy cleanup across pages
