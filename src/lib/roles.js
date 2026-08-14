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

export const CAPABILITIES = Object.freeze({
  VIEW_ALL_TICKETS: 'view_all_tickets',
  START_REPAIR: 'start_repair',
  UPDATE_REPAIR: 'update_repair',
  ASSIGN_TICKET: 'assign_ticket',
  CHANGE_PRIORITY: 'change_priority',
  VERIFY_CLOSE: 'verify_close',
  BULK_TICKET_ACTIONS: 'bulk_ticket_actions',
  EXPORT_TICKETS: 'export_tickets',
  SHIFT_HANDOVER: 'shift_handover',
  PLAN_SHUTDOWN: 'plan_shutdown',
  VIEW_FINANCIALS: 'view_financials',
});

const ROLE_CAPABILITIES = {
  operator: [],
  maintenance_technician: [
    CAPABILITIES.START_REPAIR,
    CAPABILITIES.UPDATE_REPAIR,
  ],
  maintenance_engineer: [
    CAPABILITIES.VIEW_ALL_TICKETS,
    CAPABILITIES.START_REPAIR,
    CAPABILITIES.UPDATE_REPAIR,
    CAPABILITIES.CHANGE_PRIORITY,
    CAPABILITIES.EXPORT_TICKETS,
    CAPABILITIES.PLAN_SHUTDOWN,
  ],
  supervisor: [
    CAPABILITIES.VIEW_ALL_TICKETS,
    CAPABILITIES.START_REPAIR,
    CAPABILITIES.UPDATE_REPAIR,
    CAPABILITIES.ASSIGN_TICKET,
    CAPABILITIES.CHANGE_PRIORITY,
    CAPABILITIES.VERIFY_CLOSE,
    CAPABILITIES.BULK_TICKET_ACTIONS,
    CAPABILITIES.EXPORT_TICKETS,
    CAPABILITIES.SHIFT_HANDOVER,
    CAPABILITIES.PLAN_SHUTDOWN,
  ],
  maintenance_head: Object.values(CAPABILITIES),
  owner: [
    CAPABILITIES.VIEW_ALL_TICKETS,
    CAPABILITIES.EXPORT_TICKETS,
    CAPABILITIES.VIEW_FINANCIALS,
    CAPABILITIES.PLAN_SHUTDOWN,
  ],
  quality_inspector: [
    CAPABILITIES.VIEW_ALL_TICKETS,
    CAPABILITIES.VERIFY_CLOSE,
    CAPABILITIES.EXPORT_TICKETS,
  ],
  safety_officer: [
    CAPABILITIES.VIEW_ALL_TICKETS,
    CAPABILITIES.VERIFY_CLOSE,
    CAPABILITIES.EXPORT_TICKETS,
  ],
  vendor: [CAPABILITIES.UPDATE_REPAIR],
};

export function can(role, capability) {
  return Boolean(ROLE_CAPABILITIES[normalizeRole(role)]?.includes(capability));
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
  operator: ['overview', 'machines', 'assistant', 'support', 'kaizen', 'rca', 'report'],
  maintenance_technician: ['overview', 'tickets', 'technician', 'machines', 'inventory', 'records', 'assistant', 'kaizen', 'rca', 'report'],
  maintenance_engineer: ['overview', 'tickets', 'machines', 'inventory', 'records', 'shutdown', 'assistant', 'kaizen', 'rca', 'report'],
  supervisor: ['overview', 'tickets', 'machines', 'inventory', 'shutdown', 'team', 'kaizen', 'rca', 'records', 'settings', 'report'],
  // 'support' was missing here — every other escalation/exception-handling
  // role (owner, quality_inspector, safety_officer, vendor, operator) has
  // it, and maintenance_head's own description below ("Resolve safety,
  // technical and high-impact exceptions") is literally what the Support &
  // Decisions page is for. A real UAT smoke test caught this: a
  // maintenance_head demo session hit AppShell's "not part of your role
  // view" block on /support.html.
  maintenance_head: ['overview', 'tickets', 'machines', 'inventory', 'records', 'shutdown', 'team', 'settings', 'kaizen', 'rca', 'assistant', 'support', 'report'],
  owner: ['overview', 'support', 'machines', 'tickets', 'inventory', 'records', 'shutdown', 'team', 'settings', 'kaizen', 'rca', 'assistant', 'report'],
  quality_inspector: ['overview', 'machines', 'records', 'tickets', 'kaizen', 'rca', 'support', 'report'],
  safety_officer: ['overview', 'machines', 'records', 'tickets', 'support', 'kaizen', 'rca', 'report'],
  vendor: ['support', 'kaizen', 'rca', 'report'],
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
