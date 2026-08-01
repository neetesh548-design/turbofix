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
  AlertOctagon, Users, Activity, CheckCircle2, ArrowUpRight, ShieldAlert, Workflow, TimerReset, UserRound,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart, { HorizontalBars, Sparkline } from './DashboardChart.jsx';
import RoleFocusSection from './RoleFocusSection.jsx';
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
  const overloaded = (workload.rows || []).filter((row) => row.overloaded);
  const idle = (workload.rows || []).filter((row) => row.open === 0);
  const mostLoaded = [...(workload.rows || [])].sort((a, b) => b.open - a.open)[0] || null;
  const mostBreachedMember = [...team].sort((a, b) => b.breachedOpen - a.breachedOpen || b.openTickets - a.openTickets)[0] || null;
  const supervisorFocus = breaches[0]
    ? {
      type: 'breach',
      title: `${breaches[0].machineName} is already outside SLA`,
      body: `${breaches[0].assignee} owns this ticket and it is overdue by ${formatHours(breaches[0].hoursOverdue)}.`,
      cta: 'Open ticket queue',
      href: 'tickets.html',
      pill: `${breaches.length} breach${breaches.length === 1 ? '' : 'es'}`,
      tone: 'danger',
    }
    : workload.imbalanced && mostLoaded
      ? {
        type: 'imbalance',
        title: `${mostLoaded.name} is carrying the heaviest open load`,
        body: `${mostLoaded.open} open jobs against a capacity of ${mostLoaded.capacity}. Rebalance before new work lands.`,
        cta: 'Open team view',
        href: 'team.html',
        pill: `${overloaded.length} overloaded`,
        tone: 'warning',
      }
      : {
        type: 'flow',
        title: 'The floor is stable right now',
        body: 'No active SLA breach is visible. Use this window to balance workload and clear upcoming risk early.',
        cta: 'Review team load',
        href: 'team.html',
        pill: 'Stable',
        tone: 'ok',
      };

  return (
    <div className="rd-board rd-board-supervisor" data-testid="supervisor-dashboard" data-loading={loading ? 'true' : 'false'}>
      {isDemoData && (
        <p className="rd-demo-banner" data-testid="supervisor-demo-banner">
          Showing sample team data — connect technician assignments to see live numbers.
        </p>
      )}

      <RoleFocusSection
        ariaLabel="Supervisor start here"
        tone={supervisorFocus.tone}
        title={supervisorFocus.title}
        body={supervisorFocus.body}
        pill={supervisorFocus.pill}
        meta={[
          { icon: ShieldAlert, text: `${breaches.length} active breaches`, label: 'breaches' },
          { icon: Workflow, text: `${overloaded.length} overloaded technicians`, label: 'overloaded' },
          { icon: UserRound, text: `${idle.length} idle technicians`, label: 'idle' },
        ]}
        actions={[
          { href: supervisorFocus.href, label: supervisorFocus.cta },
          { href: 'tickets.html', label: 'Open all jobs' },
        ]}
        priorities={[
          { label: 'Breach queue', value: breaches.length, help: 'Jobs already outside SLA', tone: breaches.length ? 'danger' : '' },
          { label: 'Rebalance needed', value: overloaded.length, help: 'Technicians above capacity', tone: overloaded.length ? 'warning' : '' },
          { label: 'Response trend', value: trendMeta.label, help: 'Direction of closure speed', tone: trend.direction === 'degrading' ? 'danger' : trend.direction === 'improving' ? 'info' : '' },
        ]}
      />

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

      <div className="rd-split">
        <DashboardChart
          title="Immediate supervisor actions"
          subtitle="Where you can unblock fastest"
          caption={`${Math.min(4, breaches.length + overloaded.length)} priority items`}
        >
          {breaches.length || overloaded.length || mostBreachedMember ? (
            <div className="rd-tech-mini-list">
              {breaches.slice(0, 2).map((breach) => (
                <a key={breach.ticketId} className="rd-tech-mini danger" href="tickets.html">
                  <span className="rd-tech-mini-label">SLA breach</span>
                  <strong>{breach.machineName}</strong>
                  <small>{breach.assignee} · {formatHours(breach.hoursOverdue)} overdue</small>
                </a>
              ))}
              {overloaded.slice(0, 2).map((row) => (
                <a key={row.id} className="rd-tech-mini warning" href="team.html">
                  <span className="rd-tech-mini-label">Overloaded technician</span>
                  <strong>{row.name}</strong>
                  <small>{row.open} open jobs · capacity {row.capacity}</small>
                </a>
              ))}
              {!breaches.length && !overloaded.length && mostBreachedMember ? (
                <a className="rd-tech-mini info" href="team.html">
                  <span className="rd-tech-mini-label">Watch closest load</span>
                  <strong>{mostBreachedMember.name}</strong>
                  <small>{mostBreachedMember.openTickets} open jobs · SLA {formatPct(mostBreachedMember.slaPct, '—')}</small>
                </a>
              ) : null}
            </div>
          ) : (
            <p className="rd-empty">No action hotspots right now. A good time to tighten PM discipline or reassign preventive work.</p>
          )}
        </DashboardChart>

        <DashboardChart
          title="Crew balance snapshot"
          subtitle="Who is stretched and who can absorb work"
          caption={`${team.length} technicians`}
        >
          {team.length ? (
            <div className="rd-tech-mini-list">
              {([...team]
                .sort((a, b) => b.openTickets - a.openTickets)
                .slice(0, 4)
              ).map((member) => (
                <a key={member.id} className={`rd-tech-mini ${member.tone === 'danger' ? 'danger' : member.tone === 'warning' ? 'warning' : 'info'}`} href="team.html">
                  <span className="rd-tech-mini-label">{member.tone === 'danger' ? 'Needs support' : member.tone === 'warning' ? 'Watch closely' : 'Available / stable'}</span>
                  <strong>{member.name}</strong>
                  <small>{member.openTickets} open · {member.machineCount} machines · SLA {formatPct(member.slaPct, '—')}</small>
                </a>
              ))}
            </div>
          ) : (
            <p className="rd-empty">No technician roster yet.</p>
          )}
        </DashboardChart>
      </div>

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
