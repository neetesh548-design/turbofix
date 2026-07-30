import { describe, it, expect } from 'vitest';

export function filterTenantRecords(records, currentUserCompanyCode) {
  if (!records || !Array.isArray(records)) return [];
  if (!currentUserCompanyCode) return [];

  const targetCode = currentUserCompanyCode.trim().toUpperCase();
  return records.filter((rec) => rec && rec.company_code && rec.company_code.trim().toUpperCase() === targetCode);
}

describe('Multi-Tenant Isolation Security Tests (Section 17)', () => {
  const sampleRecords = [
    { id: 'tkt-1', title: 'Hydraulic Leak', company_code: 'PUNE-PLANT-01' },
    { id: 'tkt-2', title: 'Motor Failure', company_code: 'PUNE-PLANT-01' },
    { id: 'tkt-3', title: 'Conveyor Belt Jam', company_code: 'DELHI-PLANT-02' },
    { id: 'tkt-4', title: 'CNC Spindle Noise', company_code: 'MUMBAI-PLANT-03' },
  ];

  describe('Tenant Data Boundaries', () => {
    it('returns only records belonging to the authenticated user company', () => {
      const filtered = filterTenantRecords(sampleRecords, 'PUNE-PLANT-01');
      expect(filtered).toHaveLength(2);
      expect(filtered.every((r) => r.company_code === 'PUNE-PLANT-01')).toBe(true);
    });

    it('prevents user from accessing records of another company', () => {
      const filtered = filterTenantRecords(sampleRecords, 'DELHI-PLANT-02');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('tkt-3');
    });

    it('handles case-insensitive company code comparisons correctly', () => {
      const filtered = filterTenantRecords(sampleRecords, 'pune-plant-01');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Null Safety & Attack Prevention', () => {
    it('returns empty array when user company code is null or empty', () => {
      expect(filterTenantRecords(sampleRecords, null)).toEqual([]);
      expect(filterTenantRecords(sampleRecords, '')).toEqual([]);
      expect(filterTenantRecords(sampleRecords, '   ')).toEqual([]);
    });

    it('returns empty array when dataset is null, undefined, or malformed', () => {
      expect(filterTenantRecords(null, 'PUNE-PLANT-01')).toEqual([]);
      expect(filterTenantRecords(undefined, 'PUNE-PLANT-01')).toEqual([]);
      expect(filterTenantRecords('not-an-array', 'PUNE-PLANT-01')).toEqual([]);
    });

    it('filters out records that lack company_code property (prevents leak of unassigned data)', () => {
      const corruptRecords = [
        ...sampleRecords,
        { id: 'tkt-corrupt', title: 'Unassigned Leak' },
        { id: 'tkt-null', title: 'Null Company', company_code: null },
      ];

      const filtered = filterTenantRecords(corruptRecords, 'PUNE-PLANT-01');
      expect(filtered).toHaveLength(2);
    });
  });
});

import { isRealFactoryUser, filterRowsForUserCompany } from '../utils/tenant';
import { shouldUseDemoFleet } from '../utils/demoDashboard';

describe('Strict Multi-Tenant Isolation & Demo Fallback Rules', () => {
  it('shouldUseDemoFleet MUST return false for real factory users even with 0 machines and 0 tickets', () => {
    const realUser = { company_code: 'NKS', inventory_mode: 'real' };
    expect(shouldUseDemoFleet([], [], realUser)).toBe(false);
    expect(isRealFactoryUser(realUser)).toBe(true);
  });

  it('shouldUseDemoFleet returns true only for unauthenticated demo sessions with 0 machines', () => {
    const demoUser = { company_code: 'TFDEMO', inventory_mode: 'demo' };
    expect(shouldUseDemoFleet([], [], demoUser)).toBe(true);
  });

  it('filterRowsForUserCompany strips demo seed machines for real accounts', () => {
    const realUser = { company_code: 'NKS', inventory_mode: 'real' };
    const mixedRows = [
      { id: 'bb100000-0001', company_code: 'NKS', name: 'Demo Machine Seed' },
      { id: 'real-m1', company_code: 'NKS', name: 'Real Machine 1' },
      { id: 'real-m2', company_code: 'OTHER', name: 'Other Factory Machine' },
    ];
    const filtered = filterRowsForUserCompany(mixedRows, realUser);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('real-m1');
  });
});
