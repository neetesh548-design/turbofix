/* ===========================================================
   TurboFix — Kaizen impact metrics
   ===========================================================

   Every rupee, percentage and count on the three Kaizen boards is
   computed here as a pure function over one `ideas` array. The page
   component decides *what to show*; this module decides *what is true*.

   Why the arithmetic lives outside React:
     - the operator's "my saving" and the plant manager's "realized
       savings" must be the same number computed the same way,
     - ROI is easy to get subtly wrong (cost of zero, estimate vs.
       actual, annualised vs. one-off) and deserves its own tests,
     - the 5-minute KPI cache wraps one function instead of a page.

   Conventions, mirroring utils/dashboardMetrics.js:
     - every input is defensively coerced; a missing table yields an
       empty metric, never a TypeError,
     - a metric with nothing to stand on returns `null`, not `0`.
       "No idea has been verified yet" and "₹0 saved" are different
       facts and the boards render them differently,
     - `now` is always injectable so tests never depend on the clock.

   Vocabulary used throughout:
     estimated  what the submitter forecast at submission time
     forecast   estimated savings for ideas still in flight (pipeline)
     realized   money an idea actually returned, confirmed at verification
   =========================================================== */

import { asArray, asNumber, round1, LABOUR_RATE_PER_HOUR } from './dashboardMetrics.js';

export { LABOUR_RATE_PER_HOUR };

export { formatInr, formatInrCompact, formatPct } from './dashboardMetrics.js';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* -----------------------------------------------------------
   Vocabulary
   ----------------------------------------------------------- */

export const KAIZEN_CATEGORIES = Object.freeze([
  { value: 'safety', label: 'Safety' },
  { value: 'quality', label: 'Quality' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'cost_reduction', label: 'Cost Reduction' },
  { value: 'energy_saving', label: 'Energy Saving' },
  { value: 'material_saving', label: 'Material Saving' },
  { value: 'breakdown_prevention', label: 'Breakdown Prevention' },
  { value: 'ergonomics', label: 'Ergonomics' },
  { value: '5s', label: '5S' },
  { value: 'simplification', label: 'Process Simplification' },
]);

/** The seven wastes plus unused talent — the operator's "what's wrong?" picker. */
export const LEAN_WASTES = Object.freeze([
  { value: 'motion', label: 'Motion', hint: 'Walking, reaching, searching' },
  { value: 'waiting', label: 'Waiting', hint: 'Idle machine or idle operator' },
  { value: 'defects', label: 'Defects', hint: 'Rework, scrap, rejections' },
  { value: 'transportation', label: 'Transportation', hint: 'Moving material about' },
  { value: 'inventory', label: 'Inventory', hint: 'Stock sitting between steps' },
  { value: 'overproduction', label: 'Overproduction', hint: 'Making more than needed' },
  { value: 'overprocessing', label: 'Over-processing', hint: 'Doing more than the spec' },
  { value: 'talent', label: 'Unused Talent', hint: 'Skills nobody is drawing on' },
]);

/**
 * The lifecycle, in order. `stage` groups nine statuses into the five
 * funnel bands the manager board reports on; `tone` drives badge colour.
 */
export const KAIZEN_STATUSES = Object.freeze([
  { value: 'submitted', label: 'Submitted', stage: 'submitted', tone: 'info' },
  { value: 'need_information', label: 'Need Info', stage: 'submitted', tone: 'warning' },
  { value: 'approved', label: 'Approved', stage: 'approved', tone: 'info' },
  { value: 'planned', label: 'Planned', stage: 'approved', tone: 'info' },
  { value: 'in_progress', label: 'In Trial', stage: 'trial', tone: 'warning' },
  { value: 'implemented', label: 'Implemented', stage: 'trial', tone: 'warning' },
  { value: 'verified', label: 'Verified', stage: 'verified', tone: 'ok' },
  { value: 'standardisation_pending', label: 'SOP Pending', stage: 'verified', tone: 'ok' },
  { value: 'closed', label: 'Standardised', stage: 'standardised', tone: 'ok' },
  { value: 'rejected', label: 'Rejected', stage: 'rejected', tone: 'danger' },
]);

const STATUS_INDEX = Object.freeze(
  KAIZEN_STATUSES.reduce((index, status) => {
    index[status.value] = status;
    return index;
  }, {}),
);

/** The five bands the implementation funnel reports, top to bottom. */
export const FUNNEL_STAGES = Object.freeze([
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'trial', label: 'In Trial' },
  { key: 'verified', label: 'Verified' },
  { key: 'standardised', label: 'Standardised' },
]);

export function statusMeta(status) {
  return STATUS_INDEX[String(status || '').toLowerCase()] || {
    value: String(status || 'unknown'),
    label: String(status || 'Unknown').replace(/_/g, ' '),
    stage: 'submitted',
    tone: '',
  };
}

export function categoryLabel(value) {
  const match = KAIZEN_CATEGORIES.find((category) => category.value === value);
  return match ? match.label : String(value || 'Uncategorised').replace(/_/g, ' ');
}

export function wasteLabel(value) {
  const match = LEAN_WASTES.find((waste) => waste.value === value);
  return match ? match.label : String(value || '—').replace(/_/g, ' ');
}

/* -----------------------------------------------------------
   Role resolution
   ----------------------------------------------------------- */

export const KAIZEN_ROLES = Object.freeze({
  OPERATOR: 'operator',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
});

/**
 * Anyone we cannot place sees the Manager board: it is read-only and
 * reveals impact rather than granting approval rights.
 */
export const DEFAULT_KAIZEN_ROLE = KAIZEN_ROLES.MANAGER;

const ROLE_VIEW_MAP = Object.freeze({
  operator: KAIZEN_ROLES.OPERATOR,
  machine_operator: KAIZEN_ROLES.OPERATOR,
  technician: KAIZEN_ROLES.OPERATOR,
  maintenance_technician: KAIZEN_ROLES.OPERATOR,
  contractor: KAIZEN_ROLES.OPERATOR,
  vendor: KAIZEN_ROLES.OPERATOR,

  supervisor: KAIZEN_ROLES.SUPERVISOR,
  maintenance_supervisor: KAIZEN_ROLES.SUPERVISOR,
  shift_incharge: KAIZEN_ROLES.SUPERVISOR,
  engineer: KAIZEN_ROLES.SUPERVISOR,
  maintenance_engineer: KAIZEN_ROLES.SUPERVISOR,
  reliability_engineer: KAIZEN_ROLES.SUPERVISOR,

  owner: KAIZEN_ROLES.MANAGER,
  plant_manager: KAIZEN_ROLES.MANAGER,
  maintenance_head: KAIZEN_ROLES.MANAGER,
  admin: KAIZEN_ROLES.MANAGER,
});

export function resolveKaizenRole(role) {
  const key = String(role || '').toLowerCase().trim();
  return ROLE_VIEW_MAP[key] || DEFAULT_KAIZEN_ROLE;
}

/* -----------------------------------------------------------
   Field readers
   ----------------------------------------------------------- */

/**
 * Money the idea has actually returned. `realized_savings` is the new
 * column; `actual_saving` is what the legacy table wrote. A realized
 * figure of zero on a verified idea is a real answer ("we measured, it
 * saved nothing"), so only a missing column reads as `null`.
 */
export function realizedSaving(idea) {
  const raw = idea?.realized_savings ?? idea?.actual_saving;
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** What the submitter forecast, annualised. */
export function estimatedSaving(idea) {
  return asNumber(idea?.estimated_saving ?? idea?.estimated_savings);
}

export function ideaCost(idea) {
  return asNumber(idea?.estimated_cost ?? idea?.actual_cost);
}

export function ideaStage(idea) {
  return statusMeta(idea?.status).stage;
}

export function isRejected(idea) {
  return ideaStage(idea) === 'rejected';
}

/** Verified or beyond — the point at which savings stop being a guess. */
export function isRealizedIdea(idea) {
  const stage = ideaStage(idea);
  return stage === 'verified' || stage === 'standardised';
}

/** Approved but not yet proven — the money still in flight. */
export function isPipelineIdea(idea) {
  const stage = ideaStage(idea);
  return stage === 'approved' || stage === 'trial';
}

export function isAwaitingReview(idea) {
  return ideaStage(idea) === 'submitted';
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value == null || value === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function referenceDate(now) {
  return toDate(now) || new Date();
}

/** Match a user to the ideas they submitted, by id first then by name. */
export function isSubmittedBy(idea, user) {
  if (!idea || !user) return false;
  const ids = [user.user_id, user.id, user.email].filter(Boolean).map(String);
  const ideaIds = [idea.created_by, idea.created_by_id, idea.submitted_by, idea.created_by_email]
    .filter(Boolean)
    .map(String);
  if (ids.some((id) => ideaIds.includes(id))) return true;

  const name = String(user.name || '').trim().toLowerCase();
  if (!name) return false;
  return String(idea.created_by_name || '').trim().toLowerCase() === name;
}

/* -----------------------------------------------------------
   Core arithmetic
   ----------------------------------------------------------- */

/**
 * Return on investment as a percentage: (savings − cost) / cost × 100.
 *
 * A zero-cost idea has no denominator. Rather than reporting an
 * infinite ROI — which sorts to the top of every table and tells a
 * manager nothing — it returns `null` and the UI says "no spend".
 */
export function computeRoi(savings, cost) {
  const spend = asNumber(cost);
  if (spend <= 0) return null;
  return round1(((asNumber(savings) - spend) / spend) * 100);
}

/** ROI on what the submitter forecast — the number used to triage a queue. */
export function estimatedRoi(idea) {
  return computeRoi(estimatedSaving(idea), ideaCost(idea));
}

/** ROI on measured money. `null` until the idea is verified. */
export function realizedRoi(idea) {
  const realized = realizedSaving(idea);
  if (realized == null) return null;
  return computeRoi(realized, ideaCost(idea));
}

/**
 * Did the idea beat its own forecast?
 *   'over'  realized ≥ estimate  — green
 *   'on'    within 20% below     — amber, on track
 *   'under' more than 20% short  — red
 * Returns `null` while there is nothing measured to compare against.
 */
export function performanceBand(idea) {
  const realized = realizedSaving(idea);
  if (realized == null || !isRealizedIdea(idea)) return null;
  const estimate = estimatedSaving(idea);
  if (estimate <= 0) return realized > 0 ? 'over' : 'on';
  const ratio = realized / estimate;
  if (ratio >= 1) return 'over';
  if (ratio >= 0.8) return 'on';
  return 'under';
}

/* -----------------------------------------------------------
   Roll-ups
   ----------------------------------------------------------- */

/**
 * The four numbers on the Manager board's KPI row.
 *
 * `realized` counts only verified-or-beyond ideas, so the headline
 * figure can always be defended in a review. `forecast` is everything
 * approved but unproven. They are never added together.
 */
export function impactSummary(ideas, { now } = {}) {
  const rows = asArray(ideas).filter(Boolean);
  const reference = referenceDate(now);
  const yearStart = new Date(reference.getFullYear(), 0, 1);

  let realized = 0;
  let realizedCount = 0;
  let forecast = 0;
  let forecastCount = 0;
  let spend = 0;
  let yearRealized = 0;
  let yearSpend = 0;
  let implemented = 0;
  let standardised = 0;

  rows.forEach((idea) => {
    if (isRejected(idea)) return;
    const cost = ideaCost(idea);
    const stage = ideaStage(idea);

    if (isRealizedIdea(idea)) {
      const measured = realizedSaving(idea) ?? 0;
      realized += measured;
      realizedCount += 1;
      spend += cost;
      implemented += 1;
      if (stage === 'standardised') standardised += 1;

      const closedAt = toDate(idea.verified_at) || toDate(idea.updated_at) || toDate(idea.created_at);
      if (closedAt && closedAt >= yearStart && closedAt <= reference) {
        yearRealized += measured;
        yearSpend += cost;
      }
    } else if (isPipelineIdea(idea)) {
      forecast += estimatedSaving(idea);
      forecastCount += 1;
    }
  });

  return {
    realized,
    realizedCount,
    forecast,
    forecastCount,
    spend,
    // No verified idea yet → "not measured", not "0% ROI".
    netBenefit: realizedCount ? realized - spend : null,
    roiPct: realizedCount ? computeRoi(realized, spend) : null,
    roiThisYearPct: yearRealized || yearSpend ? computeRoi(yearRealized, yearSpend) : null,
    implemented,
    standardised,
    total: rows.length,
  };
}

/**
 * Savings per category, realized and forecast side by side, sorted by
 * total value.
 *
 * Only ideas that carry money into the chart are counted: verified ones
 * (realized) and approved-or-in-trial ones (forecast). An idea still
 * awaiting review has an estimate but no decision behind it, so folding
 * it in would let anyone inflate a category by submitting optimistic
 * numbers. Those ideas are already visible in the funnel's "Submitted"
 * band, which is where an un-vetted number belongs.
 *
 * Categories that end up worth nothing are dropped — a zero-length bar
 * is noise, and its drill-down would list ideas that are not in it.
 */
export function savingsByCategory(ideas) {
  const buckets = new Map();

  asArray(ideas).forEach((idea) => {
    if (!idea || isRejected(idea)) return;

    const realized = isRealizedIdea(idea);
    const pipeline = isPipelineIdea(idea);
    if (!realized && !pipeline) return;

    const key = idea.category || 'uncategorised';
    if (!buckets.has(key)) {
      buckets.set(key, {
        category: key,
        label: categoryLabel(key),
        realized: 0,
        forecast: 0,
        count: 0,
        ideas: [],
      });
    }
    const bucket = buckets.get(key);
    bucket.count += 1;

    const saving = realized ? (realizedSaving(idea) ?? 0) : estimatedSaving(idea);
    if (realized) bucket.realized += saving;
    else bucket.forecast += saving;

    bucket.ideas.push({ id: idea.id, title: idea.title, saving, realized });
  });

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      total: bucket.realized + bucket.forecast,
      ideas: bucket.ideas.sort((a, b) => b.saving - a.saving),
    }))
    .filter((bucket) => bucket.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * Count at each funnel band, plus the one band that is visibly clogged.
 *
 * A bottleneck is a stage holding at least a third of everything in
 * flight and at least three ideas — below that the "bottleneck" is just
 * a small sample, and flagging it trains people to ignore the flag.
 */
export function implementationFunnel(ideas, { bottleneckShare = 0.34, bottleneckMin = 3 } = {}) {
  const rows = asArray(ideas).filter((idea) => idea && !isRejected(idea));
  const counts = FUNNEL_STAGES.reduce((acc, stage) => ({ ...acc, [stage.key]: 0 }), {});

  rows.forEach((idea) => {
    const stage = ideaStage(idea);
    if (counts[stage] != null) counts[stage] += 1;
  });

  const total = rows.length;
  const stages = FUNNEL_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: counts[stage.key],
    pct: total ? Math.round((counts[stage.key] / total) * 100) : 0,
  }));

  // Only pre-verified stages can clog; verified work is finished work.
  const inFlight = stages.filter((stage) => stage.key !== 'standardised' && stage.key !== 'verified');
  const worst = inFlight.reduce(
    (top, stage) => (!top || stage.count > top.count ? stage : top),
    null,
  );
  const bottleneck = worst
    && worst.count >= bottleneckMin
    && total > 0
    && worst.count / total >= bottleneckShare
    ? worst
    : null;

  return { stages, total, rejected: asArray(ideas).filter(isRejected).length, bottleneck };
}

/** Top ideas by money, realized first, with the over/on/under band attached. */
export function topSavingsIdeas(ideas, { limit = 10 } = {}) {
  return asArray(ideas)
    .filter((idea) => idea && !isRejected(idea))
    .map((idea) => {
      const realized = realizedSaving(idea);
      const estimate = estimatedSaving(idea);
      return {
        id: idea.id,
        title: idea.title,
        submitter: idea.created_by_name || 'Unknown',
        category: idea.category,
        categoryLabel: categoryLabel(idea.category),
        status: idea.status,
        cost: ideaCost(idea),
        estimate,
        realized,
        roiPct: realized == null ? estimatedRoi(idea) : realizedRoi(idea),
        band: performanceBand(idea),
        // Ranking value: measured money if we have it, otherwise the forecast.
        rank: isRealizedIdea(idea) ? (realized ?? 0) : estimate,
      };
    })
    .sort((a, b) => {
      // Proven money always outranks a forecast of the same size.
      const aRealized = a.realized != null ? 1 : 0;
      const bRealized = b.realized != null ? 1 : 0;
      if (aRealized !== bRealized) return bRealized - aRealized;
      return b.rank - a.rank;
    })
    .slice(0, limit);
}

/**
 * Ideas submitted per calendar month over the trailing window, oldest
 * first, alongside the average saving booked in each month.
 */
export function submissionTrend(ideas, { months = 6, now } = {}) {
  const reference = referenceDate(now);
  const buckets = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    buckets.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      label: start.toLocaleString('en-IN', { month: 'short' }),
      start,
      end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
      count: 0,
      savings: 0,
      savedCount: 0,
    });
  }

  asArray(ideas).forEach((idea) => {
    const created = toDate(idea?.created_at);
    if (!created) return;
    const bucket = buckets.find((entry) => created >= entry.start && created < entry.end);
    if (!bucket) return;
    bucket.count += 1;
    const measured = realizedSaving(idea);
    if (isRealizedIdea(idea) && measured != null) {
      bucket.savings += measured;
      bucket.savedCount += 1;
    }
  });

  // `start`/`end` were only ever bucketing scaffolding — drop them so the
  // trend series a chart receives carries nothing it cannot render.
  return buckets.map(({ start: _start, end: _end, savedCount, ...rest }) => ({
    ...rest,
    avgSaving: savedCount ? Math.round(rest.savings / savedCount) : null,
  }));
}

/**
 * Days from submission to standardisation, averaged over ideas that
 * completed the whole journey. Ideas still in flight are excluded —
 * including them would make the number improve every time a new idea
 * is submitted, which is exactly backwards.
 */
export function cycleTimeDays(ideas) {
  const durations = asArray(ideas)
    .filter((idea) => idea && ideaStage(idea) === 'standardised')
    .map((idea) => {
      const from = toDate(idea.created_at);
      const to = toDate(idea.verified_at) || toDate(idea.updated_at);
      if (!from || !to || to < from) return null;
      return (to - from) / MS_PER_DAY;
    })
    .filter((days) => days != null);

  if (!durations.length) return { avgDays: null, sampleSize: 0, fastestDays: null, slowestDays: null };

  const total = durations.reduce((sum, days) => sum + days, 0);
  return {
    avgDays: round1(total / durations.length),
    sampleSize: durations.length,
    fastestDays: round1(Math.min(...durations)),
    slowestDays: round1(Math.max(...durations)),
  };
}

/* -----------------------------------------------------------
   Operator board
   ----------------------------------------------------------- */

/** One person's ideas, newest first, with their personal impact tally. */
export function myIdeas(ideas, user) {
  const mine = asArray(ideas)
    .filter((idea) => isSubmittedBy(idea, user))
    .sort((a, b) => (toDate(b?.created_at)?.getTime() || 0) - (toDate(a?.created_at)?.getTime() || 0));

  const realizedTotal = mine
    .filter(isRealizedIdea)
    .reduce((sum, idea) => sum + (realizedSaving(idea) ?? 0), 0);

  return {
    ideas: mine,
    total: mine.length,
    awaitingReview: mine.filter(isAwaitingReview).length,
    inTrial: mine.filter((idea) => ideaStage(idea) === 'trial').length,
    implemented: mine.filter(isRealizedIdea).length,
    realizedTotal,
  };
}

/**
 * The hall of fame: implemented ideas ranked by money actually returned.
 * Ideas with before/after photos win ties — a visible change is more
 * persuasive to the next submitter than a marginally larger number.
 */
export function hallOfFame(ideas, { limit = 5 } = {}) {
  return asArray(ideas)
    .filter((idea) => idea && isRealizedIdea(idea) && (realizedSaving(idea) ?? 0) > 0)
    .sort((a, b) => {
      const savingGap = (realizedSaving(b) ?? 0) - (realizedSaving(a) ?? 0);
      if (savingGap !== 0) return savingGap;
      const aPhotos = a.before_photo_url && a.after_photo_url ? 1 : 0;
      const bPhotos = b.before_photo_url && b.after_photo_url ? 1 : 0;
      return bPhotos - aPhotos;
    })
    .slice(0, limit);
}

/* -----------------------------------------------------------
   Supervisor board
   ----------------------------------------------------------- */

/**
 * The review queue, ordered by the money at stake. Ideas with no cost
 * estimate sort by forecast saving alone, so a free idea worth ₹40k does
 * not sink below a ₹2k idea that happens to have an ROI number.
 */
export function pendingReview(ideas) {
  return asArray(ideas)
    .filter(isAwaitingReview)
    .map((idea) => ({
      idea,
      estimate: estimatedSaving(idea),
      cost: ideaCost(idea),
      roiPct: estimatedRoi(idea),
      needsInfo: idea.status === 'need_information',
    }))
    .sort((a, b) => b.estimate - a.estimate || (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity));
}

/**
 * Trials in flight with the countdown a supervisor actually chases.
 * `daysLeft` goes negative when a trial has run past its target date;
 * the board renders that as overdue rather than clamping it to zero.
 */
export function trialsInFlight(ideas, { now } = {}) {
  const reference = referenceDate(now);

  return asArray(ideas)
    .filter((idea) => idea && ideaStage(idea) === 'trial')
    .map((idea) => {
      const due = toDate(idea.due_date);
      const started = toDate(idea.trial_started_at) || toDate(idea.created_at);
      const daysLeft = due ? Math.ceil((due - reference) / MS_PER_DAY) : null;
      return {
        idea,
        startedAt: started,
        dueDate: due,
        daysLeft,
        overdue: daysLeft != null && daysLeft < 0,
        assignedTo: idea.assigned_to_name || idea.created_by_name || 'Unassigned',
        forecast: estimatedSaving(idea),
        readyToVerify: idea.status === 'implemented',
      };
    })
    .sort((a, b) => {
      if (a.daysLeft == null) return 1;
      if (b.daysLeft == null) return -1;
      return a.daysLeft - b.daysLeft;
    });
}

/** Verified ideas waiting to be written into a standard — the last mile. */
export function readyToStandardise(ideas) {
  return asArray(ideas)
    .filter((idea) => idea && ideaStage(idea) === 'verified')
    .sort((a, b) => (realizedSaving(b) ?? 0) - (realizedSaving(a) ?? 0));
}

/**
 * Middle value of a set of ROI percentages.
 *
 * The mean is the wrong statistic for a Kaizen portfolio and badly so.
 * Kaizen's best ideas are cheap by design — a ₹800 guard returning
 * ₹85,000 is a 10,525% ROI — so one such idea drags the mean of a
 * healthy programme into the thousands of percent and the tile stops
 * meaning anything. The median answers the question a supervisor is
 * actually asking: what does a typical idea here return?
 */
export function medianRoi(values) {
  const sorted = asArray(values)
    .filter((value) => value != null && Number.isFinite(Number(value)))
    .map(Number)
    .sort((a, b) => a - b);

  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? round1(sorted[middle])
    : round1((sorted[middle - 1] + sorted[middle]) / 2);
}

/** The supervisor's metric strip: this month's decisions and their quality. */
export function supervisorStrip(ideas, { now } = {}) {
  const reference = referenceDate(now);
  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const rows = asArray(ideas).filter(Boolean);

  const approvedThisMonth = rows.filter((idea) => {
    if (isAwaitingReview(idea) || isRejected(idea)) return false;
    const decided = toDate(idea.approved_at) || toDate(idea.updated_at) || toDate(idea.created_at);
    return decided != null && decided >= monthStart && decided <= reference;
  }).length;

  const roiSamples = rows
    .filter((idea) => !isRejected(idea) && !isAwaitingReview(idea))
    .map((idea) => (isRealizedIdea(idea) ? realizedRoi(idea) : estimatedRoi(idea)))
    .filter((roi) => roi != null);

  const trials = trialsInFlight(rows, { now: reference });

  return {
    approvedThisMonth,
    medianRoiPct: medianRoi(roiSamples),
    forecastSavings: rows.filter(isPipelineIdea).reduce((sum, idea) => sum + estimatedSaving(idea), 0),
    trialsRunning: trials.length,
    trialsOverdue: trials.filter((trial) => trial.overdue).length,
    pendingCount: rows.filter(isAwaitingReview).length,
  };
}

/* -----------------------------------------------------------
   Board assembly
   ----------------------------------------------------------- */

/**
 * Everything one role's board needs, in a single pass. Returning a
 * role-shaped object keeps the page component free of `if (role === …)`
 * chains wrapped around individual metric calls.
 */
export function buildKaizenMetrics(role, { ideas, user, now = new Date() } = {}) {
  const view = resolveKaizenRole(role);
  const rows = asArray(ideas);
  const reference = referenceDate(now);

  if (view === KAIZEN_ROLES.OPERATOR) {
    return {
      view,
      mine: myIdeas(rows, user),
      hallOfFame: hallOfFame(rows),
    };
  }

  if (view === KAIZEN_ROLES.SUPERVISOR) {
    return {
      view,
      strip: supervisorStrip(rows, { now: reference }),
      pending: pendingReview(rows),
      trials: trialsInFlight(rows, { now: reference }),
      standardise: readyToStandardise(rows),
    };
  }

  return {
    view: KAIZEN_ROLES.MANAGER,
    impact: impactSummary(rows, { now: reference }),
    byCategory: savingsByCategory(rows),
    funnel: implementationFunnel(rows),
    topIdeas: topSavingsIdeas(rows),
    trend: submissionTrend(rows, { now: reference }),
    cycleTime: cycleTimeDays(rows),
  };
}

/* -----------------------------------------------------------
   Submission helpers
   ----------------------------------------------------------- */

/** Working days in a year, net of Sundays and the usual holiday block. */
export const WORKING_DAYS_PER_YEAR = 300;

/**
 * Turn "this saves me 12 minutes a day" into an annual rupee figure.
 *
 * Operators think in minutes, the board thinks in rupees, and asking a
 * press operator to do that conversion in their head is how estimates
 * stop being submitted at all. Uses the same ₹300/hr shop labour rate
 * the machine workspace costs downtime at, so a Kaizen saving and a
 * downtime cost are quoted in the same currency of effort.
 */
export function minutesPerDayToAnnualRupees(minutesPerDay, {
  ratePerHour = LABOUR_RATE_PER_HOUR,
  workingDays = WORKING_DAYS_PER_YEAR,
} = {}) {
  const minutes = asNumber(minutesPerDay);
  if (minutes <= 0) return 0;
  return Math.round((minutes / 60) * asNumber(ratePerHour) * asNumber(workingDays));
}

/** Format a day count for a trial countdown chip. */
export function formatDaysLeft(daysLeft) {
  if (daysLeft == null) return 'No target date';
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'Due today';
  return `${daysLeft}d left`;
}

/** "Mar 4" / "Mar 4, 2025" once the year differs from today's. */
export function formatShortDate(value, now) {
  const date = toDate(value);
  if (!date) return '—';
  const reference = referenceDate(now);
  const sameYear = date.getFullYear() === reference.getFullYear();
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Next id in the KZN-<year>-NNN series, given what already exists. */
export function nextIdeaId(ideas, now) {
  const year = referenceDate(now).getFullYear();
  const prefix = `KZN-${year}-`;
  const highest = asArray(ideas).reduce((max, idea) => {
    const id = String(idea?.id || '');
    if (!id.startsWith(prefix)) return max;
    const suffix = Number(id.slice(prefix.length));
    return Number.isFinite(suffix) && suffix > max ? suffix : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}
