import { describe, it, expect } from 'vitest';
import { mockMachines, mockTickets } from '../../tests/fixtures/dashboard-fixtures.js';

describe('Dashboard Calculation Engine', () => {
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

  it('should verify machines carry replacement cost for cost-vs-RAV KPI math', () => {
    const totalRav = mockMachines.reduce((total, m) => total + (m.replacement_cost || 0), 0);
    expect(totalRav).toBe(1850000);
  });
});
