/**
 * TurboFix ticket presentation metadata + heuristic diagnostics.
 *
 * Extracted from Tickets.jsx / TicketCard.jsx, which each carried their own
 * copy of the lifecycle map and urgency palette. One source keeps the control
 * board, the cards and the drill-down panel visually consistent.
 */

/** Canonical 10-state work-order lifecycle (roadmap §3.4). */
export const LIFECYCLE = Object.freeze({
  reported: { label: 'Reported', color: '#F87171' },
  acknowledged: { label: 'Acknowledged', color: '#FBBF24' },
  assigned: { label: 'Assigned', color: '#FBBF24' },
  work_started: { label: 'Work started', color: '#60A5FA' },
  waiting_spare: { label: 'Waiting for spare', color: '#F59E0B' },
  waiting_approval: { label: 'Waiting for approval', color: '#F59E0B' },
  waiting_vendor: { label: 'Waiting for vendor', color: '#F59E0B' },
  repair_completed: { label: 'Repair completed', color: '#34D399' },
  verification_pending: { label: 'Verification pending', color: '#A78BFA' },
  closed: { label: 'Closed', color: '#25D366' },
});

/** Resolve a ticket's lifecycle badge, falling back for legacy rows. */
export function stageInfo(ticket) {
  const raw = String(ticket?.lifecycle_stage || '').toLowerCase();
  if (LIFECYCLE[raw]) return LIFECYCLE[raw];
  return ['closed', 'resolved'].includes(String(ticket?.status || '').toLowerCase())
    ? LIFECYCLE.closed
    : LIFECYCLE.reported;
}

/** Urgency badge palette: Critical=red, High=orange, Medium=blue, Low=grey. */
export const URGENCY_META = Object.freeze({
  critical: { label: 'Critical', color: '#F87171', rgb: '239,68,68', rank: 0 },
  high: { label: 'High', color: '#FBBF24', rgb: '245,158,11', rank: 1 },
  medium: { label: 'Medium', color: '#60A5FA', rgb: '96,165,250', rank: 2 },
  low: { label: 'Low', color: '#94a3b8', rgb: '148,163,184', rank: 3 },
});

const UNRATED_URGENCY = { label: 'Unrated', color: '#94a3b8', rgb: '148,163,184', rank: 4 };

export function urgencyMeta(urgency) {
  return URGENCY_META[String(urgency || '').toLowerCase()] || UNRATED_URGENCY;
}

/** Inline style for an urgency pill. */
export function urgencyBadgeStyle(urgency) {
  const meta = urgencyMeta(urgency);
  return {
    background: `rgba(${meta.rgb}, 0.15)`,
    color: meta.color,
    border: `1px solid rgba(${meta.rgb}, 0.4)`,
  };
}

/** Sort rank so Critical floats to the top of the queue. */
export function urgencyRank(ticket) {
  return urgencyMeta(ticket?.urgency).rank;
}

/** Initials for a technician avatar, e.g. "Ravi Kumar" -> "RK". */
export function initialsOf(name) {
  const clean = String(name || '').trim();
  if (!clean || clean.toLowerCase() === 'unassigned') return '?';
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** Deterministic avatar colour so a given technician always looks the same. */
export function avatarColor(name) {
  const palette = ['#25D366', '#60A5FA', '#A78BFA', '#FBBF24', '#F87171', '#34D399', '#F472B6'];
  const key = String(name || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(String(value).replace(' ', 'T')).toLocaleString();
  } catch {
    return String(value);
  }
}

/** Short one-line issue summary, whatever shape the row happens to carry. */
export function issueSummary(ticket) {
  if (!ticket) return '—';
  return ticket.issue_text || ticket.description || aiInsight(ticket) || '—';
}

/** The AI-derived insight line, tolerating both string and object ai_summary. */
export function aiInsight(ticket) {
  const summary = ticket?.ai_summary;
  if (!summary) return '';
  if (typeof summary === 'string') return summary;
  return summary.predicted_issue || summary.recommended_action || '';
}

/**
 * Heuristic "direct cause" (5-Why level 2) used when no technician RCA exists.
 * Prefers real recorded data, then the AI summary, then keyword matching.
 */
export function getDirectCause(ticket) {
  if (ticket?.root_cause?.trim()) return ticket.root_cause;
  if (ticket?.ai_summary?.predicted_issue?.trim()) return ticket.ai_summary.predicted_issue;

  const machine =
    ticket?.machine_name && ticket.machine_name !== 'Unknown' ? ticket.machine_name : 'Machine';
  const text = `${ticket?.issue_text || ''} ${machine}`.toLowerCase();

  if (/leak|oil|fluid|seal|drop|तेल|गळती/.test(text)) {
    return `${machine}: Hydraulic/Lubrication Seal Degradation or Fitting Pressure Drop`;
  }
  if (/smoke|burn|heat|fire|hot|धुआं|गरम/.test(text)) {
    return `${machine}: Thermal Overload Relay Trip or Motor Coil Resistance Failure`;
  }
  if (/noise|vibration|sound|vibrat|आवाज/.test(text)) {
    return `${machine}: Spindle Shaft Bearing Misalignment or Drive Belt Friction`;
  }
  if (/sensor|limit|tripped|electric|switch/.test(text)) {
    return `${machine}: Proximity Sensor Misalignment or Interlock Circuit Trip`;
  }
  return `${machine}: Mechanical Drive Resistance & Actuator Operational Failure`;
}

/** Heuristic "root cause & fix" (5-Why level 3). Same precedence as above. */
export function getRootCauseFix(ticket) {
  if (ticket?.repair_action?.trim()) return ticket.repair_action;
  if (ticket?.ai_summary?.recommended_action?.trim()) return ticket.ai_summary.recommended_action;

  const machine =
    ticket?.machine_name && ticket.machine_name !== 'Unknown' ? ticket.machine_name : 'Machine';
  const text = `${ticket?.issue_text || ''} ${machine}`.toLowerCase();

  if (/leak|oil|fluid|seal|drop|तेल|गळती/.test(text)) {
    return 'Replace hydraulic cylinder seal rings, torque pipe fittings to specification, and top up ISO VG 68 oil.';
  }
  if (/smoke|burn|heat|fire|hot|धुआं|गरम/.test(text)) {
    return 'Isolate main power, inspect motor windings resistance, clean cooling fins, and test thermal overload relay.';
  }
  if (/noise|vibration|sound|vibrat|आवाज/.test(text)) {
    return 'Re-align drive pulleys, replace high-speed spindle bearings, and apply synthetic lithium grease.';
  }
  return 'Perform full diagnostic check on safety interlocks, recalibrate proximity sensors, and test full stroke operation under load.';
}
