import { describe, expect, it } from 'vitest';
import {
  filterRowsToVisibleMachines,
  isTechnicianRole,
  visibleMachineIdSet,
  visibleMachinesForUser,
} from '../utils/machineVisibility';

describe('machine visibility', () => {
  const tech = { role: 'maintenance_technician', user_id: 'tech-1' };
  const machines = [
    { id: 'm1', name: 'Press', technician_user_id: 'tech-1' },
    { id: 'm2', name: 'Compressor', technician_user_id: 'tech-2' },
    { machine_id: 'm3', name: 'Lathe', assignments: { technician: { user_id: 'tech-1' } } },
  ];

  it('scopes technician users to assigned machines only', () => {
    expect(isTechnicianRole('technician')).toBe(true);
    expect(visibleMachinesForUser(machines, tech).map((machine) => machine.id || machine.machine_id)).toEqual(['m1', 'm3']);
  });

  it('does not scope owner-style users', () => {
    expect(visibleMachinesForUser(machines, { role: 'owner', user_id: 'owner-1' })).toHaveLength(3);
  });

  it('scopes supervisors and engineers to their active assignment fields', () => {
    const rows = [
      { id: 'm1', supervisor_id: 'sup-1', engineer_user_id: 'eng-2' },
      { id: 'm2', supervisor_id: 'sup-2', engineer_user_id: 'eng-1' },
      { id: 'm3', assignments: { supervisor: { user_id: 'sup-1' }, engineer: { user_id: 'eng-1' } } },
    ];

    expect(visibleMachinesForUser(rows, { role: 'supervisor', user_id: 'sup-1' }).map((machine) => machine.id)).toEqual(['m1', 'm3']);
    expect(visibleMachinesForUser(rows, { role: 'maintenance_engineer', user_id: 'eng-1' }).map((machine) => machine.id)).toEqual(['m2', 'm3']);
  });

  it('filters related rows to visible machine ids', () => {
    const ids = visibleMachineIdSet(machines, tech);
    expect(filterRowsToVisibleMachines([
      { id: 't1', machine_id: 'm1' },
      { id: 't2', machine_id: 'm2' },
      { id: 't3', machine_id: 'm3' },
    ], ids).map((row) => row.id)).toEqual(['t1', 't3']);
  });

  it('scopes generic demo technicians to one demo technician subset', () => {
    const visible = visibleMachinesForUser([
      { id: 'demo-1', assigned_to: 'demo-tech-1' },
      { id: 'demo-2', assigned_to: 'demo-tech-2' },
      { id: 'demo-3', assignments: { technician: { user_id: 'demo-tech-anil' } } },
    ], { role: 'maintenance_technician', user_id: 'demo-maintenance_technician', inventory_mode: 'demo' });

    expect(visible.map((machine) => machine.id)).toEqual(['demo-1', 'demo-3']);
  });
});
