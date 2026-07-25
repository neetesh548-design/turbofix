import { describe, it, expect } from 'vitest';

/**
 * Calculates financial impact of machine downtime based on hourly rate, spare costs, and labour.
 */
export function calculateFinancialImpact(input = {}) {
  const options = input || {};
  const { downtimeHours, hourlyRate = 0, sparePartsCost = 0, labourCost = 0 } = options;

  if (downtimeHours == null || isNaN(downtimeHours) || downtimeHours < 0) {
    return { status: 'UNAVAILABLE', totalLoss: 0, productionLoss: 0, sparePartsCost: 0, labourCost: 0 };
  }

  const validHourlyRate = Math.max(0, Number(hourlyRate) || 0);
  const validSpareParts = Math.max(0, Number(sparePartsCost) || 0);
  const validLabour = Math.max(0, Number(labourCost) || 0);

  const productionLoss = downtimeHours * validHourlyRate;
  const totalLoss = Number((productionLoss + validSpareParts + validLabour).toFixed(2));

  return {
    status: 'CALCULATED',
    totalLoss,
    productionLoss: Number(productionLoss.toFixed(2)),
    sparePartsCost: validSpareParts,
    labourCost: validLabour,
  };
}

describe('calculateFinancialImpact - Enterprise Business Logic Tests', () => {
  describe('Valid Calculations', () => {
    it('calculates downtime loss using production rate, spares, and labour', () => {
      const result = calculateFinancialImpact({
        downtimeHours: 4.5,
        hourlyRate: 5000,
        sparePartsCost: 1200,
        labourCost: 800,
      });

      expect(result).toEqual({
        status: 'CALCULATED',
        totalLoss: 24500,
        productionLoss: 22500,
        sparePartsCost: 1200,
        labourCost: 800,
      });
    });

    it('handles zero spare parts or zero labour cost cleanly', () => {
      const result = calculateFinancialImpact({ downtimeHours: 2, hourlyRate: 3000 });
      expect(result.totalLoss).toBe(6000);
      expect(result.status).toBe('CALCULATED');
    });

    it('rounds total loss to 2 decimal places for financial currency precision', () => {
      const result = calculateFinancialImpact({ downtimeHours: 1.333, hourlyRate: 1500.55 });
      expect(result.totalLoss).toBe(2000.23);
    });
  });

  describe('Missing Data & Null Safety', () => {
    it('does not crash when input object is null or undefined', () => {
      expect(calculateFinancialImpact(null)).toEqual({
        status: 'UNAVAILABLE',
        totalLoss: 0,
        productionLoss: 0,
        sparePartsCost: 0,
        labourCost: 0,
      });
      expect(calculateFinancialImpact()).toEqual({
        status: 'UNAVAILABLE',
        totalLoss: 0,
        productionLoss: 0,
        sparePartsCost: 0,
        labourCost: 0,
      });
    });

    it('marks result as UNAVAILABLE when downtimeHours is null or undefined', () => {
      expect(calculateFinancialImpact({ downtimeHours: null })).toHaveProperty('status', 'UNAVAILABLE');
      expect(calculateFinancialImpact({ downtimeHours: undefined })).toHaveProperty('status', 'UNAVAILABLE');
    });

    it('treats invalid non-numeric downtime string as UNAVAILABLE', () => {
      expect(calculateFinancialImpact({ downtimeHours: 'invalid-number' })).toHaveProperty('status', 'UNAVAILABLE');
    });
  });

  describe('Boundary Conditions', () => {
    it('handles zero downtime hours cleanly', () => {
      const result = calculateFinancialImpact({ downtimeHours: 0, hourlyRate: 5000, sparePartsCost: 500 });
      expect(result).toEqual({
        status: 'CALCULATED',
        totalLoss: 500,
        productionLoss: 0,
        sparePartsCost: 500,
        labourCost: 0,
      });
    });

    it('rejects negative downtime hours by returning UNAVAILABLE status', () => {
      const result = calculateFinancialImpact({ downtimeHours: -5, hourlyRate: 2000 });
      expect(result.status).toBe('UNAVAILABLE');
      expect(result.totalLoss).toBe(0);
    });

    it('handles extremely large financial figures without precision overflow', () => {
      const result = calculateFinancialImpact({ downtimeHours: 1000, hourlyRate: 100000 });
      expect(result.totalLoss).toBe(100000000);
    });
  });
});
