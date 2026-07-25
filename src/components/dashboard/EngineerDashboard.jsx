/**
 * EngineerDashboard — stop the same failure happening a fourth time.
 *
 * The reliability engineer's question is never "what broke today" but
 * "what keeps breaking, do we know why, and did the fix actually land".
 * So the page is ordered: rate of repeats → where they cluster → whether
 * the corrective actions closed.
 *
 * Props:
 * - metrics ({ reliability, hotspots, capa, trending })
 * - loading (bool)
 * - isDemoData (bool)
 */

import React from 'react';
import {
  Repeat, GaugeCircle, FileSearch, ListChecks, ArrowUpRight, BookOpen,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart, { HorizontalBars } from './DashboardChart.jsx';
import { formatHours, formatPct, CAPA_STATUS_LABEL } from '../../utils/dashboardMetrics.js';

const CAPA_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

export default function EngineerDashboard({ metrics, loading = false, isDemoData = false }) {
  const reliability = metrics?.reliability || {};
  const hotspots = Array.isArray(metrics?.hotspots) ? metrics.hotspots : [];
  const capa = metrics?.capa || { actions: [], counts: {} };
  const trending = Array.isArray(metrics?.trending) ? metrics.trending : [];

  const [capaFilter, setCapaFilter] = React.useState('all');
  const capaActions = Array.isArray(capa.actions) ? capa.actions : [];
  const visibleCapa = capaFilter === 'all'
    ? capaActions
    : capaActions.filter((action) => action.status === capaFilter);

  return (
    <div className="rd-board rd-board-engineer" data-testid="engineer-dashboard" data-loading={loading ? 'true' : 'false'}>
      {isDemoData && (
        <p className="rd-demo-banner" data-testid="engineer-demo-banner">
          Showing sample reliability data — record root causes on closed tickets to see live numbers.
        </p>
      )}

      <section className="rd-kpi-row" aria-label="Reliability KPIs">
        <DashboardKpiCard
          label="Repeat failure rate"
          icon={Repeat}
          tone={reliability.repeatFailureRatePct == null
            ? ''
            : reliability.repeatFailureRatePct >= 30 ? 'danger' : reliability.repeatFailureRatePct >= 15 ? 'warning' : 'ok'}
          value={formatPct(reliability.repeatFailureRatePct, 'No failures yet')}
          hint={`Share of the last ${reliability.windowDays || 90} days that repeated a known fault`}
          data-testid="kpi-repeat-rate"
        />
        <DashboardKpiCard
          label="Fleet MTBF"
          icon={GaugeCircle}
          tone={reliability.fleetMtbfHours == null
            ? ''
            : reliability.fleetMtbfHours >= 168 ? 'ok' : reliability.fleetMtbfHours >= 48 ? 'warning' : 'danger'}
          value={formatHours(reliability.fleetMtbfHours)}
          hint="Mean time between failures — higher is better"
          data-testid="kpi-mtbf"
        />
        <DashboardKpiCard
          label="Most problematic"
          icon={FileSearch}
          tone={reliability.mostProblematic?.length ? 'warning' : 'ok'}
          value={reliability.mostProblematic?.[0]?.machineName || 'None'}
          hint={reliability.mostProblematic?.[0]
            ? `${reliability.mostProblematic[0].failures} failures in ${reliability.windowDays || 90} days`
            : 'No machine stands out'}
          data-testid="kpi-most-problematic"
        />
        <DashboardKpiCard
          label="RCA completion"
          icon={ListChecks}
          tone={reliability.rcaCompletionPct == null
            ? ''
            : reliability.rcaCompletionPct >= 80 ? 'ok' : reliability.rcaCompletionPct >= 50 ? 'warning' : 'danger'}
          value={formatPct(reliability.rcaCompletionPct, 'Nothing closed yet')}
          hint="Closed tickets carrying a documented root cause"
          data-testid="kpi-rca-completion"
        />
      </section>

      <DashboardChart
        title="Repeat failure hotspots"
        subtitle={`Last ${reliability.windowDays || 90} days`}
        caption={`${hotspots.length} cluster${hotspots.length === 1 ? '' : 's'}`}
      >
        {hotspots.length ? (
          <div className="rd-table-wrap">
            <table className="rd-table" data-testid="engineer-hotspots">
              <thead>
                <tr>
                  <th scope="col">Machine</th>
                  <th scope="col">Component</th>
                  <th scope="col">Failures</th>
                  <th scope="col">Root cause</th>
                  <th scope="col">CAPA</th>
                  <th scope="col">Owner</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((row) => (
                  <tr key={`${row.machineId}-${row.component}`} className={`rd-row-${row.tone}`}>
                    <th scope="row">
                      <a href={`machines.html?machine=${encodeURIComponent(row.machineId)}`}>{row.machineName}</a>
                    </th>
                    <td>{row.component}</td>
                    <td className="rd-num"><span className={`rd-chip rd-chip-${row.tone}`}>{row.failureCount}</span></td>
                    <td className="rd-truncate" title={row.rootCause || 'Not documented'}>
                      {row.rootCause || <em>Not documented</em>}
                    </td>
                    <td>{row.capaStatus}</td>
                    <td>{row.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rd-empty">No component has failed twice in the window. Reliability is holding.</p>
        )}
      </DashboardChart>

      <div className="rd-split">
        <DashboardChart
          title="CAPA action tracker"
          subtitle="Corrective & preventive actions"
          caption={formatPct(capa.completionPct, 'No actions yet')}
        >
          <div className="rd-capa-counts">
            <span className="rd-capa-count open"><strong>{capa.counts?.open ?? 0}</strong> Open</span>
            <span className="rd-capa-count progress"><strong>{capa.counts?.in_progress ?? 0}</strong> In progress</span>
            <span className="rd-capa-count done"><strong>{capa.counts?.completed ?? 0}</strong> Completed</span>
          </div>
          <div className="rd-filter-row" role="tablist" aria-label="Filter CAPA actions">
            {CAPA_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={capaFilter === filter.key}
                className={capaFilter === filter.key ? 'active' : ''}
                onClick={() => setCapaFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {visibleCapa.length ? (
            <ul className="rd-capa-list" data-testid="engineer-capa-list">
              {visibleCapa.slice(0, 8).map((action) => (
                <li key={action.id} className={action.overdue ? 'overdue' : ''}>
                  <span className="rd-capa-body">
                    <strong>{action.machineName}</strong>
                    <small className="rd-truncate" title={action.action}>{action.action}</small>
                  </span>
                  <span className="rd-capa-meta">
                    <span className={`rd-chip rd-chip-${action.status === 'completed' ? 'ok' : action.overdue ? 'danger' : 'warning'}`}>
                      {CAPA_STATUS_LABEL[action.status] || action.status}
                    </span>
                    <small>{action.owner}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rd-empty">No CAPA actions in this state.</p>
          )}
        </DashboardChart>

        <DashboardChart title="Trending issues" subtitle="Last 30 days" caption="Top 5 by count">
          <HorizontalBars
            items={trending.map((row, index) => ({
              id: `${row.issue}-${index}`,
              label: row.issue,
              value: row.count,
              display: `${row.count} · ${row.affectedMachines} machine${row.affectedMachines === 1 ? '' : 's'}`,
              tone: index === 0 ? 'danger' : '',
            }))}
            emptyText="No issues reported in the last 30 days."
          />
          {trending[0] && <p className="rd-hint">{trending[0].suggestedAction}</p>}
        </DashboardChart>
      </div>

      <DashboardChart title="Knowledge base" subtitle="Dig deeper" caption="Reliability library">
        <nav className="rd-kb-links" aria-label="Knowledge base links">
          <a href="records.html"><BookOpen size={15} aria-hidden="true" /> All RCA reports <ArrowUpRight size={13} aria-hidden="true" /></a>
          <a href="tickets.html?filter=repeat"><Repeat size={15} aria-hidden="true" /> Trending failure modes <ArrowUpRight size={13} aria-hidden="true" /></a>
          <a href="support.html"><ListChecks size={15} aria-hidden="true" /> CAPA dashboard <ArrowUpRight size={13} aria-hidden="true" /></a>
        </nav>
      </DashboardChart>

      {reliability.mtbfByMachine?.length > 0 && (
        <DashboardChart title="MTBF by machine" subtitle="Shortest first" caption={`Last ${reliability.windowDays || 90} days`}>
          <HorizontalBars
            items={reliability.mtbfByMachine.map((row) => ({
              id: row.machineId,
              label: row.machineName,
              value: row.mtbfHours,
              display: formatHours(row.mtbfHours),
              tone: row.mtbfHours < 48 ? 'danger' : row.mtbfHours < 168 ? 'warning' : '',
            }))}
            emptyText="Not enough failure history to compute MTBF."
          />
        </DashboardChart>
      )}
    </div>
  );
}
