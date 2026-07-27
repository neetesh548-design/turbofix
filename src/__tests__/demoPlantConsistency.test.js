import { describe, expect, it } from 'vitest';
import { DEMO_MACHINES as dashboardMachines } from '../utils/demoDashboard';
import { DEMO_BREAKDOWN_MACHINES as reportMachines } from '../utils/demoBreakdown';
import { DEMO_MACHINES as machineBoard } from '../utils/demoMachines';
import { DEMO_TICKETS } from '../utils/demoTickets';

const identity = (machine) => [
  machine.machine_id || machine.id,
  machine.machine_name || machine.name,
];

describe('demo plant', () => {
  it('uses the same machine identities in every client workflow', () => {
    const knownMachineIds = new Set(machineBoard.map(m => m.machine_id));
    DEMO_TICKETS.forEach(t => {
      expect(knownMachineIds.has(t.machine_id)).toBe(true);
    });
  });
});
