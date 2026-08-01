import React from 'react';
import {
  ShieldAlert, AlertTriangle, BadgeCheck, UserX, ArrowUpRight, Repeat, IndianRupee,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart from './DashboardChart.jsx';
import RoleFocusSection from './RoleFocusSection.jsx';
import { formatInrCompact } from '../../utils/dashboardMetrics.js';
import { computeSla, isTicketClosed, normalizeUrgency } from '../../utils/ticketSla.js';

function isVerificationPending(ticket) {
  return String(ticket?.lifecycle_stage || '').toLowerCase() === 'verification_pending';
}

function isRepeatFailure(ticket) {
  return Boolean(ticket?.repeat_failure_flag);
}

function isCritical(ticket) {
  return normalizeUrgency(ticket) === 'critical';
}

function ticketSummary(ticket) {
  return ticket?.issue_text
    || (typeof ticket?.ai_summary === 'object' ? ticket.ai_summary?.summary : ticket?.ai_summary)
    || 'Maintenance issue';
}

function actionQueue(tickets = [], now = new Date()) {
  return tickets
    .filter((ticket) => !isTicketClosed(ticket))
    .map((ticket) => ({
      ticket,
      sla: computeSla(ticket, now),
    }))
    .filter(({ ticket }) => isCritical(ticket) || isRepeatFailure(ticket) || isVerificationPending(ticket))
    .map(({ ticket, sla }) => {
      const unassigned = !ticket?.technician_id && !ticket?.assigned_to && !ticket?.assignee_id;
      const estimatedCost = Number(ticket?.maintenance_cost || ticket?.repair_cost || ticket?.parts_cost || 0) || null;
      let tone = 'warning';
      if (sla.breached || isCritical(ticket)) tone = 'danger';
      else if (isVerificationPending(ticket)) tone = 'info';
      return {
        id: ticket?.id || ticket?.ticket_id,
        machineId: ticket?.machine_id,
        machineName: ticket?.machine_name || ticket?.machine_id || 'Machine',
        issue: ticketSummary(ticket),
        woNumber: ticket?.wo_number || null,
        urgency: normalizeUrgency(ticket) || 'medium',
        verificationPending: isVerificationPending(ticket),
        repeatFailure: isRepeatFailure(ticket),
        unassigned,
        breached: sla.breached,
        estimatedCost,
        tone,
      };
    })
    .sort((a, b) => Number(b.breached) - Number(a.breached)
      || Number(b.urgency === 'critical') - Number(a.urgency === 'critical')
      || Number(b.repeatFailure) - Number(a.repeatFailure)
      || Number(b.verificationPending) - Number(a.verificationPending));
}

export default function MaintenanceHeadDashboard({ tickets = [], metrics, loading = false }) {
  const queue = actionQueue(Array.isArray(tickets) ? tickets : []);
  const criticalOpen = queue.filter((row) => row.urgency === 'critical');
  const awaitingVerification = queue.filter((row) => row.verificationPending);
  const repeatFailures = queue.filter((row) => row.repeatFailure);
  const unassigned = queue.filter((row) => row.unassigned);
  const topAction = queue[0] || null;
  const valueAtRisk = metrics?.valueAtRisk || {};

  return (
    <div className="rd-board rd-board-maintenance-head" data-testid="maintenance-head-dashboard" data-loading={loading ? 'true' : 'false'}>
      {topAction ? (
        <RoleFocusSection
          ariaLabel="Maintenance head start here"
          tone={topAction.tone}
          title={`${topAction.machineName} needs authority attention`}
          body={topAction.issue}
          pill={topAction.breached
            ? 'SLA breached'
            : topAction.verificationPending
              ? 'Awaiting sign-off'
              : topAction.repeatFailure
                ? 'Repeat failure'
                : 'Critical issue'}
          meta={[
            { icon: ShieldAlert, text: `${criticalOpen.length} critical open`, label: 'critical' },
            { icon: BadgeCheck, text: `${awaitingVerification.length} awaiting verification`, label: 'verification' },
            { icon: Repeat, text: `${repeatFailures.length} repeat failures`, label: 'repeat' },
          ]}
          actions={[
            { href: 'tickets.html', label: 'Open authority queue' },
            { href: 'records.html', label: 'Review records' },
          ]}
          priorities={[
            { label: 'Critical open', value: criticalOpen.length, help: 'Immediate operational risk', tone: criticalOpen.length ? 'danger' : '' },
            { label: 'Awaiting sign-off', value: awaitingVerification.length, help: 'Repairs pending authority close', tone: awaitingVerification.length ? 'warning' : '' },
            { label: 'Fleet exposure', value: formatInrCompact(valueAtRisk.value), help: 'Estimated value tied to at-risk assets', tone: valueAtRisk.machineCount > 0 ? 'info' : '' },
          ]}
        />
      ) : (
        <section className="rd-tech-focus" aria-label="Maintenance head start here">
          <div className="rd-tech-focus-card">
            <span className="rd-tech-focus-kicker">Start here</span>
            <p className="rd-empty">No safety, technical, or sign-off exception needs your authority right now.</p>
          </div>
          <div className="rd-tech-priorities">
            <article className={`rd-tech-priority ${criticalOpen.length ? 'danger' : ''}`}>
              <span className="rd-tech-priority-label">Critical open</span>
              <strong>{criticalOpen.length}</strong>
              <small>Immediate operational risk</small>
            </article>
            <article className={`rd-tech-priority ${awaitingVerification.length ? 'warning' : ''}`}>
              <span className="rd-tech-priority-label">Awaiting sign-off</span>
              <strong>{awaitingVerification.length}</strong>
              <small>Repairs pending authority close</small>
            </article>
            <article className={`rd-tech-priority ${valueAtRisk.machineCount > 0 ? 'info' : ''}`}>
              <span className="rd-tech-priority-label">Fleet exposure</span>
              <strong>{formatInrCompact(valueAtRisk.value)}</strong>
              <small>Estimated value tied to at-risk assets</small>
            </article>
          </div>
        </section>
      )}

      <section className="rd-kpi-row" aria-label="Maintenance head KPIs">
        <DashboardKpiCard
          label="Critical open"
          icon={AlertTriangle}
          tone={criticalOpen.length ? 'danger' : 'ok'}
          value={criticalOpen.length}
          hint="Open issues requiring fast authority attention"
        />
        <DashboardKpiCard
          label="Awaiting verification"
          icon={BadgeCheck}
          tone={awaitingVerification.length ? 'warning' : 'ok'}
          value={awaitingVerification.length}
          hint="Repairs waiting for final validation"
        />
        <DashboardKpiCard
          label="Repeat failures"
          icon={Repeat}
          tone={repeatFailures.length ? 'warning' : 'ok'}
          value={repeatFailures.length}
          hint="Open issues marked as repeat breakdowns"
        />
        <DashboardKpiCard
          label="Unassigned exceptions"
          icon={UserX}
          tone={unassigned.length ? 'danger' : 'ok'}
          value={unassigned.length}
          hint="Authority queue items without a clear owner"
        />
      </section>

      <div className="rd-split">
        <DashboardChart
          title="Authority queue"
          subtitle="What needs your decision"
          caption={`${queue.length} exception${queue.length === 1 ? '' : 's'}`}
          action={<a className="rd-link" href="tickets.html">Open work orders <ArrowUpRight size={13} /></a>}
        >
          {queue.length ? (
            <div className="rd-tech-mini-list">
              {queue.slice(0, 6).map((row) => (
                <a key={row.id} className={`rd-tech-mini ${row.tone}`} href={`tickets.html?activeFilter=all&machine=${encodeURIComponent(row.machineId || '')}`}>
                  <span className="rd-tech-mini-label">
                    {row.breached ? 'SLA breached' : row.verificationPending ? 'Verification pending' : row.repeatFailure ? 'Repeat failure' : 'Critical issue'}
                  </span>
                  <strong>{row.machineName}</strong>
                  <small>{row.issue}</small>
                </a>
              ))}
            </div>
          ) : (
            <p className="rd-empty">No exception is waiting in the authority queue.</p>
          )}
        </DashboardChart>

        <DashboardChart
          title="Financial and technical exposure"
          subtitle="What deserves escalation weight"
          caption="Decision support"
        >
          <div className="rd-tech-mini-list">
            <a className="rd-tech-mini info" href="machines.html">
              <span className="rd-tech-mini-label">Value at risk</span>
              <strong>{formatInrCompact(valueAtRisk.value)}</strong>
              <small>{valueAtRisk.machineCount || 0} machine{valueAtRisk.machineCount === 1 ? '' : 's'} needing attention or service</small>
            </a>
            <a className={`rd-tech-mini ${repeatFailures.length ? 'warning' : 'info'}`} href="records.html">
              <span className="rd-tech-mini-label">Repeat-failure pressure</span>
              <strong>{repeatFailures.length} active repeats</strong>
              <small>Use RCA history to decide whether escalation or redesign is needed.</small>
            </a>
            <a className={`rd-tech-mini ${unassigned.length ? 'danger' : 'info'}`} href="team.html">
              <span className="rd-tech-mini-label">Ownership gap</span>
              <strong>{unassigned.length} unassigned exception{unassigned.length === 1 ? '' : 's'}</strong>
              <small>Critical and verification items should never sit without a named owner.</small>
            </a>
            <a className={`rd-tech-mini ${awaitingVerification.length ? 'warning' : 'info'}`} href="records.html">
              <span className="rd-tech-mini-label">Closure authority</span>
              <strong>{awaitingVerification.length} pending sign-offs</strong>
              <small>Close the loop on repairs that cannot be released without your review.</small>
            </a>
          </div>
        </DashboardChart>
      </div>
    </div>
  );
}
