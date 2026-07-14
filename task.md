# Checklist - Owner-Optimized Dynamic Escalations

- [x] Implement Worst-Case Response Time Calculator in `Settings.jsx`
  - [x] Sum active thresholds and display `Total Response Time before Owner Alert`
- [x] Implement dynamic escalation path loading in `Machines.jsx`
  - [x] Fetch escalation settings on mount
  - [x] Render timeline elements with computed cumulative starting hours
- [x] Implement active escalation tier tracking in `Tickets.jsx`
  - [x] Fetch escalation settings on mount
  - [x] Calculate elapsed hours since ticket creation
  - [x] Map elapsed time to active path roles and display current tier inside the datagrid
  - [x] Highlight tickets at owner tier with glowing red labels
- [x] Run production build verification
