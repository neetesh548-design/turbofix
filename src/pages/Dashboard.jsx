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
import QuickReportDialog from '../components/QuickReportDialog';
import OwnerDashboard from '../components/dashboard/OwnerDashboard.jsx';
import MasterTabbedDashboard from '../components/dashboard/MasterTabbedDashboard.jsx';
import TechnicianDashboard from '../components/dashboard/TechnicianDashboard.jsx';
import SupervisorDashboard from '../components/dashboard/SupervisorDashboard.jsx';
import EngineerDashboard from '../components/dashboard/EngineerDashboard.jsx';
import OperatorDashboard from '../components/dashboard/OperatorDashboard.jsx';
import LimbleCmmsDashboard from '../components/dashboard/LimbleCmmsDashboard.jsx';
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
  buildDemoPmSchedules,
  buildDemoParts,
  shouldUseDemoFleet,
  shouldUseDemoTeam,
  shouldUseDemoReliability,
} from '../utils/demoDashboard.js';
import { supabase } from '@/supabaseClient';
import { filterRowsToVisibleMachines, isShiftScopedRole, visibleMachineIdSet, visibleMachinesForUser } from '../utils/machineVisibility';
import { can, CAPABILITIES, normalizeRole } from '../lib/roles';
import { applyCurrentShiftAssignments } from '../utils/shiftAssignments';
import { filterRowsForUserCompany, isRealFactoryUser } from '../utils/tenant';
import './Dashboard.css';

const ROLE_HEADINGS = {
  operator: {
    kicker: 'Shopfloor control',
    lead: 'Machine status, breakdown reporting & shift safety checklist in one place.',
  },
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
  maintenance_head: {
    kicker: 'Exceptions & authority',
    lead: 'Safety, technical sign-offs, spare budgets, and high-impact decisions.',
  },
};

const ROLE_HEROES = {
  operator: {
    badge: 'Plant & Machine Operator Station',
    title: 'Monitor machine health, scan QR breakdown codes instantly, and track technician response in real time.',
    body: 'Keep production moving safely with 1-tap reporting, clear shift safety checklists, and live callout status.',
    image: 'qr_scanner_breakdown.jpg',
    imageAlt: 'Operator reporting a breakdown from the shop floor',
  },
  [DASHBOARD_ROLES.OWNER]: {
    badge: 'Plant VP & Factory Owner View',
    title: 'Real-time visibility into every machine breakdown, SLA timer, and financial downtime risk across all shifts.',
    body: 'Stay ahead of production bottlenecks. Track open breakdowns, maintenance head sign-offs, and critical replacement alerts live from your plant dashboard.',
    image: 'plant_owner_executive.jpg',
    imageAlt: 'Factory owner reviewing plant performance and downtime visibility',
  },
  [DASHBOARD_ROLES.TECHNICIAN]: {
    badge: 'Technician Daily Workspace',
    title: 'Start the right job first, see what is slipping, and close work without hunting through the system.',
    body: 'Your queue, machine responsibility, blocked spares, and quick reporting are brought into one simple view designed for constant daily use.',
    image: 'technician_field_repair.jpg',
    imageAlt: 'Technician completing a field repair with evidence capture',
  },
  [DASHBOARD_ROLES.SUPERVISOR]: {
    badge: 'Supervisor Control View',
    title: 'Spot overload, assign faster, and remove blockers before tickets turn into escalations.',
    body: 'Keep the team balanced, monitor SLA risk, and direct action across technicians and machines without extra clicks.',
    image: 'supervisor_shift_control.jpg',
    imageAlt: 'Shift supervisor reviewing the team dashboard on the production floor',
  },
  [DASHBOARD_ROLES.ENGINEER]: {
    badge: 'Reliability Engineering View',
    title: 'Focus on repeat failures, weak components, and corrective action quality before the same issue returns.',
    body: 'Use reliability signals to drive better fixes, stronger root cause control, and fewer recurring breakdowns.',
    image: 'maintenance_engineer_diagnostics.jpg',
    imageAlt: 'Maintenance engineer reviewing a repeat-failure root cause chart',
  },
  maintenance_head: {
    badge: 'Maintenance Head & Plant Operations',
    title: 'Strategic oversight across plant lines, high-impact exception approvals, and spare parts financial budget.',
    body: 'Control downtime exposure, approve critical repair overrides, and manage reliability across every shift.',
    image: 'maintenance_head_lead.jpg',
    imageAlt: 'Maintenance head reviewing verified repair work',
  },
  quality_inspector: {
    badge: 'Quality Assurance View',
    title: 'Verify repair evidence, release completed jobs, and catch compliance gaps before they recur.',
    body: 'Focus on inspection queues, evidence review, and quality sign-off across every completed repair.',
    image: 'records_ocr_digitization.jpg',
    imageAlt: 'Quality inspector reviewing digitized compliance records',
  },
  safety_officer: {
    badge: 'Safety & Compliance View',
    title: 'Track unsafe conditions, restart checks, and missing safety evidence before they become incidents.',
    body: 'Keep Lockout-Tagout discipline, safety audits, and compliance records current across every shift.',
    image: 'safety_officer_compliance.jpg',
    imageAlt: 'Safety officer reviewing a Lockout-Tagout compliance checklist',
  },
};

/** Supabase read with the same 3s budget the legacy dashboard used. */
function fetchWithTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: [], _timedOut: true }), ms)),
  ]).catch(() => ({ data: [] }));
}

/**
 * The raw tables the role metrics run over. Deliberately separate from
 * fetchDashboardData(), which returns the pre-derived legacy shape.
 */
async function fetchRoleSources(user) {
  const [machinesRes, ticketsRes, teamRes, pmLogsRes, shiftRosterRes, shiftAssignmentRes, pmSchedulesRes, partsRes] = await Promise.all([
    fetchWithTimeout(supabase.from('machines').select('*')),
    fetchWithTimeout(supabase.from('tickets').select('*')),
    fetchWithTimeout(supabase.from('users').select('user_id,name,email,role')),
    fetchWithTimeout(supabase.from('pm_logs').select('on_time')),
    fetchWithTimeout(supabase.from('shift_rosters').select('*')),
    fetchWithTimeout(supabase.from('machine_shift_assignments').select('*')),
    fetchWithTimeout(supabase.from('pm_schedules').select('*')),
    fetchWithTimeout(supabase.from('parts').select('*')),
  ]);

  const rawMachines = machinesRes.data || [];
  const rawTickets = ticketsRes.data || [];
  const rawTeam = teamRes.data || [];

  // A real, signed-in factory user must never be handed sample data as if
  // it were their own plant — an empty table means 0, honestly, the same
  // principle Machines.jsx already follows ("empty live workspaces must
  // remain honest"). The DEMO_* substitutions below are for demo/TFDEMO
  // and signed-out sessions only, where showing a populated example plant
  // is the point.
  const isReal = isRealFactoryUser(user);

  const machines = (!isReal && rawMachines.length === 0)
    ? DEMO_MACHINES
    : applyCurrentShiftAssignments(filterRowsForUserCompany(rawMachines, user), shiftRosterRes.data || [], shiftAssignmentRes.data || []);

  // tickets/pm_schedules/parts carry no company_code (or company_id) of
  // their own, only machine_id — scope them to this company's own machines
  // rather than trusting an unfiltered select() across tenants.
  const machineIds = new Set(machines.map((m) => m.id || m.machine_id));

  const tickets = (!isReal && rawTickets.length === 0)
    ? buildDemoTickets()
    : filterRowsForUserCompany(rawTickets, user, { validMachineIds: machineIds });

  const team = (!isReal && rawTeam.length === 0) ? DEMO_TEAM : rawTeam;
  const pmLogs = (!isReal && !pmLogsRes.data?.length) ? DEMO_PM_LOGS : (pmLogsRes.data || []);

  const pmSchedules = (pmSchedulesRes.data || []).filter((row) => machineIds.has(row.machine_id));
  const parts = (partsRes.data || []).filter((row) => machineIds.has(row.machine_id));

  return { machines, tickets, team, pmLogs, pmSchedules, parts };
}

export default function Dashboard() {
  const [user, setUser] = useState(() => readStoredUser());
  const [sources, setSources] = useState({ machines: [], tickets: [], team: [], pmLogs: [], pmSchedules: [], parts: [] });
  const [legacyData, setLegacyData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState('overview');

  // One cache per mount. Recomputing the fleet on every render is wasteful;
  // a 5-minute TTL is well inside how fast a maintenance board needs to move.
  const cacheRef = useRef(null);
  if (cacheRef.current === null) cacheRef.current = createMetricsCache();

  // The board is always the signed-in user's own role — previewing another
  // role's dashboard here used to be possible via a chip switcher, which let
  // any signed-in user render financial figures (e.g. OwnerDashboard's cost
  // KPIs) gated to roles with CAPABILITIES.VIEW_FINANCIALS. Removed rather
  // than fixed: nobody needs to browse someone else's board from their own
  // login.
  const role = useMemo(() => resolveDashboardRole(user?.role), [user]);
  const appRole = normalizeRole(user?.role);

  const specialistRole = ['maintenance_head', 'quality_inspector', 'safety_officer'].includes(appRole)
    ? appRole
    : null;

  // Operators and technicians already get a single-queue, "your next job"
  // board — the cross-fleet action board is for the roles that otherwise
  // have to jump into Tickets to see what needs a decision.
  const canSeeActionBoard = appRole !== 'operator' && can(user?.role, CAPABILITIES.VIEW_ALL_TICKETS);

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
    const isDemo = user?.inventory_mode === 'demo' || user?.company_code === 'TFDEMO';

    if (isDemo) {
      setSources({
        machines: DEMO_MACHINES,
        tickets: buildDemoTickets(),
        team: DEMO_TEAM,
        pmLogs: DEMO_PM_LOGS,
        pmSchedules: buildDemoPmSchedules(),
        parts: buildDemoParts(),
      });
      setLegacyData(fallback);
      setLoading(false);
      return;
    }

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

    return cacheRef.current.resolve(key, () => {
      const raw = buildRoleMetrics(role, input);

      // ------------------------------------------------------------------
      // Bridge: translate buildRoleMetrics owner output into the flat field
      // names that MasterTabbedDashboard / OwnerDashboard30s expect.
      // ------------------------------------------------------------------
      const fleet = raw.fleetHealth || {};
      const total = fleet.total || 0;
      const running = (fleet.byStatus?.running || 0) + (fleet.byStatus?.maintenance || 0);
      const uptimePercent = total ? Math.round((running / total) * 1000) / 10 : 0;
      const criticalDown = fleet.grid?.critical?.down || 0;

      // Health score: weighted composite of uptime, PM discipline, and SLA
      const slaPct = raw.sla?.pct ?? 100;
      const pmPct = raw.month?.pmCompletionPct ?? 100;
      const healthScore = Math.round(uptimePercent * 0.5 + slaPct * 0.25 + pmPct * 0.25);

      // Production risk label
      const productionRisk = criticalDown > 0
        ? 'Critical'
        : (fleet.byStatus?.down || 0) > 0 || (raw.valueAtRisk?.machineCount || 0) > 2
          ? 'Attention Required'
          : 'Safe';

      // Average repair time in minutes from average resolution hours
      const avgRepairMins = raw.month?.avgResolutionHours != null
        ? Math.round(raw.month.avgResolutionHours * 60)
        : 0;

      // Avoided loss estimate: sum of repair costs on closed tickets this month
      // (represents value of work that prevented further loss)
      const avoidedLoss = (raw.maintenanceCost?.repair || 0) * 2;

      return {
        ...raw,
        // Flat fields for MasterTabbedDashboard / OwnerDashboard30s
        healthScore,
        healthTrend: 0, // requires historical data; honest zero
        productionRisk,
        downtimeHours: raw.downtime?.hours || 0,
        productionLoss: raw.downtime?.cost || 0,
        revenueRisk: raw.valueAtRisk?.value || 0,
        avoidedLoss,
        uptimePercent,
        pmOnTimeRate: raw.month?.pmCompletionPct ?? 0,
        avgRepairMins,
        displayMachines: input.machines,
        displayTickets: input.tickets,
      };
    });
  }, [role, sources, user, isDemo, noFleetData, demoSession]);

  const specialistHeadings = {
    maintenance_head: { kicker: 'Exceptions', lead: 'Safety, technical and high-impact decisions requiring your authority.' },
    quality_inspector: { kicker: 'Quality assurance', lead: 'Repairs awaiting evidence review and quality release.' },
    safety_officer: { kicker: 'Safety control', lead: 'Unsafe conditions, restart checks and missing safety evidence.' },
  };
  const heading = specialistHeadings[specialistRole] || ROLE_HEADINGS[role] || ROLE_HEADINGS[DASHBOARD_ROLES.OWNER];
  const hero = ROLE_HEROES[specialistRole] || ROLE_HEROES[role] || ROLE_HEROES[DASHBOARD_ROLES.OWNER];
  const companyName = legacyData.company_name || 'TurboFix';
  const openQuickReport = useCallback(() => setQuickReportOpen(true), []);
  const roleSummaryLine = role === DASHBOARD_ROLES.TECHNICIAN
    ? 'Your active workload, SLA pressure, and assigned machines are summarized below. Open a job and get moving.'
    : role === DASHBOARD_ROLES.SUPERVISOR
      ? 'Your team load, fleet exposure, and active breaches are summarized below. Use this to redirect effort early.'
      : role === DASHBOARD_ROLES.ENGINEER
        ? 'Reliability exposure, open work, and fleet health are summarized below. Use this to prioritize technical improvement.'
        : 'Key plant metrics are summarized below. Select any section to dig deep.';

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

        {error && (
          <div className="decision-alert">
            {error}. Showing a safe empty-state until the API is available.
          </div>
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
          <LimbleCmmsDashboard
            metrics={metrics}
            tickets={sources.tickets}
            machines={sources.machines}
            pmSchedules={sources.pmSchedules}
            parts={sources.parts}
            loading={loading}
            onQuickReport={openQuickReport}
            user={user}
            role={role}
          />
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
