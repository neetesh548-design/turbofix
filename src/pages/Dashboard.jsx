import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';

const fallback = {
  kpis: { machines_down: 0, urgent_open: 0, open_tickets: 0, plant_health_pct: 100, avg_hours_to_fix: 0, total_machines: 0, pm_compliance_pct: null },
  auto_insights: { mtbf_hours: 0, mttr_hours: 0, repeat_breakdown_pct: 0, top_problem_machines: [] },
  owner_impact: { downtime_hours: 0, downtime_cost: 0, maintenance_cost: 0, repeat_loss_exposure: 0, cost_coverage_pct: 0, top_cost_machine: null, top_loss_machines: [], availability_pct: 100 },
  drilldown: { machines_down: [], urgent_issues: [], open_work: [], resolved_work: [] },
  shift_handover: { machines_down: 0, critical: [], waiting_spare: [], waiting_approval: [], waiting_vendor: [], repeat: [], pm_due: [] },
  needs_attention: [], recent_activity: [], weekly_trend: [],
};

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function ticketHours(ticket, now = new Date()) {
  const opened = new Date(ticket.created_at || ticket.reported_at || '');
  if (Number.isNaN(opened.getTime())) return 0;
  const resolvedValue = ticket.resolved_at || ticket.closed_at;
  const resolved = resolvedValue ? new Date(resolvedValue) : now;
  if (Number.isNaN(resolved.getTime())) return 0;
  return Math.max(0, (resolved.getTime() - opened.getTime()) / 3_600_000);
}

function computeMaintenanceInsights(machines, tickets, now = new Date()) {
  const machineMap = Object.fromEntries(machines.map((machine) => [machine.id, machine.name || machine.id]));
  const resolvedDurations = tickets
    .filter((ticket) => ['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase()))
    .map((ticket) => ticketHours(ticket, now))
    .filter((hours) => hours > 0);
  const mttr = resolvedDurations.length
    ? resolvedDurations.reduce((total, hours) => total + hours, 0) / resolvedDurations.length
    : 0;

  const timesByMachine = {};
  tickets.forEach((ticket) => {
    const opened = new Date(ticket.created_at || ticket.reported_at || '');
    if (!ticket.machine_id || Number.isNaN(opened.getTime())) return;
    (timesByMachine[ticket.machine_id] ||= []).push(opened);
  });
  const intervals = [];
  Object.values(timesByMachine).forEach((times) => {
    times.sort((a, b) => a - b);
    for (let index = 1; index < times.length; index += 1) {
      const hours = (times[index] - times[index - 1]) / 3_600_000;
      if (hours > 0.5) intervals.push(hours);
    }
  });

  const cutoff = new Date(now.getTime() - (30 * 24 * 3_600_000));
  const recentCounts = {};
  tickets.forEach((ticket) => {
    const opened = new Date(ticket.created_at || ticket.reported_at || '');
    if (ticket.machine_id && !Number.isNaN(opened.getTime()) && opened >= cutoff) {
      recentCounts[ticket.machine_id] = (recentCounts[ticket.machine_id] || 0) + 1;
    }
  });
  const activeMachines = Object.keys(recentCounts).length;
  const repeatMachines = Object.values(recentCounts).filter((count) => count >= 3).length;
  const topProblemMachines = Object.entries(recentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([machineId, count]) => ({ machine_id: machineId, machine_name: machineMap[machineId] || machineId, ticket_count: count }));

  return {
    mtbf_hours: intervals.length ? Math.round((intervals.reduce((total, hours) => total + hours, 0) / intervals.length) * 10) / 10 : 0,
    mttr_hours: Math.round(mttr * 10) / 10,
    repeat_breakdown_pct: activeMachines ? Math.round((repeatMachines / activeMachines) * 100) : 0,
    top_problem_machines: topProblemMachines,
  };
}

function computeOwnerImpact(machines, tickets, now = new Date()) {
  const cutoff = new Date(now.getTime() - (30 * 24 * 3_600_000));
  const machineMap = Object.fromEntries(machines.map((machine) => [machine.id, machine]));
  const recent = tickets.filter((ticket) => {
    const opened = new Date(ticket.created_at || ticket.reported_at || '');
    return !Number.isNaN(opened.getTime()) && opened >= cutoff;
  });
  const counts = {};
  const costs = {};
  const downtimeByMachine = {};
  let downtimeHours = 0;
  let downtimeCost = 0;
  let maintenanceCost = 0;

  recent.forEach((ticket) => {
    const machine = machineMap[ticket.machine_id] || {};
    // Prefer the durable downtime captured at closure (§3.4); fall back to open duration.
    const hours = ticket.downtime_minutes != null ? asNumber(ticket.downtime_minutes) / 60 : ticketHours(ticket, now);
    const cost = hours * asNumber(machine.hourly_downtime_cost);
    downtimeHours += hours;
    downtimeCost += cost;
    maintenanceCost += asNumber(ticket.maintenance_cost)
      || (asNumber(ticket.parts_cost) + asNumber(ticket.labor_cost) + asNumber(ticket.repair_cost));
    counts[ticket.machine_id] = (counts[ticket.machine_id] || 0) + 1;
    costs[ticket.machine_id] = (costs[ticket.machine_id] || 0) + cost;
    downtimeByMachine[ticket.machine_id] = (downtimeByMachine[ticket.machine_id] || 0) + hours;
  });

  const repeatLossExposure = Object.entries(costs)
    .filter(([machineId]) => (counts[machineId] || 0) >= 3)
    .reduce((total, [, cost]) => total + cost, 0);
  const [topId, topCost = 0] = Object.entries(costs).sort((a, b) => b[1] - a[1])[0] || [];
  const configured = machines.filter((machine) => asNumber(machine.hourly_downtime_cost) > 0).length;

  // Top loss-making machines — ranked by 30-day production-loss cost.
  const topLossMachines = Object.entries(costs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([machineId, cost]) => ({
      machine_id: machineId,
      machine_name: machineMap[machineId]?.name || machineId,
      cost: Math.round(cost),
      downtime_hours: Math.round((downtimeByMachine[machineId] || 0) * 10) / 10,
      tickets: counts[machineId] || 0,
    }))
    .filter((m) => m.cost > 0 || m.downtime_hours > 0);

  // Machine availability (30-day window, 24×7 basis): uptime / scheduled time.
  const windowHours = 30 * 24;
  const availabilityPct = machines.length
    ? Math.round(
        (machines.reduce((total, machine) => total + Math.max(0, 1 - (downtimeByMachine[machine.id] || 0) / windowHours), 0) / machines.length) * 100,
      )
    : 100;

  return {
    downtime_hours: Math.round(downtimeHours * 10) / 10,
    downtime_cost: Math.round(downtimeCost),
    maintenance_cost: Math.round(maintenanceCost),
    repeat_loss_exposure: Math.round(repeatLossExposure),
    cost_coverage_pct: machines.length ? Math.round((configured / machines.length) * 100) : 0,
    top_cost_machine: topId ? { machine_id: topId, machine_name: machineMap[topId]?.name || topId, cost: Math.round(topCost) } : null,
    top_loss_machines: topLossMachines,
    availability_pct: availabilityPct,
  };
}

// Shift handover (roadmap §7.3): auto-compiled so nothing critical slips between
// shifts. Everything is derived from live tickets and PM schedules — zero entry.
function computeShiftHandover(machines, tickets, pmSchedules, now = new Date()) {
  const nameOf = (id) => machines.find((m) => m.id === id)?.name || 'Unknown machine';
  const open = tickets.filter((t) => String(t.status || '').toLowerCase() === 'open');
  const urgencyOf = (t) => {
    const s = t.ai_summary;
    return String((s && typeof s === 'object' && s.urgency) || t.urgency || '').toLowerCase();
  };
  const stageOf = (t) => String(t.lifecycle_stage || '').toLowerCase();
  const item = (t) => ({
    id: t.id,
    wo: t.wo_number || null,
    machine: nameOf(t.machine_id),
    machine_id: t.machine_id,
    text: t.issue_text || (typeof t.ai_summary === 'object' ? t.ai_summary?.summary : '') || 'Maintenance issue',
  });
  return {
    machines_down: new Set(open.map((t) => t.machine_id)).size,
    critical: open.filter((t) => ['high', 'critical'].includes(urgencyOf(t))).map(item),
    waiting_spare: open.filter((t) => stageOf(t) === 'waiting_spare').map(item),
    waiting_approval: open.filter((t) => ['waiting_approval', 'verification_pending'].includes(stageOf(t))).map(item),
    waiting_vendor: open.filter((t) => stageOf(t) === 'waiting_vendor' || t.outsource_vendor).map(item),
    repeat: open.filter((t) => t.repeat_failure_flag).map(item),
    pm_due: (pmSchedules || [])
      .filter((p) => p.active !== false && p.next_due_at && new Date(p.next_due_at) <= now)
      .map((p) => ({ id: p.id, machine: nameOf(p.machine_id), machine_id: p.machine_id, text: p.title, overdue: new Date(p.next_due_at) < now })),
  };
}

async function fetchDashboardData() {
  const [machinesRes, ticketsRes, factoryRes, pmLogsRes, pmSchedulesRes] = await Promise.all([
    supabase.from('machines').select('*'),
    supabase.from('tickets').select('*'),
    supabase.from('factories').select('name').limit(1),
    supabase.from('pm_logs').select('on_time'),
    supabase.from('pm_schedules').select('id,machine_id,title,next_due_at,active'),
  ]);

  const machines = machinesRes.data || [];
  const tickets = ticketsRes.data || [];
  const companyName = factoryRes.data?.[0]?.name || 'TurboFix';
  const pmLogs = pmLogsRes.data || [];
  const pmSchedules = pmSchedulesRes.data || [];
  const pmCompliancePct = pmLogs.length
    ? Math.round((pmLogs.filter((log) => log.on_time).length / pmLogs.length) * 100)
    : null;

  const openTickets = tickets.filter(t => t.status === 'open');
  const machinesWithOpen = new Set(openTickets.map(t => t.machine_id));
  const machinesDown = machinesWithOpen.size;
  const urgentOpen = openTickets.filter(t => {
    const s = t.ai_summary;
    return s && typeof s === 'object' && (s.urgency === 'high' || s.urgency === 'critical');
  }).length;
  const healthPct = machines.length > 0 ? Math.round(((machines.length - machinesDown) / machines.length) * 100) : 100;

  const machineMap = {};
  machines.forEach(m => { machineMap[m.id] = m.name; });

  const needsAttention = openTickets.map(t => {
    const summary = t.ai_summary || {};
    return {
      machine_name: machineMap[t.machine_id] || 'Unknown',
      description: t.issue_text || summary.summary || '',
      urgency: (summary.urgency || 'Medium').charAt(0).toUpperCase() + (summary.urgency || 'medium').slice(1),
      reported_at: t.created_at,
    };
  });
  const ownerImpact = computeOwnerImpact(machines, tickets);
  const maintenanceInsights = computeMaintenanceInsights(machines, tickets);
  const shiftHandover = computeShiftHandover(machines, tickets, pmSchedules);
  const resolvedWork = tickets.filter((ticket) => ['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase())).map((ticket) => ({
    ticket_id: ticket.id,
    machine_id: ticket.machine_id,
    machine_name: machineMap[ticket.machine_id] || 'Unknown',
    description: ticket.issue_text || (typeof ticket.ai_summary === 'object' ? ticket.ai_summary?.summary : ticket.ai_summary) || 'Maintenance work',
    hours: Math.round(ticketHours(ticket) * 10) / 10,
  }));
  const averageRepairHours = resolvedWork.length
    ? Math.round((resolvedWork.reduce((total, item) => total + item.hours, 0) / resolvedWork.length) * 10) / 10
    : 0;
  const machineDetails = machinesWithOpen.size ? machines.filter((machine) => machinesWithOpen.has(machine.id)).map((machine) => ({
    machine_id: machine.id, machine_name: machine.name, location: machine.location,
    open_count: openTickets.filter((ticket) => ticket.machine_id === machine.id).length,
  })) : [];

  return {
    company_name: companyName,
    kpis: {
      open_tickets: openTickets.length,
      machines_down: machinesDown,
      urgent_open: urgentOpen,
      total_machines: machines.length,
      plant_health_pct: healthPct,
      avg_hours_to_fix: averageRepairHours,
      total_tickets: tickets.length,
      pm_compliance_pct: pmCompliancePct,
    },
    auto_insights: maintenanceInsights,
    owner_impact: ownerImpact,
    drilldown: {
      machines_down: machineDetails,
      urgent_issues: needsAttention.filter((item) => item.urgency === 'High' || item.urgency === 'Critical'),
      open_work: needsAttention,
      resolved_work: resolvedWork,
    },
    needs_attention: needsAttention,
    shift_handover: shiftHandover,
    recent_activity: [],
    weekly_trend: [],
  };
}

export default function Dashboard() {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDetail, setActiveDetail] = useState('');

  useEffect(() => {
    document.title = 'Dashboard | TurboFix';
    let mounted = true;
    fetchDashboardData()
      .then((next) => {
        if (mounted) setData({ ...fallback, ...next, kpis: { ...fallback.kpis, ...next.kpis }, auto_insights: { ...fallback.auto_insights, ...next.auto_insights } });
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const { kpis, auto_insights: insights, owner_impact: impact } = data;
  const topMachine = insights.top_problem_machines?.[0];
  const healthTone = kpis.plant_health_pct >= 90 ? 'success' : kpis.plant_health_pct >= 70 ? 'warning' : 'danger';
  const detailConfig = {
    health: { title: 'Plant health details', items: data.drilldown?.machines_down || [], empty: 'All registered machines are currently clear.' },
    machines: { title: 'Machines needing attention', items: data.drilldown?.machines_down || [], empty: 'No machine is currently marked down.' },
    urgent: { title: 'Urgent issues', items: data.drilldown?.urgent_issues || [], empty: 'No urgent issue is currently open.' },
    open: { title: 'Open maintenance work', items: data.drilldown?.open_work || [], empty: 'No open maintenance work.' },
    repair: { title: 'Recent completed work behind the average', items: data.drilldown?.resolved_work || [], empty: 'No completed repair duration is available yet.' },
  };
  const revealDetail = (detail) => {
    setActiveDetail(detail);
    window.requestAnimationFrame(() => document.getElementById('dashboard-drilldown')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  return (
    <AppShell active="overview">
      <div className="decision-page">
        <div className="decision-heading">
          <div>
            <span className="eyebrow eyebrow-light">AI maintenance operating system</span>
            <h1>Decision Center</h1>
            <p>See what needs attention, why it matters, and what to do next.</p>
          </div>
          <div className="decision-actions">
            <a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Plan a shutdown</a>
            <a className="btn btn-primary btn-sm" href="assistant.html">Ask the AI assistant</a>
          </div>
        </div>

        {error && <div className="decision-alert">{error}. Showing a safe empty-state until the API is available.</div>}
        <section className="decision-hero-grid">
          <button type="button" className={`decision-health-card clickable ${healthTone}`} onClick={() => revealDetail('health')}>
            <div className="decision-card-kicker">Plant health</div>
            <div className="decision-health-value">{loading ? '—' : `${kpis.plant_health_pct}%`}</div>
            <p>{kpis.machines_down || 0} machines currently need attention out of {kpis.total_machines || 0}.</p>
            <div className="decision-progress"><span style={{ width: `${Math.min(100, kpis.plant_health_pct || 0)}%` }} /></div>
            <small className="decision-click-hint">View affected machines →</small>
          </button>
          <div className="decision-next-card">
            <div className="decision-card-kicker">Recommended next action</div>
            <h2>{topMachine ? `Inspect ${topMachine.machine_name || topMachine.machine_id}` : 'Start with your first machine'}</h2>
            <p>{topMachine ? `${topMachine.ticket_count} recent issues make this your highest-risk machine.` : 'Register machines, upload manuals, and let TurboFix build your maintenance baseline.'}</p>
            <a href={topMachine ? `machines.html?machine=${encodeURIComponent(topMachine.machine_id)}` : 'machines.html'} className="text-link">Open machine workspace →</a>
          </div>
        </section>

        <div className="decision-section-label">Needs action now</div>
        <section className="decision-kpi-grid">
          <Metric label="Machines down" value={kpis.machines_down} tone="danger" onClick={() => revealDetail('machines')} />
          <Metric label="Urgent issues" value={kpis.urgent_open} tone="warning" onClick={() => revealDetail('urgent')} />
          <Metric label="Open work" value={kpis.open_tickets} onClick={() => revealDetail('open')} />
          <Metric label="Avg. time to fix" value={`${kpis.avg_hours_to_fix || 0}h`} onClick={() => revealDetail('repair')} />
        </section>

        {activeDetail && <section className="decision-panel dashboard-drilldown" id="dashboard-drilldown" tabIndex="-1">
          <div className="decision-panel-heading"><div><div className="decision-card-kicker">Number explained</div><h2>{detailConfig[activeDetail].title}</h2></div><button type="button" className="dashboard-drilldown-close" onClick={() => setActiveDetail('')}>Close</button></div>
          {detailConfig[activeDetail].items.length ? <div className="dashboard-detail-list">{detailConfig[activeDetail].items.map((item, index) => <a href={item.machine_id ? `machines.html?machine=${encodeURIComponent(item.machine_id)}` : 'tickets.html'} key={`${item.ticket_id || item.machine_id || index}-${index}`}><span><strong>{item.machine_name || 'Unknown machine'}</strong><small>{item.location || item.description || 'Maintenance attention required'}</small></span><b>{item.open_count != null ? `${item.open_count} open` : item.hours != null ? `${item.hours}h` : item.urgency || 'Open'}</b></a>)}</div> : <div className="decision-empty">{detailConfig[activeDetail].empty}</div>}
        </section>}

        <div className="decision-section-label">Maintenance intelligence</div>
        <section className="decision-insight-grid">
          <Insight label="Availability" value={`${impact.availability_pct ?? 100}%`} detail="Uptime over 30 days (24×7 basis)" />
          <Insight label="MTBF" value={`${insights.mtbf_hours || 0} hrs`} detail="Mean time between failures" />
          <Insight label="MTTR" value={`${insights.mttr_hours || 0} hrs`} detail="Mean time to repair" />
          <Insight label="PM compliance" value={kpis.pm_compliance_pct == null ? 'No PM yet' : `${kpis.pm_compliance_pct}%`} detail="Preventive tasks completed on time" />
          <Insight label="Repeat breakdowns" value={`${insights.repeat_breakdown_pct || 0}%`} detail="Machines with 3+ issues in 30 days" />
          <Insight label="#1 risk" value={topMachine?.machine_name || 'No data yet'} detail={topMachine ? `${topMachine.ticket_count} issues in the last 30 days` : 'Build history to see risk'} />
        </section>

        <div className="decision-section-label">Owner impact · last 30 days</div>
        <section className="decision-insight-grid">
          <Insight label="Downtime" value={`${impact.downtime_hours || 0} hrs`} detail="Automatically calculated from tickets" />
          <Insight label="Estimated production loss" value={money.format(impact.downtime_cost || 0)} detail="Based on each machine's hourly value" />
          <Insight label="Maintenance spend" value={money.format(impact.maintenance_cost || 0)} detail="Parts, labour and repair costs recorded" />
          <Insight label="Repeat-loss exposure" value={money.format(impact.repeat_loss_exposure || 0)} detail="Cost linked to machines with 3+ issues" />
        </section>

        {impact.top_loss_machines?.length > 0 && (
          <section className="decision-panel" style={{ marginTop: '12px' }}>
            <div className="decision-panel-heading"><div><div className="decision-card-kicker">Where the money goes</div><h2>Top loss-making machines · 30 days</h2></div><span className="trend-caption">By production-loss cost</span></div>
            <div className="dashboard-detail-list">
              {impact.top_loss_machines.map((machine, index) => (
                <a href={`machines.html?machine=${encodeURIComponent(machine.machine_id)}`} key={machine.machine_id}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <b style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.1rem', color: index === 0 ? '#F87171' : 'var(--slate)', minWidth: '20px' }}>{index + 1}</b>
                    <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{machine.machine_name}</strong><small>{machine.downtime_hours} hrs downtime · {machine.tickets} issue{machine.tickets === 1 ? '' : 's'}</small></span>
                  </span>
                  <b style={{ color: '#F87171' }}>{money.format(machine.cost)}</b>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="decision-panel decision-owner-brief">
          <div className="decision-panel-heading"><div><div className="decision-card-kicker">Simple daily brief</div><h2>What the owner should know</h2></div><span className="trend-caption">Auto-generated</span></div>
          {impact.cost_coverage_pct > 0 ? <>
            <p><strong>{kpis.open_tickets || 0}</strong> open tickets across <strong>{kpis.machines_down || 0}</strong> affected machines. Estimated 30-day production loss is <strong>{money.format(impact.downtime_cost || 0)}</strong>.</p>
            <p>{impact.top_cost_machine ? <><strong>{impact.top_cost_machine.machine_name}</strong> has the highest measured impact at <strong>{money.format(impact.top_cost_machine.cost)}</strong>. Review this machine first.</> : 'No cost-bearing breakdowns were recorded in this period.'}</p>
            <small>Financial coverage: {impact.cost_coverage_pct}% of machines. Estimates support decisions; they do not replace approved financial records.</small>
          </> : <p>Add an optional hourly downtime value while onboarding machines to activate production-loss and ROI insights. Technicians will not see or enter this information.</p>}
        </section>

        {(() => {
          const h = data.shift_handover || {};
          const groups = [
            ['Critical open jobs', h.critical, '#F87171'],
            ['Waiting for spare', h.waiting_spare, '#F59E0B'],
            ['Waiting for approval / verification', h.waiting_approval, '#A78BFA'],
            ['Waiting for vendor', h.waiting_vendor, '#F59E0B'],
            ['Recurring failures', h.repeat, '#F87171'],
          ];
          const pmDue = h.pm_due || [];
          const totalItems = groups.reduce((n, [, items]) => n + (items?.length || 0), 0) + pmDue.length;
          const buildText = () => {
            const lines = [`TurboFix shift handover — ${new Date().toLocaleString('en-IN')}`, `Machines down: ${h.machines_down || 0}`];
            groups.forEach(([label, items]) => { if (items?.length) { lines.push(`\n${label} (${items.length}):`); items.forEach((i) => lines.push(`- ${i.machine}${i.wo ? ` [${i.wo}]` : ''}: ${i.text}`)); } });
            if (pmDue.length) { lines.push(`\nPM due (${pmDue.length}):`); pmDue.forEach((p) => lines.push(`- ${p.machine}: ${p.text}${p.overdue ? ' (OVERDUE)' : ''}`)); }
            return lines.join('\n');
          };
          return (
            <section className="decision-panel" style={{ marginTop: '12px' }}>
              <div className="decision-panel-heading">
                <div><div className="decision-card-kicker">For the incoming shift</div><h2>Shift handover</h2></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { try { navigator.clipboard?.writeText(buildText()); } catch { /* clipboard unavailable */ } }}>Copy brief</button>
              </div>
              {totalItems === 0 ? <Empty text="Nothing pending — clean handover." /> : (
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{h.machines_down || 0} machine{h.machines_down === 1 ? '' : 's'} currently down. Everything the next shift must not miss:</div>
                  {groups.map(([label, items, color]) => items?.length ? (
                    <div key={label}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color, fontWeight: 700, marginBottom: '6px' }}>{label} · {items.length}</div>
                      <div className="dashboard-detail-list">
                        {items.map((i) => <a href={`machines.html?machine=${encodeURIComponent(i.machine_id)}`} key={i.id}><span><strong>{i.machine}</strong><small>{i.text}</small></span>{i.wo && <b style={{ color: 'var(--slate)', fontFamily: 'monospace' }}>{i.wo}</b>}</a>)}
                      </div>
                    </div>
                  ) : null)}
                  {pmDue.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FBBF24', fontWeight: 700, marginBottom: '6px' }}>PM due · {pmDue.length}</div>
                      <div className="dashboard-detail-list">
                        {pmDue.map((p) => <a href={`machines.html?machine=${encodeURIComponent(p.machine_id)}`} key={p.id}><span><strong>{p.machine}</strong><small>{p.text}</small></span><b style={{ color: p.overdue ? '#F87171' : '#FBBF24' }}>{p.overdue ? 'Overdue' : 'Due'}</b></a>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        <section className="decision-columns">
          <div className="decision-panel">
            <div className="decision-panel-heading"><div><div className="decision-card-kicker">Priority queue</div><h2>Needs attention</h2></div><a href="tickets.html" className="text-link">View all</a></div>
            {data.needs_attention?.length ? data.needs_attention.slice(0, 5).map((item, index) => (
              <div className="attention-row" key={`${item.machine_name}-${index}`}><span className={`status-dot ${item.urgency === 'High' ? 'danger' : item.urgency === 'Medium' ? 'warning' : 'success'}`} /><div><strong>{item.machine_name || 'Unknown machine'}</strong><span>{item.description || 'Maintenance issue reported'}</span></div><b>{item.urgency || 'Open'}</b></div>
            )) : <Empty text="No open issues. Your plant is clear." />}
          </div>
          <div className="decision-panel">
            <div className="decision-panel-heading"><div><div className="decision-card-kicker">Six-week signal</div><h2>Breakdown trend</h2></div><span className="trend-caption">Tickets / week</span></div>
            {data.weekly_trend?.length ? <div className="trend-bars">{data.weekly_trend.map((week) => <div className="trend-bar-wrap" key={week.week_start}><div className="trend-bar" style={{ height: `${Math.max(8, ((week.count || 0) / Math.max(...data.weekly_trend.map((x) => x.count || 0), 1)) * 100)}%` }} title={`${week.count} tickets`} /><span>{week.week_start}</span></div>)}</div> : <Empty text="No breakdown history yet." />}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone = '', onClick }) { return <button type="button" className="decision-metric clickable" onClick={onClick}><span className={`metric-value ${tone}`}>{value ?? '—'}</span><span className="metric-label">{label}</span><small className="decision-click-hint">View details →</small></button>; }
function Insight({ label, value, detail }) { return <div className="decision-insight"><span className="decision-card-kicker">{label}</span><strong>{value}</strong><span>{detail}</span></div>; }
function Empty({ text }) { return <p className="decision-empty">{text}</p>; }
