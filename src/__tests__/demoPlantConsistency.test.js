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
    const expected = machineBoard.map(identity);
    expect(dashboardMachines.map(identity)).toEqual(expected);
    expect(reportMachines.map(identity)).toEqual(expected);
    expect(DEMO_TICKETS.map(identity)).toEqual(expected);
  });
});
