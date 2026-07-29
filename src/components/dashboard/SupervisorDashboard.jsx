/**
 * SupervisorDashboard — is the team keeping up?
 *
 * Breaches lead the page when there are any: a supervisor's first job is
 * to unblock, and a breach buried under four charts is a breach nobody
 * acted on. Everything else is team shape — who is loaded, who is idle,
 * and whether response times are drifting.
 *
 * Props:
 * - metrics ({ team, workload, responseTrend, breaches, weekly })
 * - loading (bool)
 * - isDemoData (bool) shows the "sample data" banner
 */

import React from 'react';
import {
  AlertOctagon, Users, Activity, CheckCircle2, ArrowUpRight,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart, { HorizontalBars, Sparkline } from './DashboardChart.jsx';
import { formatHours, formatPct } from '../../utils/dashboardMetrics.js';

const TREND_COPY = {
  improving: { label: 'Improving', tone: 'ok' },
  stable: { label: 'Stable', tone: '' },
  degrading: { label: 'Degrading', tone: 'danger' },
  unknown: { label: 'Not enough history', tone: '' },
};

export default function SupervisorDashboard({ metrics, loading = false, isDemoData = false }) {
  const team = Array.isArray(metrics?.team) ? metrics.team : [];
  const workload = metrics?.workload || { rows: [] };
  const trend = metrics?.responseTrend || {};
  const breaches = Array.isArray(metrics?.breaches) ? metrics.breaches : [];
  const weekly = metrics?.weekly || {};
  const trendMeta = TREND_COPY[trend.direction] || TREND_COPY.unknown;

  return (
    <div className="rd-board rd-board-supervisor" data-testid="supervisor-dashboard" data-loading={loading ? 'true' : 'false'}>
      {isDemoData && (
        <p className="rd-demo-banner" data-testid="supervisor-demo-banner">
          Showing sample team data — connect technician assignments to see live numbers.
        </p>
      )}

      {breaches.length > 0 && (
        <section className="rd-alert-panel" data-testid="supervisor-breach-alert" aria-label="SLA breaches">
          <header>
            <AlertOctagon size={17} aria-hidden="true" />
            <h3>
              {breaches.length} SLA breach{breaches.length === 1 ? ' needs' : 'es need'} action
            </h3>
          </header>
          <ul>
            {breaches.slice(0, 5).map((breach) => (
              <li key={breach.ticketId}>
                <span className="rd-breach-who">{breach.assignee}</span>
                <span className="rd-breach-what">
                  <strong>{breach.machineName}</strong>
                  {breach.woNumber ? <code className="rd-wo">{breach.woNumber}</code> : null}
                </span>
                <b className="rd-breach-time">{formatHours(breach.hoursOverdue)} overdue</b>
              </li>
            ))}
          </ul>
          {breaches.length > 5 && <a className="rd-link" href="tickets.html">See all {breaches.length} breaches <ArrowUpRight size={13} /></a>}
        </section>
      )}

      <section className="rd-kpi-row" aria-label="Weekly team KPIs">
        <DashboardKpiCard
          label="Resolved this week"
          icon={CheckCircle2}
          tone="ok"
          value={weekly.resolvedThisWeek ?? 0}
          hint="Tickets closed in the last 7 days"
          data-testid="kpi-resolved-week"
        />
        <DashboardKpiCard
          label="Avg. resolution time"
          icon={Activity}
          value={formatHours(weekly.avgResolutionHours)}
          hint={`Trend: ${trendMeta.label.toLowerCase()}`}
          tone={trendMeta.tone}
          data-testid="kpi-avg-resolution"
        />
        <DashboardKpiCard
          label="On-time PM"
          icon={CheckCircle2}
          value={formatPct(weekly.pmOnTimePct, 'No PM logged')}
          hint="Preventive jobs finished on schedule"
          tone={weekly.pmOnTimePct == null ? '' : weekly.pmOnTimePct >= 90 ? 'ok' : 'warning'}
          data-testid="kpi-pm-on-time"
        />
        <DashboardKpiCard
          label="Team utilisation"
          icon={Users}
          value={formatPct(weekly.teamUtilizationPct, 'No owners set')}
          hint="Share of the fleet with a named owner"
          data-testid="kpi-team-utilization"
        />
      </section>

      <DashboardChart
        title="Team status"
        subtitle="Who is on track"
        caption={`${team.length} technician${team.length === 1 ? '' : 's'}`}
        action={<a className="rd-link" href="team.html">Manage team <ArrowUpRight size={13} /></a>}
      >
        {team.length ? (
          <div className="rd-team-grid" data-testid="supervisor-team-grid">
            {team.map((member) => (
              <article className={`rd-team-card ${member.tone}`} key={member.id}>
                <header>
                  <strong>{member.name}</strong>
                  <span className={`rd-dot ${member.tone}`} aria-hidden="true" />
                </header>
                <dl>
                  <div><dt>Machines</dt><dd>{member.machineCount}</dd></div>
                  <div><dt>Open</dt><dd>{member.openTickets}</dd></div>
                  <div><dt>Avg. response</dt><dd>{formatHours(member.avgResponseHours)}</dd></div>
                  <div><dt>SLA</dt><dd>{formatPct(member.slaPct, '—')}</dd></div>
                </dl>
                {member.breachedOpen > 0 && (
                  <p className="rd-team-flag">{member.breachedOpen} breached job{member.breachedOpen === 1 ? '' : 's'}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rd-empty">No technicians on this team yet.</p>
        )}
      </DashboardChart>

      <div className="rd-split">
        <DashboardChart title="Workload balance" subtitle="Open work per technician" caption="Marker = capacity">
          <HorizontalBars
            showCapacity
            items={(workload.rows || []).map((row) => ({
              id: row.id,
              label: row.name,
              value: row.open,
              capacity: row.capacity,
              secondaryValue: row.closedThisWeek,
              display: `${row.open} open · ${row.closedThisWeek} closed`,
              tone: row.overloaded ? 'danger' : '',
            }))}
            emptyText="No assignments to balance yet."
          />
          {workload.imbalanced && (
            <p className="rd-hint warning">Work is unevenly spread — someone is over capacity while someone else is idle.</p>
          )}
        </DashboardChart>

        <DashboardChart title="Response time" subtitle="Average time to resolve" caption={trendMeta.label}>
          <div className="rd-trend-block">
            <Sparkline points={[trend.month, trend.week, trend.today]} tone={trendMeta.tone} />
            <div className="rd-trend-stats">
              <div><span>Today</span><strong>{formatHours(trend.today)}</strong></div>
              <div><span>This week</span><strong>{formatHours(trend.week)}</strong></div>
              <div><span>This month</span><strong>{formatHours(trend.month)}</strong></div>
            </div>
          </div>
          <p className={`rd-hint ${trendMeta.tone}`}>
            {trend.direction === 'improving' && 'The team is resolving faster than the monthly average.'}
            {trend.direction === 'degrading' && 'Resolution is slowing against the monthly average — check for blockers.'}
            {trend.direction === 'stable' && 'Resolution time is holding steady against the monthly average.'}
            {trend.direction === 'unknown' && 'Not enough closed work yet to call a direction.'}
          </p>
        </DashboardChart>
      </div>
    </div>
  );
}
