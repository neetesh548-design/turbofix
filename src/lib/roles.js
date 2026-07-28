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

const ROLE_ALIASES = {
  technician: 'maintenance_technician',
  engineer: 'maintenance_engineer',
  maintenance_supervisor: 'supervisor',
  maintenance_manager: 'maintenance_head',
  maintenance_lead: 'maintenance_head',
  factory_owner: 'owner',
  plant_owner: 'owner',
  machine_operator: 'operator',
  plant_operator: 'operator',
};

export function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[normalized] || normalized;
}

export function getRoleLabel(roleVal, customRoles = []) {
  if (!roleVal) return 'Unknown Role';
  const normalizedRole = normalizeRole(roleVal);
  const found = defaultRoles.find((r) => r.value === normalizedRole);
  if (found) return found.label;
  const custom = customRoles.find((r) => normalizeRole(r.role_name) === normalizedRole);
  if (custom) return custom.role_label;
  return normalizedRole.replace(/_/g, ' ');
}

// 'kaizen' is on every role. A suggestion scheme that only management can
// open collects nothing: the operator who sees the waste has to be able to
// reach the submission form, and the Kaizen page renders a board per role
// (submit / approve / impact) rather than one page with hidden sections.
//
// 'report' is on every role for the same reason, only more so. Reporting a
// breakdown is the one thing every person in the plant must be able to do,
// including a vendor watching one contracted press. The Report Breakdown
// page renders a form per role (operator / technician / supervisor / vendor)
// and filters the machine picker accordingly, so access here is not the
// place to draw the boundary — the form itself is.
const ROLE_NAV = {
  operator: ['machines', 'inventory', 'assistant', 'support', 'kaizen', 'report'],
  // 'overview' is the technician's own dashboard (their queue and machines),
  // not the business board — the Dashboard page renders per role. Without it
  // AppShell would gate technicians out of the view built for them.
  maintenance_technician: ['overview', 'machines', 'records', 'tickets', 'assistant', 'technician', 'support', 'kaizen', 'report'],
  maintenance_engineer: ['overview', 'machines', 'inventory', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'kaizen', 'report'],
  supervisor: ['overview', 'machines', 'inventory', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'kaizen', 'report'],
  maintenance_head: ['overview', 'machines', 'inventory', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'team', 'settings', 'kaizen', 'report'],
  owner: ['overview', 'machines', 'inventory', 'records', 'tickets', 'assistant', 'shutdown', 'support', 'team', 'settings', 'kaizen', 'report'],
  quality_inspector: ['overview', 'machines', 'inventory', 'records', 'tickets', 'support', 'kaizen', 'report'],
  safety_officer: ['overview', 'machines', 'inventory', 'records', 'tickets', 'support', 'kaizen', 'report'],
  vendor: ['machines', 'inventory', 'records', 'support', 'kaizen', 'report'],
};

export function canViewWorkspace(role, workspace) {
  const allowed = ROLE_NAV[normalizeRole(role)];
  return Boolean(allowed?.includes(workspace));
}

export function roleContribution(role) {
  const normalizedRole = normalizeRole(role);
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
  }[normalizedRole] || 'Contribute to safe, reliable issue resolution.';
}
