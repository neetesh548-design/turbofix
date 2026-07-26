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

// 'kaizen' is on every role. A suggestion scheme that only management can
// open collects nothing: the operator who sees the waste has to be able to
// reach the submission form, and the Kaizen page renders a board per role
// (submit / approve / impact) rather than one page with hidden sections.
const ROLE_NAV = {
  operator: ['machines', 'assistant', 'support', 'kaizen'],
  // 'overview' is the technician's own dashboard (their queue and machines),
  // not the business board — the Dashboard page renders per role. Without it
  // AppShell would gate technicians out of the view built for them.
  maintenance_technician: ['overview', 'machines', 'records', 'assistant', 'technician', 'support', 'kaizen'],
  maintenance_engineer: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'kaizen'],
  supervisor: ['overview', 'machines', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'kaizen'],
  maintenance_head: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'team', 'settings', 'kaizen'],
  owner: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'support', 'team', 'settings', 'kaizen'],
  quality_inspector: ['overview', 'machines', 'records', 'tickets', 'support', 'kaizen'],
  safety_officer: ['overview', 'machines', 'records', 'tickets', 'support', 'kaizen'],
  vendor: ['machines', 'records', 'support', 'kaizen'],
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
