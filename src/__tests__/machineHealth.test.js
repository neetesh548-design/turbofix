import { describe, it, expect } from 'vitest';
import {
  HEALTH,
  HEALTH_COLORS,
  daysUntil,
  daysSince,
  describeDayOffset,
  openTicketCount,
  hasCriticalTicket,
  nextPmInfo,
  lastMaintenanceInfo,
  computeMachineHealth,
  machineDisplayStatus,
  summarizeFleet,
  filterMachines,
  sortByHealth,
} from '../utils/machineHealth';
import { DEMO_MACHINES } from '../utils/demoMachines';

const NOW = new Date('2026-07-26T09:30:00');
const DAY = 24 * 60 * 60 * 1000;

/** ISO date string `offset` days from NOW. */
const dateFromNow = (offset) => new Date(NOW.getTime() + offset * DAY).toISOString().slice(0, 10);

/** Minimal machine row; override only what the assertion cares about. */
const machine = (overrides = {}) => ({
  machine_id: 'M001',
  machine_name: 'CNC Turning Center',
  location: 'Bay 2',
  status: 'healthy',
  track_record: { total: 0, open: 0, resolved: 0, recent: 0, open_list: [], recent_closed: [] },
  ...overrides,
});

describe('machineDisplayStatus', () => {
  it('moves a running machine with any open ticket to Down', () => {
    const row = machine({ track_record: { open: 1, open_list: [{ issue_text: 'Oil leak near bearing' }] } });
    expect(machineDisplayStatus(row).status).toBe(HEALTH.DOWN);
  });

  it('moves a running machine with an explicit downtime ticket to Down', () => {
    const row = machine({ track_record: { open: 1, open_list: [{ issue_text: 'Machine stopped and will not run' }] } });
    expect(machineDisplayStatus(row).status).toBe(HEALTH.DOWN);
  });

  it('shows initiated breakdown repair as Maintenance, not Down', () => {
    const row = machine({ track_record: { open: 1, open_list: [{ type: 'breakdown', lifecycle_stage: 'work_started', issue_text: 'Machine stopped' }] } });
    expect(machineDisplayStatus(row).status).toBe('maintenance');
  });

  it('shows a stopped machine as Maintenance once waiting for a spare', () => {
    const row = machine({ status: 'down', track_record: { open: 1, open_list: [{ lifecycle_stage: 'waiting_spare', issue_text: 'Motor failed' }] } });
    expect(machineDisplayStatus(row).status).toBe('maintenance');
  });

  it('keeps explicit maintenance authoritative over open tickets', () => {
    const row = machine({ status: 'under_maintenance', track_record: { open: 1, open_list: [{ issue_text: 'Inspection required' }] } });
    expect(machineDisplayStatus(row).status).toBe('maintenance');
  });

  it('ignores closed tickets and keeps the machine running', () => {
    const row = machine({ track_record: { open: 0, open_list: [], recent_closed: [{ issue_text: 'Machine stopped' }] } });
    expect(machineDisplayStatus(row).status).toBe(HEALTH.RUNNING);
  });

  it('ignores tickets closed by lifecycle stage even when status is stale', () => {
    const row = machine({ id: 'M001', track_record: { open: 0, open_list: [] } });
    const tickets = [{ machine_id: 'M001', status: 'open', lifecycle_stage: 'closed' }];
    expect(machineDisplayStatus(row, tickets).status).toBe(HEALTH.RUNNING);
  });
});

/** A machine carrying `count` open tickets, the first optionally critical. */
const withOpenTickets = (count, { critical = false, ...rest } = {}) => machine({
  has_open_tickets: count > 0,
  track_record: {
    total: count,
    open: count,
    resolved: 0,
    recent: count,
    open_list: Array.from({ length: count }, (_, index) => ({
      id: `T-${index}`,
      issue_text: 'Issue',
      urgency: critical && index === 0 ? 'critical' : 'medium',
      created_at: NOW.toISOString(),
    })),
    recent_closed: [],
  },
  ...rest,
});

describe('date helpers', () => {
  it('counts whole days to a future date regardless of clock time', () => {
    expect(daysUntil(dateFromNow(2), NOW)).toBe(2);
    expect(daysUntil(dateFromNow(45), NOW)).toBe(45);
  });

  it('returns a negative count for dates in the past', () => {
    expect(daysUntil(dateFromNow(-11), NOW)).toBe(-11);
    expect(daysSince(dateFromNow(-90), NOW)).toBe(90);
  });

  it('returns null rather than NaN for missing or invalid dates', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil('', NOW)).toBeNull();
    expect(daysUntil('not-a-date', NOW)).toBeNull();
    expect(daysSince(undefined, NOW)).toBeNull();
  });

  it('describes offsets in words a plant manager reads at a glance', () => {
    expect(describeDayOffset(0)).toBe('Today');
    expect(describeDayOffset(1)).toBe('Tomorrow');
    expect(describeDayOffset(-1)).toBe('Yesterday');
    expect(describeDayOffset(5)).toBe('In 5 days');
    expect(describeDayOffset(-12)).toBe('12 days ago');
    expect(describeDayOffset(null)).toBeNull();
  });
});

describe('openTicketCount', () => {
  it('reads the tracked count', () => {
    expect(openTicketCount(withOpenTickets(2))).toBe(2);
  });

  it('falls back to the boolean flag on rows without a track record', () => {
    expect(openTicketCount({ has_open_tickets: true })).toBe(1);
    expect(openTicketCount({ has_open_tickets: false })).toBe(0);
    expect(openTicketCount({})).toBe(0);
  });
});

describe('hasCriticalTicket', () => {
  it('detects a critical ticket regardless of casing', () => {
    expect(hasCriticalTicket(withOpenTickets(1, { critical: true }))).toBe(true);
    expect(hasCriticalTicket(withOpenTickets(1))).toBe(false);
  });

  it('is safe on rows with no ticket list', () => {
    expect(hasCriticalTicket({})).toBe(false);
  });
});

describe('nextPmInfo', () => {
  it('flags an overdue PM with the number of days lost', () => {
    const pm = nextPmInfo(machine({ next_maintenance_due: dateFromNow(-11) }), NOW);
    expect(pm.tone).toBe('overdue');
    expect(pm.daysLeft).toBe(-11);
    expect(pm.label).toBe('Overdue by 11 days');
  });

  it('marks a PM inside the week as due soon', () => {
    expect(nextPmInfo(machine({ next_maintenance_due: dateFromNow(2) }), NOW).tone).toBe('due-soon');
    expect(nextPmInfo(machine({ next_maintenance_due: dateFromNow(7) }), NOW).tone).toBe('due-soon');
  });

  it('treats a distant PM as fine', () => {
    const pm = nextPmInfo(machine({ next_maintenance_due: dateFromNow(45) }), NOW);
    expect(pm.tone).toBe('ok');
    expect(pm.label).toBe('Due in 45 days');
  });

  it('derives the due date from the interval when the column is empty', () => {
    const pm = nextPmInfo(
      machine({ last_maintenance_date: dateFromNow(-20), maintenance_interval_days: 30 }),
      NOW,
    );
    expect(pm.daysLeft).toBe(10);
    expect(pm.tone).toBe('ok');
  });

  it('reports "not scheduled" when there is nothing to go on', () => {
    const pm = nextPmInfo(machine(), NOW);
    expect(pm.tone).toBe('unknown');
    expect(pm.label).toBe('Not scheduled');
  });
});

describe('lastMaintenanceInfo', () => {
  it('grades service age into fresh, aging and stale', () => {
    expect(lastMaintenanceInfo(machine({ last_maintenance_date: dateFromNow(-10) }), NOW).tone).toBe('ok');
    expect(lastMaintenanceInfo(machine({ last_maintenance_date: dateFromNow(-60) }), NOW).tone).toBe('aging');
    expect(lastMaintenanceInfo(machine({ last_maintenance_date: dateFromNow(-120) }), NOW).tone).toBe('stale');
  });

  it('handles a machine that was never serviced', () => {
    const service = lastMaintenanceInfo(machine(), NOW);
    expect(service.tone).toBe('unknown');
    expect(service.label).toBe('No record yet');
  });
});

describe('computeMachineHealth', () => {
  it('is green when nothing is outstanding', () => {
    const health = computeMachineHealth(
      machine({ last_maintenance_date: dateFromNow(-10), next_maintenance_due: dateFromNow(45) }),
      NOW,
    );
    expect(health.status).toBe(HEALTH.RUNNING);
    expect(health.color).toBe(HEALTH_COLORS[HEALTH.RUNNING]);
  });

  it('stays green when a PM is merely coming up soon', () => {
    // A machine serviced on schedule is a healthy machine — only an *overdue*
    // PM changes the colour.
    const health = computeMachineHealth(
      machine({ last_maintenance_date: dateFromNow(-28), next_maintenance_due: dateFromNow(2) }),
      NOW,
    );
    expect(health.status).toBe(HEALTH.RUNNING);
    expect(health.pm.tone).toBe('due-soon');
  });

  it('turns yellow for a single open ticket', () => {
    expect(computeMachineHealth(withOpenTickets(1), NOW).status).toBe(HEALTH.ISSUES);
  });

  it('turns red once two tickets pile up', () => {
    const health = computeMachineHealth(withOpenTickets(2), NOW);
    expect(health.status).toBe(HEALTH.DOWN);
    expect(health.reasons).toContain('2 open tickets');
  });

  it('turns red when the PM is overdue', () => {
    const health = computeMachineHealth(machine({ next_maintenance_due: dateFromNow(-3) }), NOW);
    expect(health.status).toBe(HEALTH.DOWN);
  });

  it('turns red when the machine itself is stopped', () => {
    expect(computeMachineHealth(machine({ status: 'breakdown' }), NOW).status).toBe(HEALTH.DOWN);
    expect(computeMachineHealth(machine({ status: 'waiting_spare' }), NOW).status).toBe(HEALTH.DOWN);
  });

  it('turns yellow when service is over 90 days old', () => {
    const health = computeMachineHealth(machine({ last_maintenance_date: dateFromNow(-120) }), NOW);
    expect(health.status).toBe(HEALTH.ISSUES);
    expect(health.reasons).toContain('Last serviced 120 days ago');
  });

  it('always explains itself', () => {
    const health = computeMachineHealth(machine({ next_maintenance_due: dateFromNow(45) }), NOW);
    expect(health.reasons.length).toBeGreaterThan(0);
  });

  it('never downgrades a red machine back to yellow', () => {
    // Stopped (red) plus a stale service (yellow) must remain red.
    const health = computeMachineHealth(
      machine({ status: 'breakdown', last_maintenance_date: dateFromNow(-200) }),
      NOW,
    );
    expect(health.status).toBe(HEALTH.DOWN);
  });

  it('is safe on an empty object', () => {
    expect(computeMachineHealth({}, NOW).status).toBe(HEALTH.RUNNING);
  });
});

describe('demo fleet', () => {
  // The demo rows are the fixture the design was specified against, so their
  // health states are part of the contract.
  const byId = Object.fromEntries(DEMO_MACHINES.map((row) => [row.machine_id, row]));

  it('shows a clean machine with an imminent PM as green', () => {
    expect(computeMachineHealth(byId['DEMO-M001']).status).toBe(HEALTH.RUNNING);
  });

  it('shows the machine with two tickets and an overdue PM as red', () => {
    expect(computeMachineHealth(byId['DEMO-M002']).status).toBe(HEALTH.DOWN);
  });

  it('shows a clean machine with a distant PM as green', () => {
    expect(computeMachineHealth(byId['DEMO-M003']).status).toBe(HEALTH.RUNNING);
  });

  it('shows the machine with one critical ticket as yellow', () => {
    const health = computeMachineHealth(byId['DEMO-M004']);
    expect(health.status).toBe(HEALTH.ISSUES);
    expect(health.critical).toBe(true);
  });

  it('summarises the expanded demo fleet', () => {
    expect(summarizeFleet(DEMO_MACHINES)).toEqual({ all: 12, running: 8, issues: 0, down: 4, maintenance: 0 });
  });
});

describe('filterMachines', () => {
  const fleet = [
    machine({ machine_id: 'M001', machine_name: 'CNC Turning Center', location: 'Bay 2' }),
    withOpenTickets(2, { machine_id: 'M002', machine_name: 'Hydraulic Press', location: 'Bay 1' }),
    withOpenTickets(1, { machine_id: 'M003', machine_name: 'Air Compressor', location: 'Utility Room' }),
  ];

  it('returns everything by default', () => {
    expect(filterMachines(fleet, {}, NOW)).toHaveLength(3);
  });

  it('matches machine name case-insensitively', () => {
    expect(filterMachines(fleet, { search: 'hydraulic' }, NOW).map((m) => m.machine_id)).toEqual(['M002']);
  });

  it('matches location', () => {
    expect(filterMachines(fleet, { search: 'utility' }, NOW).map((m) => m.machine_id)).toEqual(['M003']);
  });

  it('filters by health status', () => {
    expect(filterMachines(fleet, { status: HEALTH.DOWN }, NOW).map((m) => m.machine_id)).toEqual(['M002', 'M003']);
    expect(filterMachines(fleet, { status: HEALTH.ISSUES }, NOW).map((m) => m.machine_id)).toEqual([]);
    expect(filterMachines(fleet, { status: HEALTH.RUNNING }, NOW).map((m) => m.machine_id)).toEqual(['M001']);
  });

  it('combines search and status', () => {
    expect(filterMachines(fleet, { search: 'bay', status: HEALTH.DOWN }, NOW).map((m) => m.machine_id)).toEqual(['M002']);
  });

  it('is safe on a missing list', () => {
    expect(filterMachines(undefined, {}, NOW)).toEqual([]);
  });
});

describe('sortByHealth', () => {
  it('floats the machines needing action to the top', () => {
    const fleet = [
      machine({ machine_id: 'M001' }),
      withOpenTickets(1, { machine_id: 'M003' }),
      withOpenTickets(2, { machine_id: 'M002' }),
    ];
    expect(sortByHealth(fleet, NOW).map((m) => m.machine_id)).toEqual(['M002', 'M003', 'M001']);
  });

  it('does not mutate the input array', () => {
    const fleet = [withOpenTickets(1, { machine_id: 'M003' }), machine({ machine_id: 'M001' })];
    const snapshot = fleet.map((m) => m.machine_id);
    sortByHealth(fleet, NOW);
    expect(fleet.map((m) => m.machine_id)).toEqual(snapshot);
  });
});
