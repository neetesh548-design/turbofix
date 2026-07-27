/**
 * MTTR / MTBF / Downtime Cost pure utility functions.
 * All functions are stateless and take plain arrays — safe to call from
 * any component, test, or export pipeline.
 */

/**
 * Mean Time To Repair (hours).
 * Only counts closed tickets that have both a created_at and resolved_at.
 */
export function computeMTTR(tickets = []) {
  const resolved = tickets.filter(t => {
    const status = String(t.status || '').toLowerCase();
    return (status === 'resolved' || status === 'closed') && t.created_at && (t.resolved_at || t.closed_at);
  });
  if (!resolved.length) return null;
  const totalHours = resolved.reduce((sum, t) => {
    const start = new Date(t.created_at).getTime();
    const end = new Date(t.resolved_at || t.closed_at).getTime();
    return sum + Math.max(0, (end - start) / 3_600_000);
  }, 0);
  return totalHours / resolved.length;
}

/**
 * Mean Time Between Failures (hours) per machine.
 * Returns a map of machineId -> avg hours between consecutive tickets.
 */
export function computeMTBF(tickets = []) {
  const byMachine = {};
  tickets.forEach(t => {
    if (!t.machine_id || !t.created_at) return;
    if (!byMachine[t.machine_id]) byMachine[t.machine_id] = [];
    byMachine[t.machine_id].push(new Date(t.created_at).getTime());
  });

  const result = {};
  Object.entries(byMachine).forEach(([machineId, timestamps]) => {
    const sorted = timestamps.sort((a, b) => a - b);
    if (sorted.length < 2) { result[machineId] = null; return; }
    let totalGap = 0;
    for (let i = 1; i < sorted.length; i++) totalGap += sorted[i] - sorted[i - 1];
    result[machineId] = totalGap / (sorted.length - 1) / 3_600_000;
  });
  return result;
}

/**
 * Estimated production cost of all downtime (INR).
 * @param {object[]} tickets
 * @param {number} costPerHour — INR per hour of downtime (default ₹5,000)
 */
export function computeDowntimeCost(tickets = [], costPerHour = 5000) {
  const totalHours = tickets.reduce((sum, t) => {
    if (t.downtime_hours) return sum + Number(t.downtime_hours);
    // Estimate from resolution time if downtime_hours not recorded
    if (!t.created_at) return sum;
    const status = String(t.status || '').toLowerCase();
    const isClosed = status === 'resolved' || status === 'closed';
    if (!isClosed || !t.resolved_at) return sum;
    const hrs = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3_600_000;
    return sum + Math.min(hrs, 24); // cap at 24h to avoid outlier skew
  }, 0);
  return totalHours * costPerHour;
}

/**
 * Format a cost in INR with lakhs/crores notation.
 */
export function formatINR(amount) {
  if (amount == null) return '—';
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

/**
 * Summary object for dashboard display.
 */
export function computeMttrSummary(tickets = []) {
  return {
    mttr: computeMTTR(tickets),
    mtbf: computeMTBF(tickets),
    downtimeCost: computeDowntimeCost(tickets),
    resolvedCount: tickets.filter(t => ['resolved','closed'].includes(String(t.status||'').toLowerCase())).length,
    openCount: tickets.filter(t => !['resolved','closed'].includes(String(t.status||'').toLowerCase())).length,
  };
}
