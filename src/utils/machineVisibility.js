const TECHNICIAN_ROLES = new Set(['maintenance_technician', 'technician']);
const SHIFT_SCOPED_ROLES = new Set(['maintenance_technician', 'technician', 'supervisor', 'maintenance_engineer']);

export function isTechnicianRole(role) {
  return TECHNICIAN_ROLES.has(String(role || '').toLowerCase());
}

export function isShiftScopedRole(role) {
  return SHIFT_SCOPED_ROLES.has(String(role || '').toLowerCase());
}

export function machineId(machine) {
  return machine?.machine_id ?? machine?.id ?? null;
}

function technicianCandidateIds(user) {
  const ids = new Set([String(user?.user_id || '')].filter(Boolean));
  if (user?.inventory_mode === 'demo' && isTechnicianRole(user?.role)) {
    // The generic demo login stores `demo-maintenance_technician`; the demo
    // data itself uses concrete people. Map it to one technician so demo mode
    // still teaches "my machines", not "every machine".
    ids.add('demo-tech-1');
    ids.add('demo-tech-anil');
  }
  return ids;
}

export function isMachineAssignedToTechnician(machine, user) {
  if (!user?.user_id) return false;
  const userIds = technicianCandidateIds(user);
  return [
    machine?.technician_user_id,
    machine?.assigned_technician_id,
    machine?.primary_technician_id,
    machine?.assigned_to,
    machine?.assignments?.technician?.user_id,
  ].some((value) => userIds.has(String(value || '')));
}

export function isMachineVisibleToShiftUser(machine, user) {
  if (!user?.user_id) return false;
  if (isTechnicianRole(user.role)) return isMachineAssignedToTechnician(machine, user);
  const userId = String(user.user_id);
  if (String(user.role || '').toLowerCase() === 'supervisor') {
    return [machine?.supervisor_id, machine?.assignments?.supervisor?.user_id]
      .some((value) => String(value || '') === userId);
  }
  if (String(user.role || '').toLowerCase() === 'maintenance_engineer') {
    return [machine?.engineer_user_id, machine?.assignments?.engineer?.user_id]
      .some((value) => String(value || '') === userId);
  }
  return true;
}

export function visibleMachinesForUser(machines = [], user) {
  if (!isShiftScopedRole(user?.role)) return machines || [];
  return (machines || []).filter((machine) => isMachineVisibleToShiftUser(machine, user));
}

export function visibleMachineIdSet(machines = [], user) {
  return new Set(visibleMachinesForUser(machines, user).map(machineId).filter(Boolean).map(String));
}

export function filterRowsToVisibleMachines(rows = [], machineIds = new Set()) {
  if (!machineIds.size) return [];
  return (rows || []).filter((row) => machineIds.has(String(row?.machine_id || '')));
}
