/* ===========================================================
   TurboFix — Operational Health Score
   ===========================================================

   One 0–100 number that blends the four signals that actually predict
   a bad week on the floor: whether machines are running, whether PM is
   on schedule, whether the parts a repair needs are in stock, and
   whether open tickets are inside their SLA. Each driver is worth 25%
   so the score stays explainable — nobody has to remember a hidden
   weighting to know why it moved.

   Pure functions only (same contract as machineHealth.js / ticketSla.js
   / inventoryMetrics.js, which this module composes) — no Supabase
   calls here. Snapshot persistence for the month-over-month trend lives
   in the page that has the Supabase client, not in this file.
   =========================================================== */

import { machineDisplayStatus } from './machineHealth.js';
import { summarizeTickets } from './ticketSla.js';
import { buildInventoryItems, stockHealthSummary } from './inventoryMetrics.js';

export const HEALTH_BAND = Object.freeze({
  HEALTHY: 'healthy',
  ATTENTION: 'attention',
  CRITICAL: 'critical',
});

export const HEALTH_BAND_META = Object.freeze({
  [HEALTH_BAND.HEALTHY]: { label: 'Healthy', color: '#22c55e' },
  [HEALTH_BAND.ATTENTION]: { label: 'Attention needed', color: '#eab308' },
  [HEALTH_BAND.CRITICAL]: { label: 'Critical', color: '#ef4444' },
});

/** 85+ reads as healthy, 65-84 needs attention, below that is critical. */
export function bandForScore(score) {
  if (score >= 85) return HEALTH_BAND.HEALTHY;
  if (score >= 65) return HEALTH_BAND.ATTENTION;
  return HEALTH_BAND.CRITICAL;
}

/** Equal weighting — see file header for why nothing is weighted higher. */
export const DRIVER_WEIGHTS = Object.freeze({
  machineHealth: 0.25,
  pmOnTime: 0.25,
  partsAvailability: 0.25,
  ticketPressure: 0.25,
});

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Machine-status is resolved the same way the fleet board does — via
 * machineDisplayStatus, which cross-references the live tickets list
 * rather than a machine's own (often-stale, page-local) track_record.
 */
function machineHealthDriver(machines, tickets, now) {
  const list = Array.isArray(machines) ? machines : [];
  if (!list.length) return { pct: 100, detail: 'No machines on record' };

  let sum = 0;
  let down = 0;
  let issues = 0;
  list.forEach((machine) => {
    const status = machineDisplayStatus(machine, tickets, now).status;
    if (status === 'down') { down += 1; }
    else if (status === 'issues' || status === 'maintenance') { sum += 60; issues += 1; return; }
    else { sum += 100; return; }
  });

  const pct = Math.round(sum / list.length);
  const detail = down > 0
    ? `${pluralize(down, 'machine')} down`
    : issues > 0
      ? `${pluralize(issues, 'machine')} need a look`
      : 'All machines running';
  return { pct, detail };
}

/** Active PM schedules only — a paused/retired schedule can't be "overdue". */
function pmOnTimeDriver(pmSchedules, now) {
  const active = (Array.isArray(pmSchedules) ? pmSchedules : [])
    .filter((schedule) => schedule?.active !== false && schedule?.next_due_at);
  if (!active.length) return { pct: 100, detail: 'No active PM schedules' };

  const nowMs = now.getTime();
  const overdue = active.filter((schedule) => new Date(schedule.next_due_at).getTime() < nowMs);
  const pct = Math.round(((active.length - overdue.length) / active.length) * 100);
  const detail = overdue.length > 0 ? `${pluralize(overdue.length, 'PM')} overdue` : 'All PM on schedule';
  return { pct, detail };
}

/** Critical + at-risk stock counts as "short" — mirrors the inventory board's own colour language. */
function partsAvailabilityDriver(parts, consumables, now) {
  const items = buildInventoryItems({ parts, consumables }, now);
  if (!items.length) return { pct: 100, detail: 'No parts tracked yet' };

  const summary = stockHealthSummary(items);
  const short = summary.critical + summary.atRisk;
  const pct = Math.round(((items.length - short) / items.length) * 100);
  const detail = short > 0 ? `${pluralize(short, 'part')} short` : 'Stock healthy';
  return { pct, detail };
}

/** Open, unbreached tickets count as healthy — a full backlog that's all on-track is not a crisis. */
function ticketPressureDriver(tickets, now) {
  const summary = summarizeTickets(tickets, now);
  if (!summary.open) return { pct: 100, detail: 'No open tickets' };

  const pct = Math.round(((summary.open - summary.breached) / summary.open) * 100);
  const detail = summary.breached > 0
    ? `${pluralize(summary.breached, 'SLA breach')}`
    : `${pluralize(summary.open, 'ticket')} open, on track`;
  return { pct, detail };
}

/**
 * The single entry point. Every argument defaults to empty so a board with
 * no parts/PM data yet still gets an honest 100% on those drivers instead
 * of a crash or a misleading 0%.
 */
export function computeOperationalHealth({
  machines = [],
  tickets = [],
  pmSchedules = [],
  parts = [],
  consumables = [],
  now = new Date(),
} = {}) {
  const reference = now instanceof Date ? now : new Date(now);

  const machineHealth = machineHealthDriver(machines, tickets, reference);
  const pmOnTime = pmOnTimeDriver(pmSchedules, reference);
  const partsAvailability = partsAvailabilityDriver(parts, consumables, reference);
  const ticketPressure = ticketPressureDriver(tickets, reference);

  const score = Math.round(
    machineHealth.pct * DRIVER_WEIGHTS.machineHealth +
    pmOnTime.pct * DRIVER_WEIGHTS.pmOnTime +
    partsAvailability.pct * DRIVER_WEIGHTS.partsAvailability +
    ticketPressure.pct * DRIVER_WEIGHTS.ticketPressure
  );

  const drivers = {
    machineHealth: { label: 'Machine health', ...machineHealth },
    pmOnTime: { label: 'PM on time', ...pmOnTime },
    partsAvailability: { label: 'Parts availability', ...partsAvailability },
    ticketPressure: { label: 'Ticket backlog', ...ticketPressure },
  };

  const worst = Object.values(drivers).reduce((a, b) => (b.pct < a.pct ? b : a));
  const nextAction = worst.pct >= 95 ? 'Operations are in control.' : `${worst.label}: ${worst.detail}`;

  return { score, band: bandForScore(score), drivers, nextAction };
}

/**
 * Turn a previous snapshot's score into the "+5 points month over month"
 * line. Returns null (not 0) when there is nothing to compare against yet,
 * so the UI can say "not enough history" instead of implying no change.
 */
export function describeTrend(currentScore, previousScore) {
  if (typeof previousScore !== 'number' || Number.isNaN(previousScore)) return null;
  const delta = currentScore - previousScore;
  if (delta === 0) return { delta, label: 'No change vs. last month' };
  return {
    delta,
    label: `${delta > 0 ? '+' : ''}${delta} point${Math.abs(delta) === 1 ? '' : 's'} vs. last month`,
  };
}
