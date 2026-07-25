/**
 * TurboFix SLA (Service Level Agreement) Engine
 * ---------------------------------------------
 * The `tickets` table has no SLA column, so SLA is DERIVED on the client from
 * urgency + timestamps. Keeping the whole policy in one pure, testable module
 * means the control board, the KPI bar and any future report all agree.
 *
 * Policy: every ticket gets a resolution target based on its urgency, measured
 * from `created_at` to `resolved_at` (closed) or to "now" (still open).
 */

/** Resolution target, in hours, per urgency level. */
export const SLA_TARGET_HOURS = Object.freeze({
  critical: 4,
  high: 8,
  medium: 24,
  low: 72,
});

/** Applied when a ticket has no urgency, or an unrecognised one. */
export const DEFAULT_SLA_TARGET_HOURS = 24;

/** Fraction of the target after which an open ticket is flagged "at risk". */
export const AT_RISK_RATIO = 0.75;

const CLOSED_STATUSES = ['closed', 'resolved'];

/** Lifecycle stages that count as actively-worked rather than merely reported. */
export const IN_PROGRESS_STAGES = Object.freeze([
  'acknowledged',
  'assigned',
  'work_started',
  'waiting_spare',
  'waiting_approval',
  'waiting_vendor',
  'repair_completed',
  'verification_pending',
]);

/** Presentation metadata for each SLA state. Colours match the vault palette. */
export const SLA_STATE_META = Object.freeze({
  on_track: { label: 'On track', color: '#25D366', short: 'OK' },
  at_risk: { label: 'At risk', color: '#FBBF24', short: 'RISK' },
  breached: { label: 'SLA breached', color: '#F87171', short: 'BREACH' },
  met: { label: 'Met SLA', color: '#25D366', short: 'MET' },
  missed: { label: 'Missed SLA', color: '#F87171', short: 'MISSED' },
  unknown: { label: 'No SLA data', color: '#94a3b8', short: '—' },
});

/**
 * Parse a timestamp that may be an ISO string, a "YYYY-MM-DD HH:MM:SS"
 * Postgres string, or a Date. Returns epoch ms, or null when unusable.
 */
function toTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  const ms = date.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Lower-cased urgency, reading the ticket column or the AI summary. */
export function normalizeUrgency(ticket) {
  if (!ticket) return '';
  const fromSummary =
    ticket.ai_summary && typeof ticket.ai_summary === 'object' ? ticket.ai_summary.urgency : '';
  return String(ticket.urgency || fromSummary || '').toLowerCase().trim();
}

export function isTicketClosed(ticket) {
  if (!ticket) return false;
  const status = String(ticket.status || '').toLowerCase();
  const stage = String(ticket.lifecycle_stage || '').toLowerCase();
  return CLOSED_STATUSES.includes(status) || stage === 'closed';
}

export function isTicketInProgress(ticket) {
  if (!ticket || isTicketClosed(ticket)) return false;
  return IN_PROGRESS_STAGES.includes(String(ticket.lifecycle_stage || '').toLowerCase());
}

/** Resolution target in hours for this ticket's urgency. */
export function slaTargetHours(ticket) {
  const urgency = normalizeUrgency(ticket);
  return SLA_TARGET_HOURS[urgency] ?? DEFAULT_SLA_TARGET_HOURS;
}

export function ticketOpenedAt(ticket) {
  if (!ticket) return null;
  return toTime(ticket.created_at) ?? toTime(ticket.reported_at);
}

export function ticketClosedAt(ticket) {
  if (!ticket) return null;
  return toTime(ticket.resolved_at) ?? toTime(ticket.closed_at) ?? toTime(ticket.verified_at);
}

/**
 * How long the ticket has been (or was) open, in hours.
 * Closed tickets freeze at their resolution time; open ones keep counting.
 * Returns null when the ticket carries no usable opening timestamp.
 */
export function ticketAgeHours(ticket, now = new Date()) {
  const start = ticketOpenedAt(ticket);
  if (start == null) return null;
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const end = isTicketClosed(ticket) ? ticketClosedAt(ticket) ?? nowMs : nowMs;
  return Math.max(0, (end - start) / 3_600_000);
}

/**
 * Full SLA readout for a single ticket.
 *
 * @returns {{
 *   known: boolean, closed: boolean, state: string, meta: object,
 *   targetHours: number, elapsedHours: number|null, remainingHours: number|null,
 *   ratio: number|null, percentUsed: number|null, breached: boolean, dueAt: Date|null
 * }}
 */
export function computeSla(ticket, now = new Date()) {
  const targetHours = slaTargetHours(ticket);
  const closed = isTicketClosed(ticket);
  const elapsedHours = ticketAgeHours(ticket, now);

  if (elapsedHours == null) {
    return {
      known: false,
      closed,
      state: 'unknown',
      meta: SLA_STATE_META.unknown,
      targetHours,
      elapsedHours: null,
      remainingHours: null,
      ratio: null,
      percentUsed: null,
      breached: false,
      dueAt: null,
    };
  }

  const ratio = elapsedHours / targetHours;
  const breached = ratio > 1;

  let state;
  if (closed) state = breached ? 'missed' : 'met';
  else if (breached) state = 'breached';
  else if (ratio >= AT_RISK_RATIO) state = 'at_risk';
  else state = 'on_track';

  return {
    known: true,
    closed,
    state,
    meta: SLA_STATE_META[state],
    targetHours,
    elapsedHours,
    remainingHours: targetHours - elapsedHours,
    ratio,
    // Clamped for bar rendering; use `ratio` when you need the true overshoot.
    percentUsed: Math.min(100, Math.round(ratio * 100)),
    breached,
    dueAt: new Date(ticketOpenedAt(ticket) + targetHours * 3_600_000),
  };
}

/** True when a ticket is still open and past its SLA target. */
export function isSlaBreached(ticket, now = new Date()) {
  const sla = computeSla(ticket, now);
  return sla.state === 'breached';
}

/**
 * Human-friendly duration from a float number of hours.
 * 0.4 -> "24m", 3.5 -> "3h 30m", 50 -> "2d 2h"
 */
export function formatDurationHours(hours) {
  if (hours == null || Number.isNaN(hours)) return '—';
  const total = Math.max(0, Math.round(hours * 60)); // minutes
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

function isSameLocalDay(ms, reference) {
  const a = new Date(ms);
  const b = reference instanceof Date ? reference : new Date(reference);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Roll a ticket list up into the numbers shown on the KPI bar.
 * Pure so the dashboard and any report can share one definition of each metric.
 */
export function summarizeTickets(tickets = [], now = new Date()) {
  const list = Array.isArray(tickets) ? tickets : [];
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  let open = 0;
  let breached = 0;
  let atRisk = 0;
  let inProgress = 0;
  let resolvedToday = 0;
  let resolutionHoursTotal = 0;
  let resolutionCount = 0;

  list.forEach((ticket) => {
    const closed = isTicketClosed(ticket);
    const sla = computeSla(ticket, now);

    if (closed) {
      const closedAt = ticketClosedAt(ticket);
      if (closedAt != null && isSameLocalDay(closedAt, nowMs)) resolvedToday += 1;
      if (sla.known) {
        resolutionHoursTotal += sla.elapsedHours;
        resolutionCount += 1;
      }
      return;
    }

    open += 1;
    if (sla.state === 'breached') breached += 1;
    if (sla.state === 'at_risk') atRisk += 1;
    if (isTicketInProgress(ticket)) inProgress += 1;
  });

  return {
    total: list.length,
    open,
    breached,
    atRisk,
    inProgress,
    resolvedToday,
    avgResolutionHours: resolutionCount ? resolutionHoursTotal / resolutionCount : null,
    resolvedCount: resolutionCount,
  };
}
