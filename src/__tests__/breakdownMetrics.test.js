/**
 * Breakdown logger — unit coverage for utils/breakdownRouter.js
 *
 * The three things worth guarding, in order of what would hurt most
 * if it broke silently:
 *
 *   1. Routing. A report that lands in nobody's queue is a machine
 *      nobody fixes, so every branch — including the degraded ones —
 *      has a test that names the person it reaches.
 *   2. The confirmation sentence. It is a promise made to the shop
 *      floor; it must be computed from the same routing decision that
 *      files the report, never from a separate guess.
 *   3. Classification. Keyword models rot quietly. These tests pin the
 *      behaviour the UI depends on: severity ordering, Hinglish, and
 *      the fact that an empty box never claims confidence.
 */

import { describe, it, expect } from 'vitest';
import {
  BREAKDOWN_ROLES,
  DEFAULT_BREAKDOWN_ROLE,
  GENERAL_CATEGORY,
  HISTORY_WINDOW_DAYS,
  QUEUES,
  TECH_SEVERITY,
  URGENCY,
  URGENCY_ORDER,
  assignedEngineer,
  assignedSupervisor,
  assignedTechnician,
  buildBreakdownRecord,
  categoryMeta,
  classifyIssue,
  confirmationMessage,
  formatResponseWindow,
  hourlyDowntimeCost,
  isAtLeastUrgent,
  isReportClosed,
  machineFromQr,
  machineHistoryInsight,
  machineIdOf,
  machineNameOf,
  nextReportId,
  nextWorkOrderNumber,
  parseMachineQr,
  reporterSummary,
  resolveBreakdownRole,
  routeBreakdown,
  searchMachines,
  shiftSummary,
  urgencyMeta,
  validateDraft,
  vendorMachines,
  vendorSummary,
} from '../utils/breakdownRouter.js';
import {
  DEMO_BREAKDOWN_MACHINES,
  DEMO_BREAKDOWN_REPORTS,
  DEMO_TECHNICIANS,
  shouldUseDemoMachines,
  shouldUseDemoReports,
} from '../utils/demoBreakdown.js';

const NOW = new Date('2026-07-26T10:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const person = (name, role) => ({ user_id: `u-${name}`, name, role });

/** Minimal machine factory — each test overrides only what it cares about. */
function machine(overrides = {}) {
  return {
    machine_id: 'M001',
    machine_name: 'CNC Lathe 1',
    location: 'Bay 2',
    asset_code: 'CNC-04',
    hourly_downtime_cost: 18000,
    assignments: {
      technician: person('Rajesh Kumar', 'maintenance_technician'),
      supervisor: person('S. Patil', 'supervisor'),
    },
    ...overrides,
  };
}

/* ===========================================================
   Role resolution
   =========================================================== */

describe('role resolution', () => {
  it('maps shop-floor roles to the operator form', () => {
    ['operator', 'machine_operator', 'quality_inspector', 'safety_officer'].forEach((role) => {
      expect(resolveBreakdownRole(role)).toBe(BREAKDOWN_ROLES.OPERATOR);
    });
  });

  it('maps maintenance staff to the technician form', () => {
    ['technician', 'maintenance_technician', 'contractor'].forEach((role) => {
      expect(resolveBreakdownRole(role)).toBe(BREAKDOWN_ROLES.TECHNICIAN);
    });
  });

  it('maps anyone who can assign work to the supervisor form', () => {
    ['supervisor', 'maintenance_engineer', 'maintenance_head', 'owner', 'admin'].forEach((role) => {
      expect(resolveBreakdownRole(role)).toBe(BREAKDOWN_ROLES.SUPERVISOR);
    });
  });

  it('maps external partners to the vendor form', () => {
    ['vendor', 'oem', 'external_partner'].forEach((role) => {
      expect(resolveBreakdownRole(role)).toBe(BREAKDOWN_ROLES.VENDOR);
    });
  });

  it('falls back to the lowest-friction form when signed out or unmapped', () => {
    expect(resolveBreakdownRole(null)).toBe(DEFAULT_BREAKDOWN_ROLE);
    expect(resolveBreakdownRole('')).toBe(BREAKDOWN_ROLES.OPERATOR);
    expect(resolveBreakdownRole('astronaut')).toBe(BREAKDOWN_ROLES.OPERATOR);
  });

  it('is case and whitespace insensitive', () => {
    expect(resolveBreakdownRole('  Maintenance_Technician ')).toBe(BREAKDOWN_ROLES.TECHNICIAN);
  });
});

/* ===========================================================
   Urgency
   =========================================================== */

describe('urgency metadata', () => {
  it('orders the four levels most urgent first', () => {
    const ranks = URGENCY_ORDER.map((level) => urgencyMeta(level).rank);
    expect(ranks).toEqual([0, 1, 2, 3]);
  });

  it('promises a shorter response the more urgent the report', () => {
    const windows = URGENCY_ORDER.map((level) => urgencyMeta(level).responseMinutes);
    expect(windows).toEqual([...windows].sort((a, b) => a - b));
  });

  it('treats an unknown urgency as medium rather than throwing', () => {
    expect(urgencyMeta(undefined).value).toBe(URGENCY.MEDIUM);
    expect(urgencyMeta('catastrophic').value).toBe(URGENCY.MEDIUM);
  });

  it('compares severity by rank, not alphabetically', () => {
    expect(isAtLeastUrgent(URGENCY.CRITICAL, URGENCY.HIGH)).toBe(true);
    expect(isAtLeastUrgent(URGENCY.LOW, URGENCY.HIGH)).toBe(false);
  });
});

/* ===========================================================
   Classification
   =========================================================== */

describe('classifyIssue — urgency', () => {
  it('calls anything with a safety word critical', () => {
    ['smoke coming from the panel', 'there is a fire near the press', 'operator got a shock']
      .forEach((text) => {
        expect(classifyIssue(text).urgency).toBe(URGENCY.CRITICAL);
      });
  });

  it('calls a stopped machine high', () => {
    ['machine will not start', 'complete breakdown on line 2', 'spindle seized']
      .forEach((text) => {
        expect(classifyIssue(text).urgency).toBe(URGENCY.HIGH);
      });
  });

  it('calls a running-but-wrong machine medium', () => {
    ['spindle making weird noise', 'pressure dropping slowly', 'motor running hot']
      .forEach((text) => {
        expect(classifyIssue(text).urgency).toBe(URGENCY.MEDIUM);
      });
  });

  it('calls housekeeping low', () => {
    expect(classifyIssue('routine cleaning of the guard, no rush').urgency).toBe(URGENCY.LOW);
  });

  it('lets the most severe reading win when a sentence says several things', () => {
    // "slow" alone is medium; the smoke is what matters.
    expect(classifyIssue('running slow and there is smoke').urgency).toBe(URGENCY.CRITICAL);
  });

  it('understands shop-floor Hinglish', () => {
    expect(classifyIssue('machine band hai').urgency).toBe(URGENCY.HIGH);
    expect(classifyIssue('awaaz aa rahi hai').urgency).toBe(URGENCY.MEDIUM);
    expect(classifyIssue('aag lag gayi').urgency).toBe(URGENCY.CRITICAL);
  });

  it('defaults to medium rather than guessing on an unreadable sentence', () => {
    const result = classifyIssue('asdf qwerty');
    expect(result.urgency).toBe(URGENCY.MEDIUM);
    expect(result.confidence).toBe('none');
  });

  it('does not fire on a keyword buried inside another word', () => {
    // "shot" contains "hot", "repair" contains "air", "gasket" contains
    // "gas" — none of these should raise the urgency on their own.
    ['one shot part', 'repair done last week', 'gasket replaced'].forEach((text) => {
      expect(classifyIssue(text).confidence).toBe('none');
    });
  });

  it('still matches a keyword that runs on at the end', () => {
    expect(classifyIssue('the chute is jammed').urgency).toBe(URGENCY.HIGH);
    expect(classifyIssue('needs lubrication').urgency).toBe(URGENCY.LOW);
  });
});

describe('classifyIssue — category and confidence', () => {
  it('sends noise and vibration to mechanical, with a bearings hint', () => {
    const result = classifyIssue('spindle bearing making a knocking noise');
    expect(result.category).toBe('mechanical');
    expect(result.hint).toMatch(/bearing/i);
    expect(result.nextAction).toMatch(/bearing/i);
  });

  it('sends leaks to hydraulic and seals', () => {
    const result = classifyIssue('oil leak from the cylinder seal');
    expect(result.category).toBe('hydraulic');
    expect(result.hint).toMatch(/seal/i);
  });

  it('sends a machine that will not start to electrical', () => {
    expect(classifyIssue("won't start, no power at the panel").category).toBe('electrical');
  });

  it('sends overheating to thermal', () => {
    expect(classifyIssue('motor overheating at full load').category).toBe('thermal');
  });

  it('sends alarm codes to controls', () => {
    expect(classifyIssue('HMI showing error code 402').category).toBe('controls');
  });

  it('falls back to a general category with usable copy, never null', () => {
    const result = classifyIssue('something feels off');
    expect(result.category).toBe(GENERAL_CATEGORY.value);
    expect(result.hint).toBeTruthy();
    expect(result.nextAction).toBeTruthy();
  });

  it('claims high confidence only with corroborating keywords', () => {
    expect(classifyIssue('').confidence).toBe('none');
    expect(classifyIssue('leak').confidence).toBe('low');
    expect(classifyIssue('oil leak from the hydraulic cylinder').confidence).toBe('high');
  });

  it('survives null, numbers and objects without throwing', () => {
    [null, undefined, 42, {}].forEach((input) => {
      expect(() => classifyIssue(input)).not.toThrow();
      expect(classifyIssue(input).urgency).toBe(URGENCY.MEDIUM);
    });
  });

  it('quotes a response window matching the urgency it picked', () => {
    const result = classifyIssue('smoke from the motor');
    expect(result.responseMinutes).toBe(urgencyMeta(URGENCY.CRITICAL).responseMinutes);
  });
});

describe('categoryMeta', () => {
  it('returns the general fallback for anything unknown', () => {
    expect(categoryMeta('quantum').value).toBe('general');
    expect(categoryMeta(null).value).toBe('general');
  });

  it('is case insensitive on known categories', () => {
    expect(categoryMeta('HYDRAULIC').label).toMatch(/hydraulic/i);
  });
});

/* ===========================================================
   Machines
   =========================================================== */

describe('machine helpers', () => {
  it('reads id and name from either row shape', () => {
    expect(machineIdOf({ id: 'A' })).toBe('A');
    expect(machineIdOf({ machine_id: 'B' })).toBe('B');
    expect(machineNameOf({ name: 'Press' })).toBe('Press');
    expect(machineNameOf({ machine_name: 'Lathe' })).toBe('Lathe');
  });

  it('names an unknown machine rather than rendering "undefined"', () => {
    expect(machineNameOf(null)).toBe('Unknown machine');
  });

  it('finds the assigned technician in either assignment shape', () => {
    expect(assignedTechnician(machine()).name).toBe('Rajesh Kumar');
    expect(assignedTechnician({ primary_technician_name: 'Anil' }).name).toBe('Anil');
    expect(assignedTechnician({})).toBeNull();
  });

  it('finds the supervisor and engineer when present', () => {
    expect(assignedSupervisor(machine()).name).toBe('S. Patil');
    expect(assignedEngineer(machine())).toBeNull();
    expect(assignedEngineer(machine({
      assignments: { engineer: person('K. Nair', 'maintenance_engineer') },
    })).name).toBe('K. Nair');
  });

  it('never reports a negative or non-numeric downtime cost', () => {
    expect(hourlyDowntimeCost(machine())).toBe(18000);
    expect(hourlyDowntimeCost({ hourly_downtime_cost: -5 })).toBe(0);
    expect(hourlyDowntimeCost({ hourly_downtime_cost: 'lots' })).toBe(0);
    expect(hourlyDowntimeCost(null)).toBe(0);
  });
});

describe('searchMachines', () => {
  const fleet = [
    machine({ machine_id: 'M001', machine_name: 'CNC Lathe 1', location: 'Bay 2' }),
    machine({ machine_id: 'M002', machine_name: 'Hydraulic Press #2', location: 'Bay 1', asset_code: 'HYD-01' }),
    machine({ machine_id: 'M003', machine_name: 'Surface Grinder', location: 'Bay 3' }),
  ];

  it('returns everything (to the limit) on an empty query', () => {
    expect(searchMachines(fleet, '')).toHaveLength(3);
    expect(searchMachines(fleet, '   ')).toHaveLength(3);
  });

  it('matches on name, asset code and location', () => {
    expect(searchMachines(fleet, 'lathe')[0].machine_id).toBe('M001');
    expect(searchMachines(fleet, 'HYD-01')[0].machine_id).toBe('M002');
    expect(searchMachines(fleet, 'bay 3')[0].machine_id).toBe('M003');
  });

  it('ranks a name-prefix match above a match found elsewhere', () => {
    const results = searchMachines(fleet, 'cnc');
    expect(results[0].machine_name).toBe('CNC Lathe 1');
  });

  it('is case insensitive and returns an empty list on no match', () => {
    expect(searchMachines(fleet, 'LATHE')).toHaveLength(1);
    expect(searchMachines(fleet, 'submarine')).toEqual([]);
  });

  it('honours the limit', () => {
    expect(searchMachines(fleet, '', { limit: 2 })).toHaveLength(2);
  });

  it('tolerates a null fleet', () => {
    expect(searchMachines(null, 'anything')).toEqual([]);
  });
});

describe('vendorMachines', () => {
  const fleet = [
    machine({ machine_id: 'M001' }),
    machine({ machine_id: 'M002', vendor_id: 'VND-A' }),
    machine({ machine_id: 'M003', vendor_contract: { vendor_id: 'VND-B' } }),
  ];

  it('shows a vendor only the machines they hold a contract on', () => {
    expect(vendorMachines(fleet, 'VND-A').map(machineIdOf)).toEqual(['M002']);
    expect(vendorMachines(fleet, 'VND-B').map(machineIdOf)).toEqual(['M003']);
  });

  it('never leaks uncontracted machines', () => {
    expect(vendorMachines(fleet, 'VND-A').some((row) => machineIdOf(row) === 'M001')).toBe(false);
  });

  it('is case insensitive on the contract id', () => {
    expect(vendorMachines(fleet, 'vnd-a')).toHaveLength(1);
  });

  it('returns every contracted machine when the vendor id is unknown', () => {
    expect(vendorMachines(fleet, null)).toHaveLength(2);
  });
});

describe('QR parsing', () => {
  it('accepts the turbofix:// scheme', () => {
    expect(parseMachineQr('turbofix://machine/M001')).toBe('M001');
  });

  it('accepts a gateway URL with a machine parameter', () => {
    expect(parseMachineQr('https://turbofix.co.in/qr-gateway.html?machine=M002')).toBe('M002');
    expect(parseMachineQr('https://turbofix.co.in/g?machine_id=M003')).toBe('M003');
  });

  it('accepts a URL whose last path segment is the id', () => {
    expect(parseMachineQr('https://turbofix.co.in/m/M004')).toBe('M004');
  });

  it('accepts a bare id from an old sticker', () => {
    expect(parseMachineQr('CNC-04')).toBe('CNC-04');
  });

  it('rejects a mis-scan rather than selecting the wrong machine', () => {
    expect(parseMachineQr('')).toBeNull();
    expect(parseMachineQr(null)).toBeNull();
    expect(parseMachineQr('scan me for a free holiday')).toBeNull();
  });

  it('resolves a scan to a machine by id, asset code or serial', () => {
    const fleet = [machine({ machine_id: 'M001', asset_code: 'CNC-04', serial_no: 'SN-9' })];
    expect(machineFromQr(fleet, 'turbofix://machine/M001')?.machine_id).toBe('M001');
    expect(machineFromQr(fleet, 'CNC-04')?.machine_id).toBe('M001');
    expect(machineFromQr(fleet, 'SN-9')?.machine_id).toBe('M001');
    expect(machineFromQr(fleet, 'M999')).toBeNull();
  });
});

/* ===========================================================
   History
   =========================================================== */

describe('machineHistoryInsight', () => {
  const reports = [
    { machine_id: 'M001', issue_text: 'Spindle noise at high rpm', created_at: daysAgo(5) },
    { machine_id: 'M001', issue_text: 'Spindle vibration returned', created_at: daysAgo(20), resolution_note: 'Bearing replaced', closed_at: daysAgo(19) },
    { machine_id: 'M001', issue_text: 'Spindle bearing noise', created_at: daysAgo(50) },
    { machine_id: 'M002', issue_text: 'Oil leak', created_at: daysAgo(3) },
  ];

  it('says nothing when the machine has no history', () => {
    expect(machineHistoryInsight('M999', reports, { now: NOW })).toBeNull();
    expect(machineHistoryInsight('M001', [], { now: NOW })).toBeNull();
  });

  it('says nothing when there is no machine selected yet', () => {
    expect(machineHistoryInsight('', reports, { now: NOW })).toBeNull();
    expect(machineHistoryInsight(null, reports, { now: NOW })).toBeNull();
  });

  it('calls out a repeated theme', () => {
    const insight = machineHistoryInsight('M001', reports, { now: NOW });
    expect(insight.theme).toBe('spindle');
    expect(insight.themeCount).toBe(3);
    expect(insight.note).toMatch(/spindle/);
  });

  it('surfaces the last repair note so the reporter can check it first', () => {
    const insight = machineHistoryInsight('M001', reports, { now: NOW });
    expect(insight.lastRepair.resolution_note).toBe('Bearing replaced');
  });

  it('does not claim a repeat from a single report', () => {
    const insight = machineHistoryInsight('M002', reports, { now: NOW });
    expect(insight.total).toBe(1);
    expect(insight.theme).toBeNull();
    expect(insight.note).toMatch(/1 report /);
  });

  it('ignores anything older than the window', () => {
    const stale = [{ machine_id: 'M001', issue_text: 'Spindle noise', created_at: daysAgo(200) }];
    expect(machineHistoryInsight('M001', stale, { now: NOW })).toBeNull();
    expect(machineHistoryInsight('M001', stale, { now: NOW, windowDays: 365 }).total).toBe(1);
  });

  it('defaults the window to 90 days', () => {
    const insight = machineHistoryInsight('M001', reports, { now: NOW });
    expect(insight.windowDays).toBe(HISTORY_WINDOW_DAYS);
  });
});

/* ===========================================================
   Routing — the part that must never lose a report
   =========================================================== */

describe('routeBreakdown — operator', () => {
  it('sends the report to the technician assigned to the machine', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine(), urgency: URGENCY.MEDIUM });
    expect(routing.queue).toBe(QUEUES.TECHNICIAN);
    expect(routing.primary.name).toBe('Rajesh Kumar');
    expect(routing.escalated).toBe(false);
  });

  it('copies the supervisor on a critical report', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine(), urgency: URGENCY.CRITICAL });
    expect(routing.escalated).toBe(true);
    expect(routing.notify.map((p) => p.name)).toEqual(['Rajesh Kumar', 'S. Patil']);
  });

  it('falls back to the supervisor when no technician is assigned', () => {
    const orphan = machine({ assignments: { supervisor: person('S. Patil', 'supervisor') } });
    const routing = routeBreakdown({ role: 'operator', machine: orphan });
    expect(routing.queue).toBe(QUEUES.SUPERVISOR);
    expect(routing.primary.name).toBe('S. Patil');
  });

  it('still files the report when nobody at all is assigned', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine({ assignments: {} }) });
    expect(routing.queue).toBe(QUEUES.SUPERVISOR);
    expect(routing.primary).toBeNull();
    expect(routing.reason).toMatch(/nobody is assigned/i);
  });
});

describe('routeBreakdown — technician', () => {
  const reporter = { name: 'Anil Kumar', role: 'maintenance_technician', userId: 'u-anil' };

  it('keeps "I can fix it" on the technician’s own queue', () => {
    const routing = routeBreakdown({
      role: 'maintenance_technician', machine: machine(), severity: TECH_SEVERITY.SELF, reporter,
    });
    expect(routing.queue).toBe(QUEUES.TECHNICIAN);
    expect(routing.primary.name).toBe('Anil Kumar');
    expect(routing.escalated).toBe(false);
  });

  it('escalates "needs supervisor" to the supervisor queue', () => {
    const routing = routeBreakdown({
      role: 'maintenance_technician', machine: machine(), severity: TECH_SEVERITY.SUPERVISOR, reporter,
    });
    expect(routing.queue).toBe(QUEUES.SUPERVISOR);
    expect(routing.primary.name).toBe('S. Patil');
    expect(routing.escalated).toBe(true);
  });

  it('escalates "needs engineer" to engineering', () => {
    const withEngineer = machine({
      assignments: { engineer: person('K. Nair', 'maintenance_engineer'), supervisor: person('S. Patil', 'supervisor') },
    });
    const routing = routeBreakdown({
      role: 'maintenance_technician', machine: withEngineer, severity: TECH_SEVERITY.ENGINEER, reporter,
    });
    expect(routing.queue).toBe(QUEUES.ENGINEER);
    expect(routing.primary.name).toBe('K. Nair');
  });

  it('routes an engineer escalation to the supervisor when no engineer exists', () => {
    const routing = routeBreakdown({
      role: 'maintenance_technician', machine: machine(), severity: TECH_SEVERITY.ENGINEER, reporter,
    });
    expect(routing.primary.name).toBe('S. Patil');
    expect(routing.escalated).toBe(true);
  });
});

describe('routeBreakdown — supervisor', () => {
  it('honours the technician the supervisor picked', () => {
    const routing = routeBreakdown({
      role: 'supervisor',
      machine: machine(),
      assignTo: { name: 'Ramesh Yadav', role: 'maintenance_technician', userId: 'u-ramesh' },
    });
    expect(routing.queue).toBe(QUEUES.TECHNICIAN);
    expect(routing.primary.name).toBe('Ramesh Yadav');
    expect(routing.reason).toMatch(/assigned by you/i);
  });

  it('falls back to the machine’s own technician when none is picked', () => {
    const routing = routeBreakdown({ role: 'supervisor', machine: machine() });
    expect(routing.primary.name).toBe('Rajesh Kumar');
  });

  it('copies engineering on a critical supervisor report', () => {
    const full = machine({
      assignments: {
        technician: person('Rajesh Kumar', 'maintenance_technician'),
        supervisor: person('S. Patil', 'supervisor'),
        engineer: person('K. Nair', 'maintenance_engineer'),
      },
    });
    const routing = routeBreakdown({ role: 'supervisor', machine: full, urgency: URGENCY.CRITICAL });
    expect(routing.notify.map((p) => p.name)).toContain('K. Nair');
    expect(routing.escalated).toBe(true);
  });
});

describe('routeBreakdown — vendor', () => {
  const vendorContact = { name: 'Vikram Shah', role: 'vendor' };

  it('reaches the plant technician and keeps the vendor on the thread', () => {
    const routing = routeBreakdown({ role: 'vendor', machine: machine(), vendorContact });
    expect(routing.queue).toBe(QUEUES.TECHNICIAN);
    expect(routing.primary.name).toBe('Rajesh Kumar');
    expect(routing.notify.map((p) => p.name)).toContain('Vikram Shah');
  });

  it('holds the report on the vendor queue when the plant has nobody on the asset', () => {
    const routing = routeBreakdown({
      role: 'vendor', machine: machine({ assignments: {} }), vendorContact,
    });
    expect(routing.primary.name).toBe('Vikram Shah');
  });
});

describe('routeBreakdown — resilience', () => {
  it('does not throw on entirely missing input', () => {
    expect(() => routeBreakdown()).not.toThrow();
    expect(() => routeBreakdown({})).not.toThrow();
  });

  it('always returns a queue and a response window', () => {
    const routing = routeBreakdown({});
    expect(routing.queue).toBeTruthy();
    expect(routing.responseMinutes).toBeGreaterThan(0);
  });

  it('never emits a null recipient in the notify list', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine({ assignments: {} }) });
    expect(routing.notify.every(Boolean)).toBe(true);
  });
});

/* ===========================================================
   Confirmation — the promise made to the shop floor
   =========================================================== */

describe('formatResponseWindow', () => {
  it('reads in minutes, hours or days as the size demands', () => {
    expect(formatResponseWindow(15)).toBe('15 min');
    expect(formatResponseWindow(60)).toBe('60 min');
    expect(formatResponseWindow(240)).toBe('4 hr');
    expect(formatResponseWindow(1440)).toBe('1 day');
    expect(formatResponseWindow(2880)).toBe('2 days');
  });

  it('never promises zero minutes', () => {
    expect(formatResponseWindow(0)).toBe('1 min');
    expect(formatResponseWindow(null)).toBe('1 min');
  });
});

describe('confirmationMessage', () => {
  it('names the person and the time', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine(), urgency: URGENCY.HIGH });
    const message = confirmationMessage(routing, { machine: machine() });
    expect(message).toMatch(/Rajesh Kumar/);
    expect(message).toMatch(/CNC Lathe 1/);
    expect(message).toMatch(/30 min/);
  });

  it('names everyone else who was notified on an escalation', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine(), urgency: URGENCY.CRITICAL });
    expect(confirmationMessage(routing, { machine: machine() })).toMatch(/S\. Patil also notified/);
  });

  it('says plainly when nobody is assigned rather than inventing a name', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine({ assignments: {} }) });
    const message = confirmationMessage(routing, { machine: machine({ assignments: {} }) });
    expect(message).toMatch(/nobody is assigned/i);
    expect(message).toMatch(/supervisor queue/i);
  });

  it('quotes the same window the routing decided', () => {
    const routing = routeBreakdown({ role: 'operator', machine: machine(), urgency: URGENCY.CRITICAL });
    expect(confirmationMessage(routing, {})).toContain(formatResponseWindow(routing.responseMinutes));
  });
});

/* ===========================================================
   Record building
   =========================================================== */

describe('id generation', () => {
  it('continues the existing work-order sequence', () => {
    expect(nextWorkOrderNumber([{ wo_number: 'WO-00007' }, { wo_number: 'WO-00003' }])).toBe('WO-00008');
    expect(nextWorkOrderNumber([])).toBe('WO-00001');
    expect(nextWorkOrderNumber(null)).toBe('WO-00001');
  });

  it('continues the existing report sequence', () => {
    expect(nextReportId([{ id: 'BRK-0012' }])).toBe('BRK-0013');
    expect(nextReportId([])).toBe('BRK-0001');
  });

  it('ignores rows whose id is not numbered', () => {
    expect(nextWorkOrderNumber([{ wo_number: 'legacy' }, { wo_number: 'WO-00002' }])).toBe('WO-00003');
  });
});

describe('buildBreakdownRecord', () => {
  const user = { name: 'Suresh', role: 'operator', user_id: 'u-suresh' };

  it('produces one flat row carrying the routing decision', () => {
    const { record, routing } = buildBreakdownRecord(
      { machine: machine(), issueText: 'spindle making weird noise' },
      { role: 'operator', user, reports: [], now: NOW },
    );

    expect(record.machine_id).toBe('M001');
    expect(record.issue_text).toBe('spindle making weird noise');
    expect(record.urgency).toBe(URGENCY.MEDIUM);
    expect(record.category).toBe('mechanical');
    expect(record.reported_by).toBe('Suresh');
    expect(record.reported_by_role).toBe(BREAKDOWN_ROLES.OPERATOR);
    expect(record.assigned_to).toBe('Rajesh Kumar');
    expect(record.queue).toBe(routing.queue);
    expect(record.status).toBe('reported');
    expect(record.created_at).toBe(NOW.toISOString());
  });

  it('lets an explicit urgency override the classifier', () => {
    const { record } = buildBreakdownRecord(
      { machine: machine(), issueText: 'small noise', urgency: URGENCY.CRITICAL },
      { role: 'operator', user, now: NOW },
    );
    expect(record.urgency).toBe(URGENCY.CRITICAL);
  });

  it('records severity only for technicians and reason only for supervisors', () => {
    const tech = buildBreakdownRecord(
      { machine: machine(), issueText: 'bearing gone', severity: TECH_SEVERITY.SUPERVISOR },
      { role: 'maintenance_technician', user, now: NOW },
    ).record;
    expect(tech.severity).toBe(TECH_SEVERITY.SUPERVISOR);
    expect(tech.report_reason).toBeNull();

    const supervisor = buildBreakdownRecord(
      { machine: machine(), issueText: 'oil leak', reason: 'safety' },
      { role: 'supervisor', user, now: NOW },
    ).record;
    expect(supervisor.report_reason).toBe('safety');
    expect(supervisor.severity).toBeNull();
  });

  it('carries the machine downtime cost for queue prioritisation', () => {
    const { record } = buildBreakdownRecord(
      { machine: machine(), issueText: 'press down' },
      { role: 'supervisor', user, now: NOW },
    );
    expect(record.downtime_cost_per_hour).toBe(18000);
  });

  it('tags a vendor report with the vendor id', () => {
    const { record } = buildBreakdownRecord(
      { machine: machine(), issueText: 'seal weeping', vendorId: 'VND-A', contactName: 'Vikram' },
      { role: 'vendor', user: null, now: NOW },
    );
    expect(record.vendor_id).toBe('VND-A');
    expect(record.reported_by).toBe('Vikram');
  });

  it('builds a usable record even with an empty draft', () => {
    const { record } = buildBreakdownRecord({}, { role: 'operator', now: NOW });
    expect(record.machine_id).toBeNull();
    expect(record.issue_text).toBe('');
    expect(record.status).toBe('reported');
  });
});

describe('validateDraft', () => {
  it('requires a machine and an issue for everyone', () => {
    const { valid, errors } = validateDraft({}, 'operator');
    expect(valid).toBe(false);
    expect(errors.machine).toBeTruthy();
    expect(errors.issueText).toBeTruthy();
  });

  it('passes with just those two for an operator', () => {
    expect(validateDraft({ machine: machine(), issueText: 'noise' }, 'operator').valid).toBe(true);
  });

  it('additionally requires a callback name from a vendor', () => {
    const draft = { machine: machine(), issueText: 'leak' };
    expect(validateDraft(draft, 'vendor').valid).toBe(false);
    expect(validateDraft({ ...draft, contactName: 'Vikram' }, 'vendor').valid).toBe(true);
  });

  it('rejects whitespace-only issue text', () => {
    expect(validateDraft({ machine: machine(), issueText: '   ' }, 'operator').valid).toBe(false);
  });
});

/* ===========================================================
   Summaries
   =========================================================== */

describe('isReportClosed', () => {
  it('reads every closed spelling the app uses', () => {
    ['closed', 'resolved', 'done', 'completed'].forEach((status) => {
      expect(isReportClosed({ status })).toBe(true);
    });
    expect(isReportClosed({ closed_at: daysAgo(1) })).toBe(true);
    expect(isReportClosed({ status: 'open' })).toBe(false);
    expect(isReportClosed({})).toBe(false);
  });
});

describe('shiftSummary', () => {
  const now = new Date('2026-07-26T10:00:00Z');
  const inShift = (hoursBack) => new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();

  it('counts only what was reported since the shift started', () => {
    const summary = shiftSummary([
      { created_at: inShift(1), urgency: 'critical' },
      { created_at: inShift(2), urgency: 'high' },
      { created_at: inShift(48), urgency: 'critical' },
    ], { now, shiftHours: 24 });

    expect(summary.total).toBe(2);
    expect(summary.critical).toBe(1);
  });

  it('phrases the strip the way a supervisor would say it', () => {
    const summary = shiftSummary([{ created_at: inShift(1), urgency: 'critical' }], { now, shiftHours: 24 });
    expect(summary.label).toBe('1 issue reported this shift, 1 critical');
  });

  it('handles an empty shift without dividing by zero', () => {
    const summary = shiftSummary([], { now });
    expect(summary.total).toBe(0);
    expect(summary.label).toMatch(/0 issues/);
  });
});

describe('vendorSummary', () => {
  const rows = [
    { vendor_id: 'VND-A', status: 'closed' },
    { vendor_id: 'VND-A', status: 'open' },
    { vendor_id: 'VND-A', status: 'resolved' },
    { vendor_id: 'VND-B', status: 'open' },
  ];

  it('counts only this vendor’s own reports', () => {
    const summary = vendorSummary(rows, 'VND-A');
    expect(summary.reported).toBe(3);
    expect(summary.resolved).toBe(2);
    expect(summary.pending).toBe(1);
  });

  it('phrases it the way the vendor reads it', () => {
    expect(vendorSummary(rows, 'VND-A').label).toBe('You reported 3 issues, 2 resolved, 1 pending');
  });
});

describe('reporterSummary', () => {
  const rows = [
    { reporter_user_id: 'u-1', status: 'closed' },
    { reported_by: 'Suresh', status: 'open' },
    { reported_by: 'Someone else', status: 'open' },
  ];

  it('matches on user id or name, since rows carry either', () => {
    const summary = reporterSummary(rows, { user_id: 'u-1', name: 'Suresh' });
    expect(summary.reported).toBe(2);
    expect(summary.resolved).toBe(1);
  });

  it('says so plainly when the reporter has filed nothing', () => {
    expect(reporterSummary(rows, { name: 'Nobody' }).label).toBe('Nothing reported by you yet');
  });
});

/* ===========================================================
   Demo data — it has to actually exercise the branches
   =========================================================== */

describe('demo data', () => {
  it('kicks in only on an empty workspace', () => {
    expect(shouldUseDemoMachines([])).toBe(true);
    expect(shouldUseDemoMachines(null)).toBe(true);
    expect(shouldUseDemoMachines([machine()])).toBe(false);
    expect(shouldUseDemoReports([])).toBe(true);
    expect(shouldUseDemoReports([{ id: 'x' }])).toBe(false);
  });

  it('includes one unassigned machine so the fallback branch is visible', () => {
    const orphans = DEMO_BREAKDOWN_MACHINES.filter((row) => !assignedTechnician(row));
    expect(orphans).toHaveLength(1);
    expect(routeBreakdown({ role: 'operator', machine: orphans[0] }).queue).toBe(QUEUES.SUPERVISOR);
  });

  it('includes exactly one contracted machine so the vendor filter bites', () => {
    expect(vendorMachines(DEMO_BREAKDOWN_MACHINES, 'VND-HYDROTECH')).toHaveLength(1);
  });

  it('gives every demo machine a scannable QR payload that resolves', () => {
    DEMO_BREAKDOWN_MACHINES.forEach((row) => {
      expect(machineFromQr(DEMO_BREAKDOWN_MACHINES, row.qr_payload)?.machine_id).toBe(row.machine_id);
    });
  });

  it('carries a repeat theme for the history insight to find', () => {
    const insight = machineHistoryInsight('DEMO-M001', DEMO_BREAKDOWN_REPORTS);
    expect(insight).not.toBeNull();
    expect(insight.theme).toBe('spindle');
    expect(insight.lastRepair).not.toBeNull();
  });

  it('offers assignment options a supervisor can actually pick', () => {
    expect(DEMO_TECHNICIANS.length).toBeGreaterThan(1);
    DEMO_TECHNICIANS.forEach((tech) => {
      expect(tech.user_id).toBeTruthy();
      expect(tech.name).toBeTruthy();
    });
  });

  it('routes every demo report end to end without throwing', () => {
    DEMO_BREAKDOWN_MACHINES.forEach((row) => {
      ['operator', 'maintenance_technician', 'supervisor', 'vendor'].forEach((role) => {
        const { record, routing } = buildBreakdownRecord(
          { machine: row, issueText: 'oil leak from the cylinder', contactName: 'Vikram' },
          { role, reports: DEMO_BREAKDOWN_REPORTS, now: NOW },
        );
        expect(record.wo_number).toMatch(/^WO-\d{5}$/);
        expect(routing.queue).toBeTruthy();
        expect(confirmationMessage(routing, { machine: row })).toBeTruthy();
      });
    });
  });
});
