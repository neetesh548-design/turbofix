/* ===========================================================
   TurboFix — Machine health model
   ===========================================================

   All the "is this machine OK?" arithmetic lives here as pure
   functions so the dashboard components stay presentational and
   the rules stay unit-testable without mounting React.

   The health rule is deliberately blunt. A plant manager should be
   able to explain any colour on the board in one sentence:

     RED    the machine is stopped, its PM is overdue, or it has
            piled up 2+ open tickets
     YELLOW something needs a look: an open ticket, an active
            maintenance state, or no service in over 90 days
     GREEN  nothing outstanding

   Deliberately NOT part of the rule: a PM that is merely due soon.
   A machine serviced on schedule is a healthy machine, so "PM due in
   2 days" stays green on the card while the PM chip itself turns
   amber to prompt the planner.
   =========================================================== */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A PM within this many days is "coming up" — chip turns amber. */
export const PM_DUE_SOON_DAYS = 7;

/** Service older than this counts as neglected and downgrades health. */
export const MAINTENANCE_STALE_DAYS = 90;

/** Service older than this is worth flagging, but is not yet neglect. */
export const MAINTENANCE_AGING_DAYS = 30;

/** Open tickets at or above this count mean the machine is in trouble. */
export const TICKETS_CRITICAL_COUNT = 2;

/** Machine states that mean "not producing right now". */
const STOPPED_STATUSES = new Set([
  'breakdown',
  'down',
  'waiting_spare',
  'waiting_vendor',
  'shutdown',
  'decommissioned',
]);

/** Machine states that mean "someone is working on it". */
const MAINTENANCE_STATUSES = new Set(['under_maintenance', 'maintenance', 'servicing']);

export const HEALTH = {
  RUNNING: 'running',
  ISSUES: 'issues',
  DOWN: 'down',
};

/** Card accent colours. Kept here so CSS and JS cannot drift apart. */
export const HEALTH_COLORS = {
  [HEALTH.RUNNING]: '#22c55e',
  [HEALTH.ISSUES]: '#eab308',
  [HEALTH.DOWN]: '#ef4444',
};

export const HEALTH_LABELS = {
  [HEALTH.RUNNING]: 'Running',
  [HEALTH.ISSUES]: 'Needs a look',
  [HEALTH.DOWN]: 'Down',
};

const DATABASE_STATUS_BUCKETS = {
  operational: HEALTH.RUNNING, active: HEALTH.RUNNING, healthy: HEALTH.RUNNING, running: HEALTH.RUNNING,
  under_maintenance: 'maintenance', maintenance: 'maintenance', servicing: 'maintenance',
  preventive_maintenance: 'maintenance', planned_maintenance: 'maintenance',
  breakdown: HEALTH.DOWN, down: HEALTH.DOWN, shutdown: HEALTH.DOWN,
  waiting_spare: HEALTH.DOWN, waiting_vendor: HEALTH.DOWN, decommissioned: HEALTH.DOWN,
  issue: HEALTH.ISSUES, issues: HEALTH.ISSUES, warning: HEALTH.ISSUES,
};

export function databaseStatusBucket(machine) {
  return DATABASE_STATUS_BUCKETS[String(machine?.status || '').trim().toLowerCase()] || null;
}

const DOWNTIME_LANGUAGE = /\b(stopped|stop|not running|down|breakdown|shut ?down|shutdown|won['’]?t run|can['’]?t run|cannot run|no production|production stopped|emergency stop|trip(ped)?|failed)\b/i;

export function openTicketsForMachine(machine, tickets = null) {
  if (Array.isArray(tickets)) {
    const machineIds = new Set([machine?.id, machine?.machine_id].filter(Boolean));
    return tickets.filter((ticket) => {
      if (ticket?.status && ['resolved', 'closed', 'cancelled'].includes(String(ticket.status).toLowerCase())) return false;
      if (ticket?.resolved_at) return false;
      return machineIds.size === 0 || machineIds.has(ticket?.machine_id);
    });
  }
  return Array.isArray(machine?.track_record?.open_list) ? machine.track_record.open_list : [];
}

export function ticketIndicatesDowntime(ticket) {
  if (!ticket) return false;
  if (Number(ticket.downtime_minutes) > 0) return true;
  if (String(ticket.type || '').toLowerCase() === 'breakdown') return true;
  const summary = typeof ticket.ai_summary === 'object'
    ? Object.values(ticket.ai_summary).join(' ')
    : ticket.ai_summary;
  return DOWNTIME_LANGUAGE.test([
    ticket.issue_text,
    ticket.description,
    ticket.reason,
    summary,
  ].filter(Boolean).join(' '));
}

/**
 * Resolve the status shown to operators.
 *
 * The stored machine status is the source of truth for explicit Down and
 * Maintenance states. An unresolved ticket is an operational overlay: a
 * running machine becomes Issues, or Down when the ticket contains an
 * explicit downtime signal. This prevents an open breakdown from appearing
 * as Running while avoiding the unsafe assumption that every ticket means
 * production has stopped.
 */
export function machineDisplayStatus(machine, tickets = null, now = new Date()) {
  const base = machineStatusVerdict(machine, now);
  const bucket = databaseStatusBucket(machine);
  const openTickets = openTicketsForMachine(machine, tickets);

  if (bucket === 'down' || bucket === 'maintenance') return base;
  if (openTickets.length === 0 && openTicketCount(machine) === 0) return base;
  if (bucket === HEALTH.RUNNING || !bucket) {
    const downtime = openTickets.some(ticketIndicatesDowntime);
    const status = downtime ? HEALTH.DOWN : HEALTH.ISSUES;
    return {
      ...base,
      status,
      label: HEALTH_LABELS[status],
      color: HEALTH_COLORS[status],
      reasons: [downtime ? 'Open ticket indicates machine downtime' : 'Open ticket requires attention', ...base.reasons],
    };
  }
  return base;
}

export function machineStatusVerdict(machine, now = new Date()) {
  const health = computeMachineHealth(machine, now);
  const bucket = databaseStatusBucket(machine);
  if (!bucket) return health;
  const labels = { running: 'Running', issues: 'Needs a look', down: 'Down', maintenance: 'Maintenance' };
  const colors = { running: '#22c55e', issues: '#eab308', down: '#ef4444', maintenance: '#38bdf8' };
  return { ...health, status: bucket, label: labels[bucket], color: colors[bucket] };
}

/* -----------------------------------------------------------
   Date helpers — all comparisons happen at local midnight so a
   PM due "today" reads as 0 days regardless of the clock time.
   ----------------------------------------------------------- */

export function startOfDay(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Whole days from today until `value`. Negative means in the past. */
export function daysUntil(value, now = new Date()) {
  const target = startOfDay(value);
  const today = startOfDay(now);
  if (!target || !today) return null;
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

/** Whole days since `value`. Negative means in the future. */
export function daysSince(value, now = new Date()) {
  const delta = daysUntil(value, now);
  return delta === null ? null : -delta;
}

/** "Today" / "In 5 days" / "12 days ago" — plain words, no library. */
export function describeDayOffset(days) {
  if (days === null || days === undefined) return null;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/** Short date for the drawer, e.g. "24 Jul 2026". */
export function formatDate(value) {
  const date = startOfDay(value);
  if (!date) return null;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* -----------------------------------------------------------
   Derived facts
   ----------------------------------------------------------- */

/** Open ticket count, tolerating older rows that only carry a boolean. */
export function openTicketCount(machine) {
  const tracked = Number(machine?.track_record?.open);
  if (Number.isFinite(tracked)) return tracked;
  return machine?.has_open_tickets ? 1 : 0;
}

/** True when any open ticket on this machine is flagged critical. */
export function hasCriticalTicket(machine) {
  const list = machine?.track_record?.open_list;
  if (!Array.isArray(list)) return false;
  return list.some((ticket) => String(ticket?.urgency || '').toLowerCase() === 'critical');
}

/**
 * When the next preventive maintenance falls due.
 *
 * Falls back to `last_maintenance_date + maintenance_interval_days` when the
 * stored `next_maintenance_due` column is empty, so machines onboarded with
 * only an interval still get a real date on the card.
 */
export function nextPmInfo(machine, now = new Date()) {
  let due = machine?.next_maintenance_due || null;

  if (!due) {
    const last = startOfDay(machine?.last_maintenance_date);
    const interval = Number(machine?.maintenance_interval_days);
    if (last && Number.isFinite(interval) && interval > 0) {
      due = new Date(last.getTime() + interval * MS_PER_DAY);
    }
  }

  const daysLeft = daysUntil(due, now);
  if (daysLeft === null) {
    return { date: null, daysLeft: null, tone: 'unknown', label: 'Not scheduled' };
  }

  if (daysLeft < 0) {
    return {
      date: startOfDay(due),
      daysLeft,
      tone: 'overdue',
      label: `Overdue by ${Math.abs(daysLeft)} days`,
    };
  }

  const label = daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `Due in ${daysLeft} days`;
  return {
    date: startOfDay(due),
    daysLeft,
    tone: daysLeft <= PM_DUE_SOON_DAYS ? 'due-soon' : 'ok',
    label,
  };
}

/** How long since the machine was last serviced. */
export function lastMaintenanceInfo(machine, now = new Date()) {
  const daysAgo = daysSince(machine?.last_maintenance_date, now);
  if (daysAgo === null) {
    return { date: null, daysAgo: null, tone: 'unknown', label: 'No record yet' };
  }

  const tone = daysAgo > MAINTENANCE_STALE_DAYS
    ? 'stale'
    : daysAgo > MAINTENANCE_AGING_DAYS
      ? 'aging'
      : 'ok';

  return {
    date: startOfDay(machine.last_maintenance_date),
    daysAgo,
    tone,
    label: describeDayOffset(-daysAgo),
  };
}

/* -----------------------------------------------------------
   The health verdict
   ----------------------------------------------------------- */

/**
 * Reduce a machine to one of three colours plus the reasons behind it.
 *
 * `reasons` is ordered most-severe-first and is what the card tooltip and
 * the drawer show, so the colour is never unexplained.
 */
export function computeMachineHealth(machine, now = new Date()) {
  const status = String(machine?.status || '').toLowerCase();
  const openCount = openTicketCount(machine);
  const pm = nextPmInfo(machine, now);
  const service = lastMaintenanceInfo(machine, now);

  const reasons = [];
  let level = HEALTH.RUNNING;

  const escalate = (next) => {
    if (next === HEALTH.DOWN) level = HEALTH.DOWN;
    else if (next === HEALTH.ISSUES && level !== HEALTH.DOWN) level = HEALTH.ISSUES;
  };

  if (STOPPED_STATUSES.has(status)) {
    escalate(HEALTH.DOWN);
    reasons.push(status === 'waiting_spare'
      ? 'Stopped, waiting for a spare part'
      : status === 'waiting_vendor'
        ? 'Stopped, waiting for the vendor'
        : 'Machine is stopped');
  }

  if (pm.tone === 'overdue') {
    escalate(HEALTH.DOWN);
    reasons.push(`Preventive maintenance ${pm.label.toLowerCase()}`);
  }

  if (openCount >= TICKETS_CRITICAL_COUNT) {
    escalate(HEALTH.DOWN);
    reasons.push(`${openCount} open tickets`);
  } else if (openCount > 0) {
    escalate(HEALTH.ISSUES);
    reasons.push(hasCriticalTicket(machine) ? '1 critical open ticket' : '1 open ticket');
  }

  if (MAINTENANCE_STATUSES.has(status)) {
    escalate(HEALTH.ISSUES);
    reasons.push('Under maintenance');
  }

  if (service.tone === 'stale') {
    escalate(HEALTH.ISSUES);
    reasons.push(`Last serviced ${service.daysAgo} days ago`);
  }

  if (reasons.length === 0) {
    reasons.push(pm.tone === 'unknown' ? 'No open work' : `No open work · PM ${pm.label.toLowerCase()}`);
  }

  return {
    status: level,
    label: HEALTH_LABELS[level],
    color: HEALTH_COLORS[level],
    reasons,
    openCount,
    critical: hasCriticalTicket(machine),
    pm,
    service,
  };
}

/** Fleet totals for the filter bar counters. */
export function summarizeFleet(machines, now = new Date()) {
  const list = Array.isArray(machines) ? machines : [];
  const summary = { all: list.length, running: 0, issues: 0, down: 0, maintenance: 0 };
  list.forEach((machine) => {
    const bucket = machineDisplayStatus(machine, null, now).status;
    if (summary[bucket] !== undefined) summary[bucket] += 1;
  });
  return summary;
}

/** Free-text + status filtering, shared by the page and its tests. */
export function filterMachines(machines, { search = '', status = 'all' } = {}, now = new Date()) {
  const list = Array.isArray(machines) ? machines : [];
  const needle = String(search || '').trim().toLowerCase();

  return list.filter((machine) => {
    if (needle) {
      const haystack = [
        machine.machine_name,
        machine.machine_id,
        machine.asset_code,
        machine.location,
        machine.department,
        machine.category,
      ];
      if (!haystack.some((field) => String(field || '').toLowerCase().includes(needle))) return false;
    }
    if (status === 'all') return true;
    return machineDisplayStatus(machine, null, now).status === status;
  });
}

/** Worst-first ordering so the machines needing action float to the top. */
const HEALTH_WEIGHT = { [HEALTH.DOWN]: 0, [HEALTH.ISSUES]: 1, [HEALTH.RUNNING]: 2 };

export function sortByHealth(machines, now = new Date()) {
  return [...(Array.isArray(machines) ? machines : [])].sort((a, b) => {
    const left = computeMachineHealth(a, now);
    const right = computeMachineHealth(b, now);
    const leftStatus = machineDisplayStatus(a, null, now).status;
    const rightStatus = machineDisplayStatus(b, null, now).status;
    const byHealth = HEALTH_WEIGHT[leftStatus] - HEALTH_WEIGHT[rightStatus];
    if (byHealth !== 0) return byHealth;
    if (right.openCount !== left.openCount) return right.openCount - left.openCount;
    return String(a.machine_name || '').localeCompare(String(b.machine_name || ''));
  });
}
