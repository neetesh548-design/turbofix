/* ===========================================================
   TurboFix — OEE (Overall Equipment Effectiveness)
   ===========================================================

   OEE = Availability x Performance x Quality — the composite number a
   manufacturing plant manager asks for by name (InnoMaint and every other
   CMMS reviewed leads with it). TurboFix had the ingredients for
   Availability already (ticket downtime_minutes); Performance and Quality
   genuinely need a new input this app never collected: production count
   per shift (see the production_logs table in the migration of the same
   name, and machine.ideal_cycle_time_seconds / planned_minutes_per_shift).

   A machine with zero production_logs entries has NO Performance/Quality
   number — hasProductionData tells the caller so it can say "not tracked
   yet" instead of a fabricated 0% or 100%. Availability alone is always
   computable once downtime is known, since it needs no new operator input.

   Pure functions only — no Supabase calls here, same contract as
   machineHealth.js / ticketSla.js / operationalHealth.js.
   =========================================================== */

import { asArray, asNumber } from './dashboardMetrics.js';

/** Used only when a machine hasn't configured its own shift length. */
export const DEFAULT_PLANNED_MINUTES_PER_SHIFT = 480; // 8-hour shift

function toTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function withinPeriod(value, periodStart, periodEnd) {
  const t = toTime(value);
  return t != null && t >= periodStart.getTime() && t <= periodEnd.getTime();
}

/** [start of today, now) in the caller's local time — the default OEE window, matching a single-shift-so-far read. */
export function todayRange(now = new Date()) {
  const reference = now instanceof Date ? now : new Date(now);
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  return { periodStart: start, periodEnd: reference };
}

function machineIdOf(machine) {
  return machine?.id || machine?.machine_id;
}

/**
 * Run Time / Planned Production Time. Always computable — downtime comes
 * from ticket.downtime_minutes, which every breakdown ticket already
 * carries (see machineHealth.js's ticketIndicatesDowntime for the same
 * field used elsewhere).
 */
export function computeAvailability({ machine, tickets = [], periodStart, periodEnd }) {
  const machineId = machineIdOf(machine);
  const plannedMinutes = asNumber(machine?.planned_minutes_per_shift) || DEFAULT_PLANNED_MINUTES_PER_SHIFT;

  const downtimeMinutes = asArray(tickets)
    .filter((ticket) => ticket?.machine_id === machineId && withinPeriod(ticket?.created_at, periodStart, periodEnd))
    .reduce((sum, ticket) => sum + asNumber(ticket?.downtime_minutes), 0);

  const runMinutes = Math.max(0, plannedMinutes - downtimeMinutes);
  const pct = plannedMinutes > 0 ? Math.min(100, Math.round((runMinutes / plannedMinutes) * 1000) / 10) : null;

  return { pct, plannedMinutes, downtimeMinutes, runMinutes };
}

/** (Total Count x Ideal Cycle Time) / Run Time — needs both a configured cycle time and at least one production log. */
export function computePerformance({ machine, goodCount = 0, rejectCount = 0, runMinutes }) {
  const idealCycleSeconds = asNumber(machine?.ideal_cycle_time_seconds);
  if (!idealCycleSeconds || !runMinutes) return { pct: null };

  const totalCount = goodCount + rejectCount;
  const idealMinutesNeeded = (totalCount * idealCycleSeconds) / 60;
  // Clamped at 100%: a machine can't be credited for running faster than its
  // own ideal cycle time implies, even if the logged count suggests it did
  // (usually a sign the configured cycle time is stale, not a real overrun).
  const pct = Math.min(100, Math.round((idealMinutesNeeded / runMinutes) * 1000) / 10);
  return { pct };
}

/** Good Count / Total Count. */
export function computeQuality({ goodCount = 0, rejectCount = 0 }) {
  const total = goodCount + rejectCount;
  if (!total) return { pct: null };
  return { pct: Math.round((goodCount / total) * 1000) / 10 };
}

/**
 * The single entry point. Returns null (not 0 or 100) for any leg — and for
 * oeePct itself — that the underlying data can't support yet, so a machine
 * nobody has logged production for reads as "not tracked", never as a
 * fabricated score.
 */
export function computeOee({ machine, tickets = [], productionLogs = [], now = new Date(), periodStart, periodEnd }) {
  const period = periodStart && periodEnd ? { periodStart, periodEnd } : todayRange(now);
  const machineId = machineIdOf(machine);

  const logs = asArray(productionLogs)
    .filter((log) => log?.machine_id === machineId && withinPeriod(log?.log_date || log?.created_at, period.periodStart, period.periodEnd));
  const hasProductionData = logs.length > 0;
  const goodCount = logs.reduce((sum, log) => sum + asNumber(log?.good_count), 0);
  const rejectCount = logs.reduce((sum, log) => sum + asNumber(log?.reject_count), 0);

  const availability = computeAvailability({ machine, tickets, ...period });
  const performance = hasProductionData
    ? computePerformance({ machine, goodCount, rejectCount, runMinutes: availability.runMinutes })
    : { pct: null };
  const quality = hasProductionData ? computeQuality({ goodCount, rejectCount }) : { pct: null };

  const oeePct = (availability.pct != null && performance.pct != null && quality.pct != null)
    ? Math.round(((availability.pct / 100) * (performance.pct / 100) * (quality.pct / 100)) * 1000) / 10
    : null;

  return {
    oeePct,
    availabilityPct: availability.pct,
    performancePct: performance.pct,
    qualityPct: quality.pct,
    hasProductionData,
    goodCount,
    rejectCount,
    downtimeMinutes: availability.downtimeMinutes,
    plannedMinutes: availability.plannedMinutes,
  };
}
