/* ===========================================================
   TurboFix — Breakdown router
   ===========================================================

   Everything the "report a breakdown" flow knows that is not a
   pixel. The page renders three steps; this module decides what
   those three steps *mean*:

     - which of the four report forms a signed-in role gets,
     - what an operator's plain-language sentence actually says
       (urgency, likely subsystem, likely next action),
     - whose queue the finished report lands in, and
     - the sentence we show back: who was told, and by when they
       should answer.

   Why it lives outside React, mirroring utils/kaizenMetrics.js:

     - the confirmation an operator reads ("Reported to Rajesh,
       he'll check within 30 min") and the queue the report is
       actually filed into must be the same decision computed
       once, or TurboFix lies to the shop floor,
     - keyword classification is the kind of thing that quietly
       rots; it deserves a test file, not a code review,
     - the whole flow has to work offline, so none of it may
       depend on a network round-trip.

   Conventions:
     - every input is defensively coerced; a missing machine or a
       null role yields a sane report, never a TypeError,
     - `now` is always injectable so tests never touch the clock,
     - nothing here throws. The shop floor gets a filed report
       even when half the metadata is missing.
   =========================================================== */

import { asArray, asNumber } from './dashboardMetrics.js';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How far back "this machine keeps doing this" looks. */
export const HISTORY_WINDOW_DAYS = 90;

/** Two or more of the same theme in the window is worth surfacing. */
export const REPEAT_THEME_THRESHOLD = 2;

/* -----------------------------------------------------------
   Roles
   ----------------------------------------------------------- */

/**
 * Four report forms, because four people report breakdowns for
 * four different reasons. The operator is telling us something is
 * wrong; the technician is telling us what they found; the
 * supervisor is escalating with money attached; the vendor is
 * reporting on equipment they are contractually watching.
 */
export const BREAKDOWN_ROLES = Object.freeze({
  OPERATOR: 'operator',
  TECHNICIAN: 'technician',
  SUPERVISOR: 'supervisor',
  VENDOR: 'vendor',
});

/** Signed out, or an unmapped role: the lowest-friction form wins. */
export const DEFAULT_BREAKDOWN_ROLE = BREAKDOWN_ROLES.OPERATOR;

const ROLE_MAP = Object.freeze({
  operator: BREAKDOWN_ROLES.OPERATOR,
  machine_operator: BREAKDOWN_ROLES.OPERATOR,
  quality_inspector: BREAKDOWN_ROLES.OPERATOR,
  safety_officer: BREAKDOWN_ROLES.OPERATOR,

  technician: BREAKDOWN_ROLES.TECHNICIAN,
  maintenance_technician: BREAKDOWN_ROLES.TECHNICIAN,
  contractor: BREAKDOWN_ROLES.TECHNICIAN,

  supervisor: BREAKDOWN_ROLES.SUPERVISOR,
  maintenance_supervisor: BREAKDOWN_ROLES.SUPERVISOR,
  shift_incharge: BREAKDOWN_ROLES.SUPERVISOR,
  engineer: BREAKDOWN_ROLES.SUPERVISOR,
  maintenance_engineer: BREAKDOWN_ROLES.SUPERVISOR,
  reliability_engineer: BREAKDOWN_ROLES.SUPERVISOR,
  maintenance_head: BREAKDOWN_ROLES.SUPERVISOR,
  plant_manager: BREAKDOWN_ROLES.SUPERVISOR,
  owner: BREAKDOWN_ROLES.SUPERVISOR,
  admin: BREAKDOWN_ROLES.SUPERVISOR,

  vendor: BREAKDOWN_ROLES.VENDOR,
  oem: BREAKDOWN_ROLES.VENDOR,
  external_partner: BREAKDOWN_ROLES.VENDOR,
});

export function resolveBreakdownRole(role) {
  if (!role) return DEFAULT_BREAKDOWN_ROLE;
  const key = String(role).trim().toLowerCase();
  return ROLE_MAP[key] || DEFAULT_BREAKDOWN_ROLE;
}

/* -----------------------------------------------------------
   Urgency
   ----------------------------------------------------------- */

export const URGENCY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

/**
 * `responseMinutes` is a promise made to the person reporting, so it
 * is deliberately conservative — the confirmation screen quotes it.
 */
export const URGENCY_META = Object.freeze({
  [URGENCY.CRITICAL]: {
    value: URGENCY.CRITICAL, rank: 0, label: 'Critical', tone: 'danger',
    responseMinutes: 15, hint: 'Safety or a full line stop — someone comes now.',
  },
  [URGENCY.HIGH]: {
    value: URGENCY.HIGH, rank: 1, label: 'High', tone: 'danger',
    responseMinutes: 30, hint: 'Machine is down or unsafe to run.',
  },
  [URGENCY.MEDIUM]: {
    value: URGENCY.MEDIUM, rank: 2, label: 'Medium', tone: 'warning',
    responseMinutes: 240, hint: 'Still running, but not right.',
  },
  [URGENCY.LOW]: {
    value: URGENCY.LOW, rank: 3, label: 'Low', tone: 'ok',
    responseMinutes: 1440, hint: 'Worth fixing at the next stoppage.',
  },
});

export const URGENCY_ORDER = Object.freeze([
  URGENCY.CRITICAL, URGENCY.HIGH, URGENCY.MEDIUM, URGENCY.LOW,
]);

export function urgencyMeta(urgency) {
  const key = String(urgency || '').trim().toLowerCase();
  return URGENCY_META[key] || URGENCY_META[URGENCY.MEDIUM];
}

/** Rank comparison helper — lower rank is more urgent. */
export function isAtLeastUrgent(urgency, floor) {
  return urgencyMeta(urgency).rank <= urgencyMeta(floor).rank;
}

/* -----------------------------------------------------------
   Issue classification — the "AI suggestion"
   -----------------------------------------------------------

   Deliberately a keyword model rather than a call to a language
   model. Three reasons, all of them the shop floor's:

     1. it must answer while the operator is still typing, on a
        phone with two bars of signal in a metal shed,
     2. a wrong-but-instant suggestion the operator can override
        beats a right-but-absent one — the field is pre-filled,
        never locked,
     3. it has to work with the words people actually use, which
        on an Indian shop floor means Hinglish as often as English
        ("awaaz aa rahi hai", "machine band hai").

   A remote model can be layered on later behind the same
   `classifyIssue` signature; the UI never needs to know.
   ----------------------------------------------------------- */

/** Ordered most-severe first: the first rule that matches wins. */
const URGENCY_RULES = Object.freeze([
  {
    urgency: URGENCY.CRITICAL,
    reason: 'Safety words in the description',
    keywords: [
      'fire', 'smoke', 'smoking', 'burning', 'burnt', 'burn smell', 'spark', 'sparking',
      'explosion', 'blast', 'shock', 'electrocut', 'gas leak', 'chemical', 'fume',
      'injury', 'injured', 'hurt', 'accident', 'unsafe', 'safety', 'trapped',
      'emergency', 'evacuat', 'aag', 'dhuan', 'chot',
    ],
  },
  {
    urgency: URGENCY.HIGH,
    reason: 'The machine sounds stopped or unrunnable',
    keywords: [
      'breakdown', 'broken', 'not working', 'wont start', "won't start", 'will not start',
      'not starting', 'cannot start', 'no power', 'dead', 'stopped', 'stopping',
      'shut down', 'shutdown', 'tripped', 'trip', 'seized', 'jammed', 'jam', 'stuck',
      'production stopped', 'line down', 'oil leak', 'hydraulic leak', 'big leak',
      'band hai', 'kharab', 'chal nahi', 'bandh',
    ],
  },
  {
    urgency: URGENCY.MEDIUM,
    reason: 'Running, but behaving abnormally',
    keywords: [
      'noise', 'noisy', 'sound', 'rattle', 'knock', 'squeal', 'grinding sound',
      'vibration', 'vibrating', 'shaking', 'overheat', 'over heat', 'hot', 'heating',
      'temperature', 'pressure drop', 'dropping', 'low pressure', 'slow', 'sluggish',
      'intermittent', 'sometimes', 'warning', 'alarm', 'error', 'fault', 'leak',
      'seepage', 'drip', 'awaaz', 'garam', 'dheela',
    ],
  },
  {
    urgency: URGENCY.LOW,
    reason: 'Reads like planned or cosmetic work',
    keywords: [
      'minor', 'cosmetic', 'routine', 'scheduled', 'when possible', 'no rush',
      'clean', 'cleaning', 'paint', 'label', 'sticker', 'top up', 'topup',
      'lubricate', 'greasing', 'housekeeping', 'check when free',
    ],
  },
]);

/**
 * Subsystem guesses. Each carries the sentence a technician would
 * say back — "check bearings" — because that, not the taxonomy
 * label, is what makes the suggestion worth reading.
 */
export const ISSUE_CATEGORIES = Object.freeze([
  {
    value: 'safety',
    label: 'Safety',
    hint: 'Stop the machine and apply lockout–tagout before anyone approaches.',
    nextAction: 'Isolate the machine and call the safety officer',
    keywords: ['fire', 'smoke', 'spark', 'shock', 'injury', 'unsafe', 'guard', 'loto', 'emergency stop', 'aag', 'chot'],
  },
  {
    value: 'electrical',
    label: 'Electrical',
    hint: 'Likely supply, contactor or motor side — check the panel first.',
    nextAction: 'Electrical check: supply, contactor, overload relay',
    keywords: ["won't start", 'wont start', 'will not start', 'not starting', 'no power', 'dead',
      'tripped', 'trip', 'fuse', 'breaker', 'short', 'burnt coil', 'motor', 'contactor', 'wiring', 'panel'],
  },
  {
    value: 'hydraulic',
    label: 'Hydraulic / lubrication',
    hint: 'Leaks and pressure loss usually start at seals, hoses or gland packing.',
    nextAction: 'Check seals, hoses and fluid level',
    keywords: ['leak', 'leaking', 'seepage', 'drip', 'oil', 'coolant', 'hydraulic', 'lubric', 'grease', 'seal', 'gland', 'cylinder', 'ram'],
  },
  {
    value: 'pneumatic',
    label: 'Pneumatic',
    hint: 'Pressure complaints on an air circuit point at the FRL, hoses or a stuck valve.',
    nextAction: 'Check air pressure, FRL unit and solenoid valves',
    keywords: ['air', 'pneumatic', 'psi', 'bar pressure', 'compressor', 'solenoid', 'frl', 'air pressure', 'pressure drop', 'low pressure'],
  },
  {
    value: 'mechanical',
    label: 'Mechanical',
    hint: 'Noise and vibration are usually bearings, couplings or loose mountings.',
    nextAction: 'Check bearings, coupling alignment and mounting bolts',
    keywords: ['noise', 'noisy', 'sound', 'rattle', 'knock', 'squeal', 'vibration', 'vibrating', 'shaking',
      'bearing', 'spindle', 'belt', 'chain', 'gear', 'coupling', 'alignment', 'seized', 'jam', 'stuck', 'awaaz'],
  },
  {
    value: 'thermal',
    label: 'Overheating',
    hint: 'Heat complaints usually trace to cooling flow, load or lubrication.',
    nextAction: 'Check cooling flow, load and lubrication',
    keywords: ['overheat', 'over heat', 'hot', 'heating', 'temperature', 'thermal', 'cooling', 'fan', 'radiator', 'garam'],
  },
  {
    value: 'controls',
    label: 'Controls / HMI',
    hint: 'An alarm code on the screen is the fastest clue — capture it in a photo.',
    nextAction: 'Note the alarm code and check sensors / PLC I/O',
    keywords: ['hmi', 'plc', 'display', 'screen', 'alarm', 'error code', 'program', 'sensor', 'proximity', 'encoder', 'software', 'cnc program'],
  },
  {
    value: 'quality',
    label: 'Quality',
    hint: 'Dimensional or finish drift — keep the reject sample for the technician.',
    nextAction: 'Quarantine the sample and check tooling / offsets',
    keywords: ['quality', 'reject', 'rejection', 'scrap', 'dimension', 'oversize', 'undersize', 'finish', 'burr', 'taper', 'tolerance'],
  },
]);

const CATEGORY_INDEX = Object.freeze(
  Object.fromEntries(ISSUE_CATEGORIES.map((category) => [category.value, category])),
);

/** Fallback when nothing matched — never null, the UI always has copy. */
export const GENERAL_CATEGORY = Object.freeze({
  value: 'general',
  label: 'General',
  hint: 'Not enough detail to guess the subsystem — a photo will help a lot.',
  nextAction: 'Technician to inspect and diagnose on site',
  keywords: [],
});

export function categoryMeta(value) {
  return CATEGORY_INDEX[String(value || '').toLowerCase()] || GENERAL_CATEGORY;
}

/** Lowercased, punctuation flattened to spaces, so "won't" survives. */
function normalise(text) {
  return ` ${String(text || '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim()} `;
}

function matchKeywords(haystack, keywords) {
  return asArray(keywords).filter((keyword) => haystack.includes(` ${keyword} `)
    || haystack.includes(`${keyword} `)
    || haystack.includes(` ${keyword}`));
}

/**
 * Read a free-text complaint and return everything the form wants to
 * pre-fill. Pure, synchronous, and safe on an empty string.
 *
 * @param {string} text  what the reporter typed or dictated
 * @returns {{
 *   urgency: string, urgencyLabel: string, urgencyReason: string,
 *   category: string, categoryLabel: string, hint: string,
 *   nextAction: string, keywords: string[], confidence: 'none'|'low'|'high',
 *   responseMinutes: number
 * }}
 */
export function classifyIssue(text) {
  const raw = String(text || '').trim();
  const haystack = normalise(raw);

  let urgency = URGENCY.MEDIUM;
  let urgencyReason = 'No strong signal — medium until someone looks.';
  let urgencyHits = [];

  for (const rule of URGENCY_RULES) {
    const hits = matchKeywords(haystack, rule.keywords);
    if (hits.length) {
      urgency = rule.urgency;
      urgencyReason = rule.reason;
      urgencyHits = hits;
      break;
    }
  }

  // Best-scoring category rather than first match: "oil leak, motor
  // tripped" should land on whichever subsystem the sentence leans on.
  let best = GENERAL_CATEGORY;
  let bestHits = [];
  ISSUE_CATEGORIES.forEach((category) => {
    const hits = matchKeywords(haystack, category.keywords);
    if (hits.length > bestHits.length) {
      best = category;
      bestHits = hits;
    }
  });

  const keywords = Array.from(new Set([...urgencyHits, ...bestHits]));

  let confidence = 'none';
  if (raw.length >= 3 && keywords.length) confidence = keywords.length >= 2 ? 'high' : 'low';

  return {
    urgency,
    urgencyLabel: urgencyMeta(urgency).label,
    urgencyReason,
    responseMinutes: urgencyMeta(urgency).responseMinutes,
    category: best.value,
    categoryLabel: best.label,
    hint: best.hint,
    nextAction: best.nextAction,
    keywords,
    confidence,
  };
}

/* -----------------------------------------------------------
   Technician severity — the extra field only technicians see
   ----------------------------------------------------------- */

export const TECH_SEVERITY = Object.freeze({
  SELF: 'self',
  SUPERVISOR: 'supervisor',
  ENGINEER: 'engineer',
});

export const TECH_SEVERITY_OPTIONS = Object.freeze([
  { value: TECH_SEVERITY.SELF, label: 'I can fix it', hint: 'Stays on your own queue as a logged repair.' },
  { value: TECH_SEVERITY.SUPERVISOR, label: 'Needs supervisor', hint: 'Your supervisor is called over.' },
  { value: TECH_SEVERITY.ENGINEER, label: 'Needs engineer', hint: 'Escalated to maintenance engineering.' },
]);

/** What the technician thinks happens next — routed, not just recorded. */
export const NEXT_ACTIONS = Object.freeze([
  { value: 'repair', label: 'Repair now' },
  { value: 'order_parts', label: 'Order parts' },
  { value: 'call_vendor', label: 'Call vendor / OEM' },
  { value: 'monitor', label: 'Monitor and re-check' },
]);

/** Why a supervisor is filing this — drives their own reporting later. */
export const REPORT_REASONS = Object.freeze([
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'maintenance_due', label: 'Maintenance due' },
  { value: 'quality', label: 'Quality issue' },
  { value: 'safety', label: 'Safety concern' },
]);

/* -----------------------------------------------------------
   Machine helpers
   ----------------------------------------------------------- */

export function machineIdOf(machine) {
  return machine?.machine_id || machine?.id || '';
}

export function machineNameOf(machine) {
  return machine?.machine_name || machine?.name || machineIdOf(machine) || 'Unknown machine';
}

/**
 * The person a report from this machine should reach. Machines carry
 * assignments in two shapes depending on which endpoint filled them,
 * so both are read here rather than at four call sites.
 */
export function assignedTechnician(machine) {
  const assigned = machine?.assignments?.technician;
  if (assigned?.name) return { name: assigned.name, role: assigned.role || 'maintenance_technician', userId: assigned.user_id || null };
  if (machine?.primary_technician_name) {
    return { name: machine.primary_technician_name, role: 'maintenance_technician', userId: machine.technician_user_id || null };
  }
  return null;
}

export function assignedSupervisor(machine) {
  const assigned = machine?.assignments?.supervisor;
  if (assigned?.name) return { name: assigned.name, role: 'supervisor', userId: assigned.user_id || null };
  return null;
}

export function assignedEngineer(machine) {
  const assigned = machine?.assignments?.engineer || machine?.assignments?.maintenance_head;
  if (assigned?.name) return { name: assigned.name, role: assigned.role || 'maintenance_engineer', userId: assigned.user_id || null };
  return null;
}

/** ₹ lost for every hour this machine stands still. 0 when unpriced. */
export function hourlyDowntimeCost(machine) {
  return Math.max(0, asNumber(machine?.hourly_downtime_cost ?? machine?.downtime_cost_per_hour));
}

/**
 * Search over the machines the reporter is allowed to see. Matches
 * name, id, asset code, model, serial and location, so "bay 2",
 * "CNC-04" and "lathe" all find the same machine.
 */
export function searchMachines(machines, query, { limit = 8 } = {}) {
  const rows = asArray(machines);
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return rows.slice(0, limit);

  const scored = rows
    .map((machine) => {
      const name = machineNameOf(machine).toLowerCase();
      const haystack = [
        name,
        machineIdOf(machine),
        machine?.asset_code,
        machine?.serial_no,
        machine?.model,
        machine?.location,
        machine?.department,
      ].filter(Boolean).join(' ').toLowerCase();

      if (!haystack.includes(needle)) return null;
      // Name-prefix beats name-contains beats matched-somewhere-else.
      const score = name.startsWith(needle) ? 0 : name.includes(needle) ? 1 : 2;
      return { machine, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

  return scored.slice(0, limit).map((row) => row.machine);
}

/**
 * Vendors only see equipment they hold a contract on. A vendor with
 * no contracts sees nothing — an empty list is the correct answer,
 * not "show them everything".
 */
export function vendorMachines(machines, vendorId) {
  const id = String(vendorId || '').trim().toLowerCase();
  return asArray(machines).filter((machine) => {
    const contract = machine?.vendor_id || machine?.vendor_contract?.vendor_id;
    if (!contract) return false;
    if (!id) return true;
    return String(contract).toLowerCase() === id;
  });
}

/**
 * Decode a machine QR payload. The generator emits three shapes over
 * the app's life (raw id, `turbofix://machine/<id>`, and a gateway
 * URL with `?machine=`), and a five-year-old sticker on a press is
 * not getting reprinted, so all three are accepted.
 */
export function parseMachineQr(payload) {
  const raw = String(payload || '').trim();
  if (!raw) return null;

  const scheme = raw.match(/^turbofix:\/\/machine\/([^/?#]+)/i);
  if (scheme) return decodeURIComponent(scheme[1]);

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const param = url.searchParams.get('machine') || url.searchParams.get('machine_id') || url.searchParams.get('m');
      if (param) return param;
      const last = url.pathname.split('/').filter(Boolean).pop();
      return last ? decodeURIComponent(last) : null;
    } catch {
      return null;
    }
  }

  // A bare id. Reject sentences so a mis-scan does not select a machine.
  return /^[\w.-]{2,64}$/.test(raw) ? raw : null;
}

/** Find the machine a scanned code refers to, id or asset code. */
export function machineFromQr(machines, payload) {
  const code = parseMachineQr(payload);
  if (!code) return null;
  const needle = code.toLowerCase();
  return asArray(machines).find((machine) => (
    String(machineIdOf(machine)).toLowerCase() === needle
    || String(machine?.asset_code || '').toLowerCase() === needle
    || String(machine?.serial_no || '').toLowerCase() === needle
  )) || null;
}

/* -----------------------------------------------------------
   History — "this machine keeps doing this"
   ----------------------------------------------------------- */

/**
 * Coarse themes for repeat detection. Finer than this and no two
 * reports ever group; coarser and the insight says nothing.
 */
const THEME_WORDS = Object.freeze({
  spindle: ['spindle'],
  bearing: ['bearing'],
  leak: ['leak', 'seepage', 'oil', 'coolant'],
  pressure: ['pressure', 'psi'],
  electrical: ['motor', 'trip', 'power', 'panel', 'fuse'],
  noise: ['noise', 'sound', 'vibration', 'rattle'],
  overheating: ['overheat', 'temperature', 'hot'],
  jam: ['jam', 'stuck', 'seized'],
});

function themeOf(text) {
  const haystack = normalise(text);
  for (const [theme, words] of Object.entries(THEME_WORDS)) {
    if (matchKeywords(haystack, words).length) return theme;
  }
  return null;
}

function reportText(report) {
  return report?.issue_text || report?.description || report?.title || '';
}

function reportTime(report) {
  const stamp = report?.created_at || report?.reported_at || report?.timestamp;
  const time = stamp ? new Date(stamp).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

/**
 * What this machine has been telling us lately. Returns `null` when
 * there is nothing worth saying — an empty insight box is worse than
 * no box, and the caller renders on truthiness.
 *
 * @returns {null | {
 *   total: number, theme: string|null, themeCount: number,
 *   note: string, lastRepair: object|null, windowDays: number
 * }}
 */
export function machineHistoryInsight(machineId, reports, { now = new Date(), windowDays = HISTORY_WINDOW_DAYS } = {}) {
  const id = String(machineId || '').trim();
  if (!id) return null;

  const since = (now instanceof Date ? now.getTime() : Date.now()) - windowDays * MS_PER_DAY;
  const recent = asArray(reports).filter((report) => {
    if (String(report?.machine_id || '') !== id) return false;
    const at = reportTime(report);
    return at == null || at >= since;
  });

  if (!recent.length) return null;

  const themes = {};
  recent.forEach((report) => {
    const theme = themeOf(reportText(report));
    if (theme) themes[theme] = (themes[theme] || 0) + 1;
  });

  const [theme, themeCount] = Object.entries(themes)
    .sort((a, b) => b[1] - a[1])[0] || [null, 0];

  const closed = recent
    .filter((report) => report?.resolution_note || report?.repair_note || report?.closed_at)
    .sort((a, b) => (reportTime(b) || 0) - (reportTime(a) || 0));
  const lastRepair = closed[0] || null;

  const repeats = themeCount >= REPEAT_THEME_THRESHOLD;
  const note = repeats
    ? `${themeCount} ${theme} reports on this machine in the last ${windowDays} days.`
    : `${recent.length} report${recent.length === 1 ? '' : 's'} on this machine in the last ${windowDays} days.`;

  return {
    total: recent.length,
    theme: repeats ? theme : null,
    themeCount: repeats ? themeCount : 0,
    note,
    lastRepair,
    windowDays,
  };
}

/* -----------------------------------------------------------
   Routing
   ----------------------------------------------------------- */

export const QUEUES = Object.freeze({
  TECHNICIAN: 'technician',
  SUPERVISOR: 'supervisor',
  ENGINEER: 'engineer',
  VENDOR: 'vendor',
});

function recipient(person, { channel = 'push', why } = {}) {
  if (!person?.name) return null;
  return { name: person.name, role: person.role || null, userId: person.userId || null, channel, why };
}

/**
 * Where a finished report goes and who hears about it.
 *
 * The rules, in the order a plant would state them:
 *   - an operator's report is the assigned technician's problem;
 *     critical ones also wake the supervisor, because a critical
 *     report sitting in one person's queue is how a plant loses a
 *     shift,
 *   - a technician routes their own finding by the severity they
 *     picked — that is the whole point of asking them,
 *   - a supervisor's report is already an assignment; it goes to
 *     whoever they named, and critical ones copy maintenance head,
 *   - a vendor's report reaches the internal technician *and* keeps
 *     the vendor's own contact on the thread, so nobody has to ask
 *     who called it in.
 *
 * Every branch degrades: with no assigned technician the report
 * lands on the supervisor queue rather than nowhere.
 *
 * @returns {{
 *   queue: string, notify: object[], escalated: boolean,
 *   reason: string, responseMinutes: number, primary: object|null
 * }}
 */
export function routeBreakdown({
  role,
  machine,
  urgency = URGENCY.MEDIUM,
  severity = TECH_SEVERITY.SELF,
  assignTo = null,
  reporter = null,
  vendorContact = null,
} = {}) {
  const view = resolveBreakdownRole(role);
  const meta = urgencyMeta(urgency);
  const technician = assignedTechnician(machine);
  const supervisor = assignedSupervisor(machine);
  const engineer = assignedEngineer(machine);
  const critical = isAtLeastUrgent(urgency, URGENCY.CRITICAL);

  const notify = [];
  let queue = QUEUES.TECHNICIAN;
  let primary = technician;
  let escalated = false;
  let reason = '';

  if (view === BREAKDOWN_ROLES.TECHNICIAN) {
    if (severity === TECH_SEVERITY.ENGINEER) {
      queue = QUEUES.ENGINEER;
      primary = engineer || supervisor;
      escalated = true;
      reason = 'You marked it as needing an engineer.';
    } else if (severity === TECH_SEVERITY.SUPERVISOR) {
      queue = QUEUES.SUPERVISOR;
      primary = supervisor;
      escalated = true;
      reason = 'You asked for your supervisor.';
    } else {
      queue = QUEUES.TECHNICIAN;
      primary = reporter?.name ? { name: reporter.name, role: reporter.role || 'maintenance_technician', userId: reporter.userId || null } : technician;
      reason = 'Logged on your own queue as work in hand.';
    }
  } else if (view === BREAKDOWN_ROLES.SUPERVISOR) {
    queue = QUEUES.TECHNICIAN;
    primary = assignTo?.name ? assignTo : technician;
    reason = primary?.name ? `Assigned by you to ${primary.name}.` : 'No technician assigned to this machine yet.';
    if (!primary?.name) queue = QUEUES.SUPERVISOR;
  } else if (view === BREAKDOWN_ROLES.VENDOR) {
    queue = QUEUES.TECHNICIAN;
    primary = technician;
    reason = 'Sent to the plant technician who owns this asset.';
    if (!primary?.name) {
      queue = QUEUES.VENDOR;
      primary = vendorContact?.name ? vendorContact : null;
      reason = 'No plant technician on this asset — held on the vendor queue.';
    }
  } else {
    queue = QUEUES.TECHNICIAN;
    primary = technician;
    reason = 'Sent to the technician assigned to this machine.';
  }

  // Nobody assigned anywhere: the supervisor queue is the floor, not
  // a dead letter. A report must always be *somebody's*.
  if (!primary?.name) {
    if (supervisor?.name) {
      queue = QUEUES.SUPERVISOR;
      primary = supervisor;
      reason = 'No technician on this machine — your supervisor picks it up.';
    } else {
      queue = QUEUES.SUPERVISOR;
      reason = 'Nobody is assigned to this machine yet — it goes to the open supervisor queue.';
    }
  }

  notify.push(recipient(primary, { channel: 'push', why: 'Owns this report' }));

  if (critical && supervisor && supervisor.name !== primary?.name) {
    notify.push(recipient(supervisor, { channel: 'whatsapp', why: 'Critical report — supervisor copied' }));
    escalated = true;
  }
  if (view === BREAKDOWN_ROLES.SUPERVISOR && critical && engineer && engineer.name !== primary?.name) {
    notify.push(recipient(engineer, { channel: 'whatsapp', why: 'Critical report — engineering copied' }));
    escalated = true;
  }
  if (view === BREAKDOWN_ROLES.VENDOR && vendorContact?.name && vendorContact.name !== primary?.name) {
    notify.push(recipient(vendorContact, { channel: 'email', why: 'Vendor contact on file' }));
  }

  return {
    queue,
    primary: primary?.name ? primary : null,
    notify: notify.filter(Boolean),
    escalated,
    reason,
    responseMinutes: meta.responseMinutes,
  };
}

/** "45 min" / "2 hr" / "1 day" — the ETA the receipt quotes. */
export function formatResponseWindow(minutes) {
  const value = Math.max(1, Math.round(asNumber(minutes)));
  if (value < 90) return `${value} min`;
  if (value < 60 * 24) {
    const hours = Math.round(value / 60);
    return `${hours} hr`;
  }
  const days = Math.round(value / (60 * 24));
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * The sentence the reporter reads. Names a person and a time, or
 * says plainly that nobody is assigned — never "submitted
 * successfully", which tells a shop floor nothing.
 */
export function confirmationMessage(routing, { machine } = {}) {
  const window = formatResponseWindow(routing?.responseMinutes);
  const name = routing?.primary?.name;
  const where = machine ? ` on ${machineNameOf(machine)}` : '';

  if (!name) {
    return `Reported${where}. Nobody is assigned to this machine yet, so it is on the supervisor queue — expect a first response within ${window}.`;
  }
  const escalation = routing?.escalated && routing.notify.length > 1
    ? ` ${routing.notify.slice(1).map((person) => person.name).join(' and ')} also notified.`
    : '';
  return `Reported to ${name}${where}. They are notified now and should respond within ${window}.${escalation}`;
}

/* -----------------------------------------------------------
   Record building
   ----------------------------------------------------------- */

/** Sequential work-order number, continuing whatever is already there. */
export function nextWorkOrderNumber(reports) {
  const highest = asArray(reports).reduce((max, report) => {
    const match = String(report?.wo_number || '').match(/(\d+)\s*$/);
    const value = match ? Number(match[1]) : 0;
    return value > max ? value : max;
  }, 0);
  return `WO-${String(highest + 1).padStart(5, '0')}`;
}

export function nextReportId(reports) {
  const highest = asArray(reports).reduce((max, report) => {
    const match = String(report?.id || '').match(/(\d+)\s*$/);
    const value = match ? Number(match[1]) : 0;
    return value > max ? value : max;
  }, 0);
  return `BRK-${String(highest + 1).padStart(4, '0')}`;
}

/**
 * The whole point of the "lightweight storage" rule: one flat row.
 * No wizard state, no nested draft — what the three steps collected,
 * plus who filed it and where it was routed.
 */
export function buildBreakdownRecord(draft = {}, { role, user, reports = [], now = new Date() } = {}) {
  const view = resolveBreakdownRole(role);
  const machine = draft.machine || null;
  const classification = draft.classification || classifyIssue(draft.issueText);
  const urgency = draft.urgency || classification.urgency;

  const routing = routeBreakdown({
    role: view,
    machine,
    urgency,
    severity: draft.severity,
    assignTo: draft.assignTo,
    reporter: user ? { name: user.name, role: user.role, userId: user.user_id } : null,
    vendorContact: draft.vendorContact,
  });

  const stamp = (now instanceof Date ? now : new Date(now || Date.now())).toISOString();

  return {
    record: {
      id: nextReportId(reports),
      wo_number: nextWorkOrderNumber(reports),
      machine_id: machineIdOf(machine) || null,
      machine_name: machine ? machineNameOf(machine) : null,
      location: machine?.location || null,
      issue_text: String(draft.issueText || '').trim(),
      urgency,
      category: classification.category,
      suggested_action: draft.nextAction || classification.nextAction,
      photo_url: draft.photoUrl || null,
      voice_note_url: draft.voiceNoteUrl || null,
      transcribed: Boolean(draft.transcribed),
      reported_by: user?.name || draft.contactName || 'Shop floor',
      reported_by_role: view,
      reporter_user_id: user?.user_id || null,
      reporter_phone: draft.contactPhone || user?.phone || null,
      vendor_id: view === BREAKDOWN_ROLES.VENDOR ? (draft.vendorId || user?.vendor_id || null) : null,
      severity: view === BREAKDOWN_ROLES.TECHNICIAN ? (draft.severity || TECH_SEVERITY.SELF) : null,
      report_reason: view === BREAKDOWN_ROLES.SUPERVISOR ? (draft.reason || 'breakdown') : null,
      downtime_cost_per_hour: hourlyDowntimeCost(machine) || null,
      assigned_to: routing.primary?.name || null,
      queue: routing.queue,
      escalated: routing.escalated,
      status: 'reported',
      lifecycle_stage: 'reported',
      created_at: stamp,
      reported_at: stamp,
    },
    routing,
    classification,
  };
}

/** The form's own gate — the page disables Submit on this. */
export function validateDraft(draft = {}, role) {
  const view = resolveBreakdownRole(role);
  const errors = {};

  if (!machineIdOf(draft.machine)) errors.machine = 'Pick the machine first.';
  if (!String(draft.issueText || '').trim()) errors.issueText = 'Say what is wrong, even in a few words.';
  if (view === BREAKDOWN_ROLES.VENDOR && !String(draft.contactName || '').trim()) {
    errors.contactName = 'We need a name to call back.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/* -----------------------------------------------------------
   Summaries — the strip each role sees above the form
   ----------------------------------------------------------- */

/**
 * "17 issues reported this shift, 3 critical." Shift boundaries are
 * the plant's usual three: 06:00, 14:00, 22:00 local.
 */
export function shiftSummary(reports, { now = new Date(), shiftHours = 8 } = {}) {
  const at = now instanceof Date ? now : new Date(now || Date.now());
  const shiftIndex = Math.floor(at.getHours() / shiftHours);
  const shiftStart = new Date(at);
  shiftStart.setHours(shiftIndex * shiftHours, 0, 0, 0);

  const rows = asArray(reports).filter((report) => {
    const time = reportTime(report);
    return time != null && time >= shiftStart.getTime();
  });

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  rows.forEach((report) => {
    const key = urgencyMeta(report?.urgency).value;
    counts[key] += 1;
  });

  return {
    total: rows.length,
    critical: counts.critical,
    high: counts.high,
    open: rows.filter((report) => !isReportClosed(report)).length,
    shiftStart: shiftStart.toISOString(),
    label: `${rows.length} issue${rows.length === 1 ? '' : 's'} reported this shift, ${counts.critical} critical`,
  };
}

export function isReportClosed(report) {
  const status = String(report?.status || '').toLowerCase();
  return Boolean(report?.closed_at) || ['closed', 'resolved', 'done', 'completed'].includes(status);
}

/** "You reported 3 issues, 2 resolved, 1 pending." */
export function vendorSummary(reports, vendorId) {
  const id = String(vendorId || '').trim().toLowerCase();
  const rows = asArray(reports).filter((report) => {
    if (!id) return Boolean(report?.vendor_id);
    return String(report?.vendor_id || '').toLowerCase() === id;
  });

  const resolved = rows.filter(isReportClosed).length;
  return {
    reported: rows.length,
    resolved,
    pending: rows.length - resolved,
    label: `You reported ${rows.length} issue${rows.length === 1 ? '' : 's'}, ${resolved} resolved, ${rows.length - resolved} pending`,
  };
}

/** The operator's own strip: what they filed, and what came of it. */
export function reporterSummary(reports, user) {
  const name = String(user?.name || '').trim().toLowerCase();
  const id = user?.user_id ? String(user.user_id) : null;

  const rows = asArray(reports).filter((report) => {
    if (id && String(report?.reporter_user_id || '') === id) return true;
    return name && String(report?.reported_by || '').trim().toLowerCase() === name;
  });

  const resolved = rows.filter(isReportClosed).length;
  return {
    reported: rows.length,
    resolved,
    pending: rows.length - resolved,
    label: rows.length
      ? `You reported ${rows.length}, ${resolved} already fixed`
      : 'Nothing reported by you yet',
  };
}
