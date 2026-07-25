/**
 * Queue filter and sort definitions for the Work Order Control Board.
 *
 * Kept out of the toolbar component so both the toolbar and the page can import
 * them without breaking React Fast Refresh (a module that exports components
 * must export nothing else).
 */

/** Quick queue filters. Counts are supplied by the page at render time. */
export const QUEUE_FILTERS = Object.freeze([
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'breached', label: 'SLA breached' },
  { key: 'overdue', label: 'Overdue >24h' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'archived', label: 'Archived' },
]);

export const SORT_OPTIONS = Object.freeze([
  { key: 'priority', label: 'Priority' },
  { key: 'age', label: 'Age (oldest first)' },
  { key: 'sla', label: 'SLA % used' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'machine', label: 'Machine' },
]);
