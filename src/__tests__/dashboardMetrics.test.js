import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DASHBOARD_ROLES,
  DEFAULT_DASHBOARD_ROLE,
  resolveDashboardRole,
  readStoredUser,
  asArray,
  asNumber,
  round1,
  indexMachines,
  machineNameOf,
  machineCriticality,
  urgencyRank,
  isUrgentTicket,
  isAssignedTo,
  ticketAssignee,
  ticketsInWindow,
  ticketsThisMonth,
  ticketDowntimeHours,
  ticketRepairCost,
  ticketDowntimeCost,
  formatInr,
  formatInrCompact,
  formatHours,
  formatPct,
  fleetValueAtRisk,
  monthlyMaintenanceCost,
  slaCompliance,
  downtimeCost,
  fleetHealthMap,
  topProblemMachines,
  monthSummary,
  buildWorkQueue,
  technicianMachines,
  technicianQuickStats,
  teamPerformance,
  workloadBalance,
  responseTimeTrend,
  slaBreachAlerts,
  weeklySummary,
  reliabilityMetrics,
  repeatFailureHotspots,
  capaTracker,
  trendingIssues,
  createMetricsCache,
  buildRoleMetrics,
  normalizeCapaStatus,
  CAPA_STATUS_LABEL,
  LABOUR_RATE_PER_HOUR,
} from '../utils/dashboardMetrics.js';

/* A fixed clock so every expectation below is deterministic. */
const NOW = new Date('2026-07-26T12:00:00.000Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const daysAgo = (d) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

const MACHINES = [
  {
    id: 'm1', name: 'Hydraulic Press', status: 'breakdown', criticality: 'critical',
    replacement_cost: 1_000_000, hourly_downtime_cost: 1000, assigned_to: 'tech-1',
    last_maintenance_date: daysAgo(10), maintenance_interval_days: 30,
  },
  {
    id: 'm2', name: 'CNC Lathe', status: 'running', criticality: 'high',
    replacement_cost: 500_000, hourly_downtime_cost: 500, assigned_to: 'tech-2',
    last_maintenance_date: daysAgo(5), maintenance_interval_days: 30,
  },
  {
    id: 'm3', name: 'Compressor', status: 'under_maintenance', criticality: 'medium',
    replacement_cost: 200_000, hourly_downtime_cost: 0,
    last_maintenance_date: daysAgo(2), maintenance_interval_days: 60,
  },
  {
    id: 'm4', name: 'Idle Bench', status: 'running', criticality: 'low',
    last_maintenance_date: daysAgo(1), maintenance_interval_days: 90,
  },
];

const TICKETS = [
  // Open, critical (4h target), 10h old → breached, assigned to tech-1.
  {
    id: 't1', wo_number: 'WO-1', machine_id: 'm1', status: 'open', urgency: 'critical',
    assigned_to: 'tech-1', component: 'Seal', issue_text: 'Oil leak at main seal',
    created_at: hoursAgo(10), downtime_minutes: 600,
  },
  // Open, medium (24h target), 2h old → on track, assigned to tech-1.
  {
    id: 't2', wo_number: 'WO-2', machine_id: 'm1', status: 'open', urgency: 'medium',
    assigned_to: 'tech-1', component: 'Hose', issue_text: 'Hose chafing',
    created_at: hoursAgo(2), lifecycle_stage: 'waiting_spare',
  },
  // Open, high (8h target), 1h old → on track, tech-2.
  {
    id: 't3', wo_number: 'WO-3', machine_id: 'm2', status: 'open', urgency: 'high',
    assigned_to: 'tech-2', component: 'Bearing', issue_text: 'Spindle vibration',
    created_at: hoursAgo(1),
  },
  // Closed within target → met SLA. Opened 3 days ago, closed 2h later.
  {
    id: 't4', machine_id: 'm2', status: 'closed', urgency: 'medium', assigned_to: 'tech-2',
    component: 'Bearing', root_cause: 'Bearing seating wear', capa_action: 'Re-seat and monitor',
    capa_status: 'in_progress', capa_due_at: daysAgo(-5),
    created_at: daysAgo(3), resolved_at: new Date(NOW.getTime() - 3 * 86_400_000 + 2 * 3_600_000).toISOString(),
    maintenance_cost: 5000, downtime_minutes: 120,
  },
  // Closed well past target → missed SLA. Opened 20 days ago, closed 5 days later.
  {
    id: 't5', machine_id: 'm1', status: 'closed', urgency: 'high', assigned_to: 'tech-1',
    component: 'Seal', created_at: daysAgo(20),
    resolved_at: daysAgo(15), parts_cost: 2000, labor_cost: 1000, downtime_minutes: 300,
  },
  // Closed inside the last week → feeds weeklySummary.
  {
    id: 't6', machine_id: 'm3', status: 'closed', urgency: 'low', assigned_to: 'tech-2',
    component: 'Filter', created_at: daysAgo(4),
    resolved_at: daysAgo(3), labour_minutes: 120,
  },
];

const TEAM = [
  { user_id: 'tech-1', name: 'Ramesh', role: 'maintenance_technician' },
  { user_id: 'tech-2', name: 'Suresh', role: 'maintenance_technician' },
  { user_id: 'tech-3', name: 'Idle Ivan', role: 'maintenance_technician' },
];

const PM_LOGS = [{ on_time: true }, { on_time: true }, { on_time: false }, { on_time: true }];

const opts = { now: NOW };

/* =========================================================
   Role resolution
   ========================================================= */
describe('resolveDashboardRole', () => {
  it('maps owner-family roles to the owner board', () => {
    expect(resolveDashboardRole('owner')).toBe(DASHBOARD_ROLES.OWNER);
    expect(resolveDashboardRole('maintenance_head')).toBe(DASHBOARD_ROLES.OWNER);
    expect(resolveDashboardRole('plant_manager')).toBe(DASHBOARD_ROLES.OWNER);
  });

  it('maps technician roles to the technician board', () => {
    expect(resolveDashboardRole('maintenance_technician')).toBe(DASHBOARD_ROLES.TECHNICIAN);
    expect(resolveDashboardRole('technician')).toBe(DASHBOARD_ROLES.TECHNICIAN);
  });

  it('maps supervisor and engineer roles to their own boards', () => {
    expect(resolveDashboardRole('supervisor')).toBe(DASHBOARD_ROLES.SUPERVISOR);
    expect(resolveDashboardRole('maintenance_engineer')).toBe(DASHBOARD_ROLES.ENGINEER);
    expect(resolveDashboardRole('reliability_engineer')).toBe(DASHBOARD_ROLES.ENGINEER);
  });

  it('is case and whitespace insensitive', () => {
    expect(resolveDashboardRole('  SUPERVISOR ')).toBe(DASHBOARD_ROLES.SUPERVISOR);
  });

  it('falls back to the owner board for unknown, null or empty roles', () => {
    expect(resolveDashboardRole('quality_inspector')).toBe(DEFAULT_DASHBOARD_ROLE);
    expect(resolveDashboardRole(null)).toBe(DEFAULT_DASHBOARD_ROLE);
    expect(resolveDashboardRole('')).toBe(DEFAULT_DASHBOARD_ROLE);
    expect(resolveDashboardRole(undefined)).toBe(DASHBOARD_ROLES.OWNER);
  });
});

describe('readStoredUser', () => {
  // The suite-wide setup stubs `global.localStorage` with a mock that always
  // returns null, so these exercise the injectable storage parameter — which
  // is the same code path the page uses, just with the store passed in.
  const storageWith = (value) => ({ getItem: () => value });

  afterEach(() => vi.restoreAllMocks());

  it('returns the parsed user when tf_user holds valid JSON', () => {
    const store = storageWith(JSON.stringify({ role: 'supervisor', name: 'V' }));
    expect(readStoredUser(store)).toEqual({ role: 'supervisor', name: 'V' });
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredUser(storageWith(null))).toBeNull();
    expect(readStoredUser()).toBeNull();
  });

  it('returns null rather than throwing on corrupt JSON', () => {
    expect(readStoredUser(storageWith('{not json'))).toBeNull();
  });

  it('returns null when the stored value is not an object', () => {
    expect(readStoredUser(storageWith('"just-a-string"'))).toBeNull();
    expect(readStoredUser(storageWith('7'))).toBeNull();
  });

  it('returns null when reading storage throws', () => {
    expect(readStoredUser({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
  });
});

/* =========================================================
   Shared helpers
   ========================================================= */
describe('shared helpers', () => {
  it('asArray coerces non-arrays to an empty array', () => {
    expect(asArray([1, 2])).toEqual([1, 2]);
    expect(asArray(null)).toEqual([]);
    expect(asArray({ length: 2 })).toEqual([]);
  });

  it('asNumber coerces unusable values to zero', () => {
    expect(asNumber('42')).toBe(42);
    expect(asNumber(undefined)).toBe(0);
    expect(asNumber(NaN)).toBe(0);
  });

  it('round1 keeps one decimal place', () => {
    expect(round1(3.14159)).toBe(3.1);
    expect(round1(null)).toBe(0);
  });

  it('indexMachines keys rows by both id and machine_id', () => {
    const index = indexMachines([{ id: 'a', machine_id: 'A1', name: 'X' }]);
    expect(index.a.name).toBe('X');
    expect(index.A1.name).toBe('X');
  });

  it('machineNameOf falls back to the id when the machine is unknown', () => {
    expect(machineNameOf(MACHINES, 'm1')).toBe('Hydraulic Press');
    expect(machineNameOf(MACHINES, 'nope')).toBe('nope');
    expect(machineNameOf(null, null)).toBe('Unknown machine');
  });

  it('machineCriticality normalises tiers and defaults to medium', () => {
    expect(machineCriticality({ criticality: 'A' })).toBe('critical');
    expect(machineCriticality({ criticality: 'High' })).toBe('high');
    expect(machineCriticality({ criticality: 'D' })).toBe('low');
    expect(machineCriticality({})).toBe('medium');
  });

  it('urgencyRank orders critical ahead of low and unknown last', () => {
    expect(urgencyRank({ urgency: 'critical' })).toBeLessThan(urgencyRank({ urgency: 'low' }));
    expect(urgencyRank({})).toBe(4);
  });

  it('isUrgentTicket only counts critical and high', () => {
    expect(isUrgentTicket({ urgency: 'critical' })).toBe(true);
    expect(isUrgentTicket({ urgency: 'high' })).toBe(true);
    expect(isUrgentTicket({ urgency: 'medium' })).toBe(false);
  });

  it('ticketAssignee reads whichever assignment column is present', () => {
    expect(ticketAssignee({ assigned_to: 'a' })).toBe('a');
    expect(ticketAssignee({ technician_id: 'b' })).toBe('b');
    expect(ticketAssignee({})).toBeNull();
  });

  it('isAssignedTo matches on id, email or name', () => {
    const user = { user_id: 'tech-1', email: 'r@x.com', name: 'Ramesh' };
    expect(isAssignedTo({ assigned_to: 'tech-1' }, user)).toBe(true);
    expect(isAssignedTo({ assigned_to: 'R@X.COM' }, user)).toBe(true);
    expect(isAssignedTo({ assigned_to: 'Ramesh' }, user)).toBe(true);
    expect(isAssignedTo({ assigned_to: 'someone-else' }, user)).toBe(false);
    expect(isAssignedTo({ assigned_to: 'tech-1' }, null)).toBe(false);
    expect(isAssignedTo({}, user)).toBe(false);
  });

  it('ticketsInWindow keeps only tickets opened inside the lookback', () => {
    expect(ticketsInWindow(TICKETS, 7, NOW).map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4', 't6']);
    expect(ticketsInWindow(null, 7, NOW)).toEqual([]);
  });

  it('ticketsThisMonth uses the calendar month, not a rolling 30 days', () => {
    const ids = ticketsThisMonth(TICKETS, NOW).map((t) => t.id);
    expect(ids).toContain('t1');
    // Opened 20 days before 26 Jul is 6 Jul — still this month.
    expect(ids).toContain('t5');
  });

  it('ticketDowntimeHours prefers the recorded downtime over elapsed age', () => {
    expect(ticketDowntimeHours({ downtime_minutes: 90 }, NOW)).toBe(1.5);
    expect(ticketDowntimeHours({ created_at: hoursAgo(4) }, NOW)).toBeCloseTo(4, 1);
  });

  it('ticketRepairCost prefers maintenance_cost, then columns, then labour minutes', () => {
    expect(ticketRepairCost({ maintenance_cost: 900 })).toBe(900);
    expect(ticketRepairCost({ parts_cost: 300, labor_cost: 200 })).toBe(500);
    expect(ticketRepairCost({ labour_minutes: 60 })).toBe(LABOUR_RATE_PER_HOUR);
    expect(ticketRepairCost({})).toBe(0);
  });

  it('ticketDowntimeCost is zero when the machine has no hourly rate', () => {
    expect(ticketDowntimeCost({ downtime_minutes: 60 }, { hourly_downtime_cost: 1000 }, NOW)).toBe(1000);
    expect(ticketDowntimeCost({ downtime_minutes: 60 }, { }, NOW)).toBe(0);
  });
});

/* =========================================================
   Formatters
   ========================================================= */
describe('formatters', () => {
  it('formatInr renders an em dash for missing values rather than ₹0', () => {
    expect(formatInr(null)).toBe('—');
    expect(formatInr(undefined)).toBe('—');
    expect(formatInr(1200)).toContain('1,200');
  });

  it('formatInrCompact abbreviates lakhs and crores', () => {
    expect(formatInrCompact(1_500_000)).toBe('₹15L');
    expect(formatInrCompact(25_000_000)).toBe('₹2.5Cr');
    expect(formatInrCompact(8200)).toContain('8,200');
    expect(formatInrCompact(null)).toBe('—');
  });

  it('formatHours scales from minutes to days', () => {
    expect(formatHours(0.5)).toBe('30m');
    expect(formatHours(3.5)).toBe('3h 30m');
    expect(formatHours(50)).toBe('2d 2h');
    expect(formatHours(null)).toBe('—');
  });

  it('formatPct distinguishes zero percent from no data', () => {
    expect(formatPct(0)).toBe('0%');
    expect(formatPct(null)).toBe('No data yet');
    expect(formatPct(null, '—')).toBe('—');
  });
});

/* =========================================================
   Owner metrics
   ========================================================= */
describe('fleetValueAtRisk', () => {
  it('sums the replacement value of machines with open work', () => {
    const result = fleetValueAtRisk(MACHINES, TICKETS, NOW);
    // m1 and m2 carry open tickets; m3/m4 are clear and not PM-overdue.
    expect(result.machineCount).toBe(2);
    expect(result.value).toBe(1_500_000);
  });

  it('counts machines whose PM is overdue even with no open ticket', () => {
    const overdue = [{ id: 'x', name: 'X', replacement_cost: 100, last_maintenance_date: daysAgo(120), maintenance_interval_days: 30 }];
    expect(fleetValueAtRisk(overdue, [], NOW).machineCount).toBe(1);
  });

  it('reports unpriced machines instead of silently counting them as zero', () => {
    const unpriced = [{ id: 'x', name: 'X', status: 'breakdown' }];
    const result = fleetValueAtRisk(unpriced, [{ machine_id: 'x', status: 'open', created_at: hoursAgo(1) }], NOW);
    expect(result.unpricedCount).toBe(1);
    expect(result.known).toBe(false);
  });

  it('returns a clean zero for an empty fleet', () => {
    expect(fleetValueAtRisk([], [], NOW)).toMatchObject({ value: 0, machineCount: 0, known: true });
  });

  it('tolerates null inputs', () => {
    expect(() => fleetValueAtRisk(null, null, NOW)).not.toThrow();
  });
});

describe('monthlyMaintenanceCost', () => {
  it('splits repair spend from lost production', () => {
    const result = monthlyMaintenanceCost(MACHINES, TICKETS, NOW);
    expect(result.repair).toBeGreaterThan(0);
    expect(result.downtime).toBeGreaterThan(0);
    expect(result.total).toBe(result.repair + result.downtime);
  });

  it('ignores tickets from previous months', () => {
    const old = [{ id: 'o', machine_id: 'm1', created_at: daysAgo(120), maintenance_cost: 99_999 }];
    expect(monthlyMaintenanceCost(MACHINES, old, NOW).repair).toBe(0);
  });

  it('returns zeros for no tickets', () => {
    expect(monthlyMaintenanceCost(MACHINES, [], NOW)).toMatchObject({ repair: 0, downtime: 0, total: 0 });
  });
});

describe('slaCompliance', () => {
  it('counts only closed tickets and reports met vs missed', () => {
    const result = slaCompliance(TICKETS, opts);
    expect(result.met).toBe(2);    // t4 (2h vs 24h target) and t6 (24h vs 72h)
    expect(result.missed).toBe(1); // t5 took 5 days against an 8h high target
    expect(result.total).toBe(3);
    expect(result.pct).toBe(67);
    // The three open tickets are excluded — they have neither passed nor failed.
  });

  it('returns null percent — not zero — when nothing has closed', () => {
    const openOnly = TICKETS.filter((t) => t.status === 'open');
    expect(slaCompliance(openOnly, opts).pct).toBeNull();
  });

  it('reports 100% when every closed ticket met its target', () => {
    const met = [{ id: 'a', status: 'closed', urgency: 'low', created_at: hoursAgo(5), resolved_at: hoursAgo(4) }];
    expect(slaCompliance(met, opts).pct).toBe(100);
  });

  it('reports 0% when every closed ticket missed its target', () => {
    const missed = [{ id: 'a', status: 'closed', urgency: 'critical', created_at: hoursAgo(50), resolved_at: hoursAgo(1) }];
    expect(slaCompliance(missed, opts).pct).toBe(0);
  });

  it('honours a null window as "all time"', () => {
    expect(slaCompliance(TICKETS, { days: null, now: NOW }).total).toBeGreaterThan(0);
  });
});

describe('downtimeCost', () => {
  it('multiplies recorded downtime by the machine hourly rate', () => {
    // t1: 600 min = 10h × ₹1000 = ₹10,000 on m1.
    expect(downtimeCost(MACHINES, [TICKETS[0]], NOW).cost).toBe(10_000);
  });

  it('reports hours alongside rupees', () => {
    expect(downtimeCost(MACHINES, [TICKETS[0]], NOW).hours).toBe(10);
  });

  it('is zero when no machine carries an hourly cost', () => {
    expect(downtimeCost([{ id: 'm1' }], [TICKETS[0]], NOW).cost).toBe(0);
  });
});

describe('fleetHealthMap', () => {
  it('cross-tabulates health against criticality', () => {
    const map = fleetHealthMap(MACHINES, NOW);
    expect(map.total).toBe(4);
    expect(map.grid.critical.down).toBe(1);   // m1 is stopped
    expect(map.byCriticality.critical).toBe(1);
  });

  it('reports planned maintenance separately from unplanned issues', () => {
    const map = fleetHealthMap(MACHINES, NOW);
    expect(map.byStatus.maintenance).toBe(1); // m3
  });

  it('sums every bucket back to the fleet total', () => {
    const map = fleetHealthMap(MACHINES, NOW);
    const sum = Object.values(map.byStatus).reduce((a, b) => a + b, 0);
    expect(sum).toBe(map.total);
  });

  it('returns an all-zero map for an empty fleet', () => {
    const map = fleetHealthMap([], NOW);
    expect(map.total).toBe(0);
    expect(map.byStatus.down).toBe(0);
  });
});

describe('topProblemMachines', () => {
  it('ranks by open ticket count', () => {
    const rows = topProblemMachines(MACHINES, TICKETS, opts);
    expect(rows[0].machineId).toBe('m1');
    expect(rows[0].openTickets).toBe(2);
  });

  it('surfaces the worst urgency and a next action for each row', () => {
    const rows = topProblemMachines(MACHINES, TICKETS, opts);
    expect(rows[0].worstUrgency).toBe('critical');
    expect(rows[0].nextAction).toBe('Escalate — SLA breached');
  });

  it('respects the limit', () => {
    expect(topProblemMachines(MACHINES, TICKETS, { limit: 1, now: NOW })).toHaveLength(1);
  });

  it('returns an empty list when nothing is open', () => {
    expect(topProblemMachines(MACHINES, [], opts)).toEqual([]);
  });

  it('skips tickets with no machine attached', () => {
    const orphan = [{ id: 'x', status: 'open', urgency: 'high', created_at: hoursAgo(1) }];
    expect(topProblemMachines(MACHINES, orphan, opts)).toEqual([]);
  });
});

describe('monthSummary', () => {
  it('counts opened and closed inside the calendar month', () => {
    const summary = monthSummary(TICKETS, PM_LOGS, NOW);
    expect(summary.opened).toBeGreaterThan(0);
    expect(summary.closed).toBeGreaterThan(0);
  });

  it('computes PM completion from the logs', () => {
    expect(monthSummary(TICKETS, PM_LOGS, NOW).pmCompletionPct).toBe(75);
  });

  it('returns null PM completion when no PM has been logged', () => {
    expect(monthSummary(TICKETS, [], NOW).pmCompletionPct).toBeNull();
  });

  it('returns null averages when nothing closed this month', () => {
    expect(monthSummary([], [], NOW).avgResolutionHours).toBeNull();
  });
});

/* =========================================================
   Technician metrics
   ========================================================= */
describe('buildWorkQueue', () => {
  const user = { user_id: 'tech-1', name: 'Ramesh' };

  it('splits urgent from normal work', () => {
    const queue = buildWorkQueue(TICKETS, user, { machines: MACHINES, now: NOW });
    expect(queue.urgent.map((r) => r.id)).toEqual(['t1']);
    expect(queue.normal.map((r) => r.id)).toEqual(['t2']);
    expect(queue.total).toBe(2);
  });

  it('sorts urgent work by least SLA time remaining', () => {
    const user2 = { user_id: 'multi' };
    const rows = [
      { id: 'a', machine_id: 'm1', status: 'open', urgency: 'high', assigned_to: 'multi', created_at: hoursAgo(1) },
      { id: 'b', machine_id: 'm1', status: 'open', urgency: 'critical', assigned_to: 'multi', created_at: hoursAgo(3) },
    ];
    const queue = buildWorkQueue(rows, user2, { machines: MACHINES, now: NOW });
    expect(queue.urgent[0].id).toBe('b'); // 1h left vs 7h left
  });

  it('resolves machine names and flags breaches', () => {
    const queue = buildWorkQueue(TICKETS, user, { machines: MACHINES, now: NOW });
    expect(queue.urgent[0].machineName).toBe('Hydraulic Press');
    expect(queue.urgent[0].breached).toBe(true);
  });

  it('excludes closed work and other people\'s work', () => {
    const queue = buildWorkQueue(TICKETS, user, { machines: MACHINES, now: NOW });
    expect(queue.urgent.concat(queue.normal).map((r) => r.id)).not.toContain('t3');
    expect(queue.urgent.concat(queue.normal).map((r) => r.id)).not.toContain('t5');
  });

  it('returns an empty queue for an unknown user', () => {
    expect(buildWorkQueue(TICKETS, null, { now: NOW }).total).toBe(0);
  });
});

describe('technicianMachines', () => {
  it('includes machines explicitly assigned to the technician', () => {
    const rows = technicianMachines(MACHINES, [], { user_id: 'tech-1' }, opts);
    expect(rows.map((r) => r.machineId)).toEqual(['m1']);
  });

  it('falls back to machines the technician has work on', () => {
    const rows = technicianMachines(MACHINES, TICKETS, { user_id: 'tech-2' }, opts);
    expect(rows.map((r) => r.machineId)).toContain('m2');
  });

  it('sorts worst health first', () => {
    const rows = technicianMachines(MACHINES, TICKETS, { user_id: 'tech-1' }, opts);
    expect(rows[0].health).toBe('down');
  });

  it('carries the PM label through for the card', () => {
    const rows = technicianMachines(MACHINES, [], { user_id: 'tech-1' }, opts);
    expect(rows[0].pmLabel).toBeTruthy();
  });

  it('returns an empty list when nothing is assigned', () => {
    expect(technicianMachines(MACHINES, [], { user_id: 'nobody' }, opts)).toEqual([]);
  });
});

describe('technicianQuickStats', () => {
  it('counts jobs whose SLA runs out today', () => {
    const stats = technicianQuickStats(MACHINES, TICKETS, { user_id: 'tech-1' }, opts);
    expect(stats.dueToday).toBeGreaterThanOrEqual(1); // t1 is already breached
  });

  it('counts jobs blocked on a spare part', () => {
    const stats = technicianQuickStats(MACHINES, TICKETS, { user_id: 'tech-1' }, opts);
    expect(stats.partsToOrder).toBe(1); // t2 is waiting_spare
  });

  it('reports the total open count', () => {
    expect(technicianQuickStats(MACHINES, TICKETS, { user_id: 'tech-1' }, opts).openTotal).toBe(2);
  });

  it('returns zeros for a technician with nothing assigned', () => {
    const stats = technicianQuickStats(MACHINES, TICKETS, { user_id: 'nobody' }, opts);
    expect(stats).toMatchObject({ dueToday: 0, partsToOrder: 0, openTotal: 0 });
  });
});

/* =========================================================
   Supervisor metrics
   ========================================================= */
describe('teamPerformance', () => {
  it('produces one row per team member', () => {
    expect(teamPerformance(TEAM, TICKETS, MACHINES, opts)).toHaveLength(3);
  });

  it('flags a member with a live breach as danger', () => {
    const rows = teamPerformance(TEAM, TICKETS, MACHINES, opts);
    const ramesh = rows.find((r) => r.name === 'Ramesh');
    expect(ramesh.breachedOpen).toBe(1);
    expect(ramesh.tone).toBe('danger');
  });

  it('sorts breached members to the top', () => {
    expect(teamPerformance(TEAM, TICKETS, MACHINES, opts)[0].name).toBe('Ramesh');
  });

  it('returns null SLA percent for a member who has closed nothing', () => {
    const rows = teamPerformance(TEAM, TICKETS, MACHINES, opts);
    expect(rows.find((r) => r.name === 'Idle Ivan').slaPct).toBeNull();
  });

  it('returns an empty array for an empty team', () => {
    expect(teamPerformance([], TICKETS, MACHINES, opts)).toEqual([]);
  });
});

describe('workloadBalance', () => {
  it('reports open and closed-this-week per member', () => {
    const balance = workloadBalance(TEAM, TICKETS, opts);
    expect(balance.rows.find((r) => r.name === 'Ramesh').open).toBe(2);
    expect(balance.totalOpen).toBe(3);
  });

  it('marks a member over capacity as overloaded', () => {
    const balance = workloadBalance(TEAM, TICKETS, { capacity: 1, now: NOW });
    expect(balance.rows.find((r) => r.name === 'Ramesh').overloaded).toBe(true);
  });

  it('detects an imbalance when someone is over capacity and someone is idle', () => {
    expect(workloadBalance(TEAM, TICKETS, { capacity: 1, now: NOW }).imbalanced).toBe(true);
  });

  it('does not flag an imbalance when everyone is inside capacity', () => {
    expect(workloadBalance(TEAM, TICKETS, { capacity: 10, now: NOW }).imbalanced).toBe(false);
  });
});

describe('responseTimeTrend', () => {
  it('reports today, week and month averages', () => {
    const trend = responseTimeTrend(TICKETS, NOW);
    expect(trend.week).not.toBeNull();
    expect(trend.month).not.toBeNull();
  });

  it('calls the direction unknown when there is no history', () => {
    expect(responseTimeTrend([], NOW).direction).toBe('unknown');
  });

  it('calls a faster recent week an improvement', () => {
    const rows = [
      // Slow ticket a month back, fast one this week.
      { id: 'a', status: 'closed', urgency: 'low', created_at: daysAgo(25), resolved_at: daysAgo(23) },
      { id: 'b', status: 'closed', urgency: 'low', created_at: daysAgo(2), resolved_at: hoursAgo(47) },
    ];
    expect(responseTimeTrend(rows, NOW).direction).toBe('improving');
  });

  it('exposes the three points as a series for the sparkline', () => {
    expect(responseTimeTrend(TICKETS, NOW).series).toHaveLength(3);
  });
});

describe('slaBreachAlerts', () => {
  it('lists only open, breached tickets', () => {
    const alerts = slaBreachAlerts(TICKETS, TEAM, { machines: MACHINES, now: NOW });
    expect(alerts.map((a) => a.ticketId)).toEqual(['t1']);
  });

  it('resolves the assignee to a team member name', () => {
    const alerts = slaBreachAlerts(TICKETS, TEAM, { machines: MACHINES, now: NOW });
    expect(alerts[0].assignee).toBe('Ramesh');
  });

  it('reports how far past target the ticket is', () => {
    const alerts = slaBreachAlerts(TICKETS, TEAM, { machines: MACHINES, now: NOW });
    expect(alerts[0].hoursOverdue).toBeCloseTo(6, 0); // 10h elapsed vs 4h target
  });

  it('falls back to Unassigned when nobody owns the ticket', () => {
    const rows = [{ id: 'x', machine_id: 'm1', status: 'open', urgency: 'critical', created_at: hoursAgo(20) }];
    expect(slaBreachAlerts(rows, TEAM, { machines: MACHINES, now: NOW })[0].assignee).toBe('Unassigned');
  });

  it('returns an empty list when nothing has breached', () => {
    expect(slaBreachAlerts([TICKETS[2]], TEAM, { machines: MACHINES, now: NOW })).toEqual([]);
  });
});

describe('weeklySummary', () => {
  it('counts tickets resolved in the last seven days', () => {
    expect(weeklySummary(TICKETS, PM_LOGS, MACHINES, opts).resolvedThisWeek).toBe(2); // t4, t6
  });

  it('reports on-time PM percentage', () => {
    expect(weeklySummary(TICKETS, PM_LOGS, MACHINES, opts).pmOnTimePct).toBe(75);
  });

  it('measures utilisation as the share of the fleet with a named owner', () => {
    expect(weeklySummary(TICKETS, PM_LOGS, MACHINES, opts).teamUtilizationPct).toBe(50); // m1, m2 of 4
  });

  it('returns nulls rather than zeros when there is no data', () => {
    const summary = weeklySummary([], [], [], opts);
    expect(summary.avgResolutionHours).toBeNull();
    expect(summary.pmOnTimePct).toBeNull();
    expect(summary.teamUtilizationPct).toBeNull();
  });
});

/* =========================================================
   Engineer metrics
   ========================================================= */
describe('reliabilityMetrics', () => {
  it('computes a repeat failure rate over the RCA window', () => {
    const metrics = reliabilityMetrics(MACHINES, TICKETS, opts);
    expect(metrics.repeatFailureRatePct).toBeGreaterThan(0);
    expect(metrics.windowDays).toBe(90);
  });

  it('computes RCA completion from closed tickets carrying a root cause', () => {
    // t4 has a root cause; t5 and t6 do not → 1 of 3.
    expect(reliabilityMetrics(MACHINES, TICKETS, opts).rcaCompletionPct).toBe(33);
  });

  it('ranks the most problematic machines by failure count', () => {
    expect(reliabilityMetrics(MACHINES, TICKETS, opts).mostProblematic[0].machineId).toBe('m1');
  });

  it('returns null metrics when there is no history at all', () => {
    const metrics = reliabilityMetrics(MACHINES, [], opts);
    expect(metrics.repeatFailureRatePct).toBeNull();
    expect(metrics.fleetMtbfHours).toBeNull();
    expect(metrics.rcaCompletionPct).toBeNull();
  });

  it('computes MTBF only for machines with more than one failure', () => {
    const metrics = reliabilityMetrics(MACHINES, TICKETS, opts);
    expect(metrics.mtbfByMachine.every((row) => row.failures > 1)).toBe(true);
  });
});

describe('repeatFailureHotspots', () => {
  it('groups by machine and component', () => {
    const rows = repeatFailureHotspots(MACHINES, TICKETS, opts);
    const seal = rows.find((r) => r.component === 'Seal');
    expect(seal.machineId).toBe('m1');
    expect(seal.failureCount).toBe(2);
  });

  it('excludes components that failed only once', () => {
    const rows = repeatFailureHotspots(MACHINES, TICKETS, opts);
    expect(rows.some((r) => r.component === 'Hose')).toBe(false);
  });

  it('tones 3+ failures red and 2 amber', () => {
    const rows = repeatFailureHotspots(MACHINES, TICKETS, opts);
    expect(rows.find((r) => r.component === 'Seal').tone).toBe('warning');
  });

  it('surfaces a documented root cause when one exists', () => {
    const rows = repeatFailureHotspots(MACHINES, TICKETS, opts);
    expect(rows.find((r) => r.component === 'Bearing').rootCause).toBe('Bearing seating wear');
  });

  it('renders a human CAPA label rather than the raw column value', () => {
    const rows = repeatFailureHotspots(MACHINES, TICKETS, opts);
    expect(rows.find((r) => r.component === 'Bearing').capaStatus).toBe('In progress');
  });

  it('reports "Not started" when a cluster has neither a cause nor a CAPA', () => {
    const rows = repeatFailureHotspots(MACHINES, TICKETS, opts);
    expect(rows.find((r) => r.component === 'Seal').capaStatus).toBe('Not started');
  });

  it('returns an empty list when nothing repeats', () => {
    expect(repeatFailureHotspots(MACHINES, [TICKETS[0]], opts)).toEqual([]);
  });
});

describe('normalizeCapaStatus', () => {
  it('folds the many spellings of "done" onto completed', () => {
    ['Done', 'completed', 'CLOSED', 'verified'].forEach((value) => {
      expect(normalizeCapaStatus(value)).toBe('completed');
    });
  });

  it('folds hyphenated and spaced progress values onto in_progress', () => {
    ['in-progress', 'In Progress', 'ongoing', 'started'].forEach((value) => {
      expect(normalizeCapaStatus(value)).toBe('in_progress');
    });
  });

  it('treats anything unrecognised, empty or null as open', () => {
    expect(normalizeCapaStatus('')).toBe('open');
    expect(normalizeCapaStatus(null)).toBe('open');
    expect(normalizeCapaStatus('waiting on vendor')).toBe('open');
  });

  it('has a human label for every state it can return', () => {
    ['open', 'in_progress', 'completed'].forEach((state) => {
      expect(CAPA_STATUS_LABEL[state]).toBeTruthy();
    });
  });
});

describe('capaTracker', () => {
  it('buckets actions by normalised status', () => {
    const tracker = capaTracker(TICKETS, MACHINES, opts);
    expect(tracker.counts.in_progress).toBe(1);
    expect(tracker.total).toBeGreaterThan(0);
  });

  it('normalises free-text statuses onto the three buckets', () => {
    const rows = [{ id: 'a', machine_id: 'm1', created_at: daysAgo(1), capa_status: 'Done', capa_action: 'x' }];
    expect(capaTracker(rows, MACHINES, opts).counts.completed).toBe(1);
  });

  it('flags an action past its due date as overdue', () => {
    const rows = [{ id: 'a', machine_id: 'm1', created_at: daysAgo(1), capa_action: 'x', capa_status: 'open', capa_due_at: daysAgo(3) }];
    expect(capaTracker(rows, MACHINES, opts).actions[0].overdue).toBe(true);
  });

  it('returns a null completion percentage when there are no actions', () => {
    expect(capaTracker([], MACHINES, opts).completionPct).toBeNull();
  });
});

describe('trendingIssues', () => {
  it('ranks issue themes by frequency', () => {
    const rows = trendingIssues(MACHINES, TICKETS, opts);
    expect(rows[0].count).toBeGreaterThanOrEqual(rows[rows.length - 1].count);
  });

  it('counts how many machines each theme affects', () => {
    const rows = trendingIssues(MACHINES, TICKETS, opts);
    expect(rows.every((r) => r.affectedMachines >= 1)).toBe(true);
  });

  it('respects the limit', () => {
    expect(trendingIssues(MACHINES, TICKETS, { now: NOW, limit: 2 }).length).toBeLessThanOrEqual(2);
  });

  it('suggests a cross-machine check when a theme spans machines', () => {
    const rows = [
      { id: 'a', machine_id: 'm1', component: 'Belt', created_at: hoursAgo(2) },
      { id: 'b', machine_id: 'm2', component: 'Belt', created_at: hoursAgo(3) },
    ];
    expect(trendingIssues(MACHINES, rows, opts)[0].suggestedAction).toContain('common cause');
  });

  it('returns an empty list when nothing was reported', () => {
    expect(trendingIssues(MACHINES, [], opts)).toEqual([]);
  });
});

/* =========================================================
   Cache
   ========================================================= */
describe('createMetricsCache', () => {
  it('computes once and reuses the value inside the TTL', () => {
    const cache = createMetricsCache({ ttlMs: 1000, clock: () => 0 });
    const compute = vi.fn(() => 42);
    expect(cache.resolve('k', compute)).toBe(42);
    expect(cache.resolve('k', compute)).toBe(42);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('recomputes once the TTL has elapsed', () => {
    let time = 0;
    const cache = createMetricsCache({ ttlMs: 100, clock: () => time });
    const compute = vi.fn(() => time);
    cache.resolve('k', compute);
    time = 500;
    cache.resolve('k', compute);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('keeps separate keys separate', () => {
    const cache = createMetricsCache({ clock: () => 0 });
    cache.resolve('a', () => 1);
    cache.resolve('b', () => 2);
    expect(cache.size).toBe(2);
  });

  it('clear() empties the cache', () => {
    const cache = createMetricsCache({ clock: () => 0 });
    cache.resolve('a', () => 1);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('returns undefined for a key that was never set', () => {
    expect(createMetricsCache().get('missing')).toBeUndefined();
  });
});

/* =========================================================
   Role bundle
   ========================================================= */
describe('buildRoleMetrics', () => {
  const input = { machines: MACHINES, tickets: TICKETS, team: TEAM, pmLogs: PM_LOGS, now: NOW };

  it('returns the owner bundle for the owner role', () => {
    const metrics = buildRoleMetrics('owner', input);
    expect(metrics.view).toBe(DASHBOARD_ROLES.OWNER);
    expect(metrics).toHaveProperty('valueAtRisk');
    expect(metrics).toHaveProperty('fleetHealth');
    expect(metrics).toHaveProperty('problemMachines');
  });

  it('returns the technician bundle with a queue', () => {
    const metrics = buildRoleMetrics('maintenance_technician', { ...input, user: { user_id: 'tech-1' } });
    expect(metrics.view).toBe(DASHBOARD_ROLES.TECHNICIAN);
    expect(metrics.queue.total).toBe(2);
  });

  it('returns the supervisor bundle with team and breaches', () => {
    const metrics = buildRoleMetrics('supervisor', input);
    expect(metrics.view).toBe(DASHBOARD_ROLES.SUPERVISOR);
    expect(metrics.team).toHaveLength(3);
    expect(metrics.breaches).toHaveLength(1);
  });

  it('returns the engineer bundle with reliability and CAPA', () => {
    const metrics = buildRoleMetrics('maintenance_engineer', input);
    expect(metrics.view).toBe(DASHBOARD_ROLES.ENGINEER);
    expect(metrics).toHaveProperty('reliability');
    expect(metrics).toHaveProperty('capa');
  });

  it('falls back to the owner bundle for an unknown role', () => {
    expect(buildRoleMetrics('quality_inspector', input).view).toBe(DASHBOARD_ROLES.OWNER);
  });

  it('does not throw when every table is missing', () => {
    expect(() => buildRoleMetrics('owner', {})).not.toThrow();
    expect(() => buildRoleMetrics('supervisor', {})).not.toThrow();
    expect(() => buildRoleMetrics('technician', {})).not.toThrow();
    expect(() => buildRoleMetrics('engineer', {})).not.toThrow();
  });
});
