import { describe, expect, it } from 'vitest';
import { applyCurrentShiftAssignments, resolveCurrentMachineAssignment } from '../utils/shiftAssignments';

const machine = {
  id: 'm1',
  factory_id: 'f1',
  department: 'Press',
  technician_user_id: 'default-tech',
  supervisor_id: 'default-supervisor',
  engineer_user_id: 'default-engineer',
};

describe('shift assignments', () => {
  it('uses the active shift assignment over static machine ownership', () => {
    const result = resolveCurrentMachineAssignment(machine, [{
      id: 'shift-a',
      factory_id: 'f1',
      department: 'Press',
      name: 'Shift A',
      start_time: '06:00',
      end_time: '14:00',
      active_days: [2],
      timezone: 'Asia/Kolkata',
      enabled: true,
    }], [{
      machine_id: 'm1',
      shift_roster_id: 'shift-a',
      technician_user_id: 'shift-tech',
      supervisor_id: 'shift-supervisor',
      engineer_user_id: 'shift-engineer',
      effective_from: '2026-07-01',
    }], new Date('2026-07-28T04:00:00.000Z'));

    expect(result.source).toBe('shift_roster');
    expect(result.technician_user_id).toBe('shift-tech');
    expect(result.supervisor_id).toBe('shift-supervisor');
  });

  it('handles overnight shifts', () => {
    const result = resolveCurrentMachineAssignment(machine, [{
      id: 'night',
      factory_id: 'f1',
      name: 'Night',
      start_time: '22:00',
      end_time: '06:00',
      active_days: [2],
      timezone: 'Asia/Kolkata',
      enabled: true,
    }], [{
      machine_id: 'm1',
      shift_roster_id: 'night',
      technician_user_id: 'night-tech',
      effective_from: '2026-07-01',
    }], new Date('2026-07-28T19:00:00.000Z'));

    expect(result.technician_user_id).toBe('night-tech');
  });

  it('falls back to static machine assignment when no shift matches', () => {
    const result = resolveCurrentMachineAssignment(machine, [], [], new Date('2026-07-28T04:00:00.000Z'));

    expect(result.source).toBe('machine_default');
    expect(result.technician_user_id).toBe('default-tech');
    expect(result.engineer_user_id).toBe('default-engineer');
  });

  it('annotates machines with current shift owners', () => {
    const [annotated] = applyCurrentShiftAssignments([machine], [{
      id: 'shift-a',
      factory_id: 'f1',
      name: 'Shift A',
      start_time: '06:00',
      end_time: '14:00',
      active_days: [2],
      timezone: 'Asia/Kolkata',
      enabled: true,
    }], [{
      machine_id: 'm1',
      shift_roster_id: 'shift-a',
      technician_user_id: 'shift-tech',
      supervisor_id: 'shift-supervisor',
      effective_from: '2026-07-01',
    }], new Date('2026-07-28T04:00:00.000Z'));

    expect(annotated.technician_user_id).toBe('shift-tech');
    expect(annotated.supervisor_id).toBe('shift-supervisor');
    expect(annotated.assignment_source).toBe('shift_roster');
  });
});
