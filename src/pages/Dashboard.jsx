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
import SupervisorDashboard from '../components/dashboard/SupervisorDashboard.jsx';
import EngineerDashboard from '../components/dashboard/EngineerDashboard.jsx';
import AdvancedAnalyticsBoard from '../components/dashboard/AdvancedAnalyticsBoard.jsx';
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
async function fetchRoleSources() {
  const [machinesRes, ticketsRes, teamRes, pmLogsRes] = await Promise.all([
    fetchWithTimeout(supabase.from('machines').select('*')),
    fetchWithTimeout(supabase.from('tickets').select('*')),
    fetchWithTimeout(supabase.from('users').select('user_id,name,email,role')),
    fetchWithTimeout(supabase.from('pm_logs').select('on_time')),
  ]);

  return {
    machines: machinesRes.data || [],
    tickets: ticketsRes.data || [],
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

    Promise.all([fetchRoleSources(), fetchDashboardData().catch(() => fallback)])
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
  }, []);

  // Three reasons to show sample data, each narrower than the last:
  //  - Supabase gave us nothing at all (offline, empty, or past the 3s budget)
  //  - the Supervisor board has no team rows to build cards from
  //  - the Engineer board has no root_cause / component / capa_status anywhere
  // A board on real data never falls back; the banner only appears when it does.
  const noFleetData = shouldUseDemoFleet(sources.machines, sources.tickets);
  const usingDemoTeam = role === DASHBOARD_ROLES.SUPERVISOR
    && (noFleetData || shouldUseDemoTeam(sources.team));
  const usingDemoReliability = role === DASHBOARD_ROLES.ENGINEER
    && (noFleetData || shouldUseDemoReliability(sources.tickets));
  const isDemo = noFleetData || usingDemoTeam || usingDemoReliability;

  const metrics = useMemo(() => {
    const input = isDemo
      ? {
        machines: sources.machines.length ? sources.machines : DEMO_MACHINES,
        tickets: buildDemoTickets(),
        team: sources.team.length ? sources.team : DEMO_TEAM,
        pmLogs: sources.pmLogs.length ? sources.pmLogs : DEMO_PM_LOGS,
        // The demo fleet assigns work to demo-tech-1, so a signed-in
        // technician still sees a populated queue instead of an empty one.
        user: noFleetData && role === DASHBOARD_ROLES.TECHNICIAN
          ? { ...(user || {}), user_id: DEMO_TEAM[0].user_id }
          : user,
      }
      : { ...sources, user };

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
  }, [role, sources, user, isDemo, noFleetData]);

  const heading = ROLE_HEADINGS[role] || ROLE_HEADINGS[DASHBOARD_ROLES.OWNER];
  const companyName = legacyData.company_name || 'TurboFix';
  const openQuickReport = useCallback(() => setQuickReportOpen(true), []);

  return (
    <AppShell active="overview">
      <div className="decision-page md-dashboard rd-page" data-role={role} data-testid="dashboard-page">
        <div className="md-aurora" aria-hidden="true" />

        <header className="md-header rd-header">
          <div>
            <span className="eyebrow eyebrow-light">{heading.kicker}</span>
            <h1>{companyName}</h1>
            <p>{heading.lead}</p>
          </div>
          <div className="decision-actions">
            <a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Plan a shutdown</a>
            <a className="btn btn-primary btn-sm" href="assistant.html">Open maintenance help</a>
          </div>
        </header>

        {error && (
          <div className="decision-alert">
            {error}. Showing a safe empty-state until the API is available.
          </div>
        )}

        {/* The board always renders something (demo or cached), so this reads as
            "more is coming", not "nothing is here yet". */}
        {loading && <p className="rd-loading" role="status">Refreshing live data…</p>}

        {!loading && noFleetData && (
          <p className="rd-demo-banner" data-testid="dashboard-demo-banner">
            Showing sample data — no machines or tickets came back from the workspace.
            Every number below is illustrative until your plant data loads.
          </p>
        )}

        {role === DASHBOARD_ROLES.OWNER && (
          <>
            <OwnerDashboard metrics={metrics} loading={loading} />
            <ClosedLoopControlCard
              openWorkCount={legacyData.open_work_count || 0}
              loopGapCount={legacyData.loop_gap_count || 0}
              loopGaps={legacyData.loop_gaps || []}
              onTakeAction={() => { window.location.href = 'technician.html'; }}
            />
            <AdvancedAnalyticsBoard data={legacyData} />
          </>
        )}

        {role === DASHBOARD_ROLES.TECHNICIAN && (
          <TechnicianDashboard
            metrics={metrics}
            user={user}
            loading={loading}
            onQuickReport={openQuickReport}
          />
        )}

        {role === DASHBOARD_ROLES.SUPERVISOR && (
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

        {role === DASHBOARD_ROLES.ENGINEER && (
          <EngineerDashboard metrics={metrics} loading={loading} isDemoData={usingDemoReliability && !noFleetData} />
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
