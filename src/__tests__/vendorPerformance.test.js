import { describe, it, expect } from 'vitest';
import { computeVendorPerformance, slowestPendingVendor } from '../utils/vendorPerformance';

const NOW = new Date('2026-07-26T09:30:00');
const DAY = 24 * 60 * 60 * 1000;
const isoFromNow = (offsetDays) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

describe('computeVendorPerformance', () => {
  it('returns an empty list when there is nothing to roll up', () => {
    expect(computeVendorPerformance({ now: NOW })).toEqual([]);
  });

  it('ignores tickets with no outsource_vendor', () => {
    const tickets = [{ id: 'T1', status: 'open', created_at: isoFromNow(-1) }];
    expect(computeVendorPerformance({ tickets, now: NOW })).toEqual([]);
  });

  it('counts assigned, resolved, and pending tickets per vendor', () => {
    const tickets = [
      { id: 'T1', outsource_vendor: 'Hydrotech Services', status: 'open', created_at: isoFromNow(-1) },
      { id: 'T2', outsource_vendor: 'Hydrotech Services', status: 'closed', created_at: isoFromNow(-3), resolved_at: isoFromNow(-1) },
      { id: 'T3', outsource_vendor: 'Bosch Rexroth', status: 'resolved', created_at: isoFromNow(-2), resolved_at: isoFromNow(-1) },
    ];
    const result = computeVendorPerformance({ tickets, now: NOW });
    const hydrotech = result.find((v) => v.vendor === 'Hydrotech Services');
    expect(hydrotech.ticketsAssigned).toBe(2);
    expect(hydrotech.resolved).toBe(1);
    expect(hydrotech.pending).toBe(1);
  });

  it('computes average resolution hours only over tickets with a known duration', () => {
    const tickets = [
      { id: 'T1', outsource_vendor: 'Hydrotech Services', status: 'closed', created_at: isoFromNow(-2), resolved_at: isoFromNow(-1) },
      { id: 'T2', outsource_vendor: 'Hydrotech Services', status: 'closed', created_at: isoFromNow(-4), resolved_at: isoFromNow(-2) },
    ];
    const result = computeVendorPerformance({ tickets, now: NOW });
    expect(result[0].avgResolutionHours).toBe(36); // (24h + 48h) / 2
  });

  it('is null (not 0) when no resolved ticket has a usable duration', () => {
    const tickets = [{ id: 'T1', outsource_vendor: 'Hydrotech Services', status: 'open', created_at: isoFromNow(-1) }];
    const result = computeVendorPerformance({ tickets, now: NOW });
    expect(result[0].avgResolutionHours).toBeNull();
  });

  it('sums parts/labor/repair cost per vendor', () => {
    const tickets = [
      { id: 'T1', outsource_vendor: 'Hydrotech Services', status: 'open', created_at: isoFromNow(-1), parts_cost: 5000, labor_cost: 1500 },
      { id: 'T2', outsource_vendor: 'Hydrotech Services', status: 'open', created_at: isoFromNow(-1), repair_cost: 2000 },
    ];
    const result = computeVendorPerformance({ tickets, now: NOW });
    expect(result[0].totalCost).toBe(8500);
  });

  it('surfaces a vendor with AMC/warranty coverage but zero tickets', () => {
    const machines = [{ id: 'M1', amc_provider: 'Hydrotech Services' }, { id: 'M2', vendor_name: 'Hydrotech Services' }];
    const result = computeVendorPerformance({ machines, now: NOW });
    expect(result).toEqual([
      expect.objectContaining({ vendor: 'Hydrotech Services', ticketsAssigned: 0, machinesCovered: 2 }),
    ]);
  });

  it('sorts busiest vendor first', () => {
    const tickets = [
      { id: 'T1', outsource_vendor: 'Quiet Vendor', status: 'open', created_at: isoFromNow(-1) },
      { id: 'T2', outsource_vendor: 'Busy Vendor', status: 'open', created_at: isoFromNow(-1) },
      { id: 'T3', outsource_vendor: 'Busy Vendor', status: 'open', created_at: isoFromNow(-1) },
    ];
    const result = computeVendorPerformance({ tickets, now: NOW });
    expect(result.map((v) => v.vendor)).toEqual(['Busy Vendor', 'Quiet Vendor']);
  });
});

describe('slowestPendingVendor', () => {
  it('returns null when nothing is pending', () => {
    expect(slowestPendingVendor([{ vendor: 'A', pending: 0 }])).toBeNull();
    expect(slowestPendingVendor([])).toBeNull();
  });

  it('returns the vendor with the most pending tickets', () => {
    const rows = [
      { vendor: 'A', pending: 1 },
      { vendor: 'B', pending: 4 },
      { vendor: 'C', pending: 2 },
    ];
    expect(slowestPendingVendor(rows).vendor).toBe('B');
  });
});
