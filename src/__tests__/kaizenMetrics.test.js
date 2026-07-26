import { describe, it, expect } from 'vitest';
import {
  KAIZEN_ROLES,
  DEFAULT_KAIZEN_ROLE,
  FUNNEL_STAGES,
  resolveKaizenRole,
  statusMeta,
  categoryLabel,
  wasteLabel,
  realizedSaving,
  estimatedSaving,
  ideaCost,
  ideaStage,
  isRejected,
  isRealizedIdea,
  isPipelineIdea,
  isAwaitingReview,
  isSubmittedBy,
  computeRoi,
  estimatedRoi,
  realizedRoi,
  performanceBand,
  impactSummary,
  savingsByCategory,
  implementationFunnel,
  topSavingsIdeas,
  submissionTrend,
  cycleTimeDays,
  myIdeas,
  hallOfFame,
  pendingReview,
  trialsInFlight,
  readyToStandardise,
  supervisorStrip,
  medianRoi,
  buildKaizenMetrics,
  minutesPerDayToAnnualRupees,
  formatDaysLeft,
  formatShortDate,
  nextIdeaId,
  WORKING_DAYS_PER_YEAR,
  LABOUR_RATE_PER_HOUR,
} from '../utils/kaizenMetrics.js';
import { DEMO_KAIZENS, shouldUseDemoKaizen } from '../utils/demoKaizen.js';

const NOW = new Date('2026-07-26T10:00:00Z');
const days = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const ahead = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

/** Minimal idea factory — every test overrides only what it cares about. */
function idea(overrides = {}) {
  return {
    id: 'KZN-2026-100',
    title: 'Test idea',
    category: 'productivity',
    waste_category: 'motion',
    status: 'submitted',
    estimated_cost: 1000,
    estimated_saving: 10000,
    created_by_name: 'Anil Kumar',
    created_at: days(10),
    ...overrides,
  };
}

describe('role resolution', () => {
  it('maps shop-floor roles to the operator board', () => {
    ['operator', 'technician', 'maintenance_technician', 'contractor'].forEach((role) => {
      expect(resolveKaizenRole(role)).toBe(KAIZEN_ROLES.OPERATOR);
    });
  });

  it('maps decision-making roles to the supervisor board', () => {
    ['supervisor', 'maintenance_supervisor', 'engineer', 'reliability_engineer'].forEach((role) => {
      expect(resolveKaizenRole(role)).toBe(KAIZEN_ROLES.SUPERVISOR);
    });
  });

  it('maps leadership roles to the manager board', () => {
    ['owner', 'plant_manager', 'maintenance_head', 'admin'].forEach((role) => {
      expect(resolveKaizenRole(role)).toBe(KAIZEN_ROLES.MANAGER);
    });
  });

  it('is case and whitespace insensitive', () => {
    expect(resolveKaizenRole('  SuperVisor ')).toBe(KAIZEN_ROLES.SUPERVISOR);
  });

  it('falls back to the manager board for unknown, empty and nullish roles', () => {
    expect(resolveKaizenRole('galactic_overlord')).toBe(DEFAULT_KAIZEN_ROLE);
    expect(resolveKaizenRole('')).toBe(KAIZEN_ROLES.MANAGER);
    expect(resolveKaizenRole(null)).toBe(KAIZEN_ROLES.MANAGER);
    expect(resolveKaizenRole(undefined)).toBe(KAIZEN_ROLES.MANAGER);
  });
});

describe('vocabulary', () => {
  it('groups the nine statuses into five funnel stages', () => {
    expect(statusMeta('submitted').stage).toBe('submitted');
    expect(statusMeta('need_information').stage).toBe('submitted');
    expect(statusMeta('approved').stage).toBe('approved');
    expect(statusMeta('planned').stage).toBe('approved');
    expect(statusMeta('in_progress').stage).toBe('trial');
    expect(statusMeta('implemented').stage).toBe('trial');
    expect(statusMeta('verified').stage).toBe('verified');
    expect(statusMeta('standardisation_pending').stage).toBe('verified');
    expect(statusMeta('closed').stage).toBe('standardised');
  });

  it('degrades an unknown status to a readable label instead of throwing', () => {
    expect(statusMeta('some_new_status').label).toBe('some new status');
    expect(statusMeta(undefined).label).toBe('Unknown');
  });

  it('labels categories and wastes, falling back to the raw value', () => {
    expect(categoryLabel('energy_saving')).toBe('Energy Saving');
    expect(categoryLabel('mystery_type')).toBe('mystery type');
    expect(wasteLabel('motion')).toBe('Motion');
    expect(wasteLabel(null)).toBe('—');
  });
});

describe('field readers', () => {
  it('prefers realized_savings but still reads the legacy actual_saving column', () => {
    expect(realizedSaving({ realized_savings: 5000, actual_saving: 1 })).toBe(5000);
    expect(realizedSaving({ actual_saving: 2400 })).toBe(2400);
  });

  it('distinguishes a measured zero from a missing measurement', () => {
    expect(realizedSaving({ realized_savings: 0 })).toBe(0);
    expect(realizedSaving({})).toBeNull();
    expect(realizedSaving({ realized_savings: null })).toBeNull();
    expect(realizedSaving({ realized_savings: 'not a number' })).toBeNull();
  });

  it('reads estimates and costs defensively', () => {
    expect(estimatedSaving({ estimated_saving: '4200' })).toBe(4200);
    expect(estimatedSaving({})).toBe(0);
    expect(ideaCost({ estimated_cost: 900 })).toBe(900);
    expect(ideaCost(null)).toBe(0);
  });

  it('classifies each idea into exactly one lifecycle bucket', () => {
    expect(isAwaitingReview(idea({ status: 'submitted' }))).toBe(true);
    expect(isPipelineIdea(idea({ status: 'in_progress' }))).toBe(true);
    expect(isPipelineIdea(idea({ status: 'approved' }))).toBe(true);
    expect(isRealizedIdea(idea({ status: 'verified' }))).toBe(true);
    expect(isRealizedIdea(idea({ status: 'closed' }))).toBe(true);
    expect(isRejected(idea({ status: 'rejected' }))).toBe(true);
    expect(isRealizedIdea(idea({ status: 'in_progress' }))).toBe(false);
    expect(ideaStage(idea({ status: 'closed' }))).toBe('standardised');
  });
});

describe('isSubmittedBy', () => {
  it('matches on id, email and name', () => {
    expect(isSubmittedBy({ created_by: 'u-1' }, { user_id: 'u-1' })).toBe(true);
    expect(isSubmittedBy({ created_by_email: 'a@b.c' }, { email: 'a@b.c' })).toBe(true);
    expect(isSubmittedBy({ created_by_name: 'Anil Kumar' }, { name: ' anil kumar ' })).toBe(true);
  });

  it('does not match a different person, or on missing data', () => {
    expect(isSubmittedBy({ created_by_name: 'Anil Kumar' }, { name: 'Ramesh Sawant' })).toBe(false);
    expect(isSubmittedBy({ created_by_name: 'Anil' }, null)).toBe(false);
    expect(isSubmittedBy(null, { name: 'Anil' })).toBe(false);
    expect(isSubmittedBy({}, { name: '' })).toBe(false);
  });
});

describe('computeRoi', () => {
  it('returns the percentage return over spend', () => {
    expect(computeRoi(10000, 1000)).toBe(900);
    expect(computeRoi(2000, 1000)).toBe(100);
    expect(computeRoi(1000, 1000)).toBe(0);
  });

  it('goes negative when an idea loses money', () => {
    expect(computeRoi(400, 1000)).toBe(-60);
  });

  it('returns null rather than Infinity when nothing was spent', () => {
    expect(computeRoi(50000, 0)).toBeNull();
    expect(computeRoi(50000, null)).toBeNull();
    expect(computeRoi(50000, -5)).toBeNull();
  });

  it('drives estimatedRoi and realizedRoi off the right columns', () => {
    const row = idea({ estimated_saving: 6000, estimated_cost: 2000, realized_savings: 10000, status: 'verified' });
    expect(estimatedRoi(row)).toBe(200);
    expect(realizedRoi(row)).toBe(400);
    expect(realizedRoi(idea())).toBeNull();
  });
});

describe('performanceBand', () => {
  it('bands a verified idea against its own forecast', () => {
    const base = { status: 'verified', estimated_saving: 10000 };
    expect(performanceBand({ ...base, realized_savings: 12000 })).toBe('over');
    expect(performanceBand({ ...base, realized_savings: 10000 })).toBe('over');
    expect(performanceBand({ ...base, realized_savings: 8500 })).toBe('on');
    expect(performanceBand({ ...base, realized_savings: 5000 })).toBe('under');
  });

  it('has no opinion until the idea is verified and measured', () => {
    expect(performanceBand(idea({ status: 'in_progress', realized_savings: 9000 }))).toBeNull();
    expect(performanceBand(idea({ status: 'verified' }))).toBeNull();
  });

  it('treats an unforecast idea that returned money as a win', () => {
    expect(performanceBand({ status: 'closed', estimated_saving: 0, realized_savings: 3000 })).toBe('over');
    expect(performanceBand({ status: 'closed', estimated_saving: 0, realized_savings: 0 })).toBe('on');
  });
});

describe('impactSummary', () => {
  const rows = [
    idea({ id: 'a', status: 'closed', estimated_cost: 1000, realized_savings: 24000, verified_at: days(5) }),
    idea({ id: 'b', status: 'verified', estimated_cost: 800, realized_savings: 85000, verified_at: days(3) }),
    idea({ id: 'c', status: 'in_progress', estimated_cost: 3200, estimated_saving: 96000 }),
    idea({ id: 'd', status: 'approved', estimated_cost: 600, estimated_saving: 45000 }),
    idea({ id: 'e', status: 'submitted', estimated_cost: 500, estimated_saving: 20000 }),
    idea({ id: 'f', status: 'rejected', estimated_cost: 340000, estimated_saving: 30000 }),
  ];

  it('counts only verified-and-beyond ideas as realized', () => {
    const summary = impactSummary(rows, { now: NOW });
    expect(summary.realized).toBe(109000);
    expect(summary.realizedCount).toBe(2);
  });

  it('keeps the pipeline forecast separate from realized money', () => {
    const summary = impactSummary(rows, { now: NOW });
    expect(summary.forecast).toBe(141000);
    expect(summary.forecastCount).toBe(2);
  });

  it('excludes rejected ideas from spend, savings and counts', () => {
    const summary = impactSummary(rows, { now: NOW });
    expect(summary.spend).toBe(1800);
    expect(summary.netBenefit).toBe(107200);
  });

  it('ignores ideas still awaiting review when computing spend', () => {
    const summary = impactSummary(rows, { now: NOW });
    expect(summary.implemented).toBe(2);
    expect(summary.standardised).toBe(1);
  });

  it('reports ROI as null — not zero — when nothing has been verified', () => {
    const summary = impactSummary([idea({ status: 'submitted' })], { now: NOW });
    expect(summary.realizedCount).toBe(0);
    expect(summary.roiPct).toBeNull();
    expect(summary.netBenefit).toBeNull();
  });

  it('scopes ROI this year to the current calendar year', () => {
    const lastYear = idea({
      id: 'old', status: 'closed', estimated_cost: 1000, realized_savings: 500000,
      created_at: '2025-02-01T00:00:00Z', verified_at: '2025-03-01T00:00:00Z',
    });
    const all = impactSummary([...rows, lastYear], { now: NOW });
    expect(all.realized).toBe(609000);
    // Last year's ₹5L is excluded from the this-year figure.
    expect(all.roiThisYearPct).toBe(computeRoi(109000, 1800));
  });

  it('survives an empty, null or garbage input', () => {
    expect(impactSummary([], { now: NOW }).realized).toBe(0);
    expect(impactSummary(null, { now: NOW }).total).toBe(0);
    expect(impactSummary([null, undefined], { now: NOW }).total).toBe(0);
  });
});

describe('savingsByCategory', () => {
  const rows = [
    idea({ id: 'a', category: 'energy_saving', status: 'closed', realized_savings: 30000 }),
    idea({ id: 'b', category: 'energy_saving', status: 'in_progress', estimated_saving: 20000 }),
    idea({ id: 'c', category: 'safety', status: 'approved', estimated_saving: 45000 }),
    idea({ id: 'd', category: 'safety', status: 'rejected', estimated_saving: 999999 }),
  ];

  it('splits realized from forecast within each category', () => {
    const [energy] = savingsByCategory(rows).filter((row) => row.category === 'energy_saving');
    expect(energy.realized).toBe(30000);
    expect(energy.forecast).toBe(20000);
    expect(energy.total).toBe(50000);
    expect(energy.label).toBe('Energy Saving');
  });

  it('sorts categories by total value, biggest first', () => {
    const order = savingsByCategory(rows).map((row) => row.category);
    expect(order).toEqual(['energy_saving', 'safety']);
  });

  it('drops rejected ideas from the bar and from the drill-down list', () => {
    const [, safety] = savingsByCategory(rows);
    expect(safety.total).toBe(45000);
    expect(safety.ideas.map((row) => row.id)).toEqual(['c']);
  });

  it('buckets an uncategorised idea rather than dropping it', () => {
    const result = savingsByCategory([idea({ category: null, status: 'approved', estimated_saving: 100 })]);
    expect(result[0].category).toBe('uncategorised');
  });

  it('excludes ideas still awaiting review, so nobody can inflate a bar with an estimate', () => {
    const result = savingsByCategory([
      idea({ id: 'optimistic', category: 'cost_reduction', status: 'submitted', estimated_saving: 990000 }),
    ]);
    expect(result).toEqual([]);
  });

  it('never emits a zero-value category row', () => {
    const result = savingsByCategory([
      idea({ id: 'real', category: 'safety', status: 'closed', realized_savings: 4000 }),
      idea({ id: 'pending', category: 'quality', status: 'submitted', estimated_saving: 50000 }),
      idea({ id: 'nil', category: 'ergonomics', status: 'approved', estimated_saving: 0 }),
    ]);
    expect(result.map((row) => row.category)).toEqual(['safety']);
    result.forEach((row) => expect(row.total).toBeGreaterThan(0));
  });

  it('lists in the drill-down only the ideas that make up the bar', () => {
    const [bucket] = savingsByCategory([
      idea({ id: 'counted', category: 'safety', status: 'approved', estimated_saving: 45000 }),
      idea({ id: 'not-counted', category: 'safety', status: 'submitted', estimated_saving: 88000 }),
    ]);
    expect(bucket.ideas.map((row) => row.id)).toEqual(['counted']);
    expect(bucket.ideas.reduce((sum, row) => sum + row.saving, 0)).toBe(bucket.total);
  });

  it('returns an empty list for no input', () => {
    expect(savingsByCategory([])).toEqual([]);
    expect(savingsByCategory(undefined)).toEqual([]);
  });
});

describe('implementationFunnel', () => {
  const stack = (status, count) => Array.from({ length: count }, (_, i) => idea({ id: `${status}-${i}`, status }));

  it('counts every non-rejected idea into exactly one stage', () => {
    const rows = [...stack('submitted', 5), ...stack('approved', 2), ...stack('in_progress', 1), ...stack('closed', 2)];
    const funnel = implementationFunnel(rows);
    expect(funnel.total).toBe(10);
    expect(funnel.stages.map((stage) => stage.count)).toEqual([5, 2, 1, 0, 2]);
    expect(funnel.stages.map((stage) => stage.key)).toEqual(FUNNEL_STAGES.map((stage) => stage.key));
  });

  it('reports rejected ideas separately from the funnel total', () => {
    const funnel = implementationFunnel([...stack('submitted', 2), ...stack('rejected', 3)]);
    expect(funnel.total).toBe(2);
    expect(funnel.rejected).toBe(3);
  });

  it('flags the stage holding a disproportionate share of work in flight', () => {
    const funnel = implementationFunnel([...stack('submitted', 8), ...stack('approved', 1), ...stack('closed', 1)]);
    expect(funnel.bottleneck?.key).toBe('submitted');
    expect(funnel.bottleneck?.count).toBe(8);
  });

  it('does not cry bottleneck over a small sample', () => {
    const funnel = implementationFunnel([...stack('submitted', 2), ...stack('approved', 1)]);
    expect(funnel.bottleneck).toBeNull();
  });

  it('never flags a completed stage as a bottleneck', () => {
    const funnel = implementationFunnel(stack('closed', 20));
    expect(funnel.bottleneck).toBeNull();
  });

  it('handles an empty programme', () => {
    const funnel = implementationFunnel([]);
    expect(funnel.total).toBe(0);
    expect(funnel.bottleneck).toBeNull();
    expect(funnel.stages).toHaveLength(5);
  });
});

describe('topSavingsIdeas', () => {
  const rows = [
    idea({ id: 'realized-small', status: 'closed', realized_savings: 20000 }),
    idea({ id: 'forecast-huge', status: 'approved', estimated_saving: 900000 }),
    idea({ id: 'realized-big', status: 'verified', realized_savings: 90000 }),
    idea({ id: 'rejected', status: 'rejected', estimated_saving: 5000000 }),
  ];

  it('ranks proven money above forecast money of any size', () => {
    const order = topSavingsIdeas(rows).map((row) => row.id);
    expect(order).toEqual(['realized-big', 'realized-small', 'forecast-huge']);
  });

  it('omits rejected ideas entirely', () => {
    expect(topSavingsIdeas(rows).map((row) => row.id)).not.toContain('rejected');
  });

  it('attaches the performance band and the right ROI basis', () => {
    const [top] = topSavingsIdeas([
      idea({ status: 'verified', estimated_cost: 1000, estimated_saving: 10000, realized_savings: 30000 }),
    ]);
    expect(top.band).toBe('over');
    expect(top.roiPct).toBe(2900);
  });

  it('honours the limit', () => {
    const many = Array.from({ length: 25 }, (_, i) => idea({ id: `i-${i}`, status: 'approved', estimated_saving: i }));
    expect(topSavingsIdeas(many)).toHaveLength(10);
    expect(topSavingsIdeas(many, { limit: 3 })).toHaveLength(3);
  });
});

describe('submissionTrend', () => {
  it('returns one bucket per month, oldest first', () => {
    const trend = submissionTrend([], { months: 6, now: NOW });
    expect(trend).toHaveLength(6);
    expect(trend[5].key).toBe('2026-07');
    expect(trend[0].key).toBe('2026-02');
  });

  it('counts submissions into the month they were created', () => {
    const trend = submissionTrend([
      idea({ created_at: '2026-07-02T00:00:00Z' }),
      idea({ created_at: '2026-07-20T00:00:00Z' }),
      idea({ created_at: '2026-05-11T00:00:00Z' }),
    ], { months: 6, now: NOW });
    expect(trend.find((month) => month.key === '2026-07').count).toBe(2);
    expect(trend.find((month) => month.key === '2026-05').count).toBe(1);
  });

  it('averages savings only over the verified ideas in that month', () => {
    const trend = submissionTrend([
      idea({ created_at: '2026-06-05T00:00:00Z', status: 'closed', realized_savings: 40000 }),
      idea({ created_at: '2026-06-08T00:00:00Z', status: 'closed', realized_savings: 20000 }),
      idea({ created_at: '2026-06-09T00:00:00Z', status: 'submitted', estimated_saving: 999999 }),
    ], { months: 6, now: NOW });
    const june = trend.find((month) => month.key === '2026-06');
    expect(june.count).toBe(3);
    expect(june.avgSaving).toBe(30000);
  });

  it('reports a month with no verified idea as null, not zero', () => {
    const trend = submissionTrend([idea({ created_at: '2026-07-01T00:00:00Z' })], { months: 6, now: NOW });
    expect(trend.find((month) => month.key === '2026-07').avgSaving).toBeNull();
  });

  it('ignores ideas outside the window and undated rows', () => {
    const trend = submissionTrend([
      idea({ created_at: '2019-01-01T00:00:00Z' }),
      idea({ created_at: null }),
    ], { months: 6, now: NOW });
    expect(trend.reduce((sum, month) => sum + month.count, 0)).toBe(0);
  });
});

describe('cycleTimeDays', () => {
  it('averages only ideas that reached standardisation', () => {
    const result = cycleTimeDays([
      idea({ status: 'closed', created_at: days(30), verified_at: days(20) }),
      idea({ status: 'closed', created_at: days(30), verified_at: days(10) }),
      idea({ status: 'verified', created_at: days(90), verified_at: days(1) }),
    ]);
    expect(result.sampleSize).toBe(2);
    expect(result.avgDays).toBe(15);
    expect(result.fastestDays).toBe(10);
    expect(result.slowestDays).toBe(20);
  });

  it('returns null when no idea has completed the cycle', () => {
    const result = cycleTimeDays([idea({ status: 'in_progress' })]);
    expect(result.avgDays).toBeNull();
    expect(result.sampleSize).toBe(0);
  });

  it('discards rows with impossible or missing dates', () => {
    const result = cycleTimeDays([
      idea({ status: 'closed', created_at: days(5), verified_at: days(40) }),
      idea({ status: 'closed', created_at: days(5), verified_at: null }),
    ]);
    expect(result.sampleSize).toBe(0);
  });
});

describe('operator roll-ups', () => {
  const mineRows = [
    idea({ id: 'm1', created_by_name: 'Anil Kumar', created_at: days(2), status: 'submitted' }),
    idea({ id: 'm2', created_by_name: 'Anil Kumar', created_at: days(9), status: 'in_progress' }),
    idea({ id: 'm3', created_by_name: 'Anil Kumar', created_at: days(20), status: 'closed', realized_savings: 24000 }),
    idea({ id: 'other', created_by_name: 'Ramesh Sawant', status: 'closed', realized_savings: 99000 }),
  ];

  it('returns only my ideas, newest first', () => {
    const mine = myIdeas(mineRows, { name: 'Anil Kumar' });
    expect(mine.ideas.map((row) => row.id)).toEqual(['m1', 'm2', 'm3']);
    expect(mine.total).toBe(3);
  });

  it('tallies my personal impact without borrowing anyone else\'s', () => {
    const mine = myIdeas(mineRows, { name: 'Anil Kumar' });
    expect(mine.awaitingReview).toBe(1);
    expect(mine.inTrial).toBe(1);
    expect(mine.implemented).toBe(1);
    expect(mine.realizedTotal).toBe(24000);
  });

  it('returns an empty tally for a user with no ideas', () => {
    expect(myIdeas(mineRows, { name: 'Nobody' }).total).toBe(0);
    expect(myIdeas(mineRows, null).total).toBe(0);
  });

  it('ranks the hall of fame by money actually returned', () => {
    const fame = hallOfFame(mineRows);
    expect(fame.map((row) => row.id)).toEqual(['other', 'm3']);
  });

  it('excludes unverified and zero-saving ideas from the hall of fame', () => {
    const fame = hallOfFame([
      idea({ id: 'trial', status: 'in_progress', estimated_saving: 500000 }),
      idea({ id: 'zero', status: 'closed', realized_savings: 0 }),
    ]);
    expect(fame).toEqual([]);
  });

  it('breaks ties in favour of the idea with before/after photos', () => {
    const fame = hallOfFame([
      idea({ id: 'no-photos', status: 'closed', realized_savings: 5000 }),
      idea({ id: 'photos', status: 'closed', realized_savings: 5000, before_photo_url: 'b', after_photo_url: 'a' }),
    ]);
    expect(fame[0].id).toBe('photos');
  });

  it('caps the hall of fame at five', () => {
    const many = Array.from({ length: 9 }, (_, i) => idea({ id: `f-${i}`, status: 'closed', realized_savings: 1000 + i }));
    expect(hallOfFame(many)).toHaveLength(5);
  });
});

describe('supervisor roll-ups', () => {
  const rows = [
    idea({ id: 'p-small', status: 'submitted', estimated_saving: 5000, estimated_cost: 100 }),
    idea({ id: 'p-big', status: 'submitted', estimated_saving: 90000, estimated_cost: 22000 }),
    idea({ id: 'p-info', status: 'need_information', estimated_saving: 12000, estimated_cost: 0 }),
    idea({ id: 't-soon', status: 'in_progress', due_date: ahead(2), estimated_saving: 96000 }),
    idea({ id: 't-late', status: 'implemented', due_date: days(3), estimated_saving: 36000 }),
    idea({ id: 'v-1', status: 'verified', realized_savings: 85000 }),
    idea({ id: 'v-2', status: 'standardisation_pending', realized_savings: 148000 }),
  ];

  it('sorts the review queue by money at stake, not by date', () => {
    const queue = pendingReview(rows);
    expect(queue.map((row) => row.idea.id)).toEqual(['p-big', 'p-info', 'p-small']);
  });

  it('flags an idea that is waiting on the submitter', () => {
    expect(pendingReview(rows).find((row) => row.idea.id === 'p-info').needsInfo).toBe(true);
  });

  it('reports no ROI rather than infinite ROI for a free idea', () => {
    expect(pendingReview(rows).find((row) => row.idea.id === 'p-info').roiPct).toBeNull();
  });

  it('orders trials by deadline and marks the overdue ones', () => {
    const trials = trialsInFlight(rows, { now: NOW });
    expect(trials.map((row) => row.idea.id)).toEqual(['t-late', 't-soon']);
    expect(trials[0].overdue).toBe(true);
    expect(trials[0].daysLeft).toBe(-3);
    expect(trials[1].overdue).toBe(false);
  });

  it('marks an implemented trial as ready to verify', () => {
    const trials = trialsInFlight(rows, { now: NOW });
    expect(trials.find((row) => row.idea.id === 't-late').readyToVerify).toBe(true);
    expect(trials.find((row) => row.idea.id === 't-soon').readyToVerify).toBe(false);
  });

  it('sorts trials with no target date to the end', () => {
    const trials = trialsInFlight([
      idea({ id: 'no-date', status: 'in_progress', due_date: null }),
      idea({ id: 'dated', status: 'in_progress', due_date: ahead(9) }),
    ], { now: NOW });
    expect(trials.map((row) => row.idea.id)).toEqual(['dated', 'no-date']);
    expect(trials[1].daysLeft).toBeNull();
  });

  it('lists verified ideas awaiting a standard, richest first', () => {
    expect(readyToStandardise(rows).map((row) => row.id)).toEqual(['v-2', 'v-1']);
  });

  it('summarises the review workload in the metrics strip', () => {
    const strip = supervisorStrip(rows, { now: NOW });
    expect(strip.pendingCount).toBe(3);
    expect(strip.trialsRunning).toBe(2);
    expect(strip.trialsOverdue).toBe(1);
    expect(strip.forecastSavings).toBe(132000);
  });

  it('takes the median ROI only over ideas past review', () => {
    const strip = supervisorStrip([
      idea({ id: 'a', status: 'verified', estimated_cost: 1000, realized_savings: 3000 }),
      idea({ id: 'b', status: 'approved', estimated_cost: 1000, estimated_saving: 2000 }),
      idea({ id: 'c', status: 'submitted', estimated_cost: 1, estimated_saving: 1000000 }),
    ], { now: NOW });
    // 200% and 100%, with the un-reviewed idea excluded.
    expect(strip.medianRoiPct).toBe(150);
  });

  it('is not dragged into the thousands by one cheap, high-return idea', () => {
    const strip = supervisorStrip([
      idea({ id: 'typical-1', status: 'approved', estimated_cost: 1000, estimated_saving: 2000 }),
      idea({ id: 'typical-2', status: 'approved', estimated_cost: 1000, estimated_saving: 2500 }),
      idea({ id: 'outlier', status: 'verified', estimated_cost: 800, realized_savings: 85000 }),
    ], { now: NOW });
    // The outlier alone is 10525%; the median stays where the programme is.
    expect(strip.medianRoiPct).toBe(150);
  });

  it('reports no median ROI when nothing has been costed', () => {
    expect(supervisorStrip([idea({ status: 'submitted' })], { now: NOW }).medianRoiPct).toBeNull();
  });
});

describe('medianRoi', () => {
  it('takes the middle value of an odd-sized set', () => {
    expect(medianRoi([100, 900, 200])).toBe(200);
  });

  it('averages the two middle values of an even-sized set', () => {
    expect(medianRoi([100, 200, 300, 500])).toBe(250);
  });

  it('ignores nulls and non-numeric entries', () => {
    expect(medianRoi([null, 100, undefined, 300, 'x'])).toBe(200);
  });

  it('returns null for an empty or fully unusable set', () => {
    expect(medianRoi([])).toBeNull();
    expect(medianRoi([null, null])).toBeNull();
    expect(medianRoi(undefined)).toBeNull();
  });

  it('handles negative returns', () => {
    expect(medianRoi([-50, -10, 30])).toBe(-10);
  });
});

describe('buildKaizenMetrics', () => {
  it('returns only the operator board shape for an operator', () => {
    const metrics = buildKaizenMetrics('operator', { ideas: DEMO_KAIZENS, user: { name: 'Anil Kumar' }, now: NOW });
    expect(metrics.view).toBe(KAIZEN_ROLES.OPERATOR);
    expect(metrics.mine.total).toBeGreaterThan(0);
    expect(Array.isArray(metrics.hallOfFame)).toBe(true);
    expect(metrics.impact).toBeUndefined();
  });

  it('returns only the supervisor board shape for a supervisor', () => {
    const metrics = buildKaizenMetrics('supervisor', { ideas: DEMO_KAIZENS, now: NOW });
    expect(metrics.view).toBe(KAIZEN_ROLES.SUPERVISOR);
    expect(metrics.pending.length).toBeGreaterThan(0);
    expect(metrics.strip).toBeDefined();
    expect(metrics.mine).toBeUndefined();
  });

  it('returns the manager board shape for leadership and for unknown roles', () => {
    ['plant_manager', 'who_knows', undefined].forEach((role) => {
      const metrics = buildKaizenMetrics(role, { ideas: DEMO_KAIZENS, now: NOW });
      expect(metrics.view).toBe(KAIZEN_ROLES.MANAGER);
      expect(metrics.impact).toBeDefined();
      expect(metrics.funnel.stages).toHaveLength(5);
      expect(metrics.topIdeas.length).toBeGreaterThan(0);
    });
  });

  it('never throws on missing input', () => {
    expect(() => buildKaizenMetrics('operator')).not.toThrow();
    expect(() => buildKaizenMetrics('manager', { ideas: null })).not.toThrow();
    expect(buildKaizenMetrics('manager', { ideas: [] }).impact.total).toBe(0);
  });
});

describe('submission helpers', () => {
  it('converts minutes saved per day into annual rupees at the shop labour rate', () => {
    expect(minutesPerDayToAnnualRupees(60)).toBe(LABOUR_RATE_PER_HOUR * WORKING_DAYS_PER_YEAR);
    expect(minutesPerDayToAnnualRupees(12)).toBe(18000);
  });

  it('treats zero, negative and non-numeric input as no saving', () => {
    expect(minutesPerDayToAnnualRupees(0)).toBe(0);
    expect(minutesPerDayToAnnualRupees(-30)).toBe(0);
    expect(minutesPerDayToAnnualRupees('abc')).toBe(0);
  });

  it('accepts a different rate or working year', () => {
    expect(minutesPerDayToAnnualRupees(60, { ratePerHour: 100, workingDays: 10 })).toBe(1000);
  });

  it('formats a trial countdown in the supervisor\'s language', () => {
    expect(formatDaysLeft(5)).toBe('5d left');
    expect(formatDaysLeft(0)).toBe('Due today');
    expect(formatDaysLeft(-3)).toBe('3d overdue');
    expect(formatDaysLeft(null)).toBe('No target date');
  });

  it('formats dates and degrades on bad input', () => {
    expect(formatShortDate('2026-07-04T00:00:00Z', NOW)).toContain('Jul');
    expect(formatShortDate(null)).toBe('—');
    expect(formatShortDate('not a date')).toBe('—');
  });

  it('allocates the next id in the year series', () => {
    expect(nextIdeaId([{ id: 'KZN-2026-003' }, { id: 'KZN-2026-011' }], NOW)).toBe('KZN-2026-012');
    expect(nextIdeaId([], NOW)).toBe('KZN-2026-001');
    expect(nextIdeaId([{ id: 'TKT-9' }], NOW)).toBe('KZN-2026-001');
  });
});

describe('demo dataset', () => {
  it('falls back only when the workspace returns nothing', () => {
    expect(shouldUseDemoKaizen([])).toBe(true);
    expect(shouldUseDemoKaizen(null)).toBe(true);
    expect(shouldUseDemoKaizen([idea()])).toBe(false);
  });

  it('populates every stage so all three boards have something to show', () => {
    const funnel = implementationFunnel(DEMO_KAIZENS);
    funnel.stages.forEach((stage) => expect(stage.count).toBeGreaterThan(0));
    expect(funnel.rejected).toBeGreaterThan(0);
  });

  it('carries a realized figure on every verified idea', () => {
    DEMO_KAIZENS.filter(isRealizedIdea).forEach((row) => {
      expect(realizedSaving(row)).not.toBeNull();
    });
  });

  it('includes an idea that beat its forecast and one that missed it', () => {
    const bands = DEMO_KAIZENS.map(performanceBand).filter(Boolean);
    expect(bands).toContain('over');
    expect(bands).toContain('under');
  });

  it('uses only known statuses and categories', () => {
    DEMO_KAIZENS.forEach((row) => {
      expect(statusMeta(row.status).value).toBe(row.status);
      expect(categoryLabel(row.category)).not.toContain('_');
    });
  });
});
