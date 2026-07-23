# TurboFix Frontend Spec

## Goal

Make the app feel calm, clear, and easy to use. Show less at once, but keep everything reachable.

## UI rules

- One main action per section
- Important numbers should be clickable
- Keep extra detail behind drilldowns or expanders
- Use the same language across pages
- Make mobile easy to use

## Shared patterns

### Header
- Title
- Short helper text
- Main action
- Optional filters or toggles

### Drilldown
- Clear title
- Short explanation
- Related records
- Link to the source page

### Empty state
- Simple explanation
- One clear next step

### Badge
- Use for status only

### Expandable section
- Keep it closed by default
- Use it for lower-priority detail

## Page behavior

### Dashboard
- Show the executive brief first
- Make KPI cards and charts clickable
- Keep secondary KPI groups collapsed

### Machines
- Show the machine and its current loop first
- Keep work, PM, parts, consumables, people, and learning one click away

### Tickets
- Show a clean work-order board
- Make lifecycle visible
- Keep closure clear and deliberate

### Technician
- Show assigned work first
- Keep checklist, evidence, and verification prominent
- Push optional fields lower

### Support
- Show exceptions, approvals, and escalation decisions
- Keep the focus on the machine, not the person

### Records
- Upload → review → approve
- Keep raw files, AI drafts, and approved knowledge separate

### QR Gateway
- One guided flow
- Voice first
- Listen back before transcription
- Review before submit
- Show WO number and technician name at success

## Mobile behavior

- Big enough tap targets
- No crowded grids on small screens
- Keep primary buttons easy to reach

## Form guidance

- Use plain labels
- Use sensible defaults
- Keep error messages short
- Reduce technical words where possible

## Accessibility

- Visible focus states
- Good contrast
- Keyboard-friendly buttons and cards
- Expanders should be readable by screen readers

## Performance

- Fast first load
- Avoid unnecessary rerenders
- Load detail only when needed

## Good / not good

### Good
- Simple
- Clear
- Consistent

### Not good
- Too many KPIs at once
- Duplicate controls for the same action
- Hidden important actions
- Reporting-style clutter
