/**
 * SupervisorKaizen — "Review & approve".
 *
 * A supervisor's Kaizen job is three decisions, and the board is three
 * sections in the order those decisions arrive:
 *
 *   1. Should we try this?      pending review, richest idea first
 *   2. Is the trial on track?   trials in flight, soonest deadline first
 *   3. Should this become the   verified ideas waiting on a standard
 *      way we always work?
 *
 * The queue sorts by money at stake rather than by date, because a
 * date-sorted queue quietly buries the ₹90k idea under six ₹5k ones.
 *
 * Props:
 * - metrics ({ strip, pending, trials, standardise })
 * - onDecision (fn(id, status, { comment })) approve / need info / reject
 * - onCompleteTrial (fn(id)) move a trial to verification
 * - onStandardise  (fn(id)) write the idea into the PM standard
 * - loading (bool)
 */

import React, { useState } from 'react';
import {
  AlertTriangle, BadgeCheck, CheckCircle2, ClipboardCheck, FlaskConical,
  Inbox, MessageSquareWarning, ThumbsDown, TrendingUp, Wallet,
} from 'lucide-react';
import DashboardKpiCard from '../dashboard/DashboardKpiCard.jsx';
import DashboardChart from '../dashboard/DashboardChart.jsx';
import KaizenIdeaCard from './KaizenIdeaCard.jsx';
import KaizenPager from './KaizenPager.jsx';
import usePagedIdeas from './usePagedIdeas.js';
import {
  formatInrCompact,
  formatPct,
  formatDaysLeft,
  formatShortDate,
  realizedSaving,
  formatInr,
} from '../../utils/kaizenMetrics.js';

export default function SupervisorKaizen({
  metrics,
  onDecision,
  onCompleteTrial,
  onStandardise,
  loading = false,
}) {
  const strip = metrics?.strip || {};
  const pending = metrics?.pending || [];
  const trials = metrics?.trials || [];
  const standardise = metrics?.standardise || [];

  const pendingPage = usePagedIdeas(pending);
  const trialPage = usePagedIdeas(trials);

  // Which card has its comment box open. Rejecting without a reason is
  // how a suggestion scheme dies, so the comment box is part of the flow.
  const [commenting, setCommenting] = useState(null);
  const [comment, setComment] = useState('');

  const decide = (id, status) => {
    onDecision?.(id, status, { comment: comment.trim() });
    setCommenting(null);
    setComment('');
  };

  const openComment = (id, intent) => {
    setCommenting({ id, intent });
    setComment('');
  };

  return (
    <div className="rd-board kz-board kz-board-supervisor" data-testid="supervisor-kaizen" data-loading={loading ? 'true' : 'false'}>

      {/* ---------- Metrics strip ---------- */}
      <section className="rd-kpi-row" aria-label="Kaizen review KPIs">
        <DashboardKpiCard
          label="Waiting on you"
          icon={Inbox}
          tone={strip.pendingCount > 0 ? 'warning' : 'ok'}
          value={strip.pendingCount ?? 0}
          hint={strip.pendingCount ? 'Ideas that cannot move until you decide' : 'Queue is clear'}
          data-testid="kz-kpi-pending"
        />
        <DashboardKpiCard
          label="Approved this month"
          icon={BadgeCheck}
          value={strip.approvedThisMonth ?? 0}
          hint="Decisions you have already made"
          data-testid="kz-kpi-approved"
        />
        <DashboardKpiCard
          label="Median ROI"
          icon={TrendingUp}
          tone={strip.medianRoiPct == null ? '' : strip.medianRoiPct >= 100 ? 'ok' : 'warning'}
          value={formatPct(strip.medianRoiPct, 'Nothing costed yet')}
          hint="What a typical idea returns — the mean is skewed by cheap, high-return fixes"
          data-testid="kz-kpi-roi"
        />
        <DashboardKpiCard
          label="Forecast savings"
          icon={Wallet}
          value={formatInrCompact(strip.forecastSavings || 0)}
          hint={`${strip.trialsRunning ?? 0} trial${strip.trialsRunning === 1 ? '' : 's'} running${strip.trialsOverdue ? ` · ${strip.trialsOverdue} overdue` : ''}`}
          tone={strip.trialsOverdue ? 'warning' : ''}
          data-testid="kz-kpi-forecast"
        />
      </section>

      {/* ---------- 1. Pending review ---------- */}
      <DashboardChart
        title="Ideas pending review"
        subtitle="Biggest opportunity first"
        caption={pending.length ? `${pending.length} waiting` : 'Queue clear'}
      >
        {pending.length ? (
          <>
            <div className="kz-idea-list" data-testid="kaizen-pending-list">
              {pendingPage.slice.map(({ idea, roiPct, cost, estimate, needsInfo }) => (
                <KaizenIdeaCard
                  key={idea.id}
                  idea={idea}
                  meta={
                    <span className={`kz-chip ${roiPct != null && roiPct >= 100 ? 'ok' : ''}`}>
                      {roiPct == null ? 'No spend' : `ROI ${roiPct}%`}
                    </span>
                  }
                  footer={
                    <>
                      <div className="kz-decision-facts">
                        <span>Forecast <strong>{formatInr(estimate)}</strong></span>
                        <span>Cost <strong>{cost > 0 ? formatInr(cost) : 'nil'}</strong></span>
                        {needsInfo && <span className="warning">Awaiting the submitter&rsquo;s reply</span>}
                      </div>

                      {commenting?.id === idea.id ? (
                        <div className="kz-comment-box">
                          <label htmlFor={`kz-comment-${idea.id}`}>
                            {commenting.intent === 'rejected'
                              ? 'Why are you turning this down? The submitter sees this.'
                              : 'What do you need from the submitter?'}
                          </label>
                          <textarea
                            id={`kz-comment-${idea.id}`}
                            rows={2}
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            placeholder="One line is enough."
                          />
                          <div className="kz-comment-actions">
                            <button
                              type="button"
                              className="kz-btn kz-btn-primary"
                              disabled={!comment.trim()}
                              onClick={() => decide(idea.id, commenting.intent)}
                            >
                              Send &amp; {commenting.intent === 'rejected' ? 'reject' : 'request info'}
                            </button>
                            <button type="button" className="kz-btn kz-btn-ghost" onClick={() => setCommenting(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="kz-btn-row">
                          <button
                            type="button"
                            className="kz-btn kz-btn-primary"
                            onClick={() => onDecision?.(idea.id, 'approved')}
                            data-testid="kaizen-approve"
                          >
                            <CheckCircle2 size={14} aria-hidden="true" /> Approve for trial
                          </button>
                          <button type="button" className="kz-btn kz-btn-ghost" onClick={() => openComment(idea.id, 'need_information')}>
                            <MessageSquareWarning size={14} aria-hidden="true" /> Need info
                          </button>
                          <button type="button" className="kz-btn kz-btn-danger" onClick={() => openComment(idea.id, 'rejected')}>
                            <ThumbsDown size={14} aria-hidden="true" /> Reject
                          </button>
                        </div>
                      )}
                    </>
                  }
                />
              ))}
            </div>
            <KaizenPager {...pendingPage} noun="ideas" />
          </>
        ) : (
          <p className="rd-empty">
            <Inbox size={15} aria-hidden="true" /> Nothing waiting. Every submitted idea has an answer.
          </p>
        )}
      </DashboardChart>

      {/* ---------- 2. Trials in flight ---------- */}
      <DashboardChart
        title="Approved ideas in trial"
        subtitle="Soonest deadline first"
        caption={trials.length ? `${trials.length} running` : 'No trials running'}
      >
        {trials.length ? (
          <>
            <div className="rd-table-wrap">
              <table className="rd-table kz-table" data-testid="kaizen-trials-table">
                <thead>
                  <tr>
                    <th scope="col">Idea</th>
                    <th scope="col">Started</th>
                    <th scope="col">Target</th>
                    <th scope="col">Assigned to</th>
                    <th scope="col">Forecast</th>
                    <th scope="col">Countdown</th>
                    <th scope="col"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {trialPage.slice.map((trial) => (
                    <tr key={trial.idea.id} className={trial.overdue ? 'rd-row-danger' : ''}>
                      <th scope="row">
                        {trial.idea.title}
                        <small className="kz-cell-sub">{trial.idea.id}</small>
                      </th>
                      <td data-label="Started">{formatShortDate(trial.startedAt)}</td>
                      <td data-label="Target">{formatShortDate(trial.dueDate)}</td>
                      <td data-label="Assigned to">{trial.assignedTo}</td>
                      <td data-label="Forecast" className="rd-num">{formatInrCompact(trial.forecast)}</td>
                      <td data-label="Countdown">
                        <span className={`kz-countdown ${trial.overdue ? 'danger' : ''}`}>
                          {trial.overdue && <AlertTriangle size={12} aria-hidden="true" />}
                          {formatDaysLeft(trial.daysLeft)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="kz-btn kz-btn-sm kz-btn-primary"
                          onClick={() => onCompleteTrial?.(trial.idea.id)}
                          data-testid="kaizen-complete-trial"
                        >
                          Mark complete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <KaizenPager {...trialPage} noun="trials" />
          </>
        ) : (
          <p className="rd-empty">
            <FlaskConical size={15} aria-hidden="true" /> No trial running. Approve an idea above to start one.
          </p>
        )}
      </DashboardChart>

      {/* ---------- 3. Ready to standardise ---------- */}
      <DashboardChart
        title="Implementation decisions"
        subtitle="Proven — make it the standard"
        caption={standardise.length ? `${standardise.length} ready` : undefined}
      >
        {standardise.length ? (
          <div className="kz-idea-list" data-testid="kaizen-standardise-list">
            {standardise.map((idea) => (
              <KaizenIdeaCard
                key={idea.id}
                idea={idea}
                defaultOpen
                meta={<span className="kz-chip ok">Verified {formatInrCompact(realizedSaving(idea) ?? 0)}</span>}
                footer={
                  <div className="kz-btn-row">
                    <button
                      type="button"
                      className="kz-btn kz-btn-primary"
                      onClick={() => onStandardise?.(idea.id)}
                      data-testid="kaizen-standardise"
                    >
                      <ClipboardCheck size={14} aria-hidden="true" /> Standardise — add to PM checklist
                    </button>
                    <span className="kz-btn-note">
                      Writes the change into the preventive-maintenance standard so it survives the next shift change.
                    </span>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <p className="rd-empty">
            <BadgeCheck size={15} aria-hidden="true" /> Nothing verified is waiting. Completed trials land here.
          </p>
        )}
      </DashboardChart>
    </div>
  );
}
