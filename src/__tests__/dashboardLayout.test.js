import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readStoredLayout, DASHBOARD_LAYOUT_STORAGE_KEY } from '../lib/dashboardLayout';

describe('src/lib/dashboardLayout - readStoredLayout', () => {
  const defaultLayout = [
    { id: 'widget-1', title: 'Widget 1' },
    { id: 'widget-2', title: 'Widget 2' },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Normal Cases', () => {
    it('should return default layout when localStorage is empty', () => {
      const layout = readStoredLayout(defaultLayout);
      expect(layout).toEqual(defaultLayout);
    });

    it('should parse and return valid saved layout from localStorage', () => {
      const validSaved = [
        { id: 'widget-2', title: 'Widget 2' },
        { id: 'widget-1', title: 'Widget 1' },
      ];
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(validSaved));

      const layout = readStoredLayout(defaultLayout);
      expect(layout).toEqual(validSaved);
      getItemSpy.mockRestore();
    });
  });

  describe('Edge Cases & Null Safety', () => {
    it('should fallback to default layout when defaultLayout is null or empty', () => {
      expect(readStoredLayout([])).toEqual([]);
    });

    it('should return default layout when stored JSON is invalid', () => {
      localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, 'invalid-json-{');
      const layout = readStoredLayout(defaultLayout);
      expect(layout).toEqual(defaultLayout);
    });

    it('should return default layout when stored data is not an array', () => {
      localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
      const layout = readStoredLayout(defaultLayout);
      expect(layout).toEqual(defaultLayout);
    });

    it('should return default layout when saved layout length differs from default layout length', () => {
      const lengthMismatch = [{ id: 'widget-1', title: 'Widget 1' }];
      localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(lengthMismatch));

      const layout = readStoredLayout(defaultLayout);
      expect(layout).toEqual(defaultLayout);
    });

    it('should return default layout when saved layout contains unexpected widget IDs', () => {
      const unexpectedItem = [
        { id: 'unknown-widget-999', title: 'Unknown' },
        { id: 'widget-2', title: 'Widget 2' },
      ];
      localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(unexpectedItem));

      const layout = readStoredLayout(defaultLayout);
      expect(layout).toEqual(defaultLayout);
    });

    it('should handle localStorage.getItem throwing an exception gracefully', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Access denied');
      });

      const layout = readStoredLayout(defaultLayout);
      expect(layout).toEqual(defaultLayout);
      getItemSpy.mockRestore();
    });
  });
});
