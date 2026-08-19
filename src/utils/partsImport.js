/* ===========================================================
   TurboFix — Bulk parts CSV import
   ===========================================================

   Same rationale and mechanics as machineImport.js (see that file's header
   for the full "why this exists" note) — this is the parts-inventory half
   of the same self-serve onboarding gap. Mirrors the exact field shape
   StoreManagerInventory.jsx's "Add part" form already sends to
   Inventory.jsx's addItem(), so a parsed row inserts with zero translation.

   Pure functions only — parseCSV itself lives in machineImport.js and is
   re-exported here rather than duplicated.
   =========================================================== */

import { parseCSV } from './machineImport.js';

export { parseCSV };

export const MACHINE_PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const PART_IMPORT_COLUMNS = [
  { key: 'name', label: 'Part name', required: true, parse: (v) => v.trim() },
  { key: 'part_number', label: 'Part number', required: false, parse: (v) => v.trim() },
  { key: 'associated_machine', label: 'Associated machine', required: false, parse: (v) => v.trim() },
  {
    key: 'machine_priority',
    label: 'Machine priority (Low/Medium/High/Critical)',
    required: false,
    parse: (v) => {
      const trimmed = v.trim();
      const match = MACHINE_PRIORITY_LEVELS.find((level) => level.toLowerCase() === trimmed.toLowerCase());
      return match || 'Medium';
    },
  },
  { key: 'stock_qty', label: 'Stock on hand', required: false, parse: (v) => (v.trim() === '' ? 0 : Number(v)) },
  { key: 'reorder_level', label: 'Reorder level', required: false, parse: (v) => (v.trim() === '' ? 0 : Number(v)) },
  { key: 'unit_cost', label: 'Unit cost (₹)', required: false, parse: (v) => (v.trim() === '' ? 0 : Number(v)) },
  { key: 'lead_time_days', label: 'Lead time (days)', required: false, parse: (v) => (v.trim() === '' ? 0 : Number(v)) },
  { key: 'supplier', label: 'Supplier', required: false, parse: (v) => v.trim() },
  { key: 'location', label: 'Bin / location', required: false, parse: (v) => v.trim() },
];

const EXAMPLE_ROW = {
  name: 'Bearing 6205ZZ',
  part_number: 'BRG-6205ZZ',
  associated_machine: 'CNC Lathe 1',
  machine_priority: 'High',
  stock_qty: '12',
  reorder_level: '5',
  unit_cost: '450',
  lead_time_days: '7',
  supplier: 'Hydrotech Services',
  location: 'Bin A-04',
};

function escapeCell(value) {
  if (value == null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildPartImportTemplateCSV() {
  const header = PART_IMPORT_COLUMNS.map((col) => escapeCell(col.label)).join(',');
  const example = PART_IMPORT_COLUMNS.map((col) => escapeCell(EXAMPLE_ROW[col.key] ?? '')).join(',');
  return [header, example].join('\n');
}

export function downloadPartImportTemplateCSV(filename = 'turbofix-parts-import-template.csv') {
  if (typeof document === 'undefined') return;
  const blob = new Blob(['﻿', buildPartImportTemplateCSV()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function stripHint(value) {
  return value.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

const HEADER_ALIASES = {
  name: ['part name', 'name'],
  part_number: ['part number', 'part_number', 'part no', 'sku'],
  associated_machine: ['associated machine', 'machine', 'machine name'],
  machine_priority: ['machine priority', 'priority'],
  stock_qty: ['stock on hand', 'stock qty', 'quantity', 'qty'],
  reorder_level: ['reorder level', 'reorder point', 'reorder'],
  unit_cost: ['unit cost', 'unit price', 'cost'],
  lead_time_days: ['lead time', 'lead time days'],
  supplier: ['supplier', 'vendor'],
  location: ['bin / location', 'bin location', 'location', 'bin'],
};

function matchColumnKey(headerCell) {
  const normalized = stripHint(headerCell.trim().toLowerCase());
  return PART_IMPORT_COLUMNS.find((col) =>
    (HEADER_ALIASES[col.key] || []).some((alias) => stripHint(alias) === normalized)
  )?.key || null;
}

/**
 * Parse + validate an uploaded CSV against PART_IMPORT_COLUMNS.
 * Same contract as machineImport.js's parseMachinesCSV.
 */
export function parsePartsCSV(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return { valid: [], errors: [{ rowNumber: 0, message: 'The file is empty.' }] };

  const [headerRow, ...dataRows] = rows;
  const keyByColumnIndex = headerRow.map(matchColumnKey);
  if (!keyByColumnIndex.includes('name')) {
    return { valid: [], errors: [{ rowNumber: 0, message: 'No "Part name" column found — download the template to see the expected headers.' }] };
  }

  const valid = [];
  const errors = [];

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const record = {};
    keyByColumnIndex.forEach((key, columnIndex) => {
      if (!key) return;
      const column = PART_IMPORT_COLUMNS.find((col) => col.key === key);
      record[key] = column.parse(cells[columnIndex] ?? '');
    });

    if (!record.name) {
      errors.push({ rowNumber, message: 'Part name is required.' });
      return;
    }
    for (const numericKey of ['stock_qty', 'reorder_level', 'unit_cost', 'lead_time_days']) {
      if (record[numericKey] != null && Number.isNaN(record[numericKey])) {
        errors.push({ rowNumber, message: `"${record.name}": ${PART_IMPORT_COLUMNS.find((c) => c.key === numericKey).label} must be a number.` });
        return;
      }
    }

    valid.push({
      name: record.name,
      part_number: record.part_number || '',
      associated_machine: record.associated_machine || '',
      machine_priority: record.machine_priority || 'Medium',
      stock_qty: record.stock_qty || 0,
      reorder_level: record.reorder_level || 0,
      unit_cost: record.unit_cost || 0,
      lead_time_days: record.lead_time_days || 0,
      supplier: record.supplier || '',
      location: record.location || '',
    });
  });

  return { valid, errors };
}
