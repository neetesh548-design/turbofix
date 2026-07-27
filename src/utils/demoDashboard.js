/**
 * Sample data for the Supervisor and Engineer boards.
 *
 * Those two views depend on columns most pilot factories have not filled in
 * yet — technician assignment, `root_cause`, `capa_status`, `component`.
 * Rather than show four empty panels, the page falls back to this fixture and
 * labels it clearly, so a supervisor evaluating TurboFix can see the shape of
 * the board before their own data reaches it.
 *
 * Real data always wins: see shouldUseDemoTeam / shouldUseDemoReliability.
 */

const hoursAgo = (hours, now = Date.now()) => new Date(now - hours * 3_600_000).toISOString();
const daysAgo = (days, now = Date.now()) => new Date(now - days * 86_400_000).toISOString();

export const DEMO_TEAM = Object.freeze([
  { user_id: 'demo-tech-1', name: 'Ramesh Yadav', role: 'maintenance_technician' },
  { user_id: 'demo-tech-2', name: 'Suresh Iyer', role: 'maintenance_technician' },
  { user_id: 'demo-tech-3', name: 'Vikram Patil', role: 'maintenance_technician' },
  { user_id: 'demo-tech-4', name: 'Anita Deshmukh', role: 'maintenance_engineer' },
]);

export const DEMO_MACHINES = Object.freeze([
  { id: 'DEMO-M001', name: 'CNC Lathe 1', location: 'Bay 2 · Machining', status: 'running', criticality: 'high', assigned_to: 'demo-tech-1', hourly_downtime_cost: 3100, replacement_cost: 2_400_000 },
  { id: 'DEMO-M002', name: 'Hydraulic Press #2', location: 'Bay 1 · Forming', status: 'breakdown', criticality: 'critical', assigned_to: 'demo-tech-2', hourly_downtime_cost: 4200, replacement_cost: 1_800_000 },
  { id: 'DEMO-M003', name: 'Surface Grinder', location: 'Bay 3 · Finishing', status: 'running', criticality: 'medium', assigned_to: 'demo-tech-3', hourly_downtime_cost: 2600, replacement_cost: 900_000 },
  { id: 'DEMO-M004', name: 'Air Compressor 75kW', location: 'Utility Room', status: 'under_maintenance', criticality: 'high', assigned_to: 'demo-tech-2', hourly_downtime_cost: 5200, replacement_cost: 1_200_000 },
  { id: 'DEMO-M005', name: 'Packing Conveyor', location: 'Dispatch', status: 'running', criticality: 'low', assigned_to: 'demo-tech-4', hourly_downtime_cost: 1800, replacement_cost: 700_000 },
]);

/**
 * A deliberately mixed ticket set: one live breach, a healthy closed
 * history, and a component that has failed four times so the hotspot and
 * CAPA panels have something real to render.
 */
export function buildDemoTickets(now = Date.now()) {
  return [
    // Live breach — critical, 4h target, opened 11h ago.
    {
      id: 'demo-t1', wo_number: 'WO-1041', machine_id: 'DEMO-M002', status: 'open',
      lifecycle_stage: 'work_started', urgency: 'critical', assigned_to: 'demo-tech-2',
      component: 'Main oil seal', issue_text: 'Hydraulic oil leak at the main seal, pressure dropping',
      created_at: hoursAgo(11, now), downtime_minutes: 660,
    },
    {
      id: 'demo-t2', wo_number: 'WO-1042', machine_id: 'DEMO-M004', status: 'open',
      lifecycle_stage: 'waiting_spare', urgency: 'high', assigned_to: 'demo-tech-2',
      component: 'Air filter', issue_text: 'Discharge temperature high, unit auto-shutting down',
      created_at: hoursAgo(5, now),
    },
    {
      id: 'demo-t3', wo_number: 'WO-1043', machine_id: 'DEMO-M001', status: 'open',
      lifecycle_stage: 'assigned', urgency: 'medium', assigned_to: 'demo-tech-1',
      component: 'Spindle bearing', issue_text: 'Spindle vibration returns after restart',
      created_at: hoursAgo(9, now),
    },
    {
      id: 'demo-t4', wo_number: 'WO-1044', machine_id: 'DEMO-M005', status: 'open',
      lifecycle_stage: 'reported', urgency: 'low', assigned_to: 'demo-tech-4',
      component: 'Drive belt', issue_text: 'Conveyor tracking drifts under full load',
      created_at: hoursAgo(30, now),
    },
    // Repeat cluster on the press seal — four failures in 90 days.
    ...[6, 24, 45, 70].map((days, index) => ({
      id: `demo-r${index + 1}`, wo_number: `WO-10${30 + index}`, machine_id: 'DEMO-M002',
      status: 'closed', lifecycle_stage: 'closed', urgency: 'high', assigned_to: 'demo-tech-2',
      component: 'Main oil seal', issue_text: 'Oil seal weeping under load',
      root_cause: index < 2 ? 'Seal groove out of tolerance after re-machining' : null,
      capa_action: index === 0 ? 'Re-machine seal groove to OEM tolerance and re-qualify' : null,
      capa_status: index === 0 ? 'in_progress' : null,
      capa_due_at: index === 0 ? daysAgo(-14, now) : null,
      created_at: daysAgo(days, now),
      resolved_at: daysAgo(days - 0.2, now),
      downtime_minutes: 280, maintenance_cost: 14_500,
    })),
    // Healthy closed history so SLA compliance is not 0%.
    ...[2, 4, 8, 12, 16, 21, 33, 48].map((days, index) => ({
      id: `demo-c${index + 1}`, wo_number: `WO-11${10 + index}`,
      machine_id: DEMO_MACHINES[index % DEMO_MACHINES.length].id,
      status: 'closed', lifecycle_stage: 'closed',
      urgency: ['medium', 'low', 'high'][index % 3],
      assigned_to: DEMO_TEAM[index % DEMO_TEAM.length].user_id,
      component: ['Coolant pump', 'Drive belt', 'Limit switch', 'Lubrication line'][index % 4],
      issue_text: 'Routine corrective work completed',
      root_cause: index % 2 === 0 ? 'Wear beyond service limit' : null,
      created_at: daysAgo(days, now),
      resolved_at: daysAgo(days - 0.15, now),
      downtime_minutes: 90, maintenance_cost: 3_200,
    })),
  ];
}

export const DEMO_PM_LOGS = Object.freeze([
  { on_time: true }, { on_time: true }, { on_time: true },
  { on_time: false }, { on_time: true }, { on_time: true },
]);

/**
 * No machines AND no tickets means Supabase is unreachable, empty, or timed
 * out — not that the plant has nothing. Every board falls back to the demo
 * fleet in that case, matching what the legacy dashboard already did.
 */
export function shouldUseDemoFleet(machines, tickets) {
  const noMachines = !Array.isArray(machines) || machines.length === 0;
  const noTickets = !Array.isArray(tickets) || tickets.length === 0;
  return noMachines && noTickets;
}

/** Demo team only when there is genuinely nobody to show. */
export function shouldUseDemoTeam(team) {
  return !Array.isArray(team) || team.length === 0;
}

/**
 * Demo reliability data when no closed ticket carries the columns the
 * Engineer board reads. One real root cause is enough to switch to live.
 */
export function shouldUseDemoReliability(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  if (list.length === 0) return true;
  return !list.some((ticket) => ticket?.root_cause || ticket?.component || ticket?.capa_status);
}
