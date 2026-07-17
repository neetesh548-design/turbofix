import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';

const fallback = {
  kpis: { machines_down: 0, urgent_open: 0, open_tickets: 0, plant_health_pct: 100, avg_hours_to_fix: 0, total_machines: 0 },
  auto_insights: { mtbf_hours: 0, mttr_hours: 0, repeat_breakdown_pct: 0, top_problem_machines: [] },
  needs_attention: [], recent_activity: [], weekly_trend: [],
};

async function fetchDashboardData() {
  const [machinesRes, ticketsRes, factoryRes] = await Promise.all([
    supabase.from('machines').select('id,name,location,status'),
    supabase.from('tickets').select('id,machine_id,status,issue_text,ai_summary,created_at'),
    supabase.from('factories').select('name').limit(1),
  ]);

  const machines = machinesRes.data || [];
  const tickets = ticketsRes.data || [];
  const companyName = factoryRes.data?.[0]?.name || 'TurboFix';

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

  return {
    company_name: companyName,
    kpis: {
      open_tickets: openTickets.length,
      machines_down: machinesDown,
      urgent_open: urgentOpen,
      total_machines: machines.length,
      plant_health_pct: healthPct,
      avg_hours_to_fix: 0,
      total_tickets: tickets.length,
    },
    auto_insights: { mtbf_hours: 0, mttr_hours: 0, repeat_breakdown_pct: 0, top_problem_machines: [] },
    needs_attention: needsAttention,
    recent_activity: [],
    weekly_trend: [],
  };
}

export default function Dashboard() {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchDashboardData()
      .then((next) => {
        if (mounted) setData({ ...fallback, ...next, kpis: { ...fallback.kpis, ...next.kpis }, auto_insights: { ...fallback.auto_insights, ...next.auto_insights } });
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const { kpis, auto_insights: insights } = data;
  const topMachine = insights.top_problem_machines?.[0];
  const healthTone = kpis.plant_health_pct >= 90 ? 'success' : kpis.plant_health_pct >= 70 ? 'warning' : 'danger';

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
          <div className={`decision-health-card ${healthTone}`}>
            <div className="decision-card-kicker">Plant health</div>
            <div className="decision-health-value">{loading ? '—' : `${kpis.plant_health_pct}%`}</div>
            <p>{kpis.machines_down || 0} machines currently need attention out of {kpis.total_machines || 0}.</p>
            <div className="decision-progress"><span style={{ width: `${Math.min(100, kpis.plant_health_pct || 0)}%` }} /></div>
          </div>
          <div className="decision-next-card">
            <div className="decision-card-kicker">Recommended next action</div>
            <h2>{topMachine ? `Inspect ${topMachine.machine_name || topMachine.machine_id}` : 'Start with your first machine'}</h2>
            <p>{topMachine ? `${topMachine.ticket_count} recent issues make this your highest-risk machine.` : 'Register machines, upload manuals, and let TurboFix build your maintenance baseline.'}</p>
            <a href={topMachine ? `machines.html?machine=${encodeURIComponent(topMachine.machine_id)}` : 'machines.html'} className="text-link">Open machine workspace →</a>
          </div>
        </section>

        <div className="decision-section-label">Needs action now</div>
        <section className="decision-kpi-grid">
          <Metric label="Machines down" value={kpis.machines_down} tone="danger" />
          <Metric label="Urgent issues" value={kpis.urgent_open} tone="warning" />
          <Metric label="Open work" value={kpis.open_tickets} />
          <Metric label="Avg. time to fix" value={`${kpis.avg_hours_to_fix || 0}h`} />
        </section>

        <div className="decision-section-label">Maintenance intelligence</div>
        <section className="decision-insight-grid">
          <Insight label="MTBF" value={`${insights.mtbf_hours || 0} hrs`} detail="Mean time between failures" />
          <Insight label="MTTR" value={`${insights.mttr_hours || 0} hrs`} detail="Mean time to repair" />
          <Insight label="Repeat breakdowns" value={`${insights.repeat_breakdown_pct || 0}%`} detail="Machines with 3+ issues in 30 days" />
          <Insight label="#1 risk" value={topMachine?.machine_name || 'No data yet'} detail={topMachine ? `${topMachine.ticket_count} issues in the last 30 days` : 'Build history to see risk'} />
        </section>

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

function Metric({ label, value, tone = '' }) { return <div className="decision-metric"><span className={`metric-value ${tone}`}>{value ?? '—'}</span><span className="metric-label">{label}</span></div>; }
function Insight({ label, value, detail }) { return <div className="decision-insight"><span className="decision-card-kicker">{label}</span><strong>{value}</strong><span>{detail}</span></div>; }
function Empty({ text }) { return <p className="decision-empty">{text}</p>; }
