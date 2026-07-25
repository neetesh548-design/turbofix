/**
 * PDF Generator Utility Tests
 * Tests for dashboard PDF export functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatDate,
  createPDFTemplate,
  generatePDFExport,
  generateCSVExport,
  validateDashboardData,
} from '../utils/PDFGenerator';

describe('PDFGenerator Utility', () => {
  // Test Data
  const mockDashboardData = {
    kpis: {
      machines_down: 2,
      urgent_open: 5,
      open_tickets: 15,
      plant_health_pct: 85,
      avg_hours_to_fix: 4.5,
      pm_compliance_pct: 75,
      total_machines: 10,
      total_tickets: 100,
    },
    dashboard_overview: {
      status_mix: [
        { label: 'open', value: 15 },
        { label: 'resolved', value: 70 },
        { label: 'closed', value: 15 },
      ],
      type_mix: [
        { label: 'Breakdown', value: 50 },
      ],
      cost_by_month: [
        { key: '2026-06', label: 'Jun', cost: 50000 },
        { key: '2026-07', label: 'Jul', cost: 60000 },
      ],
      total_cost: 110000,
      avg_cost: 1100,
      maintenance_count: 100,
      scheduled_pct: 60,
    },
    drilldown: {
      machines_down: [
        { machine_id: 'm1', machine_name: 'Machine 1', location: 'Floor A', open_count: 5 },
        { machine_id: 'm2', machine_name: 'Machine 2', location: 'Floor B', open_count: 3 },
      ],
      online_machines: [
        { machine_id: 'm3', machine_name: 'Machine 3', location: 'Floor A', status: 'Online' },
      ],
    },
  };

  describe('formatCurrency', () => {
    it('should format currency value correctly', () => {
      const result = formatCurrency(50000);
      expect(result).toMatch(/₹/);
      expect(result).toMatch(/50,000/);
    });

    it('should handle zero value', () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/₹/);
    });

    it('should handle negative values', () => {
      const result = formatCurrency(-5000);
      expect(result).toMatch(/₹/);
    });

    it('should handle undefined value', () => {
      const result = formatCurrency(undefined);
      expect(result).toMatch(/₹/);
    });

    it('should handle different currency codes', () => {
      const result = formatCurrency(100, 'USD');
      expect(result).toMatch(/\$/);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-07-25');
      const result = formatDate(date);
      expect(result).toBeTruthy();
      expect(result).toMatch(/Jul/);
    });

    it('should handle string date input', () => {
      const result = formatDate('2026-07-25');
      expect(result).toBeTruthy();
    });

    it('should handle current date', () => {
      const result = formatDate(new Date());
      expect(result).toBeTruthy();
    });

    it('should handle invalid date gracefully', () => {
      const result = formatDate('invalid-date');
      expect(result).toBeTruthy();
    });

    it('should support custom locale', () => {
      const date = new Date('2026-07-25');
      const result = formatDate(date, 'en-US');
      expect(result).toBeTruthy();
    });
  });

  describe('createPDFTemplate', () => {
    it('should create PDF template with all sections', () => {
      const template = createPDFTemplate(mockDashboardData, 'TestCompany');
      expect(template).toBeTruthy();
      expect(template.tagName).toBe('DIV');
    });

    it('should include company name in template', () => {
      const template = createPDFTemplate(mockDashboardData, 'MyCompany');
      const text = template.textContent;
      expect(text).toContain('MyCompany');
    });

    it('should include KPI section when included', () => {
      const template = createPDFTemplate(mockDashboardData, 'Test', {
        includeKPIs: true,
      });
      const text = template.textContent;
      expect(text).toContain('Key Performance Indicators');
    });

    it('should exclude KPI section when excluded', () => {
      const template = createPDFTemplate(mockDashboardData, 'Test', {
        includeKPIs: false,
      });
      const text = template.textContent;
      expect(text).not.toContain('Key Performance Indicators');
    });

    it('should include machines section when included', () => {
      const template = createPDFTemplate(mockDashboardData, 'Test', {
        includeMachines: true,
      });
      const text = template.textContent;
      expect(text).toContain('Machines Down');
    });

    it('should handle missing dashboard overview', () => {
      const data = { ...mockDashboardData, dashboard_overview: null };
      const template = createPDFTemplate(data, 'Test');
      expect(template).toBeTruthy();
    });

    it('should handle missing drilldown data', () => {
      const data = { ...mockDashboardData, drilldown: null };
      const template = createPDFTemplate(data, 'Test', { includeMachines: true });
      expect(template).toBeTruthy();
    });

    it('should format currency in template', () => {
      const template = createPDFTemplate(mockDashboardData, 'Test');
      const text = template.textContent;
      expect(text).toContain('₹');
    });

    it('should include export date', () => {
      const template = createPDFTemplate(mockDashboardData, 'Test');
      const text = template.textContent;
      expect(text).toContain('Exported on');
    });
  });

  describe('validateDashboardData', () => {
    it('should validate correct dashboard data', () => {
      const result = validateDashboardData(mockDashboardData);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject null data', () => {
      const result = validateDashboardData(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject missing KPI data', () => {
      const data = { ...mockDashboardData, kpis: null };
      const result = validateDashboardData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('KPI data is missing');
    });

    it('should reject missing overview data', () => {
      const data = { ...mockDashboardData, dashboard_overview: null };
      const result = validateDashboardData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Overview data is missing');
    });

    it('should accept data with both KPI and overview', () => {
      const result = validateDashboardData(mockDashboardData);
      expect(result.valid).toBe(true);
    });
  });

  describe('generatePDFExport', () => {
    beforeEach(() => {
      // Mock html2pdf
      global.html2pdf = vi.fn(() => ({
        set: vi.fn(function() { return this; }),
        from: vi.fn(function() { return this; }),
        save: vi.fn(function() {
          return Promise.resolve();
        }),
      }));
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should export PDF with default options', async () => {
      const promise = generatePDFExport(mockDashboardData);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should use custom filename', async () => {
      const options = { filename: 'Custom_Report.pdf' };
      const promise = generatePDFExport(mockDashboardData, options);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should use custom company name', async () => {
      const options = { companyName: 'Acme Corp' };
      const promise = generatePDFExport(mockDashboardData, options);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should respect includeKPIs option', async () => {
      const options = { includeKPIs: false };
      const promise = generatePDFExport(mockDashboardData, options);
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('generateCSVExport', () => {
    beforeEach(() => {
      // Mock DOM methods
      global.Blob = vi.fn(() => ({}));
      global.URL = {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
      };
      document.createElement = vi.fn((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: vi.fn(),
          };
        }
        return {};
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should export CSV with data', () => {
      expect(() => {
        generateCSVExport(mockDashboardData);
      }).not.toThrow();
    });

    it('should use custom filename', () => {
      expect(() => {
        generateCSVExport(mockDashboardData, 'custom.csv');
      }).not.toThrow();
    });

    it('should handle empty data gracefully', () => {
      expect(() => {
        generateCSVExport({}, 'test.csv');
      }).not.toThrow();
    });
  });
});
