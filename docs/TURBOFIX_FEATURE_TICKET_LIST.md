# TurboFix Feature Ticket List

## Main work streams

### 1. Closed-loop maintenance
- QR Gateway: scan → speak → listen back → review → submit
- Technician: accept → repair → evidence → verify → close
- Support: approve, return, or escalate
- Machines: show the current loop first
- Dashboard: clickable KPI and chart drilldowns

### 2. Machine knowledge
- Upload old records
- Review the AI draft
- Approve useful knowledge
- Keep raw files, review snapshots, and final submissions separate
- Link history back to the machine

### 3. Simpler UI
- Shorter headers
- Fewer visible cards at once
- One main action per section
- Consistent labels across pages

### 4. Dashboard drilldowns
- Machines online
- Downtime
- Predicted failures
- Uptime / efficiency
- Priority queue
- Trend charts

### 5. Machine page clarity
- Current loop status
- Open work
- Closed work
- Assigned people
- PM status
- Parts and consumables
- Knowledge readiness

### 6. Security
- Company-only data
- Role-based access
- Session expiry handling
- RLS review
- Secure privileged actions

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
