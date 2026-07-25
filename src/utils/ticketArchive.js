/**
 * TurboFix Ticket Archiving & Systematic Storage Engine
 * Business Rule: Closed tickets older than 3 months (90 days) are systematically archived
 * to keep active tables fast and lightweight over multi-year operations.
 */

export const ARCHIVE_THRESHOLD_DAYS = 90;
export const ARCHIVE_THRESHOLD_MS = ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Determines if a ticket is eligible for 3-month systematic archiving
 * @param {Object} ticket
 * @param {Date} [now]
 * @returns {Boolean}
 */
export function isEligibleForArchive(ticket, now = new Date()) {
  if (!ticket) return false;
  
  const status = String(ticket.status || ticket.lifecycle_stage || '').toLowerCase();
  const isClosed = ['closed', 'resolved'].includes(status);
  if (!isClosed) return false;

  // Check explicit archived flag if present
  if (ticket.archived === true || ticket.is_archived === true) return true;

  // Calculate closed date age
  const closedDateStr = ticket.closed_at || ticket.resolved_at || ticket.updated_at || ticket.created_at;
  if (!closedDateStr) return false;

  const closedDate = new Date(closedDateStr);
  if (Number.isNaN(closedDate.getTime())) return false;

  const ageMs = now.getTime() - closedDate.getTime();
  return ageMs >= ARCHIVE_THRESHOLD_MS;
}

/**
 * Partition tickets into Active vs. Systematically Archived
 * @param {Array} tickets
 * @param {Date} [now]
 * @returns {Object} { activeTickets, archivedTickets }
 */
export function partitionTickets(tickets = [], now = new Date()) {
  const activeTickets = [];
  const archivedTickets = [];

  tickets.forEach((ticket) => {
    if (isEligibleForArchive(ticket, now)) {
      archivedTickets.push({ ...ticket, is_systematically_archived: true });
    } else {
      activeTickets.push(ticket);
    }
  });

  return { activeTickets, archivedTickets };
}

/**
 * Generate CSV data download for archived historical tickets
 * @param {Array} archivedTickets
 * @returns {String} CSV string
 */
export function exportArchivedTicketsCSV(archivedTickets = []) {
  const headers = [
    'Ticket ID',
    'Machine ID',
    'Machine Name',
    'Issue Summary',
    'Direct Cause',
    'Root Cause Fix',
    'Urgency',
    'Status',
    'Reported At',
    'Closed At',
    'Archive Date'
  ];

  const rows = archivedTickets.map((t) => [
    `"${t.id || ''}"`,
    `"${t.machine_id || ''}"`,
    `"${(t.machine_name || '').replace(/"/g, '""')}"`,
    `"${(t.issue_text || t.description || '').replace(/"/g, '""')}"`,
    `"${(t.root_cause || '').replace(/"/g, '""')}"`,
    `"${(t.repair_action || '').replace(/"/g, '""')}"`,
    `"${t.urgency || 'Normal'}"`,
    `"${t.status || 'Closed'}"`,
    `"${t.created_at || t.reported_at || ''}"`,
    `"${t.closed_at || t.resolved_at || ''}"`,
    `"${new Date().toISOString().split('T')[0]}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Trigger CSV download in browser
 */
export function downloadArchivedCSV(archivedTickets = [], filename = `turbofix-archived-tickets-${new Date().toISOString().split('T')[0]}.csv`) {
  const csvContent = exportArchivedTicketsCSV(archivedTickets);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
