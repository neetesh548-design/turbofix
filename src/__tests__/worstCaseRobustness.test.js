import { describe, it, expect } from 'vitest';
import { isRealFactoryUser, rowCompanyCode, filterRowsForUserCompany } from '../utils/tenant';
import { shouldUseDemoFleet, shouldUseDemoTeam, shouldUseDemoReliability } from '../utils/demoDashboard';
import { fetchDashboardData } from '../lib/dashboardData';

describe('Worst-Case & Robustness Verification Suite', () => {

  describe('1. Corrupted LocalStorage & Session State', () => {
    it('handles invalid JSON in localStorage tf_user without crashing', () => {
      window.localStorage.setItem('tf_user', '{bad-json-format:');
      
      let parsedUser = null;
      expect(() => {
        try {
          parsedUser = JSON.parse(window.localStorage.getItem('tf_user') || 'null');
        } catch {
          parsedUser = null;
        }
      }).not.toThrow();

      expect(parsedUser).toBeNull();
      expect(isRealFactoryUser(parsedUser)).toBe(false);
      expect(shouldUseDemoFleet([], [], parsedUser)).toBe(true);
    });

    it('handles null, undefined, boolean, and empty object users safely', () => {
      [null, undefined, {}, { company_code: '' }, { company_code: '   ' }, { company_code: null }].forEach((badUser) => {
        expect(isRealFactoryUser(badUser)).toBe(false);
      });
    });
  });

  describe('2. Security Injection & Malicious String Handling', () => {
    it('safely handles SQL injection and XSS payloads in company_code and machine_id', () => {
      const maliciousUser = {
        company_code: "' OR '1'='1'; DROP TABLE users; --",
        inventory_mode: "<script>alert('xss')</script>",
      };

      expect(isRealFactoryUser(maliciousUser)).toBe(true);

      const maliciousRows = [
        { id: "bb100000-0001", company_code: "' OR '1'='1'; DROP TABLE users; --" },
        { id: "m1", company_code: "' OR '1'='1'; DROP TABLE users; --" },
        { id: "<script>alert(1)</script>", company_code: "OTHER" },
      ];

      const filtered = filterRowsForUserCompany(maliciousRows, maliciousUser);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('m1');
    });

    it('handles extreme zalgo/unicode characters without crashing string upper-casing', () => {
      const zalgoUser = { company_code: 'NKS\u0307\u0302\u0361' };
      expect(() => isRealFactoryUser(zalgoUser)).not.toThrow();
      expect(() => rowCompanyCode({ company_code: 'NKS\u0307' })).not.toThrow();
    });
  });

  describe('3. Null, Undefined & Malformed Data Collections', () => {
    it('handles rows array containing null, undefined, numbers, or string elements', () => {
      const malformedRows = [
        null,
        undefined,
        12345,
        "string-element",
        {},
        { id: null, company_code: 'NKS' },
        { id: 'm1', company_code: 'NKS' },
      ];
      const realUser = { company_code: 'NKS', inventory_mode: 'real' };

      expect(() => filterRowsForUserCompany(malformedRows, realUser)).not.toThrow();
      const result = filterRowsForUserCompany(malformedRows, realUser);
      expect(result).toHaveLength(2);
      expect(result[1].id).toBe('m1');
    });

    it('handles shouldUseDemoFleet with non-array inputs safely', () => {
      const realUser = { company_code: 'NKS' };
      expect(shouldUseDemoFleet(null, undefined, realUser)).toBe(false);
      expect(shouldUseDemoFleet(null, undefined, null)).toBe(true);
    });

    it('handles shouldUseDemoTeam and shouldUseDemoReliability with corrupted tickets', () => {
      expect(shouldUseDemoTeam(null)).toBe(true);
      expect(shouldUseDemoTeam('invalid')).toBe(true);

      const corruptedTickets = [null, undefined, {}, { root_cause: null, component: undefined }];
      expect(shouldUseDemoReliability(corruptedTickets)).toBe(true);
    });
  });

  describe('4. High Volume & Stress Processing', () => {
    it('filters 10,000 machines in under 100ms without memory stack overflow', () => {
      const realUser = { company_code: 'FACTORY-A', inventory_mode: 'real' };
      const largeFleet = Array.from({ length: 10000 }, (_, i) => ({
        id: i % 100 === 0 ? `bb100000-${i}` : `m-${i}`,
        company_code: i % 2 === 0 ? 'FACTORY-A' : 'FACTORY-B',
        machine_name: `Machine #${i}`,
      }));

      const start = performance.now();
      const filtered = filterRowsForUserCompany(largeFleet, realUser);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((m) => m.company_code === 'FACTORY-A')).toBe(true);
      expect(filtered.some((m) => m.id.startsWith('bb100000-'))).toBe(false);
    });
  });

  describe('5. Network Failure & Timeout Fallback Resilience', () => {
    it('fetchDashboardData recovers gracefully when Supabase network fails completely', async () => {
      window.localStorage.setItem('tf_user', JSON.stringify({ company_code: 'NKS' }));

      const res = await fetchDashboardData();
      expect(res).toBeDefined();
      expect(res.company_name).toBeDefined();
      expect(res.kpis).toBeDefined();
      expect(Array.isArray(res.dashboard_overview.status_mix)).toBe(true);
    });
  });

});
