import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLANNED_MINUTES_PER_SHIFT,
  computeAvailability,
  computePerformance,
  computeQuality,
  computeOee,
  todayRange,
} from '../utils/oee';

const { periodStart, periodEnd } = todayRange(new Date('2026-07-26T12:00:00'));
const machine = (overrides = {}) => ({ id: 'M001', ...overrides });

describe('computeAvailability', () => {
  it('is 100% with no downtime and no configured shift length (default applies)', () => {
    const result = computeAvailability({ machine: machine(), tickets: [], periodStart, periodEnd });
    expect(result.pct).toBe(100);
    expect(result.plannedMinutes).toBe(DEFAULT_PLANNED_MINUTES_PER_SHIFT);
  });

  it('subtracts downtime_minutes from tickets on this machine within the period', () => {
    const tickets = [
      { machine_id: 'M001', downtime_minutes: 60, created_at: '2026-07-26T10:00:00' },
      { machine_id: 'M002', downtime_minutes: 999, created_at: '2026-07-26T10:00:00' }, // different machine
      { machine_id: 'M001', downtime_minutes: 30, created_at: '2026-07-20T10:00:00' }, // outside period
    ];
    const result = computeAvailability({ machine: machine({ planned_minutes_per_shift: 480 }), tickets, periodStart, periodEnd });
    expect(result.downtimeMinutes).toBe(60);
    expect(result.runMinutes).toBe(420);
    expect(result.pct).toBe(87.5);
  });

  it('clamps at 100% rather than going negative when downtime exceeds planned time', () => {
    const tickets = [{ machine_id: 'M001', downtime_minutes: 600, created_at: '2026-07-26T10:00:00' }];
    const result = computeAvailability({ machine: machine({ planned_minutes_per_shift: 480 }), tickets, periodStart, periodEnd });
    expect(result.runMinutes).toBe(0);
    expect(result.pct).toBe(0);
  });
});

describe('computePerformance', () => {
  it('is null when the machine has no configured ideal cycle time', () => {
    expect(computePerformance({ machine: machine(), goodCount: 10, rejectCount: 0, runMinutes: 400 }).pct).toBeNull();
  });

  it('is null when there is no run time to compare against', () => {
    expect(computePerformance({ machine: machine({ ideal_cycle_time_seconds: 30 }), goodCount: 10, rejectCount: 0, runMinutes: 0 }).pct).toBeNull();
  });

  it('computes (count x ideal cycle time) / run time', () => {
    // 100 units at 30s ideal cycle = 3000s = 50 minutes of ideal work, over 400 minutes run time
    const result = computePerformance({ machine: machine({ ideal_cycle_time_seconds: 30 }), goodCount: 90, rejectCount: 10, runMinutes: 400 });
    expect(result.pct).toBe(12.5);
  });

  it('clamps at 100% instead of exceeding it', () => {
    const result = computePerformance({ machine: machine({ ideal_cycle_time_seconds: 60 }), goodCount: 1000, rejectCount: 0, runMinutes: 10 });
    expect(result.pct).toBe(100);
  });
});

describe('computeQuality', () => {
  it('is null with zero total count', () => {
    expect(computeQuality({ goodCount: 0, rejectCount: 0 }).pct).toBeNull();
  });

  it('is good / total', () => {
    expect(computeQuality({ goodCount: 90, rejectCount: 10 }).pct).toBe(90);
  });
});

describe('computeOee', () => {
  it('reports hasProductionData=false and null performance/quality/oee when nobody has logged production yet', () => {
    const result = computeOee({ machine: machine(), tickets: [], productionLogs: [], periodStart, periodEnd });
    expect(result.hasProductionData).toBe(false);
    expect(result.performancePct).toBeNull();
    expect(result.qualityPct).toBeNull();
    expect(result.oeePct).toBeNull();
    // Availability alone is still computable — it needs no new operator input.
    expect(result.availabilityPct).toBe(100);
  });

  it('ignores production logs for other machines or outside the period', () => {
    const productionLogs = [
      { machine_id: 'M002', good_count: 100, reject_count: 0, log_date: '2026-07-26' },
      { machine_id: 'M001', good_count: 50, reject_count: 0, log_date: '2026-07-01' },
    ];
    const result = computeOee({ machine: machine(), tickets: [], productionLogs, periodStart, periodEnd });
    expect(result.hasProductionData).toBe(false);
  });

  it('multiplies availability x performance x quality when all three are known', () => {
    const m = machine({ planned_minutes_per_shift: 480, ideal_cycle_time_seconds: 24 });
    const tickets = [{ machine_id: 'M001', downtime_minutes: 80, created_at: '2026-07-26T09:00:00' }]; // run time = 400min
    const productionLogs = [{ machine_id: 'M001', good_count: 380, reject_count: 20, log_date: '2026-07-26' }];
    const result = computeOee({ machine: m, tickets, productionLogs, periodStart, periodEnd });

    // availability: 400/480 = 83.3%
    expect(result.availabilityPct).toBeCloseTo(83.3, 1);
    // performance: (400 * 24s)/60 = 160 ideal minutes / 400 run minutes = 40%
    expect(result.performancePct).toBe(40);
    // quality: 380/400 = 95%
    expect(result.qualityPct).toBe(95);
    // oee = 0.833 * 0.40 * 0.95 ≈ 31.7%
    expect(result.oeePct).toBeCloseTo(31.7, 1);
    expect(result.hasProductionData).toBe(true);
  });

  it('sums multiple shift entries for the same machine on the same day', () => {
    const m = machine();
    const productionLogs = [
      { machine_id: 'M001', good_count: 100, reject_count: 5, log_date: '2026-07-26' },
      { machine_id: 'M001', good_count: 80, reject_count: 10, log_date: '2026-07-26' },
    ];
    const result = computeOee({ machine: m, tickets: [], productionLogs, periodStart, periodEnd });
    expect(result.goodCount).toBe(180);
    expect(result.rejectCount).toBe(15);
  });
});
