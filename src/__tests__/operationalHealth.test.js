import { describe, it, expect } from 'vitest';
import {
  HEALTH_BAND,
  bandForScore,
  computeOperationalHealth,
  describeTrend,
} from '../utils/operationalHealth';

const NOW = new Date('2026-07-26T09:30:00');
const DAY = 24 * 60 * 60 * 1000;
const isoFromNow = (offsetDays) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

const machine = (overrides = {}) => ({
  id: 'M001',
  machine_id: 'M001',
  status: 'running',
  ...overrides,
});

describe('bandForScore', () => {
  it('bands 85+ as healthy, 65-84 as attention, below as critical', () => {
    expect(bandForScore(100)).toBe(HEALTH_BAND.HEALTHY);
    expect(bandForScore(85)).toBe(HEALTH_BAND.HEALTHY);
    expect(bandForScore(84)).toBe(HEALTH_BAND.ATTENTION);
    expect(bandForScore(65)).toBe(HEALTH_BAND.ATTENTION);
    expect(bandForScore(64)).toBe(HEALTH_BAND.CRITICAL);
    expect(bandForScore(0)).toBe(HEALTH_BAND.CRITICAL);
  });
});

describe('computeOperationalHealth', () => {
  it('scores 100 with a healthy band when every input is empty', () => {
    const result = computeOperationalHealth({ now: NOW });
    expect(result.score).toBe(100);
    expect(result.band).toBe(HEALTH_BAND.HEALTHY);
    expect(result.nextAction).toBe('Operations are in control.');
  });

  it('drops the machine-health driver when a machine is down', () => {
    const machines = [machine({ id: 'M001', status: 'breakdown' }), machine({ id: 'M002', status: 'running' })];
    const result = computeOperationalHealth({ machines, now: NOW });
    expect(result.drivers.machineHealth.pct).toBe(50);
    expect(result.drivers.machineHealth.detail).toBe('1 machine down');
    expect(result.score).toBeLessThan(100);
  });

  it('flags overdue PM schedules and ignores inactive ones', () => {
    const pmSchedules = [
      { machine_id: 'M001', next_due_at: isoFromNow(-2), active: true },
      { machine_id: 'M002', next_due_at: isoFromNow(5), active: true },
      { machine_id: 'M003', next_due_at: isoFromNow(-30), active: false },
    ];
    const result = computeOperationalHealth({ pmSchedules, now: NOW });
    expect(result.drivers.pmOnTime.pct).toBe(50);
    expect(result.drivers.pmOnTime.detail).toBe('1 PM overdue');
  });

  it('counts critical and at-risk stock as short on the parts driver', () => {
    const parts = [
      { id: 'P1', part_name: 'Bearing', stock_qty: 0, reorder_level: 5 },
      { id: 'P2', part_name: 'Belt', stock_qty: 50, reorder_level: 5, max_level: 100 },
    ];
    const result = computeOperationalHealth({ parts, now: NOW });
    expect(result.drivers.partsAvailability.pct).toBe(50);
    expect(result.drivers.partsAvailability.detail).toBe('1 part short');
  });

  it('treats an open backlog with no SLA breaches as fully healthy', () => {
    const tickets = [
      { id: 'T1', machine_id: 'M001', urgency: 'low', status: 'open', created_at: isoFromNow(-0.1) },
    ];
    const result = computeOperationalHealth({ tickets, now: NOW });
    expect(result.drivers.ticketPressure.pct).toBe(100);
    expect(result.drivers.ticketPressure.detail).toBe('1 ticket open, on track');
  });

  it('penalizes breached SLA tickets', () => {
    const tickets = [
      { id: 'T1', machine_id: 'M001', urgency: 'critical', status: 'open', created_at: isoFromNow(-1) },
    ];
    const result = computeOperationalHealth({ tickets, now: NOW });
    expect(result.drivers.ticketPressure.pct).toBe(0);
    expect(result.drivers.ticketPressure.detail).toBe('1 SLA breach');
  });

  it('names the worst driver as the next action', () => {
    const machines = [machine({ id: 'M001', status: 'breakdown' })];
    const result = computeOperationalHealth({ machines, now: NOW });
    expect(result.nextAction).toContain('Machine health');
  });

  it('cross-references the live tickets list rather than a stale per-machine track_record', () => {
    const machines = [machine({ id: 'M001', status: 'running' })];
    const tickets = [
      { id: 'T1', machine_id: 'M001', urgency: 'critical', status: 'open', created_at: isoFromNow(-0.01) },
    ];
    const result = computeOperationalHealth({ machines, tickets, now: NOW });
    // An open ticket on an otherwise "running" machine downgrades it — this
    // only works if machine health looks at the tickets array, not just
    // machine.status or a page-local track_record field.
    expect(result.drivers.machineHealth.pct).toBeLessThan(100);
  });
});

describe('describeTrend', () => {
  it('returns null when there is no prior snapshot', () => {
    expect(describeTrend(80, undefined)).toBeNull();
    expect(describeTrend(80, null)).toBeNull();
  });

  it('describes an improvement', () => {
    expect(describeTrend(85, 80)).toEqual({ delta: 5, label: '+5 points vs. last month' });
  });

  it('describes a decline', () => {
    expect(describeTrend(70, 80)).toEqual({ delta: -10, label: '-10 points vs. last month' });
  });

  it('describes no change', () => {
    expect(describeTrend(80, 80)).toEqual({ delta: 0, label: 'No change vs. last month' });
  });
});
