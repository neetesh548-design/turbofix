import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getElapsedHours, getCurrentEscalationLevel } from '../lib/escalation';

describe('src/lib/escalation', () => {
  const now = 1700000000000;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getElapsedHours', () => {
    it('should calculate elapsed hours correctly from reported date string', () => {
      const pastTime = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      expect(getElapsedHours(pastTime)).toBeCloseTo(2, 1);
    });

    it('should handle space-separated date strings', () => {
      const pastTimeStr = '2026-07-25 12:00:00';
      const hours = getElapsedHours(pastTimeStr);
      expect(typeof hours).toBe('number');
      expect(hours).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for null, undefined, or empty string inputs', () => {
      expect(getElapsedHours(null)).toBe(0);
      expect(getElapsedHours(undefined)).toBe(0);
      expect(getElapsedHours('')).toBe(0);
    });

    it('should return 0 for invalid date strings', () => {
      expect(getElapsedHours('invalid-date-format')).toBe(0);
    });

    it('should return 0 for future dates', () => {
      const futureTime = new Date(now + 2 * 60 * 60 * 1000).toISOString();
      expect(getElapsedHours(futureTime)).toBe(0);
    });
  });

  describe('getCurrentEscalationLevel', () => {
    const escalationPath = [
      { label: 'Technician Notice', role: 'technician', threshold_hours: 2 },
      { label: 'Supervisor Escalation', role: 'supervisor', threshold_hours: 4 },
      { label: 'Owner Alert', role: 'owner', threshold_hours: 8 },
    ];

    it('should return null if ticket status is not Open', () => {
      const ticket = { status: 'Closed', reported_at: new Date(now - 1000).toISOString() };
      expect(getCurrentEscalationLevel(ticket, escalationPath)).toBeNull();
    });

    it('should return null if escalationPath is empty', () => {
      const ticket = { status: 'Open', reported_at: new Date(now - 1000).toISOString() };
      expect(getCurrentEscalationLevel(ticket, [])).toBeNull();
    });

    it('should return Level 0 when elapsed time is within initial threshold', () => {
      const ticket = { status: 'Open', reported_at: new Date(now - 1 * 60 * 60 * 1000).toISOString() };
      const level = getCurrentEscalationLevel(ticket, escalationPath);

      expect(level).toEqual({
        level: 0,
        label: 'Technician Notice',
        role: 'technician',
        hoursLeft: 1,
      });
    });

    it('should return Level 1 when elapsed time exceeds first threshold', () => {
      const ticket = { status: 'Open', reported_at: new Date(now - 3 * 60 * 60 * 1000).toISOString() };
      const level = getCurrentEscalationLevel(ticket, escalationPath);

      expect(level).toEqual({
        level: 1,
        label: 'Supervisor Escalation',
        role: 'supervisor',
        hoursLeft: 3, // (2+4) - 3 = 3
      });
    });

    it('should return final level with hoursLeft = null when elapsed time exceeds all thresholds', () => {
      const ticket = { status: 'Open', reported_at: new Date(now - 20 * 60 * 60 * 1000).toISOString() };
      const level = getCurrentEscalationLevel(ticket, escalationPath);

      expect(level).toEqual({
        level: 2,
        label: 'Owner Alert',
        role: 'owner',
        hoursLeft: null,
      });
    });

    it('should handle missing threshold_hours gracefully without throwing', () => {
      const incompletePath = [
        { label: 'Default Level', role: 'technician' }
      ];
      const ticket = { status: 'Open', reported_at: new Date(now - 1000).toISOString() };
      const level = getCurrentEscalationLevel(ticket, incompletePath);

      expect(level).toEqual({
        level: 0,
        label: 'Default Level',
        role: 'technician',
        hoursLeft: null,
      });
    });
  });
});
