/* ===========================================================
   TurboFix — Role-aware dashboard metrics
   ===========================================================

   Every number on the role dashboards is computed here, as a pure
   function over the same `machines` / `tickets` / `team` arrays the
   rest of the app already fetches. Keeping the arithmetic out of the
   React tree means:

     - the Owner board and the Supervisor board cannot disagree about
       what "SLA compliance" means,
     - each metric is unit-testable without mounting a component,
     - the 5-minute KPI cache wraps one function instead of a page.

   Conventions used throughout:
     - every input is defensively coerced to an array; a missing table
       yields an empty/zero metric rather than a TypeError,
     - a metric with no data to stand on returns `null`, never `0`.
       "No PM logged yet" and "0% compliance" are different facts and
       the UI renders them differently,
     - `now` is always injectable so tests never depend on the clock.
   =========================================================== */

import {
  computeSla,
  isTicketClosed,
  normalizeUrgency,
  ticketOpenedAt,
  ticketClosedAt,
  ticketAgeHours,
} from './ticketSla.js';
import { computeMachineHealth, databaseStatusBucket, machineStatusVerdict, nextPmInfo, HEALTH } from './machineHealth.js';

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Assumed shop labour rate (₹/hr) — matches the machine workspace. */
export const LABOUR_RATE_PER_HOUR = 300;

/** A machine failing this many times in the RCA window is a hotspot. */
export const REPEAT_FAILURE_THRESHOLD = 3;
export const REPEAT_WATCH_THRESHOLD = 2;

/** Reliability-engineering lookback for repeat failures. */
export const RCA_WINDOW_DAYS = 90;

/* -----------------------------------------------------------
   Role resolution
   ----------------------------------------------------------- */

export const DASHBOARD_ROLES = Object.freeze({
  OWNER: 'owner',
  TECHNICIAN: 'technician',
  SUPERVISOR: 'supervisor',
  ENGINEER: 'engineer',
});

/** Fallback when nobody is logged in — the business-wide view. */
export const DEFAULT_DASHBOARD_ROLE = DASHBOARD_ROLES.OWNER;

/**
 * Map every app role onto one of the four dashboard layouts.
 * Roles that are not maintenance-facing (operator, vendor, inspector)
 * land on the Owner board, which is the read-only summary view.
 */
const ROLE_VIEW_MAP = Object.freeze({
  owner: DASHBOARD_ROLES.OWNER,
  maintenance_head: DASHBOARD_ROLES.OWNER,
  plant_manager: DASHBOARD_ROLES.OWNER,
  admin: DASHBOARD_ROLES.OWNER,
  maintenance_technician: DASHBOARD_ROLES.TECHNICIAN,
  technician: DASHBOARD_ROLES.TECHNICIAN,
  supervisor: DASHBOARD_ROLES.SUPERVISOR,
  maintenance_supervisor: DASHBOARD_ROLES.SUPERVISOR,
  maintenance_engineer: DASHBOARD_ROLES.ENGINEER,
  engineer: DASHBOARD_ROLES.ENGINEER,
  reliability_engineer: DASHBOARD_ROLES.ENGINEER,
});

export function resolveDashboardRole(role) {
  const key = String(role || '').toLowerCase().trim();
  return ROLE_VIEW_MAP[key] || DEFAULT_DASHBOARD_ROLE;
}

/**
 * Read the signed-in user from localStorage without ever throwing.
 * A corrupt `tf_user` blob must degrade to the Owner board, not a
 * white screen.
 */
export function readStoredUser(storage) {
  const store = storage || (typeof localStorage === 'undefined' ? null : localStorage);
  if (!store) return null;
  try {
    const raw = store.getItem('tf_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/* -----------------------------------------------------------
   Shared helpers
   ----------------------------------------------------------- */

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toDate(now) {
  return now instanceof Date ? now : new Date(now || Date.now());
}

/** Round to one decimal — every "hours"/"percent" figure goes through this. */
export function round1(value) {
  return Math.round(asNumber(value) * 10) / 10;
}

export function machineNameOf(machines, machineId) {
  const match = asArray(machines).find(
    (machine) => machine?.id === machineId || machine?.machine_id === machineId,
  );
  return match?.name || match?.machine_name || machineId || 'Unknown machine';
}

/** Index machines by both `id` and `machine_id`, since rows use both. */
export function indexMachines(machines) {
  const index = {};
  asArray(machines).forEach((machine) => {
    if (!machine) return;
    if (machine.id != null) index[machine.id] = machine;
    if (machine.machine_id != null) index[machine.machine_id] = machine;
  });
  return index;
}

export function isTicketOpen(ticket) {
  return !isTicketClosed(ticket);
}

/** Tickets opened inside the trailing `days` window. */
export function ticketsInWindow(tickets, days, now = new Date()) {
  const cutoff = toDate(now).getTime() - days * MS_PER_DAY;
  return asArray(tickets).filter((ticket) => {
    const opened = ticketOpenedAt(ticket);
    return opened != null && opened >= cutoff;
  });
}

/** Tickets opened inside the current calendar month. */
export function ticketsThisMonth(tickets, now = new Date()) {
  const reference = toDate(now);
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1).getTime();
  return asArray(tickets).filter((ticket) => {
    const opened = ticketOpenedAt(ticket);
    return opened != null && opened >= start;
  });
}

/** Downtime hours: prefer the value captured at closure, else elapsed age. */
export function ticketDowntimeHours(ticket, now = new Date()) {
  if (ticket?.downtime_minutes != null) return asNumber(ticket.downtime_minutes) / 60;
  return asNumber(ticketAgeHours(ticket, toDate(now)));
}

/** Parts + labour recorded against a ticket, in ₹. */
export function ticketRepairCost(ticket) {
  const direct = asNumber(ticket?.maintenance_cost);
  if (direct > 0) return direct;
  const parts = asNumber(ticket?.parts_cost);
  const labourColumn = asNumber(ticket?.labor_cost) + asNumber(ticket?.repair_cost);
  if (parts > 0 || labourColumn > 0) return parts + labourColumn;
  return (asNumber(ticket?.labour_minutes) / 60) * LABOUR_RATE_PER_HOUR;
}

/** Lost production value for a ticket, in ₹. */
export function ticketDowntimeCost(ticket, machine, now = new Date()) {
  const rate = asNumber(machine?.hourly_downtime_cost);
  if (rate <= 0) return 0;
  return ticketDowntimeHours(ticket, now) * rate;
}

/** The person a ticket is assigned to, whichever column carries it. */
export function ticketAssignee(ticket) {
  return (
    ticket?.assigned_to
    || ticket?.assignee_id
    || ticket?.technician_id
    || ticket?.assigned_technician
    || null
  );
}

/**
 * Does this ticket belong to `user`? Matches on id, email or name so a
 * technician sees their queue regardless of which key the row stores.
 */
export function isAssignedTo(ticket, user) {
  if (!user) return false;
  const assignee = ticketAssignee(ticket);
  if (assignee == null) return false;
  const needle = String(assignee).toLowerCase().trim();
  return [user.user_id, user.id, user.email, user.name]
    .filter(Boolean)
    .some((candidate) => String(candidate).toLowerCase().trim() === needle);
}

/** Rank used everywhere urgency drives ordering. */
export const URGENCY_RANK = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3 });

export function urgencyRank(ticket) {
  return URGENCY_RANK[normalizeUrgency(ticket)] ?? 4;
}

export function isUrgentTicket(ticket) {
  return ['critical', 'high'].includes(normalizeUrgency(ticket));
}

/** Machine criticality, normalised to the four planning tiers. */
export function machineCriticality(machine) {
  const raw = String(machine?.criticality || machine?.priority || '').toLowerCase().trim();
  if (['critical', 'a', 'very high'].includes(raw)) return 'critical';
  if (['high', 'b'].includes(raw)) return 'high';
  if (['low', 'd'].includes(raw)) return 'low';
  return 'medium';
}

/* -----------------------------------------------------------
   Formatters — shared so every board renders ₹ and hours identically
   ----------------------------------------------------------- */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹ with Indian digit grouping. `null` renders as an em dash, not ₹0. */
export function formatInr(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return INR.format(Math.round(Number(value)));
}

/** Compact ₹ for KPI tiles: 1.2Cr / 4.5L / ₹8,200. */
export function formatInrCompact(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const amount = Math.round(Number(value));
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) return `₹${round1(amount / 10_000_000)}Cr`;
  if (abs >= 100_000) return `₹${round1(amount / 100_000)}L`;
  return INR.format(amount);
}

/** "3h 30m" / "2d 2h". Mirrors formatDurationHours in ticketSla. */
export function formatHours(hours) {
  if (hours == null || !Number.isFinite(Number(hours))) return '—';
  const minutes = Math.max(0, Math.round(Number(hours) * 60));
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

/** Percentages that know the difference between "0%" and "no data". */
export function formatPct(value, fallback = 'No data yet') {
  if (value == null || !Number.isFinite(Number(value))) return fallback;
  return `${Math.round(Number(value))}%`;
}

/* -----------------------------------------------------------
   OWNER / PLANT MANAGER
   ----------------------------------------------------------- */

/**
 * Rupee value of the machines currently exposed — those carrying an
 * open ticket or an overdue PM. This is an exposure figure, not a loss:
 * it answers "how much of my fleet is not in a known-good state?".
 */
export function fleetValueAtRisk(machines, tickets, now = new Date()) {
  const reference = toDate(now);
  const openByMachine = new Set(
    asArray(tickets).filter(isTicketOpen).map((ticket) => ticket?.machine_id),
  );

  let value = 0;
  let count = 0;
  let unpriced = 0;

  asArray(machines).forEach((machine) => {
    const id = machine?.id ?? machine?.machine_id;
    const pmOverdue = nextPmInfo(machine, reference).tone === 'overdue';
    if (!openByMachine.has(id) && !pmOverdue) return;
    count += 1;
    const worth = asNumber(machine?.replacement_cost) || asNumber(machine?.asset_value);
    if (worth > 0) value += worth;
    else unpriced += 1;
  });

  return {
    value: Math.round(value),
    machineCount: count,
    unpricedCount: unpriced,
    // Null, not zero: an unpriced fleet has an unknown exposure.
    known: count === 0 || value > 0,
  };
}

/** Labour + parts + lost production for the current calendar month. */
export function monthlyMaintenanceCost(machines, tickets, now = new Date()) {
  const reference = toDate(now);
  const index = indexMachines(machines);
  const scope = ticketsThisMonth(tickets, reference);

  let repair = 0;
  let downtime = 0;
  scope.forEach((ticket) => {
    repair += ticketRepairCost(ticket);
    downtime += ticketDowntimeCost(ticket, index[ticket?.machine_id], reference);
  });

  return {
    repair: Math.round(repair),
    downtime: Math.round(downtime),
    total: Math.round(repair + downtime),
    ticketCount: scope.length,
  };
}

/**
 * Share of resolved tickets that beat their SLA window.
 * Only closed tickets count — an open ticket has not yet passed or failed.
 */
export function slaCompliance(tickets, { days = 30, now = new Date() } = {}) {
  const reference = toDate(now);
  const scope = days == null ? asArray(tickets) : ticketsInWindow(tickets, days, reference);
  const closed = scope.filter(isTicketClosed);

  let met = 0;
  let missed = 0;
  closed.forEach((ticket) => {
    const sla = computeSla(ticket, reference);
    if (!sla.known) return;
    if (sla.state === 'met') met += 1;
    else if (sla.state === 'missed') missed += 1;
  });

  const total = met + missed;
  return {
    met,
    missed,
    total,
    // Null when nothing has closed yet — never claim 0% compliance.
    pct: total ? Math.round((met / total) * 100) : null,
  };
}

/** Lost production value from breakdowns in the current month. */
export function downtimeCost(machines, tickets, now = new Date()) {
  const reference = toDate(now);
  const index = indexMachines(machines);
  const scope = ticketsThisMonth(tickets, reference);

  let cost = 0;
  let hours = 0;
  scope.forEach((ticket) => {
    hours += ticketDowntimeHours(ticket, reference);
    cost += ticketDowntimeCost(ticket, index[ticket?.machine_id], reference);
  });

  return { cost: Math.round(cost), hours: round1(hours), ticketCount: scope.length };
}

/**
 * Fleet health grid — every machine bucketed by health and by how much
 * its failure would hurt. The cross-tab is the point: 3 machines down is
 * a different morning if all 3 are criticality-critical.
 */
export function fleetHealthMap(machines, now = new Date()) {
  const reference = toDate(now);
  const byStatus = { running: 0, issues: 0, down: 0, maintenance: 0 };
  const byCriticality = { critical: 0, high: 0, medium: 0, low: 0 };
  const grid = {
    critical: { running: 0, issues: 0, down: 0, maintenance: 0 },
    high: { running: 0, issues: 0, down: 0, maintenance: 0 },
    medium: { running: 0, issues: 0, down: 0, maintenance: 0 },
    low: { running: 0, issues: 0, down: 0, maintenance: 0 },
  };

  asArray(machines).forEach((machine) => {
    const health = machineStatusVerdict(machine, reference);
    // Database status is authoritative. Derived health is only used for
    // legacy rows that do not have a recognized machine status.
    const bucket = databaseStatusBucket(machine) || health.status;
    const criticality = machineCriticality(machine);

    byStatus[bucket] += 1;
    byCriticality[criticality] += 1;
    grid[criticality][bucket] += 1;
  });

  return { total: asArray(machines).length, byStatus, byCriticality, grid };
}

/**
 * The five machines costing the plant the most attention right now,
 * ranked by open ticket count then by worst urgency.
 */
export function topProblemMachines(machines, tickets, { limit = 5, now = new Date() } = {}) {
  const reference = toDate(now);
  const index = indexMachines(machines);
  const open = asArray(tickets).filter(isTicketOpen);

  const byMachine = new Map();
  open.forEach((ticket) => {
    const id = ticket?.machine_id;
    if (id == null) return;
    if (!byMachine.has(id)) byMachine.set(id, []);
    byMachine.get(id).push(ticket);
  });

  const rows = Array.from(byMachine.entries()).map(([machineId, list]) => {
    const sorted = [...list].sort((a, b) => urgencyRank(a) - urgencyRank(b));
    const worst = sorted[0];
    const machine = index[machineId];
    const sla = computeSla(worst, reference);
    return {
      machineId,
      machineName: machineNameOf(machines, machineId),
      openTickets: list.length,
      worstUrgency: normalizeUrgency(worst) || 'medium',
      lastIssue: worst?.issue_text
        || (typeof worst?.ai_summary === 'object' ? worst.ai_summary?.summary : worst?.ai_summary)
        || 'Maintenance issue',
      assignedTo: ticketAssignee(worst),
      slaState: sla.state,
      breached: sla.breached,
      criticality: machineCriticality(machine),
      // Drives the row colour: breached or 3+ open is red, else amber.
      urgencyTone: sla.breached || list.length >= 3 ? 'danger' : list.length >= 2 ? 'warning' : 'ok',
      nextAction: sla.breached
        ? 'Escalate — SLA breached'
        : list.length >= REPEAT_FAILURE_THRESHOLD
          ? 'Raise RCA — repeat failures'
          : 'Assign and close out',
    };
  });

  return rows
    .sort((a, b) => b.openTickets - a.openTickets
      || URGENCY_RANK[a.worstUrgency] - URGENCY_RANK[b.worstUrgency])
    .slice(0, limit);
}

/** The "this month" strip on the Owner board. */
export function monthSummary(tickets, pmLogs, now = new Date()) {
  const reference = toDate(now);
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1).getTime();
  const list = asArray(tickets);

  let opened = 0;
  let closed = 0;
  let breached = 0;
  let resolutionHours = 0;
  let resolutionCount = 0;

  list.forEach((ticket) => {
    const openedAt = ticketOpenedAt(ticket);
    if (openedAt != null && openedAt >= start) opened += 1;

    const closedAt = ticketClosedAt(ticket);
    if (isTicketClosed(ticket) && closedAt != null && closedAt >= start) {
      closed += 1;
      const sla = computeSla(ticket, reference);
      if (sla.known) {
        resolutionHours += sla.elapsedHours;
        resolutionCount += 1;
        if (sla.state === 'missed') breached += 1;
      }
    }
  });

  const logs = asArray(pmLogs);
  const onTime = logs.filter((log) => log?.on_time).length;

  return {
    opened,
    closed,
    breached,
    pmCompletionPct: logs.length ? Math.round((onTime / logs.length) * 100) : null,
    avgResolutionHours: resolutionCount ? round1(resolutionHours / resolutionCount) : null,
    // Closed-vs-opened is the honest read on whether the team kept up.
    clearanceRatePct: opened ? Math.round((closed / opened) * 100) : null,
  };
}

/* -----------------------------------------------------------
   TECHNICIAN
   ----------------------------------------------------------- */

/**
 * A technician's day, split the way they actually work it: everything
 * critical/high first, ordered by how little SLA time is left.
 */
export function buildWorkQueue(tickets, user, { machines = [], now = new Date() } = {}) {
  const reference = toDate(now);
  const mine = asArray(tickets).filter(
    (ticket) => isTicketOpen(ticket) && isAssignedTo(ticket, user),
  );

  const decorate = (ticket) => {
    const sla = computeSla(ticket, reference);
    return {
      id: ticket?.id,
      woNumber: ticket?.wo_number || null,
      machineId: ticket?.machine_id,
      machineName: machineNameOf(machines, ticket?.machine_id),
      issue: ticket?.issue_text
        || (typeof ticket?.ai_summary === 'object' ? ticket.ai_summary?.summary : ticket?.ai_summary)
        || 'Maintenance issue',
      urgency: normalizeUrgency(ticket) || 'medium',
      stage: ticket?.lifecycle_stage || 'reported',
      slaState: sla.state,
      slaLabel: sla.meta?.label || '—',
      slaColor: sla.meta?.color,
      remainingHours: sla.remainingHours,
      percentUsed: sla.percentUsed,
      breached: sla.breached,
    };
  };

  // Least time left floats to the top; unknown SLA sinks to the bottom.
  const bySlaTimeLeft = (a, b) => {
    const left = a.remainingHours ?? Number.POSITIVE_INFINITY;
    const right = b.remainingHours ?? Number.POSITIVE_INFINITY;
    return left - right;
  };

  const decorated = mine.map(decorate);
  return {
    urgent: decorated.filter((row) => ['critical', 'high'].includes(row.urgency)).sort(bySlaTimeLeft),
    normal: decorated.filter((row) => !['critical', 'high'].includes(row.urgency)).sort(bySlaTimeLeft),
    total: decorated.length,
  };
}

/**
 * The machines this technician owns. Falls back to "machines I have open
 * work on" so a new joiner with no explicit assignment still sees a board.
 */
export function technicianMachines(machines, tickets, user, { now = new Date() } = {}) {
  const reference = toDate(now);
  const list = asArray(machines);
  const myTickets = asArray(tickets).filter((ticket) => isAssignedTo(ticket, user));
  const myMachineIds = new Set(myTickets.map((ticket) => ticket?.machine_id));

  const owned = list.filter((machine) => {
    const id = machine?.id ?? machine?.machine_id;
    const assigned = machine?.assigned_to || machine?.responsible_technician;
    if (assigned && user) {
      const needle = String(assigned).toLowerCase().trim();
      const match = [user.user_id, user.id, user.email, user.name]
        .filter(Boolean)
        .some((candidate) => String(candidate).toLowerCase().trim() === needle);
      if (match) return true;
    }
    return myMachineIds.has(id);
  });

  return owned.map((machine) => {
    const id = machine?.id ?? machine?.machine_id;
    const health = computeMachineHealth(machine, reference);
    const openCount = asArray(tickets).filter(
      (ticket) => ticket?.machine_id === id && isTicketOpen(ticket),
    ).length;
    return {
      machineId: id,
      machineName: machine?.name || machine?.machine_name || id,
      location: machine?.location || null,
      health: health.status,
      healthLabel: health.label,
      healthColor: health.color,
      openTickets: openCount,
      pmLabel: health.pm.label,
      pmTone: health.pm.tone,
      pmDate: health.pm.date,
    };
  }).sort((a, b) => {
    const weight = { down: 0, issues: 1, running: 2 };
    return weight[a.health] - weight[b.health] || b.openTickets - a.openTickets;
  });
}

/** The three numbers a technician needs before picking up a spanner. */
export function technicianQuickStats(machines, tickets, user, { now = new Date() } = {}) {
  const reference = toDate(now);
  const mine = asArray(tickets).filter((ticket) => isAssignedTo(ticket, user));
  const open = mine.filter(isTicketOpen);

  // "Due today" = breached, at risk, or the SLA clock runs out before midnight.
  const endOfDay = new Date(reference);
  endOfDay.setHours(23, 59, 59, 999);
  const hoursToMidnight = (endOfDay.getTime() - reference.getTime()) / MS_PER_HOUR;

  const dueToday = open.filter((ticket) => {
    const sla = computeSla(ticket, reference);
    if (!sla.known) return false;
    return sla.breached || sla.remainingHours <= hoursToMidnight;
  }).length;

  const myMachineIds = new Set(mine.map((ticket) => ticket?.machine_id));
  const overduePm = asArray(machines).filter((machine) => {
    const id = machine?.id ?? machine?.machine_id;
    if (myMachineIds.size && !myMachineIds.has(id)) return false;
    return nextPmInfo(machine, reference).tone === 'overdue';
  }).length;

  const partsToOrder = open.filter(
    (ticket) => String(ticket?.lifecycle_stage || '').toLowerCase() === 'waiting_spare',
  ).length;

  return { dueToday, overduePm, partsToOrder, openTotal: open.length };
}

/* -----------------------------------------------------------
   SUPERVISOR
   ----------------------------------------------------------- */

/** One card per technician: load, responsiveness, SLA record. */
export function teamPerformance(team, tickets, machines, { now = new Date() } = {}) {
  const reference = toDate(now);
  const list = asArray(tickets);

  return asArray(team).map((member) => {
    const mine = list.filter((ticket) => isAssignedTo(ticket, member));
    const open = mine.filter(isTicketOpen);
    const closed = mine.filter(isTicketClosed);

    let met = 0;
    let missed = 0;
    let responseHours = 0;
    let responseCount = 0;
    closed.forEach((ticket) => {
      const sla = computeSla(ticket, reference);
      if (sla.state === 'met') met += 1;
      else if (sla.state === 'missed') missed += 1;
      if (sla.known) {
        responseHours += sla.elapsedHours;
        responseCount += 1;
      }
    });

    const slaTotal = met + missed;
    const slaPct = slaTotal ? Math.round((met / slaTotal) * 100) : null;
    const breachedOpen = open.filter((ticket) => computeSla(ticket, reference).breached).length;

    const machineCount = asArray(machines).filter((machine) => {
      const assigned = machine?.assigned_to || machine?.responsible_technician;
      return assigned && isAssignedTo({ assigned_to: assigned }, member);
    }).length;

    // Red beats yellow: an active breach outranks a merely-slipping average.
    let tone = 'ok';
    if (breachedOpen > 0 || (slaPct != null && slaPct < 70)) tone = 'danger';
    else if (open.length > 5 || (slaPct != null && slaPct < 90)) tone = 'warning';

    return {
      id: member?.user_id || member?.id || member?.email || member?.name,
      name: member?.name || member?.email || 'Unnamed technician',
      role: member?.role || 'maintenance_technician',
      machineCount,
      openTickets: open.length,
      closedTickets: closed.length,
      breachedOpen,
      avgResponseHours: responseCount ? round1(responseHours / responseCount) : null,
      slaPct,
      tone,
    };
  }).sort((a, b) => b.breachedOpen - a.breachedOpen || b.openTickets - a.openTickets);
}

/**
 * Open vs closed-this-week per technician, plus a capacity read so the
 * bar chart shows overload rather than just "who has the most tickets".
 */
export function workloadBalance(team, tickets, { capacity = 6, now = new Date() } = {}) {
  const reference = toDate(now);
  const weekAgo = reference.getTime() - 7 * MS_PER_DAY;
  const list = asArray(tickets);

  const rows = asArray(team).map((member) => {
    const mine = list.filter((ticket) => isAssignedTo(ticket, member));
    const open = mine.filter(isTicketOpen).length;
    const closedThisWeek = mine.filter((ticket) => {
      const closedAt = ticketClosedAt(ticket);
      return isTicketClosed(ticket) && closedAt != null && closedAt >= weekAgo;
    }).length;
    return {
      id: member?.user_id || member?.id || member?.email || member?.name,
      name: member?.name || member?.email || 'Unnamed technician',
      open,
      closedThisWeek,
      capacity,
      utilizationPct: capacity > 0 ? Math.round((open / capacity) * 100) : null,
      overloaded: open > capacity,
    };
  });

  const totalOpen = rows.reduce((sum, row) => sum + row.open, 0);
  return {
    rows: rows.sort((a, b) => b.open - a.open),
    totalOpen,
    avgOpen: rows.length ? round1(totalOpen / rows.length) : 0,
    // A single overloaded tech while others idle is the thing to spot.
    imbalanced: rows.length > 1 && rows.some((row) => row.overloaded) && rows.some((row) => row.open === 0),
  };
}

/** Average resolution time today / this week / this month, plus direction. */
export function responseTimeTrend(tickets, now = new Date()) {
  const reference = toDate(now);
  const closed = asArray(tickets).filter(isTicketClosed);

  const averageWithin = (days) => {
    const cutoff = reference.getTime() - days * MS_PER_DAY;
    const scope = closed.filter((ticket) => {
      const closedAt = ticketClosedAt(ticket);
      return closedAt != null && closedAt >= cutoff;
    });
    const hours = scope
      .map((ticket) => computeSla(ticket, reference))
      .filter((sla) => sla.known)
      .map((sla) => sla.elapsedHours);
    return hours.length ? round1(hours.reduce((a, b) => a + b, 0) / hours.length) : null;
  };

  const today = averageWithin(1);
  const week = averageWithin(7);
  const month = averageWithin(30);

  // Compare the recent week against the month it sits inside. Lower is better.
  let direction = 'stable';
  if (week != null && month != null && month > 0) {
    const delta = (week - month) / month;
    if (delta <= -0.1) direction = 'improving';
    else if (delta >= 0.1) direction = 'degrading';
  } else if (week == null || month == null) {
    direction = 'unknown';
  }

  return { today, week, month, direction, series: [today, week, month] };
}

/** Every open ticket already past its SLA, with who owns it. */
export function slaBreachAlerts(tickets, team, { machines = [], now = new Date() } = {}) {
  const reference = toDate(now);
  const byId = new Map();
  asArray(team).forEach((member) => {
    [member?.user_id, member?.id, member?.email, member?.name]
      .filter(Boolean)
      .forEach((key) => byId.set(String(key).toLowerCase().trim(), member));
  });

  return asArray(tickets)
    .filter(isTicketOpen)
    .map((ticket) => ({ ticket, sla: computeSla(ticket, reference) }))
    .filter(({ sla }) => sla.state === 'breached')
    .map(({ ticket, sla }) => {
      const assignee = ticketAssignee(ticket);
      const member = assignee ? byId.get(String(assignee).toLowerCase().trim()) : null;
      return {
        ticketId: ticket?.id,
        woNumber: ticket?.wo_number || null,
        machineName: machineNameOf(machines, ticket?.machine_id),
        machineId: ticket?.machine_id,
        assignee: member?.name || assignee || 'Unassigned',
        urgency: normalizeUrgency(ticket) || 'medium',
        hoursOverdue: round1(Math.abs(sla.remainingHours ?? 0)),
        targetHours: sla.targetHours,
      };
    })
    .sort((a, b) => b.hoursOverdue - a.hoursOverdue);
}

/** The Supervisor's Friday-afternoon numbers. */
export function weeklySummary(tickets, pmLogs, machines, { now = new Date() } = {}) {
  const reference = toDate(now);
  const weekAgo = reference.getTime() - 7 * MS_PER_DAY;
  const list = asArray(tickets);

  const resolved = list.filter((ticket) => {
    const closedAt = ticketClosedAt(ticket);
    return isTicketClosed(ticket) && closedAt != null && closedAt >= weekAgo;
  });

  const hours = resolved
    .map((ticket) => computeSla(ticket, reference))
    .filter((sla) => sla.known)
    .map((sla) => sla.elapsedHours);

  const logs = asArray(pmLogs);
  const onTime = logs.filter((log) => log?.on_time).length;

  // Utilisation proxy: share of the fleet that has a named owner. Without
  // crew-hours data this is the honest available measure.
  const fleet = asArray(machines);
  const covered = fleet.filter(
    (machine) => machine?.assigned_to || machine?.responsible_technician,
  ).length;

  return {
    resolvedThisWeek: resolved.length,
    avgResolutionHours: hours.length ? round1(hours.reduce((a, b) => a + b, 0) / hours.length) : null,
    pmOnTimePct: logs.length ? Math.round((onTime / logs.length) * 100) : null,
    teamUtilizationPct: fleet.length ? Math.round((covered / fleet.length) * 100) : null,
  };
}

/* -----------------------------------------------------------
   MAINTENANCE ENGINEER
   ----------------------------------------------------------- */

/** Reliability headline: are we fixing causes or just symptoms? */
export function reliabilityMetrics(machines, tickets, { now = new Date() } = {}) {
  const reference = toDate(now);
  const scope = ticketsInWindow(tickets, RCA_WINDOW_DAYS, reference);

  // Repeat = a machine+component pair seen more than once in the window.
  const seen = new Map();
  let repeats = 0;
  scope.forEach((ticket) => {
    const key = `${ticket?.machine_id}::${String(ticket?.component || ticket?.subsystem || 'general').toLowerCase()}`;
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    if (count > 1) repeats += 1;
  });

  // MTBF per machine: mean gap between consecutive failures.
  const openings = new Map();
  scope.forEach((ticket) => {
    const id = ticket?.machine_id;
    const opened = ticketOpenedAt(ticket);
    if (id == null || opened == null) return;
    if (!openings.has(id)) openings.set(id, []);
    openings.get(id).push(opened);
  });

  const mtbfByMachine = [];
  const allGaps = [];
  openings.forEach((times, machineId) => {
    const sorted = [...times].sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const hours = (sorted[i] - sorted[i - 1]) / MS_PER_HOUR;
      if (hours > 0.5) gaps.push(hours);
    }
    if (!gaps.length) return;
    allGaps.push(...gaps);
    mtbfByMachine.push({
      machineId,
      machineName: machineNameOf(machines, machineId),
      mtbfHours: round1(gaps.reduce((a, b) => a + b, 0) / gaps.length),
      failures: sorted.length,
    });
  });

  const closed = scope.filter(isTicketClosed);
  const withRca = closed.filter((ticket) => Boolean(ticket?.root_cause)).length;

  const byMachineCount = new Map();
  scope.forEach((ticket) => {
    const id = ticket?.machine_id;
    if (id == null) return;
    byMachineCount.set(id, (byMachineCount.get(id) || 0) + 1);
  });

  return {
    repeatFailureRatePct: scope.length ? Math.round((repeats / scope.length) * 100) : null,
    fleetMtbfHours: allGaps.length ? round1(allGaps.reduce((a, b) => a + b, 0) / allGaps.length) : null,
    mtbfByMachine: mtbfByMachine.sort((a, b) => a.mtbfHours - b.mtbfHours).slice(0, 5),
    rcaCompletionPct: closed.length ? Math.round((withRca / closed.length) * 100) : null,
    mostProblematic: Array.from(byMachineCount.entries())
      .map(([machineId, count]) => ({
        machineId,
        machineName: machineNameOf(machines, machineId),
        failures: count,
      }))
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 5),
    windowDays: RCA_WINDOW_DAYS,
    sampleSize: scope.length,
  };
}

/**
 * Fold the many spellings of a CAPA status onto the three states the
 * tracker buckets by. Free-text columns carry "Done", "in-progress",
 * "Verified" and friends; the UI must not show four words for one state.
 */
export function normalizeCapaStatus(value) {
  const raw = String(value || '').toLowerCase().replace(/[\s-]/g, '_');
  if (['completed', 'complete', 'done', 'closed', 'verified'].includes(raw)) return 'completed';
  if (['in_progress', 'progress', 'ongoing', 'started'].includes(raw)) return 'in_progress';
  return 'open';
}

/** Human label for a normalised CAPA status. */
export const CAPA_STATUS_LABEL = Object.freeze({
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
});

/** Machine + component pairs failing again and again. */
export function repeatFailureHotspots(machines, tickets, { now = new Date(), limit = 10 } = {}) {
  const reference = toDate(now);
  const scope = ticketsInWindow(tickets, RCA_WINDOW_DAYS, reference);

  const groups = new Map();
  scope.forEach((ticket) => {
    const machineId = ticket?.machine_id;
    if (machineId == null) return;
    const component = String(ticket?.component || ticket?.subsystem || 'General').trim() || 'General';
    const key = `${machineId}::${component.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { machineId, component, tickets: [] });
    groups.get(key).tickets.push(ticket);
  });

  return Array.from(groups.values())
    .map(({ machineId, component, tickets: list }) => {
      const withCause = list.find((ticket) => ticket?.root_cause);
      const tracked = list.find((ticket) => ticket?.capa_status);
      // A cluster with a root cause but no CAPA row is "Open" — the work is
      // identified. With neither, nobody has started looking yet.
      const capaStatus = tracked
        ? CAPA_STATUS_LABEL[normalizeCapaStatus(tracked.capa_status)]
        : withCause ? 'Open' : 'Not started';
      return {
        machineId,
        machineName: machineNameOf(machines, machineId),
        component,
        failureCount: list.length,
        rootCause: withCause?.root_cause || null,
        capaStatus,
        owner: ticketAssignee(list[0]) || 'Unassigned',
        tone: list.length >= REPEAT_FAILURE_THRESHOLD
          ? 'danger'
          : list.length >= REPEAT_WATCH_THRESHOLD ? 'warning' : 'ok',
      };
    })
    .filter((row) => row.failureCount >= REPEAT_WATCH_THRESHOLD)
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, limit);
}

/** Corrective/preventive actions, bucketed by where they have got to. */
export function capaTracker(tickets, machines, { now = new Date() } = {}) {
  const reference = toDate(now);
  const scope = ticketsInWindow(tickets, RCA_WINDOW_DAYS, reference);

  const actions = scope
    .filter((ticket) => ticket?.capa_action || ticket?.capa_status || ticket?.root_cause)
    .map((ticket) => ({
      id: ticket?.id,
      machineId: ticket?.machine_id,
      machineName: machineNameOf(machines, ticket?.machine_id),
      action: ticket?.capa_action || ticket?.root_cause || 'Root-cause action pending',
      dueDate: ticket?.capa_due_at || ticket?.due_at || null,
      owner: ticketAssignee(ticket) || 'Unassigned',
      status: normalizeCapaStatus(ticket?.capa_status),
      overdue: Boolean(
        ticket?.capa_due_at
        && normalizeCapaStatus(ticket?.capa_status) !== 'completed'
        && new Date(ticket.capa_due_at).getTime() < reference.getTime(),
      ),
    }));

  const counts = { open: 0, in_progress: 0, completed: 0 };
  actions.forEach((action) => { counts[action.status] += 1; });

  return {
    actions: actions.sort((a, b) => Number(b.overdue) - Number(a.overdue)),
    counts,
    total: actions.length,
    completionPct: actions.length ? Math.round((counts.completed / actions.length) * 100) : null,
  };
}

/** The five issue themes showing up most in the last 30 days. */
export function trendingIssues(machines, tickets, { now = new Date(), days = 30, limit = 5 } = {}) {
  const reference = toDate(now);
  const scope = ticketsInWindow(tickets, days, reference);

  const themeOf = (ticket) => {
    const explicit = ticket?.component || ticket?.subsystem || ticket?.failure_mode;
    if (explicit) return String(explicit).trim();
    const text = String(
      ticket?.issue_text
      || (typeof ticket?.ai_summary === 'object' ? ticket.ai_summary?.summary : ticket?.ai_summary)
      || '',
    ).trim();
    // No component column: fall back to the leading words of the report,
    // which is enough to cluster "oil leak" style repeats.
    return text ? text.split(/\s+/).slice(0, 4).join(' ') : 'Unclassified';
  };

  const groups = new Map();
  scope.forEach((ticket) => {
    const theme = themeOf(ticket);
    const key = theme.toLowerCase();
    if (!groups.has(key)) groups.set(key, { theme, count: 0, machineIds: new Set(), sample: ticket });
    const entry = groups.get(key);
    entry.count += 1;
    if (ticket?.machine_id != null) entry.machineIds.add(ticket.machine_id);
  });

  return Array.from(groups.values())
    .map((entry) => ({
      issue: entry.theme,
      count: entry.count,
      affectedMachines: entry.machineIds.size,
      machineName: machineNameOf(machines, entry.sample?.machine_id),
      suggestedAction: entry.count >= REPEAT_FAILURE_THRESHOLD
        ? 'Open an RCA — recurring theme'
        : entry.machineIds.size > 1
          ? 'Check for a common cause across machines'
          : 'Monitor',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* -----------------------------------------------------------
   KPI cache — 5-minute TTL
   ----------------------------------------------------------- */

export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Tiny memo keyed by a caller-supplied string. Dashboards recompute the
 * same rollups on every re-render otherwise; a 5-minute TTL keeps the
 * numbers fresh enough for a maintenance board while cutting the work.
 */
export function createMetricsCache({ ttlMs = DEFAULT_CACHE_TTL_MS, clock = () => Date.now() } = {}) {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (clock() - entry.at > ttlMs) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      store.set(key, { at: clock(), value });
      return value;
    },
    /** Compute-or-reuse. The only method callers normally need. */
    resolve(key, compute) {
      const hit = this.get(key);
      if (hit !== undefined) return hit;
      return this.set(key, compute());
    },
    clear() { store.clear(); },
    get size() { return store.size; },
  };
}

/**
 * Everything one role's board needs, in a single pass.
 * Returning a role-shaped object keeps the page component free of
 * `if (role === ...)` chains around the metric calls.
 */
export function buildRoleMetrics(role, { machines, tickets, team, pmLogs, user, now = new Date() } = {}) {
  const view = resolveDashboardRole(role);
  const reference = toDate(now);
  const safeMachines = asArray(machines);
  const safeTickets = asArray(tickets);

  if (view === DASHBOARD_ROLES.TECHNICIAN) {
    return {
      view,
      queue: buildWorkQueue(safeTickets, user, { machines: safeMachines, now: reference }),
      myMachines: technicianMachines(safeMachines, safeTickets, user, { now: reference }),
      quickStats: technicianQuickStats(safeMachines, safeTickets, user, { now: reference }),
    };
  }

  if (view === DASHBOARD_ROLES.SUPERVISOR) {
    return {
      view,
      team: teamPerformance(team, safeTickets, safeMachines, { now: reference }),
      workload: workloadBalance(team, safeTickets, { now: reference }),
      responseTrend: responseTimeTrend(safeTickets, reference),
      breaches: slaBreachAlerts(safeTickets, team, { machines: safeMachines, now: reference }),
      weekly: weeklySummary(safeTickets, pmLogs, safeMachines, { now: reference }),
    };
  }

  if (view === DASHBOARD_ROLES.ENGINEER) {
    return {
      view,
      reliability: reliabilityMetrics(safeMachines, safeTickets, { now: reference }),
      hotspots: repeatFailureHotspots(safeMachines, safeTickets, { now: reference }),
      capa: capaTracker(safeTickets, safeMachines, { now: reference }),
      trending: trendingIssues(safeMachines, safeTickets, { now: reference }),
    };
  }

  return {
    view: DASHBOARD_ROLES.OWNER,
    valueAtRisk: fleetValueAtRisk(safeMachines, safeTickets, reference),
    maintenanceCost: monthlyMaintenanceCost(safeMachines, safeTickets, reference),
    sla: slaCompliance(safeTickets, { now: reference }),
    downtime: downtimeCost(safeMachines, safeTickets, reference),
    fleetHealth: fleetHealthMap(safeMachines, reference),
    problemMachines: topProblemMachines(safeMachines, safeTickets, { now: reference }),
    month: monthSummary(safeTickets, pmLogs, reference),
  };
}
