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

/**
 * @param {object} [options]
 * @param {string} [options.machineIdKey] - which field on each row holds the machine id (default 'machine_id')
 * @param {Set} [options.validMachineIds] - a pre-computed set of this company's own machine ids, for
 *   tables (tickets, parts, consumables...) that carry no company_code/company_id of their own and can
 *   only be scoped transitively through the machine they belong to. Build it from an already-scoped
 *   machines list, e.g. `new Set(companyMachines.map((m) => m.id || m.machine_id))`.
 */
export function filterRowsForUserCompany(rows, user, options = {}) {
  const machineIdKey = typeof options === 'string' ? options : (options.machineIdKey || 'machine_id');
  const validMachineIds = typeof options === 'string' ? null : (options.validMachineIds || null);

  if (!Array.isArray(rows)) return [];
  if (!isRealFactoryUser(user)) return rows;

  const companyCode = String(user.company_code).trim().toUpperCase();
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    if (isDemoSeedMachineId(row?.id) || isDemoSeedMachineId(row?.[machineIdKey])) return false;
    const code = rowCompanyCode(row);
    if (code) return code === companyCode;
    if (user?.company_id && row?.company_id) return row.company_id === user.company_id;
    if (validMachineIds) return validMachineIds.has(row?.[machineIdKey]);
    return false;
  });
}
