const TECHNICIAN_ROLES = new Set(['maintenance_technician', 'technician']);

export function isTechnicianRole(role) {
  return TECHNICIAN_ROLES.has(String(role || '').toLowerCase());
}

export function machineId(machine) {
  return machine?.machine_id ?? machine?.id ?? null;
}

export function isMachineAssignedToTechnician(machine, user) {
  if (!user?.user_id) return false;
  const userId = String(user.user_id);
  return [
    machine?.technician_user_id,
    machine?.assigned_technician_id,
    machine?.primary_technician_id,
    machine?.assignments?.technician?.user_id,
  ].some((value) => String(value || '') === userId);
}

export function visibleMachinesForUser(machines = [], user) {
  if (!isTechnicianRole(user?.role)) return machines || [];
  return (machines || []).filter((machine) => isMachineAssignedToTechnician(machine, user));
}

export function visibleMachineIdSet(machines = [], user) {
  return new Set(visibleMachinesForUser(machines, user).map(machineId).filter(Boolean).map(String));
}

export function filterRowsToVisibleMachines(rows = [], machineIds = new Set()) {
  if (!machineIds.size) return [];
  return (rows || []).filter((row) => machineIds.has(String(row?.machine_id || '')));
}
