/**
 * AdvancedAnalyticsBoard — the deep-dive analytics that used to live inline
 * in the Dashboard page.
 *
 * MVP-first: the role boards answer the day-to-day question in one screen,
 * and everything here — the four category boards, the 12-month trend strip,
 * repair-vs-replace, AMC expiry, data quality, audit trail and the shift
 * handover brief — stays one click away behind the drill-down instead of
 * being deleted.
 *
 * Props:
 * - data (object) the shape returned by fetchDashboardData()
 */

import React, { useState } from 'react';
import { AlertTriangle, DollarSign, Layers, TrendingUp } from 'lucide-react';
import AntDKPICard from '../AntDKPICard';
import { AntDChartCard, AntDDetailList, AntDEmptyState } from '../AntDDashboardComponents';
import AdvancedFeaturesDrilldown from '../AdvancedFeaturesDrilldown';
import { fallback, money, TREND_WINDOWS } from '../../lib/dashboardData';

export default function AdvancedAnalyticsBoard({ data = fallback }) {
  const [activeDetail, setActiveDetail] = useState('');
  const [activeBoard, setActiveBoard] = useState('overview');
  const [trendWindow, setTrendWindow] = useState('12m');
  const [trendMetric, setTrendMetric] = useState('issues');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const kpis = { ...fallback.kpis, ...(data.kpis || {}) };
  const insights = { ...fallback.auto_insights, ...(data.auto_insights || {}) };
  const impact = { ...fallback.owner_impact, ...(data.owner_impact || {}) };
  const overview = data.dashboard_overview || fallback.dashboard_overview;
  const efficiency = data.efficiency || fallback.efficiency;
  const costRatios = data.cost_ratios || fallback.cost_ratios;
  const backlog = data.backlog || fallback.backlog;

  const trendMonths = (TREND_WINDOWS || []).find((item) => item.key === trendWindow)?.months || 12;
  const trendSeries = (data.monthly_trend || []).slice(-trendMonths);
  const maxTrendCount = Math.max(...trendSeries.map((month) => month.issues || 0), 1);
  const maxTrendResolved = Math.max(...trendSeries.map((month) => month.resolved || 0), 1);
  const maxTrendDowntime = Math.max(...trendSeries.map((month) => month.downtime_hours || 0), 1);
  const trendTotals = trendSeries.reduce((acc, month) => {
    acc.issues += month.issues || 0;
    acc.resolved += month.resolved || 0;
    acc.downtime_hours += month.downtime_hours || 0;
    return acc;
  }, { issues: 0, resolved: 0, downtime_hours: 0 });
  const trendMetricLabel = {
    issues: 'Issues',
    resolved: 'Resolved',
    downtime_hours: 'Downtime hours',
  }[trendMetric] || 'Issues';
  const trendMetricTotal = trendSeries.reduce((total, month) => total + (month[trendMetric] || 0), 0);

  const downtimeItems = impact.top_loss_machines?.length ? impact.top_loss_machines.map((machine) => ({
    machine_id: machine.machine_id,
    machine_name: machine.machine_name,
    description: `${machine.downtime_hours} hrs downtime · ${machine.tickets} issue${machine.tickets === 1 ? '' : 's'}`,
    value: `${machine.downtime_hours}h`,
  })) : data.drilldown?.resolved_work || [];
  const predictedItems = insights.top_problem_machines?.map((machine) => ({
    machine_id: machine.machine_id,
    machine_name: machine.machine_name,
    description: `${machine.ticket_count} recent issue${machine.ticket_count === 1 ? '' : 's'} / repeat signal`,
    value: `${machine.ticket_count} signals`,
  })) || [];
  const trendItems = trendSeries.map((month) => ({
    machine_name: month.label,
    description: `${month.issues || 0} issues · ${month.resolved || 0} resolved · ${Math.round((month.downtime_hours || 0) * 10) / 10} downtime hrs`,
    value: month[trendMetric],
  }));
  const secondaryKpiItems = [
    { machine_name: 'Equipment', description: 'Registered assets in this workspace', value: kpis.total_machines || 0 },
    { machine_name: 'Total cost', description: 'Recorded maintenance spend', value: money.format(overview.total_cost || 0) },
    { machine_name: 'Average cost', description: 'Average maintenance cost per record', value: money.format(overview.avg_cost || 0) },
    { machine_name: 'Maintenance records', description: 'Total maintenance records captured', value: overview.maintenance_count || 0 },
    { machine_name: 'Scheduled PM coverage', description: 'Active preventive maintenance coverage', value: `${overview.scheduled_pct || 0}%` },
  ];
  const detailConfig = {
    health: { title: 'Plant health details', items: data.drilldown?.machines_down || [], empty: 'All registered machines are currently clear.' },
    uptime: { title: 'Uptime and efficiency details', items: data.drilldown?.machines_down || [], empty: 'No machine is currently reducing uptime.' },
    online: { title: 'Machines online', items: data.drilldown?.online_machines || [], empty: 'No online machine list is available yet.' },
    machines: { title: 'Machines needing attention', items: data.drilldown?.machines_down || [], empty: 'No machine is currently marked down.' },
    urgent: { title: 'Urgent issues', items: data.drilldown?.urgent_issues || [], empty: 'No urgent issue is currently open.' },
    open: { title: 'Open maintenance work', items: data.drilldown?.open_work || [], empty: 'No open maintenance work.' },
    repair: { title: 'Recent completed work behind the average', items: data.drilldown?.resolved_work || [], empty: 'No completed repair duration is available yet.' },
    downtime: { title: 'Downtime contributors', items: downtimeItems, empty: 'No downtime contributors are available yet.' },
    predicted: { title: 'Predicted failure signals', items: predictedItems, empty: 'No repeat or urgent failure signal is available yet.' },
    alerts: { title: 'AI insights and alerts', items: predictedItems.length ? predictedItems : data.drilldown?.urgent_issues || [], empty: 'No AI alert needs action right now.' },
    trend: { title: `${trendMetricLabel} trend details`, items: trendItems, empty: 'No trend data is available yet.' },
    queue: { title: 'Priority queue details', items: data.needs_attention || [], empty: 'No open priority item is waiting.' },
    secondary: { title: 'Additional KPI parameters', items: secondaryKpiItems, empty: 'No additional KPI data available.' },
  };
  const revealDetail = (detail) => {
    setActiveDetail(detail);
    window.requestAnimationFrame(() => document.getElementById('dashboard-drilldown')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const toggleBoard = (key) => setActiveBoard((prev) => (prev === key ? 'overview' : key));

  const urgencyRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const mostCritical = [...(data.needs_attention || [])].sort(
    (a, b) => (urgencyRank[a.urgency] ?? 9) - (urgencyRank[b.urgency] ?? 9),
  )[0];
  const topMachine = insights?.top_problem_machines?.[0];

  const handover = data.shift_handover || {};
  const handoverGroups = [
    ['Critical open jobs', handover.critical, '#F87171'],
    ['Waiting for spare', handover.waiting_spare, '#F59E0B'],
    ['Waiting for approval / verification', handover.waiting_approval, '#A78BFA'],
    ['Waiting for vendor', handover.waiting_vendor, '#F59E0B'],
    ['Recurring failures', handover.repeat, '#F87171'],
  ];
  const handoverPmDue = handover.pm_due || [];
  const handoverTotal = handoverGroups.reduce((n, [, items]) => n + (items?.length || 0), 0) + handoverPmDue.length;
  const buildHandoverText = () => {
    const lines = [`TurboFix shift handover — ${new Date().toLocaleString('en-IN')}`, `Machines down: ${handover.machines_down || 0}`];
    handoverGroups.forEach(([label, items]) => { if (items?.length) { lines.push(`\n${label} (${items.length}):`); items.forEach((i) => lines.push(`- ${i.machine}${i.wo ? ` [${i.wo}]` : ''}: ${i.text}`)); } });
    if (handoverPmDue.length) { lines.push(`\nPM due (${handoverPmDue.length}):`); handoverPmDue.forEach((p) => lines.push(`- ${p.machine}: ${p.text}${p.overdue ? ' (OVERDUE)' : ''}`)); }
    return lines.join('\n');
  };
  const exportDashboardData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `turbofix-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
        {/* PRIORITY ROW — the two signals the role boards have no home for:
            the live "needs attention" queue, and the MTBF/MTTR/repeat
            reliability read that otherwise only the Engineer board carries. */}
        {/* PRIORITY ROW — what needs action right now */}
        <section className="md-priority-row">
          <div className="md-card md-queue-card">
            <div className="md-card-head">
              <div>
                <span className="md-kicker">Priority queue</span>
                <h2>Needs attention</h2>
              </div>
              <a href="tickets.html" className="text-link">View all</a>
            </div>
            {mostCritical && (
              <button type="button" className="md-most-critical" onClick={() => revealDetail('urgent')}>
                <AlertTriangle size={15} />
                <span className="md-most-critical-text">
                  <strong>Most urgent · {mostCritical.machine_name}</strong>
                  <small>{mostCritical.description}</small>
                </span>
                <b className="md-queue-tag">{mostCritical.urgency}</b>
              </button>
            )}
            <div className="md-queue-list">
              {data.needs_attention?.length ? data.needs_attention
                .filter((item) => !mostCritical || item.ticket_id == null || item.ticket_id !== mostCritical.ticket_id)
                .slice(0, 3).map((item, index) => (
                <button type="button" className="md-queue-row" onClick={() => revealDetail('queue')} key={`${item.machine_name}-${index}`}>
                  <span aria-hidden="true" className={`md-dot md-dot-${item.urgency === 'High' ? 'danger' : item.urgency === 'Medium' ? 'warning' : 'ok'}`} />
                  <span className="md-queue-text">
                    <strong>{item.machine_name || 'Unknown machine'}</strong>
                    <small>{item.description || 'Maintenance issue reported'}</small>
                  </span>
                  <b className="md-queue-tag">{item.urgency || 'Open'}</b>
                </button>
              )) : <Empty text="No open issues. Your plant is clear." />}
            </div>
          </div>

          <div className="md-card md-reliability-card">
            <div className="md-card-head">
              <div>
                <span className="md-kicker">Category 1 · Reliability</span>
                <h2>Equipment health</h2>
              </div>
            </div>
            <SeverityBar
              label="MTBF"
              value={insights.mtbf_hours || 0}
              unit="h"
              pct={Math.min(100, ((insights.mtbf_hours || 0) / 48) * 100)}
              tone={(insights.mtbf_hours || 0) >= 24 ? 'ok' : (insights.mtbf_hours || 0) >= 12 ? 'warning' : 'danger'}
              hint="Time between failures — higher is better"
              onClick={() => revealDetail('predicted')}
            />
            <SeverityBar
              label="MTTR"
              value={insights.mttr_hours || 0}
              unit="h"
              pct={Math.min(100, ((insights.mttr_hours || 0) / 12) * 100)}
              tone={(insights.mttr_hours || 0) <= 4 ? 'ok' : (insights.mttr_hours || 0) <= 8 ? 'warning' : 'danger'}
              hint="Average repair time — lower is better"
              onClick={() => revealDetail('repair')}
            />
            <SeverityBar
              label="Repeat breakdowns"
              value={insights.repeat_breakdown_pct || 0}
              unit="%"
              pct={insights.repeat_breakdown_pct || 0}
              tone={insights.repeat_breakdown_pct >= 50 ? 'danger' : insights.repeat_breakdown_pct >= 20 ? 'warning' : 'ok'}
              hint="Assets failing 3+ times in 30 days"
              onClick={() => revealDetail('alerts')}
            />
            <button type="button" className="md-alert-mini" onClick={() => revealDetail('alerts')}>
              <AlertTriangle size={14} />
              <span>
                <strong>{topMachine ? topMachine.machine_name : 'No repeat-failure signal'}</strong>
                <small>{topMachine ? `${topMachine.ticket_count} issues in 30 days — inspect first` : 'No major recurring issue detected'}</small>
              </span>
            </button>
          </div>

          <div className="md-card md-impact-card">
            <div className="md-card-head">
              <div>
                <span className="md-kicker">Category 3 · Cost</span>
                <h2>Financial impact</h2>
              </div>
            </div>
            <CostComposition
              segments={[
                { label: 'Downtime cost', value: impact.downtime_cost || 0, tone: 'danger', detail: 'downtime' },
                { label: 'Maintenance cost', value: impact.maintenance_cost || 0, tone: 'blue', detail: 'secondary' },
                { label: 'Repeat-failure exposure', value: impact.repeat_loss_exposure || 0, tone: 'amber', detail: 'alerts' },
              ]}
              onSegmentClick={(s) => revealDetail(s.detail)}
            />
          </div>
        </section>

        <AdvancedFeaturesDrilldown isOpen={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}>
          <div className="dashboard-filter-row" aria-label="Dashboard filters">
            {[
              ['equipment', 'Equipment-wise'],
              ['maintenance', 'Maintenance-wise'],
              ['frequency', 'Frequency-wise'],
              ['technician', 'Technician-wise'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={activeBoard === key ? 'active' : ''}
                onClick={() => toggleBoard(key)}
                aria-pressed={activeBoard === key}
              >
                {label}
              </button>
            ))}
          </div>
        {activeBoard === 'overview' && (
          <p className="md-filter-hint">Pick a category above to drill into its detailed KPIs, charts, and breakdowns.</p>
        )}
        {activeBoard === 'technician' && (
          <div className="md-category-empty">No technician-level breakdown is available yet — this view will populate once work orders are attributed to individual technicians.</div>
        )}

        {/* CATEGORY 2 — Operational Efficiency */}
        {activeBoard === 'equipment' && (
        <section className="md-category">
          <button type="button" className="md-category-head md-category-head-btn" onClick={() => toggleBoard('equipment')}>
            <TrendingUp size={18} />
            <div>
              <span className="md-kicker">Category 2</span>
              <h2>Operational efficiency</h2>
            </div>
            <span className="md-category-collapse">Collapse ▲</span>
          </button>
          <div className="md-kpi-grid">
            <AntDKPICard
              label="PM compliance rate"
              value={kpis.pm_compliance_pct == null ? 'No PM yet' : `${kpis.pm_compliance_pct}%`}
              hint="World-class 95%+ · PMs completed on time"
              tone={kpis.pm_compliance_pct != null && kpis.pm_compliance_pct < 80 ? 'warning' : 'ok'}
              onClick={() => revealDetail('secondary')}
            />
            <AntDKPICard
              label="Planned vs reactive"
              value={efficiency.planned_pct == null ? 'No data yet' : `${efficiency.planned_pct}% planned`}
              hint="World-class 85%+ planned · 30 days"
              tone={efficiency.planned_pct != null && efficiency.planned_pct < 50 ? 'danger' : ''}
              onClick={() => revealDetail('secondary')}
            />
            <AntDKPICard
              label="Scheduled PM coverage"
              value={`${overview.scheduled_pct || 0}%`}
              hint="Active preventive schedules on the fleet"
              onClick={() => revealDetail('secondary')}
            />
            <AntDKPICard
              label="Backlog age"
              value={`${backlog.avg_age_days || 0}d avg`}
              hint={`${backlog.over_7d_count || 0} open tickets waiting over a week`}
              tone={backlog.over_7d_count > 0 ? 'warning' : ''}
              onClick={() => revealDetail('open')}
            />
          </div>
          <section className="dashboard-analysis-board md-charts-row">
            <AntDChartCard title="Open vs resolved" subtitle="Work distribution" caption="Selected window">
              <WorkMixChart open={trendTotals.issues - trendTotals.resolved} resolved={trendTotals.resolved} />
            </AntDChartCard>
            <AntDChartCard title="Top machines" subtitle="Equipment-wise risk" caption="30 days">
              <RiskBars machines={insights.top_problem_machines || []} />
            </AntDChartCard>
            <AntDChartCard title="Status mix" subtitle="Maintenance status" caption="All records">
              <MiniDonutChart items={overview.status_mix || []} />
            </AntDChartCard>
            <AntDChartCard title="Type analysis" subtitle="Maintenance-wise" caption="Top 5">
              <CategoryBars items={overview.type_mix || []} />
            </AntDChartCard>
          </section>
        </section>
        )}

        {/* CATEGORY 3 — Cost Management */}
        {activeBoard === 'maintenance' && (
        <section className="md-category">
          <button type="button" className="md-category-head md-category-head-btn" onClick={() => toggleBoard('maintenance')}>
            <DollarSign size={18} />
            <div>
              <span className="md-kicker">Category 3</span>
              <h2>Cost management</h2>
            </div>
            <span className="md-category-collapse">Collapse ▲</span>
          </button>
          <div className="md-category-export">
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportDashboardData}>Export data</button>
          </div>
          <div className="md-kpi-grid">
            <AntDKPICard
              label="Maintenance cost vs asset value"
              value={costRatios.cost_pct_of_rav == null ? 'Set replacement costs' : `${costRatios.cost_pct_of_rav}%`}
              hint="World-class 2–3% of replacement value · 12 months"
              tone={costRatios.cost_pct_of_rav != null && costRatios.cost_pct_of_rav > 8 ? 'danger' : ''}
              onClick={() => revealDetail('secondary')}
            />
            <AntDKPICard
              label="Emergency cost ratio"
              value={costRatios.emergency_cost_ratio == null ? 'No data yet' : `${costRatios.emergency_cost_ratio}%`}
              hint="World-class under 15% · share spent on unplanned work"
              tone={costRatios.emergency_cost_ratio != null && costRatios.emergency_cost_ratio > 45 ? 'danger' : ''}
              onClick={() => revealDetail('secondary')}
            />
            <AntDKPICard label="Total maintenance spend" value={money.format(overview.total_cost || 0)} hint="All recorded maintenance records" onClick={() => revealDetail('secondary')} />
            <AntDKPICard label="Average cost per record" value={money.format(overview.avg_cost || 0)} hint={`${overview.maintenance_count || 0} maintenance records`} onClick={() => revealDetail('secondary')} />
          </div>
          <section className="dashboard-analysis-board md-charts-row md-charts-row-cost">
            <AntDChartCard title="Monthly spend" subtitle="Cost trend" caption="12 months">
              <CostBars items={overview.cost_by_month || []} />
            </AntDChartCard>
            {impact.top_loss_machines?.length > 0 && (
              <AntDChartCard title="Top loss-making machines" subtitle="Where the money goes" caption="30 days">
                <AntDDetailList
                  items={impact.top_loss_machines.slice(0, 4).map((m, i) => ({ ...m, id: m.machine_id, index: i }))}
                  renderItem={(machine, index) => (
                    <a href={`machines.html?machine=${encodeURIComponent(machine.machine_id)}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <b style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem', color: index === 0 ? '#F87171' : 'var(--slate)', minWidth: '20px' }}>{index + 1}</b>
                        <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{machine.machine_name}</strong><small>{machine.downtime_hours} hrs downtime · {machine.tickets} issue{machine.tickets === 1 ? '' : 's'}</small></span>
                      </span>
                      <b style={{ color: '#F87171' }}>{money.format(machine.cost)}</b>
                    </a>
                  )}
                  emptyMessage="No loss-making machines detected"
                />
              </AntDChartCard>
            )}
          </section>
        </section>
        )}

        {/* CATEGORY 4 — Strategic Planning */}
        {activeBoard === 'frequency' && (
        <section className="md-category">
          <button type="button" className="md-category-head md-category-head-btn" onClick={() => toggleBoard('frequency')}>
            <Layers size={18} />
            <div>
              <span className="md-kicker">Category 4</span>
              <h2>Strategic planning</h2>
            </div>
            <span className="md-category-collapse">Collapse ▲</span>
          </button>
          <section className="decision-panel dashboard-trend-panel dashboard-trend-strip">
            <div className="decision-panel-heading dashboard-trend-heading">
              <div>
                <div className="decision-card-kicker">Trend strip</div>
                <h2>Last 1 year, customizable</h2>
              </div>
              <div className="dashboard-trend-switch" role="tablist" aria-label="Trend range">
                {TREND_WINDOWS.map((item) => (
                  <button key={item.key} type="button" className={trendWindow === item.key ? 'active' : ''} onClick={() => setTrendWindow(item.key)}>{item.label}</button>
                ))}
              </div>
            </div>
            <div className="dashboard-trend-strip-shell">
              <div className="dashboard-trend-strip-copy">
                <strong>{trendMetricLabel}</strong>
                <span>{trendSeries.length ? `${trendTotals.issues} issues · ${trendTotals.resolved} resolved · ${Math.round(trendTotals.downtime_hours * 10) / 10}h downtime` : 'No trend history yet.'}</span>
              </div>
              <div className="dashboard-trend-switch dashboard-trend-metric-switch" role="tablist" aria-label="Trend metric">
                {[
                  ['issues', 'Issues'],
                  ['resolved', 'Resolved'],
                  ['downtime_hours', 'Downtime'],
                ].map(([key, label]) => (
                  <button key={key} type="button" className={trendMetric === key ? 'active' : ''} onClick={() => setTrendMetric(key)}>{label}</button>
                ))}
              </div>
            </div>
            <button type="button" className="dashboard-trend-click-layer" onClick={() => revealDetail('trend')} aria-label="View trend details">
              <div className="dashboard-trend-strip-bars">
                {trendSeries.length ? trendSeries.map((month) => {
                  const value = month[trendMetric] || 0;
                  const maxValue = trendMetric === 'resolved' ? maxTrendResolved : trendMetric === 'downtime_hours' ? maxTrendDowntime : maxTrendCount;
                  return (
                    <div className="dashboard-trend-strip-bar" key={month.key}>
                      <span className="dashboard-trend-strip-fill" style={{ height: `${Math.max(10, (value / Math.max(maxValue, 1)) * 100)}%` }} />
                      <small>{month.label}</small>
                    </div>
                  );
                }) : <Empty text="No trend history yet." />}
              </div>
            </button>
            <div className="dashboard-trend-strip-footer">
              <strong>{trendMetricTotal}</strong>
              <small>Total over selected window</small>
            </div>
          </section>

          {data.repair_replace?.length > 0 && (
            <section className="decision-panel">
              <div className="decision-panel-heading"><div><div className="decision-card-kicker">Capital decision signal</div><h2>Repair vs. replacement</h2></div><span className="trend-caption">Last 12 months · you decide</span></div>
              <AntDDetailList
                items={data.repair_replace}
                renderItem={(m) => (
                  <a href={`machines.html?machine=${encodeURIComponent(m.machine_id)}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{m.machine_name}</strong>
                      <small>{money.format(m.annual_cost)} maintenance{m.replacement_cost > 0 ? ` · ${m.ratio_pct}% of ${money.format(m.replacement_cost)} replacement` : ' · set a replacement cost to compare'} · {m.breakdowns} breakdown{m.breakdowns === 1 ? '' : 's'}</small>
                    </span>
                    <b style={{ color: m.recommendation === 'Consider replacement' ? '#F87171' : '#FBBF24', whiteSpace: 'nowrap' }}>{m.recommendation}</b>
                  </a>
                )}
                emptyMessage="No repair/replacement recommendations at this time"
              />
            </section>
          )}

          {(data.vendor_amc?.alerts?.length > 0 || data.vendor_amc?.outsourced_open > 0) && (
            <section className="decision-panel">
              <div className="decision-panel-heading"><div><div className="decision-card-kicker">Contracts &amp; vendors</div><h2>AMC &amp; warranty</h2></div><span className="trend-caption">{data.vendor_amc.outsourced_open > 0 ? `${data.vendor_amc.outsourced_open} open at vendor` : 'Next 60 days'}</span></div>
              {data.vendor_amc.alerts?.length ? (
                <div className="dashboard-detail-list">
                  {data.vendor_amc.alerts.map((a, index) => {
                    const expired = a.days < 0;
                    const tone = expired ? '#F87171' : a.days <= 30 ? '#FBBF24' : 'var(--slate)';
                    return (
                      <a href={`machines.html?machine=${encodeURIComponent(a.machine_id)}`} key={`${a.machine_id}-${a.type}-${index}`}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <b style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: tone, border: `1px solid ${tone}`, borderRadius: '999px', padding: '2px 8px' }}>{a.type}</b>
                          <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{a.machine}</strong><small>{a.party} · expires {new Date(a.expiry).toLocaleDateString('en-IN')}</small></span>
                        </span>
                        <b style={{ color: tone, whiteSpace: 'nowrap' }}>{expired ? `Expired ${Math.abs(a.days)}d ago` : a.days === 0 ? 'Expires today' : `${a.days}d left`}</b>
                      </a>
                    );
                  })}
                </div>
              ) : <Empty text="No AMC or warranty expiring in the next 60 days." />}
            </section>
          )}

          <section className="decision-columns">
            <div className="decision-panel">
              <div className="decision-panel-heading"><div><div className="decision-card-kicker">KPI trust layer</div><h2>Data quality <LeanTag term="Poka-Yoke" kanji="ポカヨケ" meaning="Poka-Yoke — mistake-proofing. These checks stop bad records from corrupting your KPIs." /></h2></div><span className="trend-caption">{data.data_quality?.length || 0} to review</span></div>
              {data.data_quality?.length ? data.data_quality.slice(0, 8).map((f, index) => (
                <a className="attention-row" href={f.machine_id ? `machines.html?machine=${encodeURIComponent(f.machine_id)}` : 'tickets.html'} key={`${f.type}-${index}`}>
                  <span aria-hidden="true" className="status-dot warning" />
                  <b className="attention-status warning">Review</b>
                  <div><strong>{f.machine}{f.wo ? ` · ${f.wo}` : ''}</strong><span>{f.type} — {f.detail}</span></div>
                </a>
              )) : <Empty text="Records look clean. KPIs are trustworthy." />}
            </div>
            <div className="decision-panel">
              <div className="decision-panel-heading"><div><div className="decision-card-kicker">Audit trail</div><h2>Recent changes</h2></div><span className="trend-caption">Append-only</span></div>
              {data.audit_log?.length ? data.audit_log.slice(0, 8).map((entry) => {
                const d = entry.details || {};
                const label = entry.action === 'created' ? `Work order created${d.wo ? ` (${d.wo})` : ''}`
                  : entry.action === 'closed' ? `Closed${d.wo ? ` (${d.wo})` : ''}`
                  : entry.action === 'lifecycle_changed' ? `Stage: ${d.from || '—'} → ${d.to || '—'}`
                  : `Status: ${d.from || '—'} → ${d.to || '—'}`;
                return (
                  <div className="attention-row" key={entry.id}>
                    <span aria-hidden="true" className={`status-dot ${entry.action === 'closed' ? 'success' : entry.action === 'created' ? 'warning' : ''}`} />
                    <div><strong>{label}</strong><span>{entry.actor || 'system'} · {new Date(entry.created_at).toLocaleString('en-IN')}</span></div>
                  </div>
                );
              }) : <Empty text="No recorded changes yet." />}
            </div>
          </section>

          <section className="decision-panel">
            <div className="decision-panel-heading">
              <div><div className="decision-card-kicker">For the incoming shift</div><h2>Shift handover</h2></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { try { navigator.clipboard?.writeText(buildHandoverText()); } catch { /* clipboard unavailable */ } }}>Copy brief</button>
            </div>
            {handoverTotal === 0 ? <AntDEmptyState message="Nothing pending — clean handover." type="success" /> : (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{handover.machines_down || 0} machine{handover.machines_down === 1 ? '' : 's'} currently down. Everything the next shift must not miss:</div>
                {handoverGroups.map(([label, items, color]) => items?.length ? (
                  <div key={label}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color, fontWeight: 700, marginBottom: '6px' }}>{label} · {items.length}</div>
                    <div className="dashboard-detail-list">
                      {items.map((i) => <a href={`machines.html?machine=${encodeURIComponent(i.machine_id)}`} key={i.id}><span><strong>{i.machine}</strong><small>{i.text}</small></span>{i.wo && <b style={{ color: 'var(--slate)', fontFamily: 'monospace' }}>{i.wo}</b>}</a>)}
                    </div>
                  </div>
                ) : null)}
                {handoverPmDue.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FBBF24', fontWeight: 700, marginBottom: '6px' }}>PM due · {handoverPmDue.length}</div>
                    <div className="dashboard-detail-list">
                      {handoverPmDue.map((p) => <a href={`machines.html?machine=${encodeURIComponent(p.machine_id)}`} key={p.id}><span><strong>{p.machine}</strong><small>{p.text}</small></span><b style={{ color: p.overdue ? '#F87171' : '#FBBF24' }}>{p.overdue ? 'Overdue' : 'Due'}</b></a>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
        )}
        </AdvancedFeaturesDrilldown>
        <details className="dashboard-secondary-kpis">
          <summary>
            <span>More context</span>
            <small>Equipment count, PM coverage, and per-record averages</small>
          </summary>
          <section className="dashboard-scoreboard" aria-label="Additional maintenance snapshot">
            <ScoreTile label="Equipment" value={kpis.total_machines || 0} detail="Registered assets" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Total cost" value={money.format(overview.total_cost || 0)} detail="Recorded maintenance spend" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Avg. cost" value={money.format(overview.avg_cost || 0)} detail="Per maintenance record" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Maintenance" value={overview.maintenance_count || 0} detail="Total records" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Scheduled" value={`${overview.scheduled_pct || 0}%`} detail="Active PM coverage" tone="green" onClick={() => revealDetail('secondary')} />
          </section>
        </details>

        {activeDetail && <section className="decision-panel dashboard-drilldown" id="dashboard-drilldown" tabIndex="-1" style={{ marginBottom: '20px' }}>
          <div className="decision-panel-heading"><div><div className="decision-card-kicker">Number explained</div><h2>{detailConfig[activeDetail].title}</h2></div><button type="button" className="dashboard-drilldown-close" onClick={() => setActiveDetail('')}>Close</button></div>
          {detailConfig[activeDetail].items.length ? <div className="dashboard-detail-list">{detailConfig[activeDetail].items.map((item, index) => <a href={item.machine_id ? `machines.html?machine=${encodeURIComponent(item.machine_id)}` : item.ticket_id ? 'tickets.html' : '#dashboard-drilldown'} key={`${item.ticket_id || item.machine_id || item.machine_name || index}-${index}`}><span><strong>{item.machine_name || 'Dashboard item'}</strong><small>{item.location || item.description || 'Maintenance attention required'}</small></span><b>{item.value ?? (item.open_count != null ? `${item.open_count} open` : item.hours != null ? `${item.hours}h` : item.urgency || item.status || 'Open')}</b></a>)}</div> : <div className="decision-empty">{detailConfig[activeDetail].empty}</div>}
        </section>}
    </>
  );
}

// Lean/TPS principle tag. English stays primary everywhere; the Japanese term
// rides along as a kicker so nobody has to learn a word to use the page.
function LeanTag({ term, kanji, meaning, tone = '' }) {
  return (
    <span className={`lean-tag ${tone}`} title={meaning}>
      <span className="lean-tag-term">{term}</span>
      <span className="lean-tag-kanji">{kanji}</span>
    </span>
  );
}
function Empty({ text }) { return <p className="decision-empty">{text}</p>; }
function ScoreTile({ label, value, detail, tone = '', onClick }) {
  return (
    <button type="button" className={`dashboard-score-tile dashboard-click-card ${tone}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}
function WorkMixChart({ open = 0, resolved = 0 }) {
  const safeOpen = Math.max(0, open || 0);
  const safeResolved = Math.max(0, resolved || 0);
  const total = Math.max(1, safeOpen + safeResolved);
  const resolvedPct = Math.round((safeResolved / total) * 100);
  return (
    <div className="dashboard-work-mix">
      <div className="dashboard-donut" style={{ '--resolved': `${resolvedPct}%` }} aria-label={`${resolvedPct}% resolved`}>
        <strong>{resolvedPct}%</strong>
        <span>resolved</span>
      </div>
      <div className="dashboard-chart-legend">
        <span><i className="legend-open" />Open <b>{safeOpen}</b></span>
        <span><i className="legend-resolved" />Resolved <b>{safeResolved}</b></span>
      </div>
    </div>
  );
}

function MiniDonutChart({ items = [] }) {
  const rows = items.filter((item) => item.value > 0);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const open = (rows || []).find((item) => item.label === 'open')?.value || 0;
  const openPct = total ? Math.round((open / total) * 100) : 0;
  if (!rows.length) return <Empty text="No maintenance status yet." />;
  return (
    <div className="dashboard-work-mix compact">
      <div className="dashboard-donut status" style={{ '--resolved': `${Math.max(0, 100 - openPct)}%` }}>
        <strong>{openPct}%</strong>
        <span>open</span>
      </div>
      <div className="dashboard-chart-legend">
        {rows.slice(0, 4).map((item) => (
          <span key={item.label}><i className={item.label === 'open' ? 'legend-open' : 'legend-resolved'} />{item.label} <b>{item.value}</b></span>
        ))}
      </div>
    </div>
  );
}

function CategoryBars({ items = [] }) {
  const max = Math.max(...items.map((item) => item.value || 0), 1);
  if (!items.length) return <Empty text="No maintenance type data yet." />;
  return (
    <div className="dashboard-category-bars">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <div><i style={{ width: `${Math.max(8, ((item.value || 0) / max) * 100)}%` }} /></div>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function CostBars({ items = [] }) {
  const rows = items.slice(-12);
  const max = Math.max(...rows.map((item) => item.cost || 0), 1);
  if (!rows.length) return <Empty text="No cost trend yet." />;
  return (
    <div className="dashboard-cost-bars">
      {rows.map((item) => (
        <div key={item.key}>
          <span style={{ height: `${Math.max(8, ((item.cost || 0) / max) * 100)}%` }} />
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function RiskBars({ machines = [] }) {
  const rows = machines.slice(0, 5);
  const max = Math.max(...rows.map((machine) => machine.ticket_count || 0), 1);
  if (!rows.length) return <Empty text="No repeat-failure signal yet." />;
  return (
    <div className="dashboard-risk-bars">
      {rows.map((machine, index) => (
        <a href={`machines.html?machine=${encodeURIComponent(machine.machine_id)}`} key={machine.machine_id}>
          <span>{machine.machine_name || machine.machine_id}</span>
          <div><i style={{ width: `${Math.max(8, ((machine.ticket_count || 0) / max) * 100)}%` }} /></div>
          <b>{machine.ticket_count || 0}</b>
          <small>#{index + 1}</small>
        </a>
      ))}
    </div>
  );
}

// Horizontal severity bar — turns a bare number into an instant good/warn/bad read.
function SeverityBar({ label, value, unit = '', pct, tone = '', hint, onClick }) {
  const safePct = Math.max(4, Math.min(100, pct));
  return (
    <button type="button" className={`md-severity-row ${tone}`} onClick={onClick} title={hint}>
      <span className="md-severity-label">{label}</span>
      <span className="md-severity-track"><span className="md-severity-fill" style={{ width: `${safePct}%` }} /></span>
      <span className="md-severity-value">{value}{unit}</span>
    </button>
  );
}

// Stacked composition bar — shows cost proportions at a glance instead of 3 flat numbers.
function CostComposition({ segments, onSegmentClick }) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + Math.max(0, s.value), 0));
  return (
    <div className="md-cost-composition">
      <div className="md-cost-comp-bar">
        {segments.map((s) => (
          <span
            key={s.label}
            className={`md-cost-comp-seg ${s.tone}`}
            style={{ width: `${Math.max(0, (s.value / total) * 100)}%` }}
            title={`${s.label}: ${money.format(s.value)}`}
          />
        ))}
      </div>
      <div className="md-cost-comp-legend">
        {segments.map((s) => (
          <button type="button" key={s.label} className="md-cost-comp-item" onClick={() => onSegmentClick?.(s)}>
            <span className={`md-cost-comp-dot ${s.tone}`} />
            <span className="md-cost-comp-label">{s.label}</span>
            <b className={`md-cost-comp-value ${s.tone}`}>{money.format(s.value)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
