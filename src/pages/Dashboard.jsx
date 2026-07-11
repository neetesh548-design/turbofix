import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MainLayout from '../layouts/MainLayout';

function MachineNameplate({ machineName, status }) {
  const statusClass = status === 'down' ? 'critical' : status === 'warning' ? 'warning' : 'healthy';
  return (
    <div className="machine-nameplate">
      <div className={`status-lamp ${statusClass}`}></div>
      {machineName}
    </div>
  );
}

function KpiCard({ value, label, loading }) {
  return (
    <div className="kpi-card" style={{ 
      background: 'var(--n-1)', 
      border: 'var(--border-weight) solid var(--n-2)', 
      borderRadius: 'var(--radius-md)', 
      padding: 'var(--space-24)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <div className="kpi-number" style={{ fontSize: 'var(--text-31)', fontWeight: '700', color: 'var(--n-4)', marginBottom: 'var(--space-4)' }}>
        {loading ? <span style={{ opacity: 0.5 }}>...</span> : value}
      </div>
      <div className="kpi-label" style={{ fontSize: 'var(--text-12)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--n-3)' }}>
        {label}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Dashboard Data State
  const [kpis, setKpis] = useState({
    machinesDown: 0,
    totalMachines: 0,
    openTickets: 0,
    urgentOpen: 0
  });

  const [insights, setInsights] = useState({
    mttr: null,
    mtbf: null,
    topProblem: null
  });

  const [recentTickets, setRecentTickets] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/vault');
      return;
    }
    
    // 2. Fetch User Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    setUser(profile);

    // 3. Fetch Core KPIs (Machines and Tickets)
    // NOTE: This relies on RLS to only return the tenant's data
    try {
      const [{ count: totalMachines }, { count: machinesDown }, { count: openTickets }, { count: urgentOpen }] = await Promise.all([
        supabase.from('machines').select('*', { count: 'exact', head: true }),
        supabase.from('machines').select('*', { count: 'exact', head: true }).eq('status', 'down'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('urgency', 'high')
      ]);

      setKpis({
        machinesDown: machinesDown || 0,
        totalMachines: totalMachines || 0,
        openTickets: openTickets || 0,
        urgentOpen: urgentOpen || 0
      });

      // 4. Fetch Analytics (SQL Views)
      // Safely attempt to fetch views. If views don't exist yet, it will fail gracefully.
      const [{ data: mttrData }, { data: mtbfData }, { data: paretoData }] = await Promise.all([
        supabase.from('analytics_mttr_monthly').select('*').limit(1),
        supabase.from('analytics_machine_mtbf').select('*').limit(1),
        supabase.from('analytics_downtime_pareto').select('*').limit(1)
      ]);

      setInsights({
        mttr: mttrData?.[0]?.avg_hours_to_resolve?.toFixed(1) || '—',
        mtbf: mtbfData?.[0]?.avg_days_between_faults?.toFixed(1) || '—',
        topProblem: paretoData?.[0]?.machine_name || '—'
      });

      // 5. Fetch Recent Activity
      const { data: tickets } = await supabase
        .from('tickets')
        .select(`
          id, 
          status, 
          urgency,
          description,
          created_at,
          machines ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(5);
        
      setRecentTickets(tickets || []);

    } catch (e) {
      console.error("Dashboard data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/vault');
  }

  return (
    <MainLayout>
      <section style={{ padding: 'var(--space-64) 0', backgroundColor: 'var(--n-0)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 'var(--content-width)', margin: '0 auto', padding: '0 var(--space-24)' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-48)' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-31)', fontWeight: '700', fontFamily: 'var(--font-industrial)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--n-4)' }}>
                {user ? `${user.company_id} Control Room` : 'Loading...'}
              </h1>
              <p style={{ margin: 'var(--space-4) 0 0', color: 'var(--n-3)', fontSize: 'var(--text-14)' }}>
                {user ? `${user.full_name} (${user.role})` : 'Authenticating...'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
              <button onClick={() => navigate('/vault')} style={{ background: 'var(--color-brand)', color: 'white', border: 'none', padding: 'var(--space-12) var(--space-24)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
                Document Vault
              </button>
              <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--n-4)', border: 'var(--border-weight) solid var(--n-2)', padding: 'var(--space-12) var(--space-24)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
                Log out
              </button>
            </div>
          </div>

          {/* Real-time KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-16)', marginBottom: 'var(--space-48)' }}>
            <KpiCard loading={loading} label="Machines Down" value={`${kpis.machinesDown} / ${kpis.totalMachines}`} />
            <KpiCard loading={loading} label="Urgent Open Tickets" value={kpis.urgentOpen} />
            <KpiCard loading={loading} label="Total Open Tickets" value={kpis.openTickets} />
          </div>

          {/* Analytics / Insights */}
          <h2 style={{ fontSize: 'var(--text-20)', fontWeight: '600', color: 'var(--n-4)', marginBottom: 'var(--space-16)' }}>Factory Analytics (Last 30 Days)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-16)', marginBottom: 'var(--space-48)' }}>
            <KpiCard loading={loading} label="MTTR (Hours)" value={insights.mttr} />
            <KpiCard loading={loading} label="MTBF (Days)" value={insights.mtbf} />
            <KpiCard loading={loading} label="#1 Problem Machine" value={insights.topProblem} />
          </div>

          {/* Recent Activity List */}
          <h2 style={{ fontSize: 'var(--text-20)', fontWeight: '600', color: 'var(--n-4)', marginBottom: 'var(--space-16)' }}>Recent Breakdowns</h2>
          <div style={{ background: 'var(--n-1)', border: 'var(--border-weight) solid var(--n-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--n-3)' }}>Loading activity...</div>
            ) : recentTickets.length === 0 ? (
              <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--n-3)' }}>No open tickets. Plant is healthy.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 'var(--space-12) var(--space-16)', fontSize: 'var(--text-12)', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--n-3)', borderBottom: 'var(--border-weight) solid var(--n-2)' }}>Machine</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-12) var(--space-16)', fontSize: 'var(--text-12)', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--n-3)', borderBottom: 'var(--border-weight) solid var(--n-2)' }}>Issue</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-12) var(--space-16)', fontSize: 'var(--text-12)', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--n-3)', borderBottom: 'var(--border-weight) solid var(--n-2)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map(ticket => (
                    <tr key={ticket.id}>
                      <td style={{ padding: 'var(--space-16)', borderBottom: 'var(--border-weight) solid var(--n-2)' }}>
                        <MachineNameplate machineName={ticket.machines?.name || 'Unknown'} status={ticket.status === 'open' ? 'down' : 'healthy'} />
                      </td>
                      <td style={{ padding: 'var(--space-16)', borderBottom: 'var(--border-weight) solid var(--n-2)', color: 'var(--n-4)' }}>
                        {ticket.description}
                      </td>
                      <td style={{ padding: 'var(--space-16)', borderBottom: 'var(--border-weight) solid var(--n-2)' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: 'var(--text-12)',
                          fontWeight: '700',
                          backgroundColor: ticket.status === 'open' ? 'var(--color-status-critical-bg)' : 'var(--color-status-healthy-bg)',
                          color: ticket.status === 'open' ? 'var(--color-status-critical)' : 'var(--color-status-healthy)',
                          textTransform: 'uppercase'
                        }}>
                          {ticket.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </section>
    </MainLayout>
  );
}
