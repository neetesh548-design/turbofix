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

## Main flows

- QR Gateway: scan → speak → listen back → review → submit
- Technician: accept → repair → evidence → verify → close
- Support: review exception → approve, return, or escalate
- Machines: open a machine and see the active loop first
- Dashboard: click a KPI or chart to see what is behind it
- Records: upload old records, review the draft, approve useful knowledge

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
