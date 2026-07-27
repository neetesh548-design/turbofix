/**
 * CSV export for the work-order control board.
 *
 * Distinct from `ticketArchive.exportArchivedTicketsCSV`, which is fixed to the
 * archive schema. This one exports whatever the supervisor is currently looking
 * at, including the derived SLA columns they filtered and sorted on.
 */

import { computeSla, ticketAgeHours, isTicketClosed } from './ticketSla';

const COLUMNS = [
  ['Work Order', (t) => t.wo_number || t.ticket_id || t.id],
  ['Ticket ID', (t) => t.ticket_id || t.id],
  ['Machine', (t) => t.machine_name],
  ['Machine ID', (t) => t.machine_id],
  ['Issue', (t) => t.issue_text || t.description],
  ['Urgency', (t) => t.urgency || 'Unrated'],
  ['Status', (t) => t.status],
  ['Lifecycle Stage', (t) => t.lifecycle_stage],
  ['Assignee', (t) => t.technician_name],
  ['Reported At', (t) => t.created_at || t.reported_at],
  ['Resolved At', (t) => t.resolved_at || t.closed_at || ''],
  ['Age (hours)', (t, sla, age) => (age == null ? '' : age.toFixed(2))],
  ['SLA Target (hours)', (t, sla) => sla.targetHours],
  ['SLA Used (%)', (t, sla) => (sla.ratio == null ? '' : Math.round(sla.ratio * 100))],
  ['SLA State', (t, sla) => sla.meta.label],
  ['Closed', (t) => (isTicketClosed(t) ? 'Yes' : 'No')],
  ['Root Cause', (t) => t.root_cause],
  ['Repair Action', (t) => t.repair_action],
  ['Parts Used', (t) => t.parts_used],
  ['Downtime (min)', (t) => t.downtime_minutes],
];

/** RFC-4180 style escaping: wrap in quotes, double any inner quote. */
function escapeCell(value) {
  if (value == null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Build a CSV string from a ticket list.
 * @param {Array} tickets
 * @param {Date} [now] injected clock so SLA columns are reproducible
 * @param {Object} [options] optional { startDate, endDate } filter
 * @returns {string}
 */
export function buildTicketsCSV(tickets = [], now = new Date(), options = {}) {
  let list = Array.isArray(tickets) ? tickets : [];
  if (options.startDate) {
    const start = new Date(options.startDate).getTime();
    list = list.filter((t) => new Date(t.created_at || t.reported_at).getTime() >= start);
  }
  if (options.endDate) {
    const end = new Date(options.endDate).getTime();
    list = list.filter((t) => new Date(t.created_at || t.reported_at).getTime() <= end);
  }

  const rows = list.map((ticket) => {
    const sla = computeSla(ticket, now);
    const age = ticketAgeHours(ticket, now);
    return COLUMNS.map(([, read]) => escapeCell(read(ticket, sla, age))).join(',');
  });
  return [COLUMNS.map(([header]) => escapeCell(header)).join(','), ...rows].join('\n');
}

/**
 * Trigger a browser download of the given tickets as CSV.
 * No-ops outside a DOM (e.g. during SSR or unit tests).
 */
export function downloadTicketsCSV(tickets = [], filename, options = {}) {
  if (typeof document === 'undefined') return;

  const name = filename || `turbofix-tickets-${new Date().toISOString().split('T')[0]}.csv`;
  // BOM keeps Excel happy with the non-ASCII machine names this plant uses.
  const blob = new Blob(['﻿', buildTicketsCSV(tickets, new Date(), options)], {
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
