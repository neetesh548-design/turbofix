import { describe, it, expect } from 'vitest';
import { computeMTTR, computeDowntimeCost, formatINR } from '../utils/mttrMetrics';

describe('computeMTTR', () => {
  it('returns null for empty array', () => expect(computeMTTR([])).toBeNull());
  it('returns null when no closed tickets', () => {
    expect(computeMTTR([{ status: 'open', created_at: new Date().toISOString() }])).toBeNull();
  });
  it('computes 4h MTTR for a ticket closed 4 hours after creation', () => {
    const created = new Date(2024, 0, 1, 8, 0, 0).toISOString();
    const resolved = new Date(2024, 0, 1, 12, 0, 0).toISOString();
    expect(computeMTTR([{ status: 'resolved', created_at: created, resolved_at: resolved }])).toBeCloseTo(4);
  });
});

describe('computeDowntimeCost', () => {
  it('uses downtime_hours when present', () => {
    expect(computeDowntimeCost([{ downtime_hours: 2 }], 5000)).toBe(10000);
  });
  it('returns 0 for empty array', () => expect(computeDowntimeCost([], 5000)).toBe(0));
});

describe('formatINR', () => {
  it('formats lakhs', () => expect(formatINR(250000)).toBe('₹2.5L'));
  it('formats crores', () => expect(formatINR(15000000)).toBe('₹1.5Cr'));
  it('returns em dash for null', () => expect(formatINR(null)).toBe('—'));
});
