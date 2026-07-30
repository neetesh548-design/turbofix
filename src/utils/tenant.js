const DEMO_MACHINE_PREFIXES = ['bb100000-', 'd3234567-'];

export function isRealFactoryUser(user) {
  const companyCode = String(user?.company_code || '').trim().toUpperCase();
  return Boolean(companyCode && companyCode !== 'TFDEMO' && user?.inventory_mode !== 'demo');
}

export function rowCompanyCode(row) {
  return String(row?.company_code || row?.company_domain || row?.domain || '').trim().toUpperCase();
}

export function isDemoSeedMachineId(value) {
  const id = String(value || '');
  return DEMO_MACHINE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function filterRowsForUserCompany(rows, user, machineIdKey = 'machine_id') {
  if (!Array.isArray(rows)) return [];
  if (!isRealFactoryUser(user)) return rows;

  const companyCode = String(user.company_code).trim().toUpperCase();
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    if (isDemoSeedMachineId(row?.id) || isDemoSeedMachineId(row?.[machineIdKey])) return false;
    const code = rowCompanyCode(row);
    if (code) return code === companyCode;
    if (user?.company_id && row?.company_id) return row.company_id === user.company_id;
    return false;
  });
}
