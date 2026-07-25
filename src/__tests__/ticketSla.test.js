import { describe, it, expect } from 'vitest';
import {
  SLA_TARGET_HOURS,
  DEFAULT_SLA_TARGET_HOURS,
  computeSla,
  isSlaBreached,
  isTicketClosed,
  isTicketInProgress,
  slaTargetHours,
  ticketAgeHours,
  formatDurationHours,
  summarizeTickets,
  normalizeUrgency,
} from '../utils/ticketSla';
import { buildTicketsCSV } from '../utils/ticketExport';

const NOW = new Date('2026-07-26T12:00:00Z');

/** Build a ticket opened `hoursAgo` before NOW. */
const ticketOpened = (hoursAgo, overrides = {}) => ({
  id: 'T-1',
  machine_name: 'CNC Lathe 1',
  status: 'open',
  urgency: 'High',
  created_at: new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString(),
  ...overrides,
});

describe('SLA targets', () => {
  it('maps each urgency to its documented target', () => {
    expect(slaTargetHours({ urgency: 'Critical' })).toBe(SLA_TARGET_HOURS.critical);
    expect(slaTargetHours({ urgency: 'high' })).toBe(SLA_TARGET_HOURS.high);
    expect(slaTargetHours({ urgency: 'MEDIUM' })).toBe(SLA_TARGET_HOURS.medium);
    expect(slaTargetHours({ urgency: 'low' })).toBe(SLA_TARGET_HOURS.low);
  });

  it('falls back to the default target for missing or unknown urgency', () => {
    expect(slaTargetHours({})).toBe(DEFAULT_SLA_TARGET_HOURS);
    expect(slaTargetHours({ urgency: 'catastrophic' })).toBe(DEFAULT_SLA_TARGET_HOURS);
  });

  it('reads urgency out of an object ai_summary when the column is empty', () => {
    expect(normalizeUrgency({ ai_summary: { urgency: 'Critical' } })).toBe('critical');
    // A string ai_summary must not blow up.
    expect(normalizeUrgency({ ai_summary: 'spindle bearing worn' })).toBe('');
  });
});

describe('computeSla', () => {
  it('reports on_track well inside the window', () => {
    const sla = computeSla(ticketOpened(2), NOW); // 2h of an 8h High target
    expect(sla.state).toBe('on_track');
    expect(sla.breached).toBe(false);
    expect(sla.percentUsed).toBe(25);
    expect(sla.remainingHours).toBeCloseTo(6, 5);
  });

  it('flags at_risk once 75% of the window is consumed', () => {
    const sla = computeSla(ticketOpened(6), NOW); // 6h of 8h = 75%
    expect(sla.state).toBe('at_risk');
    expect(sla.breached).toBe(false);
  });

  it('flags breached past the target and keeps the true overshoot in ratio', () => {
    const sla = computeSla(ticketOpened(20), NOW); // 20h of an 8h target
    expect(sla.state).toBe('breached');
    expect(sla.breached).toBe(true);
    expect(sla.ratio).toBeCloseTo(2.5, 5);
    // percentUsed is clamped for bar rendering
    expect(sla.percentUsed).toBe(100);
    expect(sla.remainingHours).toBeLessThan(0);
  });

  it('freezes the clock at resolution for closed tickets', () => {
    const resolvedAt = new Date(NOW.getTime() - 18 * 3_600_000).toISOString();
    const ticket = ticketOpened(20, { status: 'resolved', resolved_at: resolvedAt });
    const sla = computeSla(ticket, NOW);
    // Open 20h ago, closed 18h ago => 2h to resolve, inside the 8h target.
    expect(sla.elapsedHours).toBeCloseTo(2, 5);
    expect(sla.state).toBe('met');
  });

  it('marks a closed ticket that took too long as missed, not breached', () => {
    const resolvedAt = new Date(NOW.getTime() - 1 * 3_600_000).toISOString();
    const ticket = ticketOpened(30, { status: 'closed', resolved_at: resolvedAt });
    expect(computeSla(ticket, NOW).state).toBe('missed');
  });

  it('degrades gracefully when there is no opening timestamp', () => {
    const sla = computeSla({ id: 'x', urgency: 'high' }, NOW);
    expect(sla.known).toBe(false);
    expect(sla.state).toBe('unknown');
    expect(sla.elapsedHours).toBeNull();
    expect(sla.breached).toBe(false);
  });

  it('parses Postgres-style "YYYY-MM-DD HH:MM:SS" timestamps', () => {
    const sla = computeSla(
      { status: 'open', urgency: 'low', created_at: '2026-07-26 08:00:00Z' },
      NOW
    );
    expect(sla.known).toBe(true);
    expect(sla.elapsedHours).toBeCloseTo(4, 5);
  });

  it('never reports negative age for a future-dated ticket', () => {
    expect(ticketAgeHours(ticketOpened(-5), NOW)).toBe(0);
  });

  it('isSlaBreached is true only for open, overdue tickets', () => {
    expect(isSlaBreached(ticketOpened(20), NOW)).toBe(true);
    expect(
      isSlaBreached(ticketOpened(20, { status: 'resolved', resolved_at: NOW.toISOString() }), NOW)
    ).toBe(false);
  });
});

describe('status helpers', () => {
  it('treats resolved, closed status and closed stage as closed', () => {
    expect(isTicketClosed({ status: 'resolved' })).toBe(true);
    expect(isTicketClosed({ status: 'Closed' })).toBe(true);
    expect(isTicketClosed({ lifecycle_stage: 'closed' })).toBe(true);
    expect(isTicketClosed({ status: 'open' })).toBe(false);
  });

  it('counts worked stages as in-progress but not reported or closed ones', () => {
    expect(isTicketInProgress({ status: 'open', lifecycle_stage: 'work_started' })).toBe(true);
    expect(isTicketInProgress({ status: 'open', lifecycle_stage: 'waiting_spare' })).toBe(true);
    expect(isTicketInProgress({ status: 'open', lifecycle_stage: 'reported' })).toBe(false);
    expect(isTicketInProgress({ status: 'resolved', lifecycle_stage: 'work_started' })).toBe(false);
  });
});

describe('formatDurationHours', () => {
  it.each([
    [0.4, '24m'],
    [1, '1h'],
    [3.5, '3h 30m'],
    [24, '1d'],
    [50, '2d 2h'],
  ])('formats %s hours as %s', (hours, expected) => {
    expect(formatDurationHours(hours)).toBe(expected);
  });

  it('returns an em dash for unusable input', () => {
    expect(formatDurationHours(null)).toBe('—');
    expect(formatDurationHours(NaN)).toBe('—');
  });
});

describe('summarizeTickets', () => {
  const tickets = [
    ticketOpened(1, { id: 'a', urgency: 'High', lifecycle_stage: 'reported' }),
    ticketOpened(20, { id: 'b', urgency: 'High', lifecycle_stage: 'work_started' }), // breached
    ticketOpened(7, { id: 'c', urgency: 'High', lifecycle_stage: 'assigned' }), // at risk
    ticketOpened(5, {
      id: 'd',
      status: 'resolved',
      resolved_at: new Date(NOW.getTime() - 1 * 3_600_000).toISOString(), // today
    }),
    ticketOpened(200, {
      id: 'e',
      status: 'resolved',
      resolved_at: new Date(NOW.getTime() - 100 * 3_600_000).toISOString(), // not today
    }),
  ];

  const summary = summarizeTickets(tickets, NOW);

  it('counts open, breached, at-risk and in-progress work', () => {
    expect(summary.total).toBe(5);
    expect(summary.open).toBe(3);
    expect(summary.breached).toBe(1);
    expect(summary.atRisk).toBe(1);
    expect(summary.inProgress).toBe(2); // work_started + assigned
  });

  it('counts only tickets resolved on the current local day', () => {
    expect(summary.resolvedToday).toBe(1);
  });

  it('averages resolution time across closed tickets only', () => {
    // 'd' took 4h, 'e' took 100h => mean 52h
    expect(summary.resolvedCount).toBe(2);
    expect(summary.avgResolutionHours).toBeCloseTo(52, 5);
  });

  it('handles an empty or non-array input without throwing', () => {
    expect(summarizeTickets([], NOW).open).toBe(0);
    expect(summarizeTickets(undefined, NOW).total).toBe(0);
    expect(summarizeTickets([], NOW).avgResolutionHours).toBeNull();
  });
});

describe('buildTicketsCSV', () => {
  it('emits a header row plus one row per ticket', () => {
    const csv = buildTicketsCSV([ticketOpened(2, { wo_number: 'WO-1' })], NOW);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"SLA State"');
    expect(lines[1]).toContain('"WO-1"');
    expect(lines[1]).toContain('"On track"');
  });

  it('escapes embedded quotes so the CSV stays parseable', () => {
    const csv = buildTicketsCSV([ticketOpened(1, { issue_text: 'He said "grinding"' })], NOW);
    expect(csv).toContain('"He said ""grinding"""');
  });

  it('returns just the header for an empty list', () => {
    expect(buildTicketsCSV([], NOW).split('\n')).toHaveLength(1);
  });
});
