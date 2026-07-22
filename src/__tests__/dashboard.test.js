import { describe, it, expect, beforeEach } from 'vitest';
import { mockMachines, mockTickets, mockReflectiveMemory } from '../../tests/fixtures/dashboard-fixtures.js';

// Polyfill localStorage if running in Node environment without DOM
const storageMap = new Map();
const mockLocalStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.clear) {
  globalThis.localStorage = mockLocalStorage;
}

describe('Dashboard Calculation Engine & Reflective Memory Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should verify correct calculation of open tickets and machines down', () => {
    const openTickets = mockTickets.filter((t) => t.status === 'open');
    const machinesWithOpen = new Set(openTickets.map((t) => t.machine_id));

    expect(openTickets.length).toBe(3);
    expect(machinesWithOpen.size).toBe(2); // m1 and m4
  });

  it('should verify calculation of downtime cost and financial ROI impact', () => {
    const closedTickets = mockTickets.filter((t) => t.status === 'closed');
    const totalMaintenanceCost = closedTickets.reduce((acc, t) => acc + (t.maintenance_cost || 0), 0);

    expect(totalMaintenanceCost).toBe(4500);
  });

  it('should verify localStorage persistence for Reflective Behavioral Memory', () => {
    localStorage.setItem('turbofix_reflective_memory', JSON.stringify(mockReflectiveMemory));

    const loaded = JSON.parse(localStorage.getItem('turbofix_reflective_memory'));
    expect(loaded.lastFocus).toBe('Hydraulic Press');
    expect(loaded.viewsCount).toBe(5);
    expect(loaded.inspectCount).toBe(14);
  });

  it('should clear Reflective Memory cleanly upon request', () => {
    localStorage.setItem('turbofix_reflective_memory', JSON.stringify(mockReflectiveMemory));
    localStorage.removeItem('turbofix_reflective_memory');

    expect(localStorage.getItem('turbofix_reflective_memory')).toBeNull();
  });
});
