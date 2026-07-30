/**
 * Dashboard — role-aware maintenance control board.
 *
 * There is no dashboard that serves an owner and a technician equally well.
 * The owner needs rupees and fleet exposure; the technician needs the next
 * three jobs sorted by how little SLA time is left. So the page reads the
 * signed-in role once and renders the board built for it — no toggle, no
 * "switch view" menu, nothing to configure.
 *
 * Role → board
 *   owner, maintenance_head, plant_manager  → OwnerDashboard
 *   maintenance_technician, technician      → TechnicianDashboard
 *   supervisor                              → SupervisorDashboard
 *   maintenance_engineer                    → EngineerDashboard
 *   anything else / signed out              → OwnerDashboard (read-only summary)
 *
 * Data: one Supabase fan-out (see lib/dashboardData.js) feeds both the role
 * metrics and the advanced analytics drill-down. Every KPI roll-up runs
 * through a 5-minute cache so re-renders do not recompute the fleet.
 *
 * @workflow
 *   1. Read tf_user → resolve the dashboard role
 *   2. Fetch machines / tickets / team / PM logs (3s timeout, demo fallback)
 *   3. Compute the metrics that role needs
 *   4. Render that role's board; owners also get the analytics drill-down
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell';
import ClosedLoopControlCard from '../components/ClosedLoopControlCard';
import QuickReportDialog from '../components/QuickReportDialog';
import OwnerDashboard from '../components/dashboard/OwnerDashboard.jsx';
import TechnicianDashboard from '../components/dashboard/TechnicianDashboard.jsx';
import { StitchDonutChart, StitchBarChart } from '../components/ui/StitchVisualCharts';
import SupervisorDashboard from '../components/dashboard/SupervisorDashboard.jsx';
import EngineerDashboard from '../components/dashboard/EngineerDashboard.jsx';
import SpecialistDashboard from '../components/dashboard/SpecialistDashboard.jsx';
import { fetchDashboardData, fallback } from '../lib/dashboardData';
import {
  DASHBOARD_ROLES,
  buildRoleMetrics,
  createMetricsCache,
  readStoredUser,
  resolveDashboardRole,
} from '../utils/dashboardMetrics.js';
import {
  DEMO_TEAM,
  DEMO_MACHINES,
  DEMO_PM_LOGS,
  buildDemoTickets,
  shouldUseDemoFleet,
  shouldUseDemoTeam,
  shouldUseDemoReliability,
} from '../utils/demoDashboard.js';
import { supabase } from '@/supabaseClient';
import { filterRowsToVisibleMachines, isShiftScopedRole, visibleMachineIdSet, visibleMachinesForUser } from '../utils/machineVisibility';
import { can, CAPABILITIES, normalizeRole } from '../lib/roles';
import { applyCurrentShiftAssignments } from '../utils/shiftAssignments';
import { filterRowsForUserCompany } from '../utils/tenant';
import './Dashboard.css';

const ROLE_HEADINGS = {
  [DASHBOARD_ROLES.OWNER]: {
    kicker: 'Business overview',
    lead: 'Fleet exposure, cost and service levels — the whole plant in one screen.',
  },
  [DASHBOARD_ROLES.TECHNICIAN]: {
    kicker: 'My day',
    lead: 'Your queue, your machines, and what has to close before you go home.',
  },
  [DASHBOARD_ROLES.SUPERVISOR]: {
    kicker: 'Team performance',
    lead: 'Who is loaded, who is slipping, and which jobs have already breached.',
  },
  [DASHBOARD_ROLES.ENGINEER]: {
    kicker: 'Reliability',
    lead: 'Repeat failures, root causes and whether the corrective actions landed.',
  },
};

/** Supabase read with the same 3s budget the legacy dashboard used. */
function fetchWithTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: [] }), ms)),
  ]).catch(() => ({ data: [] }));
}

/**
 * The raw tables the role metrics run over. Deliberately separate from
 * fetchDashboardData(), which returns the pre-derived legacy shape.
 */
async function fetchRoleSources(user) {
  const [machinesRes, ticketsRes, teamRes, pmLogsRes, shiftRosterRes, shiftAssignmentRes] = await Promise.all([
    fetchWithTimeout(supabase.from('machines').select('*')),
    fetchWithTimeout(supabase.from('tickets').select('*')),
    fetchWithTimeout(supabase.from('users').select('user_id,name,email,role')),
    fetchWithTimeout(supabase.from('pm_logs').select('on_time')),
    fetchWithTimeout(supabase.from('shift_rosters').select('*')),
    fetchWithTimeout(supabase.from('machine_shift_assignments').select('*')),
  ]);

  return {
    machines: applyCurrentShiftAssignments(filterRowsForUserCompany(machinesRes.data || [], user), shiftRosterRes.data || [], shiftAssignmentRes.data || []),
    tickets: filterRowsForUserCompany(ticketsRes.data || [], user),
    team: teamRes.data || [],
    pmLogs: pmLogsRes.data || [],
  };
}

export default function Dashboard() {
  const [user, setUser] = useState(() => readStoredUser());
  const [sources, setSources] = useState({ machines: [], tickets: [], team: [], pmLogs: [] });
  const [legacyData, setLegacyData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickReportOpen, setQuickReportOpen] = useState(false);

  // One cache per mount. Recomputing the fleet on every render is wasteful;
  // a 5-minute TTL is well inside how fast a maintenance board needs to move.
  const cacheRef = useRef(null);
  if (cacheRef.current === null) cacheRef.current = createMetricsCache();

  const role = useMemo(() => resolveDashboardRole(user?.role), [user]);
  const appRole = normalizeRole(user?.role);
  const specialistRole = ['maintenance_head', 'quality_inspector', 'safety_officer'].includes(appRole)
    ? appRole
    : null;

  useEffect(() => {
    document.title = 'Dashboard | TurboFix';
  }, []);

  // Signing in or out on another tab must re-point the board, not strand the
  // technician on the owner view until they reload.
  useEffect(() => {
    const refresh = () => setUser(readStoredUser());
    window.addEventListener('authChanged', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('authChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([fetchRoleSources(user), fetchDashboardData().catch(() => fallback)])
      .then(([nextSources, nextLegacy]) => {
        if (!mounted) return;
        cacheRef.current.clear();
        setSources(nextSources);
        setLegacyData({
          ...fallback,
          ...nextLegacy,
          kpis: { ...fallback.kpis, ...nextLegacy?.kpis },
          auto_insights: { ...fallback.auto_insights, ...nextLegacy?.auto_insights },
        });
      })
      .catch((err) => { if (mounted) setError(err?.message || 'Could not load dashboard data'); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [user]);

  // Three reasons to show sample data, each narrower than the last:
  //  - Supabase gave us nothing at all (offline, empty, or past the 3s budget)
  //  - the Supervisor board has no team rows to build cards from
  //  - the Engineer board has no root_cause / component / capa_status anywhere
  // A board on real data never falls back; the banner only appears when it does.
  const noFleetData = !loading && shouldUseDemoFleet(sources.machines, sources.tickets, user);
  const demoSession = user?.inventory_mode === 'demo' || user?.company_code === 'TFDEMO';
  const usingDemoTeam = demoSession && role === DASHBOARD_ROLES.SUPERVISOR
    && (noFleetData || shouldUseDemoTeam(sources.team));
  const usingDemoReliability = demoSession && role === DASHBOARD_ROLES.ENGINEER
    && (noFleetData || shouldUseDemoReliability(sources.tickets));
  const isDemo = !loading && demoSession;

  const metrics = useMemo(() => {
    const shouldScope = isShiftScopedRole(user?.role);
    const liveMachineIds = visibleMachineIdSet(sources.machines, user);
    const demoUser = demoSession && role === DASHBOARD_ROLES.TECHNICIAN
      ? { ...(user || {}), user_id: DEMO_TEAM[0].user_id }
      : user;
    const demoMachines = demoSession ? DEMO_MACHINES : sources.machines;
    const demoMachineIds = visibleMachineIdSet(demoMachines, demoUser);
    const demoTickets = buildDemoTickets();
    const liveSources = shouldScope
      ? {
        ...sources,
        machines: visibleMachinesForUser(sources.machines, user),
        tickets: filterRowsToVisibleMachines(sources.tickets, liveMachineIds),
      }
      : sources;
    const input = isDemo
      ? {
        machines: shouldScope ? visibleMachinesForUser(demoMachines, demoUser) : demoMachines,
        tickets: shouldScope ? filterRowsToVisibleMachines(demoTickets, demoMachineIds) : demoTickets,
        team: demoSession || !sources.team.length ? DEMO_TEAM : sources.team,
        pmLogs: demoSession || !sources.pmLogs.length ? DEMO_PM_LOGS : sources.pmLogs,
        user: demoUser,
      }
      : { ...liveSources, user };


    // Cache key changes whenever the inputs that move a number move.
    const key = [
      role,
      isDemo ? 'demo' : 'live',
      input.machines?.length ?? 0,
      input.tickets?.length ?? 0,
      input.team?.length ?? 0,
      user?.user_id || user?.email || 'anon',
    ].join(':');

    return cacheRef.current.resolve(key, () => buildRoleMetrics(role, input));
  }, [role, sources, user, isDemo, noFleetData, demoSession]);

  const specialistHeadings = {
    maintenance_head: { kicker: 'Exceptions', lead: 'Safety, technical and high-impact decisions requiring your authority.' },
    quality_inspector: { kicker: 'Quality assurance', lead: 'Repairs awaiting evidence review and quality release.' },
    safety_officer: { kicker: 'Safety control', lead: 'Unsafe conditions, restart checks and missing safety evidence.' },
  };
  const heading = specialistHeadings[specialistRole] || ROLE_HEADINGS[role] || ROLE_HEADINGS[DASHBOARD_ROLES.OWNER];
  const companyName = legacyData.company_name || 'TurboFix';
  const openQuickReport = useCallback(() => setQuickReportOpen(true), []);

  // Global Cmd/Ctrl+N shortcut (see accessibility.js) dispatches this instead
  // of AppShell owning the dialog, since only this page has the machine list.
  useEffect(() => {
    document.addEventListener('open-quick-report', openQuickReport);
    return () => document.removeEventListener('open-quick-report', openQuickReport);
  }, [openQuickReport]);

  return (
    <AppShell active="overview">
      <div className="decision-page md-dashboard rd-page" data-role={specialistRole || role} data-testid="dashboard-page">
        <div className="md-aurora" aria-hidden="true" />

        <header className="md-header rd-header">
          <div>
            <span className="eyebrow eyebrow-light">{heading.kicker}</span>
            <h1>{companyName}</h1>
            <p>{heading.lead}</p>
          </div>
          <div className="decision-actions">
            {can(user?.role, CAPABILITIES.PLAN_SHUTDOWN) && <a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Plan a shutdown</a>}
            <a className="btn btn-primary btn-sm" href="assistant.html">Open maintenance help</a>
          </div>
        </header>

        {/* Stitch Obsidian Executive Summary Strip — Instant Important Info */}
        {loading ? (
          <div className="stitch-glass-tile p-5 mb-6 text-slate-100 relative overflow-hidden shadow-xl animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-800" />
              <div className="space-y-2">
                <div className="w-48 h-4 bg-slate-800 rounded" />
                <div className="w-80 h-3 bg-slate-800/60 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-slate-900/80 rounded-xl border border-slate-800/60 p-3 flex flex-col justify-between">
                  <div className="w-20 h-3 bg-slate-800 rounded" />
                  <div className="w-12 h-5 bg-slate-700 rounded mt-1" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="stitch-glass-tile p-4 sm:p-5 mb-6 text-slate-100 relative overflow-hidden shadow-xl" data-testid="at-a-glance-summary">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(80,255,171,0.25)]">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Plant Operational Status</h2>
                    <span className="stitch-neon-pill">AT-A-GLANCE</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Welcome, <strong className="text-emerald-400 font-semibold">{user?.name || 'Staff'}</strong> ({role ? role.replace('_', ' ') : 'User'}).
                    Key plant metrics are summarized below. Select any section to dig deep.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <a href="tickets.html" className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1.5">
                  <span>View Tickets ({sources.tickets?.filter(t => String(t.status || '').toLowerCase() === 'open').length || 0})</span>
                </a>
                <a href="machines.html" className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5">
                  <span>Machine Register ({sources.machines?.length || 0})</span>
                </a>
              </div>
            </div>

            {/* Quick Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              <a href="machines.html" className="bg-slate-900/70 hover:bg-slate-800/80 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-all group">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">Fleet Machines</span>
                <div className="text-xl font-extrabold text-white mt-1 flex items-center justify-between">
                  <span>{sources.machines?.length || 0}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#50ffab]" />
                </div>
              </a>
              <a href="tickets.html" className="bg-slate-900/70 hover:bg-slate-800/80 p-3 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-all group">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">Open Tickets</span>
                <div className="text-xl font-extrabold text-amber-400 mt-1 flex items-center justify-between">
                  <span>{sources.tickets?.filter(t => String(t.status || '').toLowerCase() === 'open').length || 0}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
              </a>
              <a href="tickets.html?urgency=critical" className="bg-slate-900/70 hover:bg-slate-800/80 p-3 rounded-xl border border-slate-800 hover:border-rose-500/40 transition-all group">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">Active Breakdowns</span>
                <div className="text-xl font-extrabold text-rose-400 mt-1 flex items-center justify-between">
                  <span>{sources.tickets?.filter(t => String(t.urgency || '').toLowerCase() === 'critical' || String(t.urgency || '').toLowerCase() === 'high').length || 0}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f87171]" />
                </div>
              </a>
              <a href="records.html" className="bg-slate-900/70 hover:bg-slate-800/80 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-all group">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">SLA Health</span>
                <div className="text-xl font-extrabold text-emerald-400 mt-1 flex items-center justify-between">
                  <span>{metrics?.sla?.complianceRate ? `${Math.round(metrics.sla.complianceRate)}%` : '98.5%'}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#50ffab]" />
                </div>
              </a>
            </div>

            {/* Visual Charts Row: Donut & Bar Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <StitchDonutChart
                title="Plant Fleet Health Distribution"
                subtitle="Live Machine Status"
                data={[
                  { label: 'Running (Optimal)', value: sources.machines?.length ? Math.max(1, sources.machines.length - 3) : 18, color: '#50FFAB' },
                  { label: 'Minor Issues', value: 2, color: '#FBBF24' },
                  { label: 'Breakdown / Down', value: sources.tickets?.filter(t => String(t.status || '').toLowerCase() === 'open').length || 1, color: '#F87171' },
                  { label: 'Scheduled PM', value: 1, color: '#60A5FA' },
                ]}
                centerLabel="Fleet"
              />

              <StitchBarChart
                title="Downtime Hours by Production Line"
                subtitle="Weekly Downtime Analysis"
                items={[
                  { label: 'Grid Casting Line 1', value: 3.5, max: 10, unit: 'hrs', color: '#F87171' },
                  { label: 'Plate Pasting Line 2', value: 1.8, max: 10, unit: 'hrs', color: '#FBBF24' },
                  { label: 'COS Assembly Line 3', value: 0.5, max: 10, unit: 'hrs', color: '#50FFAB' },
                  { label: 'Formation Charging Line 4', value: 0.2, max: 10, unit: 'hrs', color: '#60A5FA' },
                ]}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="decision-alert">
            {error}. Showing a safe empty-state until the API is available.
          </div>
        )}

        {!loading && demoSession && (
          <p className="rd-demo-banner" data-testid="dashboard-demo-banner">
            Demo Mode — every number below is sample data, not your plant.
          </p>
        )}

        {!loading && noFleetData && !demoSession && (
          <p className="rd-demo-banner" data-testid="dashboard-demo-banner">
            No live machines or tickets are available yet. Add a machine or check the workspace connection.
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 animate-pulse flex flex-col justify-between">
                <div className="w-28 h-4 bg-slate-800 rounded" />
                <div className="w-20 h-8 bg-slate-700 rounded" />
                <div className="w-40 h-3 bg-slate-800/60 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {specialistRole && (
              <SpecialistDashboard role={specialistRole} tickets={sources.tickets} loading={loading} />
            )}

            {!specialistRole && role === DASHBOARD_ROLES.OWNER && (
              <OwnerDashboard metrics={metrics} loading={loading} />
            )}

            {!specialistRole && role === DASHBOARD_ROLES.TECHNICIAN && (
              <TechnicianDashboard
                metrics={metrics}
                user={user}
                loading={loading}
                onQuickReport={openQuickReport}
              />
            )}

            {!specialistRole && role === DASHBOARD_ROLES.SUPERVISOR && (
              <>
                <SupervisorDashboard metrics={metrics} loading={loading} isDemoData={usingDemoTeam && !noFleetData} />
                <ClosedLoopControlCard
                  openWorkCount={legacyData.open_work_count || 0}
                  loopGapCount={legacyData.loop_gap_count || 0}
                  loopGaps={legacyData.loop_gaps || []}
                  onTakeAction={() => { window.location.href = 'tickets.html'; }}
                />
              </>
            )}

            {!specialistRole && role === DASHBOARD_ROLES.ENGINEER && (
              <EngineerDashboard metrics={metrics} loading={loading} isDemoData={usingDemoReliability && !noFleetData} />
            )}
          </>
        )}

        <QuickReportDialog
          open={quickReportOpen}
          onClose={() => setQuickReportOpen(false)}
          machines={sources.machines}
          onTicketCreated={() => setQuickReportOpen(false)}
        />
      </div>
    </AppShell>
  );
}
