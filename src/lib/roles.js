export const defaultRoles = [
  { value: 'maintenance_technician', label: 'Maintenance Technician' },
  { value: 'supervisor', label: 'Maintenance Supervisor' },
  { value: 'maintenance_engineer', label: 'Maintenance Engineer' },
  { value: 'maintenance_head', label: 'Maintenance Head' },
  { value: 'owner', label: 'Owner / Plant Director' },
  { value: 'operator', label: 'Plant / Machine Operator' },
  { value: 'quality_inspector', label: 'Quality Inspector' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'vendor', label: 'Vendor / OEM Specialist' }
];

export function getRoleLabel(roleVal, customRoles = []) {
  if (!roleVal) return 'Unknown Role';
  const found = defaultRoles.find((r) => r.value === roleVal);
  if (found) return found.label;
  const custom = customRoles.find((r) => r.role_name === roleVal);
  if (custom) return custom.role_label;
  return String(roleVal).replace(/_/g, ' ');
}

const ROLE_NAV = {
  operator: ['machines', 'assistant', 'support'],
  maintenance_technician: ['machines', 'records', 'assistant', 'technician', 'support'],
  maintenance_engineer: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support'],
  supervisor: ['overview', 'machines', 'tickets', 'assistant', 'shutdown', 'technician', 'support'],
  maintenance_head: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'team', 'settings'],
  owner: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'support', 'team', 'settings'],
  quality_inspector: ['overview', 'machines', 'records', 'tickets', 'support'],
  safety_officer: ['overview', 'machines', 'records', 'tickets', 'support'],
  vendor: ['machines', 'records', 'support'],
};

export function canViewWorkspace(role, workspace) {
  const allowed = ROLE_NAV[role];
  return !allowed || allowed.includes(workspace);
}

export function roleContribution(role) {
  return {
    operator: 'Scan QR codes and report shopfloor breakdowns instantly.',
    maintenance_technician: 'Resolve assigned work and ask for support when needed.',
    maintenance_engineer: 'Support diagnosis and help remove repeat failures.',
    supervisor: 'Remove blockers and verify normal repair closure.',
    maintenance_head: 'Resolve safety, technical and high-impact exceptions.',
    owner: 'Decide only when production risk or investment needs business authority.',
    quality_inspector: 'Verify repair quality and ensure compliance with factory standards.',
    safety_officer: 'Ensure safety protocols and Lockout-Tagout (LOTO) procedures are followed.',
    vendor: 'Provide specialized OEM machine support and warranty service.',
  }[role] || 'Contribute to safe, reliable issue resolution.';
}
