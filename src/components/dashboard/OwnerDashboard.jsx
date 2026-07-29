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
  ShieldAlert, Wallet, TrendingDown, Factory, ArrowUpRight,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart, { HorizontalBars, StatusDonut } from './DashboardChart.jsx';
import { formatInrCompact, formatPct } from '../../utils/dashboardMetrics.js';

export default function OwnerDashboard({ metrics, loading = false, onDrilldown }) {
  const valueAtRisk = metrics?.valueAtRisk || {};
  const cost = metrics?.maintenanceCost || {};
  const downtime = metrics?.downtime || {};
  const fleet = metrics?.fleetHealth || {};
  const problems = Array.isArray(metrics?.problemMachines) ? metrics.problemMachines : [];
  const month = metrics?.month || {};

  const drill = (key) => (onDrilldown ? () => onDrilldown(key) : undefined);

  return (
    <div className="rd-board rd-board-owner" data-testid="owner-dashboard" data-loading={loading ? 'true' : 'false'}>
      <section className="rd-kpi-row" aria-label="Business KPIs">
        <DashboardKpiCard
          label="Money at risk"
          icon={ShieldAlert}
          tone={valueAtRisk.machineCount > 0 ? 'danger' : 'ok'}
          value={valueAtRisk.known === false ? 'Set asset values' : formatInrCompact(valueAtRisk.value)}
          hint={`${valueAtRisk.machineCount || 0} machine${valueAtRisk.machineCount === 1 ? '' : 's'} need attention or service`}
          info={{ summary: 'Estimated value of machines needing attention.', detail: 'Adds the replacement value of machines with open issues or overdue service.' }}
          onClick={drill('machines')}
          data-testid="kpi-value-at-risk"
        />
        <DashboardKpiCard
          label="Maintenance spend · this month"
          icon={Wallet}
          value={formatInrCompact(cost.total)}
          hint={`${formatInrCompact(cost.repair)} labour and parts · ${formatInrCompact(cost.downtime)} production loss`}
          info={{ summary: 'Money spent on repairs and regular maintenance this month.', detail: 'Adds parts cost, labour cost, and recorded production loss from maintenance work.' }}
          onClick={drill('secondary')}
          data-testid="kpi-maintenance-cost"
        />
        <DashboardKpiCard
          label="Important machines"
          icon={ShieldAlert}
          tone={(fleet.grid?.critical?.down || 0) > 0 ? 'danger' : 'ok'}
          value={(fleet.grid?.critical?.down || 0) + (fleet.grid?.critical?.issues || 0)}
          hint={`${fleet.grid?.critical?.down || 0} stopped · ${fleet.grid?.critical?.issues || 0} need attention`}
          info={{ summary: 'Important machines that are stopped or need attention.', detail: 'Counts critical machines marked Down or Issues in the current machine records.' }}
          onClick={drill('machines')}
          data-testid="kpi-critical-machines"
        />
        <DashboardKpiCard
          label="Production loss · this month"
          icon={TrendingDown}
          tone={downtime.cost > 0 ? 'danger' : 'ok'}
          value={formatInrCompact(downtime.cost)}
          hint={`${downtime.hours || 0} hours lost across ${downtime.ticketCount || 0} machine issue${downtime.ticketCount === 1 ? '' : 's'}`}
          info={{ summary: 'Estimated money lost while machines were stopped.', detail: 'Multiplies recorded downtime hours by each machine’s hourly loss rate.' }}
          onClick={drill('downtime')}
          data-testid="kpi-downtime-cost"
        />
      </section>

      <div className="rd-split">
        <DashboardChart
          title="Machine status"
          subtitle="Current plant position"
          caption={`${fleet.total || 0} machines`}
        >
          <StatusDonut values={fleet.byStatus} total={fleet.total} />
        </DashboardChart>

        <DashboardChart title="This month" subtitle="Quick summary" caption="Month to date">
          <div className="rd-mini-grid">
            <MiniStat label="New issues" value={month.opened ?? 0} />
            <MiniStat label="Issues closed" value={month.closed ?? 0} tone="ok" />
            <MiniStat label="Service completed" value={formatPct(month.pmCompletionPct, 'No data yet')} />
          </div>
        </DashboardChart>
      </div>

      <DashboardChart
        title="Machines needing attention"
        subtitle="Fix these first"
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
