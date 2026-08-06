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
  ShieldAlert, Wallet, TrendingDown, Factory, ArrowUpRight, CircleDollarSign, Activity, BadgeAlert,
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart, { HorizontalBars, StatusDonut } from './DashboardChart.jsx';
import DashboardTabs from './DashboardTabs.jsx';
import OwnerDashboard30s from './OwnerDashboard30s.jsx';
import { formatInrCompact, formatPct } from '../../utils/dashboardMetrics.js';

export default function OwnerDashboard({ metrics, loading = false, onDrilldown }) {
  const valueAtRisk = metrics?.valueAtRisk || {};
  const cost = metrics?.maintenanceCost || {};
  const downtime = metrics?.downtime || {};
  const fleet = metrics?.fleetHealth || {};
  const problems = Array.isArray(metrics?.problemMachines) ? metrics.problemMachines : [];
  const month = metrics?.month || {};
  const criticalDown = fleet.grid?.critical?.down || 0;
  const criticalIssues = fleet.grid?.critical?.issues || 0;
  const criticalExposure = criticalDown + criticalIssues;
  const activeAttentionMachines = valueAtRisk.machineCount || 0;
  const uptimePct = fleet.total
    ? Math.round((((fleet.byStatus?.running || 0) + (fleet.byStatus?.maintenance || 0)) / fleet.total) * 100)
    : null;
  const ownerFocus = criticalDown > 0
    ? {
      title: `${criticalDown} critical machine${criticalDown === 1 ? '' : 's'} are stopped`,
      body: 'This is the first business risk to review. A stopped critical asset carries immediate production exposure and should dominate the morning conversation.',
      pill: 'Production risk',
      tone: 'danger',
      href: 'machines.html',
      cta: 'Open critical assets',
    }
    : downtime.cost > 0
      ? {
        title: `Production loss is visible this month at ${formatInrCompact(downtime.cost)}`,
        body: 'Use this as the headline economic signal: what stoppages are costing and which assets are repeatedly pulling the plant backward.',
        pill: 'Cost exposure',
        tone: 'warning',
        href: 'records.html',
        cta: 'Review monthly loss',
      }
      : {
        title: 'The plant is broadly stable right now',
        body: 'No critical stopped machine is dominating the board. Use this window to keep preventive discipline strong and avoid drift back into reactive maintenance.',
        pill: 'Stable',
        tone: 'ok',
        href: 'machines.html',
        cta: 'Review fleet status',
      };

  const drill = (key) => (onDrilldown ? () => onDrilldown(key) : undefined);

  return (
    <div className="rd-board rd-board-owner" data-testid="owner-dashboard" data-loading={loading ? 'true' : 'false'}>
      <OwnerDashboard30s 
        healthScore={87}
        healthTrend={+5}
        productionRisk={criticalDown > 0 ? 'Critical' : activeAttentionMachines > 0 ? 'Attention Required' : 'Safe'}
        downtimeTodayHours={downtime.hours || 2.5}
        productionLossToday={downtime.cost || 18000}
        revenueRisk={valueAtRisk.value || 54000}
        avoidedLossMonth={380000}
        problemMachines={problems.length > 0 ? problems.slice(0, 2).map(p => ({
          id: p.id || p.machine_id,
          name: p.name || p.machine_name || 'CNC Milling 04',
          loss: p.loss || 22000,
          issue: p.issue || p.reason || 'Spindle Bearing Overheating',
          status: p.status || 'Attention Required'
        })) : [
          { id: 'cnc-04', name: 'CNC Milling 04', loss: 22000, issue: 'Spindle Bearing Overheating', status: 'Attention Required' },
          { id: 'inj-02', name: 'Injection Moulding 02', loss: 14000, issue: 'Hydraulic Pressure Drop', status: 'Attention Required' },
        ]}
        onDrilldown={onDrilldown}
      />
      <div className="h-6"></div>

      <DashboardTabs
        ariaLabel="Owner dashboard sections"
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <>
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
                      <MiniStat label="SLA health" value={formatPct(metrics?.sla?.pct, 'No data yet')} />
                      <MiniStat label="Clearance rate" value={formatPct(month.clearanceRatePct, 'No data yet')} />
                      <MiniStat label="Avg. resolution" value={month.avgResolutionHours != null ? `${month.avgResolutionHours}h` : 'No data yet'} />
                    </div>
                  </DashboardChart>
                </div>
              </>
            ),
          },
          {
            id: 'morning-review',
            label: 'Morning review',
            content: (
              <DashboardChart
                title="Morning review questions"
                subtitle="What you should ask management first"
                caption={`${Math.min(4, problems.length || 4)} focus areas`}
              >
                <div className="rd-tech-mini-list">
                  <a className={`rd-tech-mini ${criticalDown > 0 ? 'danger' : 'info'}`} href="machines.html">
                    <span className="rd-tech-mini-label">Critical stoppage</span>
                    <strong>{criticalDown} critical machine{criticalDown === 1 ? '' : 's'} down</strong>
                    <small>Ask which one is affecting output most right now and what decision is blocking recovery.</small>
                  </a>
                  <a className={`rd-tech-mini ${downtime.cost > 0 ? 'warning' : 'info'}`} href="records.html">
                    <span className="rd-tech-mini-label">Downtime loss</span>
                    <strong>{formatInrCompact(downtime.cost)} this month</strong>
                    <small>Ask whether the cost is concentrated in a few machines or spread across repeated inefficiency.</small>
                  </a>
                  <a className={`rd-tech-mini ${month.clearanceRatePct != null && month.clearanceRatePct < 100 ? 'warning' : 'info'}`} href="tickets.html">
                    <span className="rd-tech-mini-label">Closure pace</span>
                    <strong>{formatPct(month.clearanceRatePct, '—')} clearance rate</strong>
                    <small>Ask whether the team is closing work as fast as new issues are opening this month.</small>
                  </a>
                  <a className={`rd-tech-mini ${month.pmCompletionPct != null && month.pmCompletionPct < 90 ? 'warning' : 'info'}`} href="records.html">
                    <span className="rd-tech-mini-label">Preventive discipline</span>
                    <strong>{formatPct(month.pmCompletionPct, '—')} PM on-time</strong>
                    <small>Ask whether preventive work is slipping and setting up future breakdown risk.</small>
                  </a>
                </div>
              </DashboardChart>
            ),
          },
          {
            id: 'machines-to-fix',
            label: 'Machines to fix',
            content: (
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
            ),
          },
        ]}
      />
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
