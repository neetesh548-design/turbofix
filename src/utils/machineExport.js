/**
 * CSV export for the machine health board.
 *
 * Mirrors `ticketExport.js`'s shape so both boards export consistently.
 */

import { machineStatusVerdict } from './machineHealth';

const COLUMNS = [
  ['Machine', (m) => m.machine_name || m.machine_id],
  ['Machine ID', (m) => m.machine_id],
  ['Location', (m) => m.location],
  ['Status', (m, health) => health.label],
  ['Technician', (m) => m.assignments?.technician?.name || 'Unassigned'],
  ['Open tickets', (m, health) => health.openCount],
  ['Last service', (m, health) => health.service.label],
  ['Next PM', (m, health) => health.pm.label],
];

/** RFC-4180 style escaping: wrap in quotes, double any inner quote. */
function escapeCell(value) {
  if (value == null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Build a CSV string from a machine list.
 * @param {Array} machines
 * @returns {string}
 */
export function buildMachinesCSV(machines = []) {
  const rows = (Array.isArray(machines) ? machines : []).map((machine) => {
    const health = machineStatusVerdict(machine);
    return COLUMNS.map(([, read]) => escapeCell(read(machine, health))).join(',');
  });
  return [COLUMNS.map(([header]) => escapeCell(header)).join(','), ...rows].join('\n');
}

/**
 * Trigger a browser download of the given machines as CSV.
 * No-ops outside a DOM (e.g. during SSR or unit tests).
 */
export function downloadMachinesCSV(machines = [], filename) {
  if (typeof document === 'undefined') return;

  const name = filename || `turbofix-machines-${new Date().toISOString().split('T')[0]}.csv`;
  const blob = new Blob(['﻿', buildMachinesCSV(machines)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
