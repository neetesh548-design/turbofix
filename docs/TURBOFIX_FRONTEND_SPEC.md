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

## Core Frontend Components & Layouts

- **Shell Layout (`src/components/AppShell.jsx`)**: Responsive navbar, token validation check (`isTokenExpired()`), and multi-role context routing (`readAuth()`).
- **Dashboard Screen (`src/pages/Dashboard.jsx`)**: Renders high-level KPIs (backlog, planned/reactive ratio, downtime cost velocity) with clickable drill-down events that reveal nested tables on the same page.
- **Machines Screen (`src/pages/Machines.jsx`)**: Shows active machine indicators, parts stock status, and lists all linked open/closed tickets.
- **QR Gateway Screen (`src/pages/QRGateway.jsx` / `src/pages/Inventory.jsx`)**: Guided trilingual wizard (voice capture, playback, issue verification step, and auto-assign response). Uses `dynamicChecklist.js` to calculate step similarity scores for incoming work orders.
- **Technician Portal (`src/pages/Technician.jsx`)**: Self-contained step checklists, camera capture trigger for evidence verification, and supervisor signature request fields.
- **Records Screen (`src/pages/Records.jsx`)**: Partitioned workspaces showing raw file list, structured markdown reviews, and AI-approved context toggles.

## Offline Capabilities & Caching Strategy (`src/sw-strategies.js`)

To guarantee operation in signal-dead areas of a factory, TurboFix uses a Service Worker for offline-first operation:
1. **Static Cache**: Precaches crucial core HTML/CSS/JS shell bundles.
2. **Offline Action Queue (`OfflineActionQueue`)**: Intercepts writes (e.g. ticket creation, checklist step updates, comments) when the device is offline and queues them.
3. **Automatic Synchronization**: Plays back queued requests in chronological order as soon as network connectivity is restored.
4. **Offline Indicators**: Shows alert banners on screens (e.g., QRGateway, Dashboard) when interacting with cached data.

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
