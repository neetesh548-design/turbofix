# TurboFix Product Requirements

## What TurboFix is

TurboFix helps a factory keep machines running by making it easy to report problems, see machine context, assign work, verify repairs, and learn from history. Analytics still does the calculations in the background. TurboFix shows the workflow and decisions on top.

## What it should do well

- Make reporting quick.
- Keep each machine’s history together.
- Show the next action clearly.
- Keep screens simple for each role.
- Let people review and correct important data.
- Close the loop from issue to verified repair.

## Main users

- Operator
- Technician
- Supervisor
- Maintenance head
- Owner
- Support reviewer

## Closed-Loop Maintenance Lifecycle

TurboFix runs on a strictly defined, closed-loop maintenance lifecycle:
1. **Detect**: Operators scan machine QR codes and capture issues using voice, text, or photo.
2. **Understand**: The backend uses LLM parsing to analyze voice transcripts/texts into a structured `IssueBrief`.
3. **Prioritize**: Automatically categorizes urgency and checks against active breakdown logs.
4. **Assign**: Routes work orders to the least-loaded technician or specific skill sets.
5. **Execute**: Technicians perform repair tasks guided by step-by-step checklists.
6. **Verify**: Repairs are validated via supervisor review or photographic evidence.
7. **Close**: Records closed loop resolution metrics (downtime, spare parts costs).
8. **Learn**: Converts resolved technician work records into permanent machine knowledge context.

## 1-Hour Developer Onboarding Map

To understand TurboFix in under 1 hour, trace these core concepts from UI to Database:

| Business Concept | Frontend Module / Component | Backend Repository Interface | Database Tables (Supabase) |
| :--- | :--- | :--- | :--- |
| **Operator Reporting** | `src/pages/QRGateway.jsx` | `TicketRepository` | `public.tickets` (voice_note_media_id) |
| **Technician Repair** | `src/pages/Technician.jsx` | `TechnicianWorkRepository` | `public.technician_work` (checklist, notes) |
| **Machine Context** | `src/pages/Machines.jsx` | `MachineRepository` | `public.machines` (has_open_ticket) |
| **Escalations & Alerts**| `src/pages/Support.jsx` | `EscalationConfigRepository`| `public.escalation_config` (timers, channels) |
| **Machine Knowledge** | `src/pages/Records.jsx` | `MachineRecordRepository` | `public.machine_records` (approved_knowledge) |
| **Dashboard KPIs** | `src/pages/Dashboard.jsx` | `CustomKpiRepository` | `public.custom_kpi_entries` (metric logs) |

## What the app must support

### Issue capture
- Voice, text, and photo input
- Playback before transcription
- Machine context before submit
- Review before a work order is created

### Work order flow
- Visible stages from open to closed
- Verification before closure
- Extra evidence for critical jobs
- Open and closed work shown inside the machine view

### Machine knowledge
- One record set per machine
- Approved records become trusted AI context
- Raw files, review drafts, and approved knowledge stay separate

### Role views
- Owner: health, cost, approvals, high-risk items
- Technician: assigned work, checklist, evidence, verification
- Supervisor/support: exceptions, approvals, escalation, closure checks
- Operator: simple report, confirm, correct, trace

### Dashboard
- Show only the important overview first
- Make cards and charts clickable
- Keep the first screen calm

### Machine page
- Show the current machine first
- Show open work, closed work, PM, parts, consumables, people, and learning
- Make missing ownership or blocked work obvious

## Quality bar

- Works well on mobile and desktop
- Easy to read and easy to tap
- Clear empty states
- Safe for production use
- Keeps approved data accurate

## How we know it is working

- Reports are faster
- Fewer incomplete tickets
- Repairs are verified more often
- Repeat failures are easier to understand
- More records become usable machine knowledge
- It takes fewer clicks to find the next action

## What this does not try to do

- Replace analytics
- Become a general ERP
- Skip review or verification
- Hide important corrections
