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
