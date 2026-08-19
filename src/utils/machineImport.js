/* ===========================================================
   TurboFix — Bulk machine CSV import
   ===========================================================

   Onboarding a plant's machine list one machine at a time, by hand,
   through the "Add machine" form is the #1 friction point reviewers of
   every CMMS in this space call out for small manufacturers moving off
   spreadsheets. This is the missing self-serve path: download a blank
   template, fill it in the spreadsheet the plant already has, upload it
   back.

   Deliberately NOT machineExport.js's format — that export is a status
   report (computed columns like "Open tickets", "Status"), not an
   onboarding template. This is the inverse: the actual fields
   Machines.jsx's "Add machine" form collects, so a parsed row inserts
   with zero translation.

   Pure functions only. No Supabase calls, no DOM assumptions beyond the
   one download helper (which no-ops outside a browser, same pattern as
   machineExport.js).
   =========================================================== */

export const CRITICALITY_LEVELS = ['low', 'medium', 'high', 'critical'];

/**
 * Column order for both the template and the parser. `required` gates
 * validation; `parse` converts the raw cell string to the value that goes
 * straight into the Supabase insert payload.
 */
export const MACHINE_IMPORT_COLUMNS = [
  { key: 'name', label: 'Machine name', required: true, parse: (v) => v.trim() },
  { key: 'location', label: 'Location', required: false, parse: (v) => v.trim() },
  { key: 'asset_code', label: 'Asset tag / code', required: false, parse: (v) => v.trim() || null },
  { key: 'category', label: 'Category', required: false, parse: (v) => v.trim() || null },
  { key: 'manufacturer', label: 'Manufacturer', required: false, parse: (v) => v.trim() || null },
  { key: 'model', label: 'Model', required: false, parse: (v) => v.trim() || null },
  { key: 'serial_number', label: 'Serial number', required: false, parse: (v) => v.trim() || null },
  { key: 'department', label: 'Department', required: false, parse: (v) => v.trim() || null },
  { key: 'production_line', label: 'Production line', required: false, parse: (v) => v.trim() || null },
  {
    key: 'criticality',
    label: 'Criticality (low/medium/high/critical)',
    required: false,
    parse: (v) => {
      const normalized = v.trim().toLowerCase();
      return CRITICALITY_LEVELS.includes(normalized) ? normalized : 'medium';
    },
  },
  {
    key: 'hourly_downtime_cost',
    label: 'Downtime cost per hour (₹)',
    required: false,
    parse: (v) => (v.trim() === '' ? 0 : Number(v)),
  },
  {
    key: 'maintenance_interval_days',
    label: 'Maintenance interval (days)',
    required: false,
    parse: (v) => (v.trim() === '' ? 90 : Number(v)),
  },
];

const EXAMPLE_ROW = {
  name: 'CNC Lathe 2',
  location: 'Shop 1',
  asset_code: 'CNC-02',
  category: 'Machining',
  manufacturer: 'HMT',
  model: 'NH-22',
  serial_number: 'SN-88213',
  department: 'Production',
  production_line: 'Line A',
  criticality: 'high',
  hourly_downtime_cost: '1500',
  maintenance_interval_days: '90',
};

function escapeCell(value) {
  if (value == null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** One header row plus one filled-in example row, so the format is obvious without a separate instructions doc. */
export function buildMachineImportTemplateCSV() {
  const header = MACHINE_IMPORT_COLUMNS.map((col) => escapeCell(col.label)).join(',');
  const example = MACHINE_IMPORT_COLUMNS.map((col) => escapeCell(EXAMPLE_ROW[col.key] ?? '')).join(',');
  return [header, example].join('\n');
}

export function downloadMachineImportTemplateCSV(filename = 'turbofix-machine-import-template.csv') {
  if (typeof document === 'undefined') return;
  const blob = new Blob(['﻿', buildMachineImportTemplateCSV()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Minimal RFC-4180 parser: handles quoted fields, escaped quotes ("") and
 * commas/newlines inside quotes. Good enough for spreadsheet-exported CSV
 * without pulling in a dependency for one function.
 */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const source = String(text || '').replace(/^﻿/, ''); // strip BOM if present

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/**
 * Map a header row's cells to column keys by matching MACHINE_IMPORT_COLUMNS'
 * labels case-insensitively, tolerating a header written by hand (e.g. just
 * "Name" instead of "Machine name") via a couple of common aliases.
 */
const HEADER_ALIASES = {
  name: ['name', 'machine name', 'machine'],
  location: ['location'],
  asset_code: ['asset code', 'asset tag', 'asset tag / code', 'asset_code'],
  category: ['category'],
  manufacturer: ['manufacturer'],
  model: ['model'],
  serial_number: ['serial number', 'serial_number', 'serial'],
  department: ['department'],
  production_line: ['production line', 'production_line', 'line'],
  criticality: ['criticality'],
  hourly_downtime_cost: ['downtime cost per hour (₹)', 'downtime cost per hour', 'hourly downtime cost', 'downtime cost'],
  maintenance_interval_days: ['maintenance interval (days)', 'maintenance interval', 'pm interval'],
};

/** Drop a parenthetical hint like "(₹)" or "(low/medium/high/critical)" before comparing. */
function stripHint(value) {
  return value.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

function matchColumnKey(headerCell) {
  const normalized = stripHint(headerCell.trim().toLowerCase());
  return MACHINE_IMPORT_COLUMNS.find((col) =>
    (HEADER_ALIASES[col.key] || []).some((alias) => stripHint(alias) === normalized)
  )?.key || null;
}

/**
 * Parse + validate an uploaded CSV against MACHINE_IMPORT_COLUMNS.
 *
 * @returns {{ valid: object[], errors: { rowNumber: number, message: string }[] }}
 *   `valid` rows are ready to spread straight into a Supabase insert.
 *   `rowNumber` is 1-indexed against the file (header excluded) so the
 *   error message matches what someone sees if they open the file.
 */
export function parseMachinesCSV(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return { valid: [], errors: [{ rowNumber: 0, message: 'The file is empty.' }] };

  const [headerRow, ...dataRows] = rows;
  const keyByColumnIndex = headerRow.map(matchColumnKey);
  if (!keyByColumnIndex.includes('name')) {
    return { valid: [], errors: [{ rowNumber: 0, message: 'No "Machine name" column found — download the template to see the expected headers.' }] };
  }

  const valid = [];
  const errors = [];

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const record = {};
    keyByColumnIndex.forEach((key, columnIndex) => {
      if (!key) return;
      const column = MACHINE_IMPORT_COLUMNS.find((col) => col.key === key);
      record[key] = column.parse(cells[columnIndex] ?? '');
    });

    if (!record.name) {
      errors.push({ rowNumber, message: 'Machine name is required.' });
      return;
    }
    if (record.hourly_downtime_cost != null && Number.isNaN(record.hourly_downtime_cost)) {
      errors.push({ rowNumber, message: `"${record.name}": downtime cost per hour must be a number.` });
      return;
    }
    if (record.maintenance_interval_days != null && Number.isNaN(record.maintenance_interval_days)) {
      errors.push({ rowNumber, message: `"${record.name}": maintenance interval must be a number.` });
      return;
    }

    valid.push({
      name: record.name,
      location: record.location || '',
      asset_code: record.asset_code ?? null,
      category: record.category ?? null,
      manufacturer: record.manufacturer ?? null,
      model: record.model ?? null,
      serial_number: record.serial_number ?? null,
      department: record.department ?? null,
      production_line: record.production_line ?? null,
      criticality: record.criticality || 'medium',
      hourly_downtime_cost: record.hourly_downtime_cost || 0,
      maintenance_interval_days: record.maintenance_interval_days || 90,
    });
  });

  return { valid, errors };
}
