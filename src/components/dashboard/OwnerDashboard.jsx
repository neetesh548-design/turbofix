/**
 * OwnerDashboard — the whole business at a glance.
 *
 * Answers, in order: how much of my fleet is exposed, what is it costing
 * me this month, are we honouring our commitments, and which machines
 * should I ask about in the morning meeting.
 *
 * Props:
 * - metrics ({ valueAtRisk, maintenanceCost, sla, downtime, fleetHealth,
 *              problemMachines, month }) from buildRoleMetrics('owner', …)
 * - loading (bool)
 * - onDrilldown (fn(key)) optional hook back to the page-level detail panel
 */

import React from 'react';
import {
  ShieldAlert, Wallet, Timer, TrendingDown, Factory, ArrowUpRight,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart, { HorizontalBars, StatusDonut } from './DashboardChart.jsx';
import { formatInrCompact, formatHours, formatPct } from '../../utils/dashboardMetrics.js';

export default function OwnerDashboard({ metrics, loading = false, onDrilldown }) {
  const valueAtRisk = metrics?.valueAtRisk || {};
  const cost = metrics?.maintenanceCost || {};
  const sla = metrics?.sla || {};
  const downtime = metrics?.downtime || {};
  const fleet = metrics?.fleetHealth || {};
  const problems = Array.isArray(metrics?.problemMachines) ? metrics.problemMachines : [];
  const month = metrics?.month || {};

  const drill = (key) => (onDrilldown ? () => onDrilldown(key) : undefined);

  return (
    <div className="rd-board rd-board-owner" data-testid="owner-dashboard" data-loading={loading ? 'true' : 'false'}>
      <section className="rd-kpi-row" aria-label="Business KPIs">
        <DashboardKpiCard
          label="Fleet value at risk"
          icon={ShieldAlert}
          tone={valueAtRisk.machineCount > 0 ? 'danger' : 'ok'}
          value={valueAtRisk.known === false ? 'Set asset values' : formatInrCompact(valueAtRisk.value)}
          hint={`${valueAtRisk.machineCount || 0} machine${valueAtRisk.machineCount === 1 ? '' : 's'} with open work or overdue PM`}
          onClick={drill('machines')}
          data-testid="kpi-value-at-risk"
        />
        <DashboardKpiCard
          label="Maintenance cost · this month"
          icon={Wallet}
          value={formatInrCompact(cost.total)}
          hint={`${formatInrCompact(cost.repair)} labour & parts · ${formatInrCompact(cost.downtime)} lost production`}
          onClick={drill('secondary')}
          data-testid="kpi-maintenance-cost"
        />
        <DashboardKpiCard
          label="SLA compliance"
          icon={Timer}
          tone={sla.pct == null ? '' : sla.pct >= 90 ? 'ok' : sla.pct >= 75 ? 'warning' : 'danger'}
          value={formatPct(sla.pct, 'Nothing closed yet')}
          hint={sla.total ? `${sla.met} met · ${sla.missed} missed · last 30 days` : 'No resolved tickets in the window'}
          onClick={drill('urgent')}
          data-testid="kpi-sla-compliance"
        />
        <DashboardKpiCard
          label="Downtime cost · this month"
          icon={TrendingDown}
          tone={downtime.cost > 0 ? 'danger' : 'ok'}
          value={formatInrCompact(downtime.cost)}
          hint={`${downtime.hours || 0} hours lost across ${downtime.ticketCount || 0} breakdown${downtime.ticketCount === 1 ? '' : 's'}`}
          onClick={drill('downtime')}
          data-testid="kpi-downtime-cost"
        />
      </section>

      <div className="rd-split">
        <DashboardChart
          title="Fleet health map"
          subtitle="Where the risk sits"
          caption={`${fleet.total || 0} machines`}
        >
          <StatusDonut values={fleet.byStatus} total={fleet.total} />
        </DashboardChart>

        <DashboardChart title="This month" subtitle="Operating summary" caption="Calendar month to date">
          <div className="rd-mini-grid">
            <MiniStat label="Tickets opened" value={month.opened ?? 0} />
            <MiniStat label="Tickets closed" value={month.closed ?? 0} tone="ok" />
            <MiniStat label="SLA breached" value={month.breached ?? 0} tone={month.breached ? 'danger' : 'ok'} />
            <MiniStat label="PM completion" value={formatPct(month.pmCompletionPct, 'No PM logged')} />
            <MiniStat label="Avg. resolution" value={formatHours(month.avgResolutionHours)} />
            <MiniStat
              label="Clearance rate"
              value={formatPct(month.clearanceRatePct, '—')}
              tone={month.clearanceRatePct != null && month.clearanceRatePct < 100 ? 'warning' : 'ok'}
            />
          </div>
        </DashboardChart>
      </div>

      <DashboardChart
        title="Top problem machines"
        subtitle="Ask about these first"
        caption="Ranked by open work"
        action={<a className="rd-link" href="machines.html">All machines <ArrowUpRight size={13} /></a>}
      >
      {problems.length ? (
          <div data-testid="owner-problem-machines">
            <HorizontalBars
              items={problems.map((row) => ({
                id: row.machineId,
                label: row.machineName,
                value: row.openTickets,
                tone: row.urgencyTone === 'critical' ? 'danger' : row.urgencyTone === 'high' ? 'warning' : '',
                display: `${row.openTickets} open`,
              }))}
              emptyText="No machine has open work."
            />
            <div className="rd-risk-links">
              {problems.slice(0, 3).map((row) => (
                <a key={row.machineId} href={`machines.html?machine=${encodeURIComponent(row.machineId)}`}>
                  {row.machineName} · {row.nextAction}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <p className="rd-empty">
            <Factory size={15} aria-hidden="true" /> No machine has open work. The plant is clear.
          </p>
        )}
      </DashboardChart>
    </div>
  );
}

function MiniStat({ label, value, tone = '' }) {
  return (
    <div className={`rd-mini-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
