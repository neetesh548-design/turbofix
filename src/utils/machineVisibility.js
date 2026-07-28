const TECHNICIAN_ROLES = new Set(['maintenance_technician', 'technician']);

export function isTechnicianRole(role) {
  return TECHNICIAN_ROLES.has(String(role || '').toLowerCase());
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
