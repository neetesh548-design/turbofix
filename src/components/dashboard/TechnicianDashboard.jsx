/**
 * TechnicianDashboard — "what do I do today?"
 *
 * The queue leads, because that is the whole job. Urgent work is a
 * separate block rather than a red row in one long list, so a technician
 * on a phone at the machine sees their next task without scrolling.
 *
 * Props:
 * - metrics ({ queue, myMachines, quickStats }) from buildRoleMetrics('technician', …)
 * - user    (object) the signed-in technician, for the greeting
 * - loading (bool)
 * - onQuickReport (fn) opens the existing Quick Report modal
 */

import React from 'react';
import {
  AlertTriangle, ClipboardList, Wrench, PackageSearch, CalendarClock, Zap, ArrowUpRight,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart from './DashboardChart.jsx';
import { formatHours } from '../../utils/dashboardMetrics.js';

const HEALTH_TONE = { down: 'danger', issues: 'warning', running: 'ok' };

export default function TechnicianDashboard({ metrics, user, loading = false, onQuickReport }) {
  const queue = metrics?.queue || { urgent: [], normal: [], total: 0 };
  const urgent = Array.isArray(queue.urgent) ? queue.urgent : [];
  const normal = Array.isArray(queue.normal) ? queue.normal : [];
  const myMachines = Array.isArray(metrics?.myMachines) ? metrics.myMachines : [];
  const stats = metrics?.quickStats || {};

  const [showAllMachines, setShowAllMachines] = React.useState(false);
  const visibleMachines = showAllMachines ? myMachines : myMachines.slice(0, 5);

  return (
    <div className="rd-board rd-board-technician" data-testid="technician-dashboard" data-loading={loading ? 'true' : 'false'}>
      <section className="rd-greeting">
        <div>
          <span className="rd-kicker">My work</span>
          <h2>{user?.name ? `${user.name.split(' ')[0]}'s queue` : 'My queue'}</h2>
          <p>
            {queue.total
              ? `${queue.total} job${queue.total === 1 ? '' : 's'} assigned to you · ${urgent.length} ${urgent.length === 1 ? 'needs' : 'need'} attention now`
              : 'Nothing assigned to you right now.'}
          </p>
        </div>
      </section>

      <section className="rd-kpi-row rd-kpi-row-3" aria-label="Today at a glance">
        <DashboardKpiCard
          label="To close today"
          icon={CalendarClock}
          tone={stats.dueToday > 0 ? 'warning' : 'ok'}
          value={stats.dueToday ?? 0}
          hint="SLA runs out before the end of the day"
          data-testid="kpi-due-today"
        />
        <DashboardKpiCard
          label="Overdue PM"
          icon={Wrench}
          tone={stats.overduePm > 0 ? 'danger' : 'ok'}
          value={stats.overduePm ?? 0}
          hint="Machines past their service date"
          data-testid="kpi-overdue-pm"
        />
        <DashboardKpiCard
          label="Spares to order"
          icon={PackageSearch}
          tone={stats.partsToOrder > 0 ? 'warning' : 'ok'}
          value={stats.partsToOrder ?? 0}
          hint="Jobs blocked waiting on a part"
          data-testid="kpi-parts-to-order"
        />
      </section>

      <DashboardChart
        title="Urgent — do these first"
        subtitle="Critical & high priority"
        caption={`${urgent.length} job${urgent.length === 1 ? '' : 's'}`}
      >
        <QueueList rows={urgent} emptyText="No urgent work assigned. Good place to be." urgent />
      </DashboardChart>

      <DashboardChart
        title="Everything else"
        subtitle="Medium & low priority"
        caption={`${normal.length} job${normal.length === 1 ? '' : 's'}`}
      >
        <QueueList rows={normal} emptyText="No other work in your queue." />
      </DashboardChart>

      <DashboardChart
        title="My machines"
        subtitle="What I'm responsible for"
        caption={`${myMachines.length} assigned`}
        action={<a className="rd-link" href="machines.html">Open machines <ArrowUpRight size={13} /></a>}
      >
        {myMachines.length ? (
          <>
            <div className="rd-machine-grid" data-testid="technician-machine-grid">
              {visibleMachines.map((machine) => (
                <a
                  className={`rd-machine-card ${HEALTH_TONE[machine.health] || ''}`}
                  key={machine.machineId}
                  href={`machines.html?machine=${encodeURIComponent(machine.machineId)}`}
                >
                  <span className="rd-machine-head">
                    <strong>{machine.machineName}</strong>
                    <span className={`rd-dot ${HEALTH_TONE[machine.health] || ''}`} aria-hidden="true" />
                  </span>
                  <small className="rd-machine-status">{machine.healthLabel}</small>
                  <span className="rd-machine-meta">
                    <span>{machine.openTickets} open</span>
                    <span className={`rd-pm rd-pm-${machine.pmTone}`}>{machine.pmLabel}</span>
                  </span>
                </a>
              ))}
            </div>
            {myMachines.length > 5 && (
              <button type="button" className="rd-more-btn" onClick={() => setShowAllMachines((prev) => !prev)}>
                {showAllMachines ? 'Show fewer' : `Show all ${myMachines.length} machines`}
              </button>
            )}
          </>
        ) : (
          <p className="rd-empty">No machines assigned to you yet. Ask your supervisor to assign some.</p>
        )}
      </DashboardChart>

      {typeof onQuickReport === 'function' && (
        <button
          type="button"
          className="rd-fab"
          onClick={onQuickReport}
          data-testid="technician-quick-report"
          aria-label="Report an issue"
        >
          <Zap size={17} aria-hidden="true" />
          <span>Quick report</span>
        </button>
      )}
    </div>
  );
}

/** One queue block. `urgent` only changes the accent, not the structure. */
function QueueList({ rows, emptyText, urgent = false }) {
  if (!rows.length) {
    return (
      <p className="rd-empty">
        <ClipboardList size={15} aria-hidden="true" /> {emptyText}
      </p>
    );
  }

  return (
    <ul className={`rd-queue ${urgent ? 'urgent' : ''}`}>
      {rows.map((row) => (
        <li key={row.id} className={`rd-queue-item ${row.breached ? 'breached' : ''}`}>
          <span className={`rd-queue-bar rd-urgency-${row.urgency}`} aria-hidden="true" />
          <span className="rd-queue-body">
            <strong>{row.machineName}</strong>
            <small className="rd-truncate" title={row.issue}>{row.issue}</small>
            <span className="rd-queue-meta">
              <span className={`rd-sla rd-sla-${row.slaState}`}>
                {row.breached ? <AlertTriangle size={12} aria-hidden="true" /> : null}
                {row.breached
                  ? `Overdue by ${formatHours(Math.abs(row.remainingHours ?? 0))}`
                  : row.remainingHours != null
                    ? `${formatHours(row.remainingHours)} left`
                    : row.slaLabel}
              </span>
              {row.woNumber ? <code className="rd-wo">{row.woNumber}</code> : null}
            </span>
          </span>
          <span className="rd-queue-actions">
            <a className="rd-btn rd-btn-primary" href={`technician.html?ticket=${encodeURIComponent(row.id ?? '')}`}>Start</a>
            <a className="rd-btn" href="tickets.html">Details</a>
          </span>
        </li>
      ))}
    </ul>
  );
}
