export const defaultRoles = [
  { value: 'maintenance_technician', label: 'Maintenance Technician' },
  { value: 'supervisor', label: 'Maintenance Supervisor' },
  { value: 'maintenance_engineer', label: 'Maintenance Engineer' },
  { value: 'maintenance_head', label: 'Maintenance Head' },
  { value: 'owner', label: 'Owner / Plant Director' }
];

export function getRoleLabel(roleVal, customRoles = []) {
  const found = defaultRoles.find((r) => r.value === roleVal);
  if (found) return found.label;
  const custom = customRoles.find((r) => r.role_name === roleVal);
  if (custom) return custom.role_label;
  return roleVal.replace('_', ' ');
}

const ROLE_NAV = {
  maintenance_technician: ['machines', 'records', 'assistant', 'technician', 'support'],
  maintenance_engineer: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support'],
  supervisor: ['overview', 'machines', 'tickets', 'assistant', 'shutdown', 'technician', 'support'],
  maintenance_head: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'team', 'settings'],
  owner: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'support', 'team', 'settings'],
};

export function canViewWorkspace(role, workspace) {
  const allowed = ROLE_NAV[role];
  return !allowed || allowed.includes(workspace);
}

export function roleContribution(role) {
  return {
    maintenance_technician: 'Resolve assigned work and ask for support when needed.',
    maintenance_engineer: 'Support diagnosis and help remove repeat failures.',
    supervisor: 'Remove blockers and verify normal repair closure.',
    maintenance_head: 'Resolve safety, technical and high-impact exceptions.',
    owner: 'Decide only when production risk or investment needs business authority.',
  }[role] || 'Contribute to safe, reliable issue resolution.';
}
