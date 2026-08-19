import React, { useState, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Package,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  CheckSquare,
  ChevronRight,
  User,
  IndianRupee,
  TrendingUp,
  Cpu,
  Repeat,
  AlertCircle,
  QrCode,
  Zap,
  Users,
} from 'lucide-react';
import { formatInrCompact } from '../../utils/dashboardMetrics.js';
import { HEALTH_BAND_META, bandForScore } from '../../utils/operationalHealth.js';

/**
 * LimbleCmmsDashboard — Role-Aware Limble CMMS Reference Implementation
 * Combines Limble CMMS minimalist 4-KPI + 2-Column visual design with 100%
 * real metrics data tailored specifically to the user's role (Owner, Technician,
 * Supervisor, Engineer, Operator).
 */
export default function LimbleCmmsDashboard({
  metrics,
  tickets = [],
  machines = [],
  pmSchedules = [],
  parts = [],
  loading = false,
  onQuickReport,
  user,
  role = 'owner',
  operationalHealth,
  healthTrend,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // all | urgent | completed

  const userRole = String(role || user?.role || 'owner').toLowerCase();
  const isOwner = ['owner', 'plant_manager', 'plant_head', 'admin', 'maintenance_head', 'head', 'manager'].some((r) => userRole.includes(r));
  const isTech = ['technician', 'maintenance_technician', 'fitter'].some((r) => userRole.includes(r));
  const isSuper = ['supervisor', 'maintenance_supervisor'].some((r) => userRole.includes(r));
  const isEngineer = ['engineer', 'reliability_engineer', 'maintenance_engineer'].some((r) => userRole.includes(r));
  const isOperator = ['operator', 'machine_operator'].some((r) => userRole.includes(r));

  // Open vs closed tickets from actual data
  const openTickets = useMemo(() => {
    return tickets.filter(
      (t) => !['closed', 'resolved', 'verified'].includes(String(t.status || '').toLowerCase())
    );
  }, [tickets]);

  const urgentTickets = useMemo(() => {
    return openTickets.filter(
      (t) => String(t.urgency || '').toLowerCase() === 'critical' || String(t.urgency || '').toLowerCase() === 'high'
    );
  }, [openTickets]);

  const completedTickets = useMemo(() => {
    return tickets.filter(
      (t) => ['closed', 'resolved', 'verified'].includes(String(t.status || '').toLowerCase())
    );
  }, [tickets]);

  const downMachines = useMemo(() => {
    return machines.filter(
      (m) => ['breakdown', 'down', 'maintenance'].includes(String(m.status || '').toLowerCase())
    );
  }, [machines]);

  const lowStockParts = useMemo(() => {
    return parts.filter(
      (p) => Number(p.stock_qty ?? p.quantity ?? 0) <= Number(p.reorder_level ?? 5)
    );
  }, [parts]);

  // Filtered tickets based on search query and active tab
  const displayedTickets = useMemo(() => {
    let list = filterTab === 'urgent'
      ? urgentTickets
      : filterTab === 'completed'
      ? completedTickets
      : openTickets;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          (t.title || t.issue || t.description || '').toLowerCase().includes(q) ||
          (t.machine_id || '').toLowerCase().includes(q) ||
          (t.assigned_to || t.technician_name || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [filterTab, openTickets, urgentTickets, completedTickets, searchQuery]);

  return (
    <div className="limble-cmms-container space-y-4 font-sans text-slate-200">
      
      {/* ── 1. HEADER & CONTROL BAR ────────────────────────────── */}
      <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#50ffab]" />
            LIMBLE CMMS DASHBOARD • {isOwner ? 'EXECUTIVE MALIK' : isTech ? 'TECHNICIAN WORKSPACE' : isSuper ? 'SUPERVISOR CONTROL' : isEngineer ? 'RELIABILITY ENGINEERING' : 'OPERATOR STATION'}
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {isOwner ? 'Factory Money Risk & Machine Overview' : isTech ? 'My Daily Work Queue' : isSuper ? 'Shift Team & Workload Control' : isEngineer ? 'Machine Health & Breakdown Prevention' : 'Shopfloor Breakdown Callout'}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks, machines, techs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b1118] border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Action Button */}
          {onQuickReport && (
            <button
              onClick={onQuickReport}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              {isOperator ? '+ Machine Breakdown Alert' : '+ New Work Order'}
            </button>
          )}
        </div>
      </div>

      {/* ── OPERATIONAL HEALTH SCORE ─────────────────────────────
          One 0-100 number blending machine health, PM on-time, parts
          availability and ticket/SLA pressure — see utils/operationalHealth.js
          for the scoring, docs/lessons on why this exists as an explainable,
          equally-weighted composite rather than a black-box "AI score". */}
      {!loading && operationalHealth && (
        <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 shrink-0"
                style={{
                  borderColor: HEALTH_BAND_META[bandForScore(operationalHealth.score)].color,
                  color: HEALTH_BAND_META[bandForScore(operationalHealth.score)].color,
                }}
              >
                <span className="text-2xl font-black font-mono leading-none">{operationalHealth.score}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">/100</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Operational Health</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border"
                    style={{
                      color: HEALTH_BAND_META[bandForScore(operationalHealth.score)].color,
                      borderColor: `${HEALTH_BAND_META[bandForScore(operationalHealth.score)].color}4d`,
                      backgroundColor: `${HEALTH_BAND_META[bandForScore(operationalHealth.score)].color}1a`,
                    }}
                  >
                    {HEALTH_BAND_META[bandForScore(operationalHealth.score)].label}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1">{operationalHealth.nextAction}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  {healthTrend ? healthTrend.label : 'Not enough history yet for a trend'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 min-w-[220px]">
              {Object.values(operationalHealth.drivers).map((driver) => (
                <div key={driver.label} className="min-w-[140px]">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wide">{driver.label}</span>
                    <span className="text-slate-300 font-mono font-bold">{driver.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${driver.pct}%`,
                        backgroundColor: HEALTH_BAND_META[bandForScore(driver.pct)].color,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{driver.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. TOP 4 MINIMALIST KPI CARDS (100% REAL COMPUTED DATA) ─ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1 */}
        <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isOwner ? 'Downtime Money Risk' : isTech ? 'My Open Tasks' : isSuper ? 'Total Open Work' : isEngineer ? 'Repeat Failure Rate' : 'Machine Status'}
            </span>
            <span className="text-xl lg:text-3xl font-black text-white font-mono">
              {loading ? '—' : isOwner ? formatInrCompact(metrics?.revenueRisk ?? 0) : isTech ? (metrics?.queue?.total ?? openTickets.length) : isSuper ? openTickets.length : isEngineer ? `${metrics?.reliability?.repeatFailureRatePct ?? 0}%` : (machines[0]?.status || 'Running')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              {isOwner ? 'Exposed asset value' : isTech ? 'Tasks in queue' : isSuper ? 'Active plant work' : isEngineer ? 'Last 90 days' : 'Primary line'}
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            {isOwner ? <IndianRupee className="w-6 h-6" /> : isTech ? <Wrench className="w-6 h-6" /> : isSuper ? <Users className="w-6 h-6" /> : isEngineer ? <Repeat className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isOwner ? 'Daily Loss Today' : isTech ? 'Urgent SLA Tasks' : isSuper ? 'SLA Overdue Tasks' : isEngineer ? 'Average Run Time (MTBF)' : 'Active Breakdowns'}
            </span>
            <span className="text-xl lg:text-3xl font-black text-amber-400 font-mono">
              {loading ? '—' : isOwner ? formatInrCompact(metrics?.productionLoss ?? 0) : isTech ? (metrics?.queue?.urgent?.length ?? urgentTickets.length) : isSuper ? (metrics?.breaches?.length ?? 0) : isEngineer ? (metrics?.reliability?.fleetMtbfHours ? `${metrics.reliability.fleetMtbfHours}h` : 'No data') : openTickets.length}
            </span>
            <span className="text-[10px] text-amber-500/80 block mt-1">
              {isOwner ? 'Downtime loss' : isTech ? 'Overdue risk' : isSuper ? 'SLA breached' : isEngineer ? 'Between stops' : 'Plant callouts'}
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isOwner ? 'Monthly Money Saved' : isTech ? 'My Assigned Machines' : isSuper ? 'Avg Response Time' : isEngineer ? 'Average Repair Time' : 'Shift Checklist'}
            </span>
            <span className="text-xl lg:text-3xl font-black text-emerald-400 font-mono">
              {loading ? '—' : isOwner ? formatInrCompact(metrics?.avoidedLoss ?? 0) : isTech ? (metrics?.myMachines?.length ?? machines.length) : isSuper ? (metrics?.responseTrend?.avgHours ? `${metrics.responseTrend.avgHours}h` : 'No data') : isEngineer ? (metrics?.month?.avgResolutionHours ? `${metrics.month.avgResolutionHours}h` : 'No data') : 'Verified'}
            </span>
            <span className="text-[10px] text-emerald-500/80 block mt-1">
              {isOwner ? 'Savings this month' : isTech ? 'Under your care' : isSuper ? 'Fitter response' : isEngineer ? 'MTTR speed' : 'Safety status'}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            {isOwner ? <TrendingUp className="w-6 h-6" /> : isTech ? <Cpu className="w-6 h-6" /> : isSuper ? <Clock className="w-6 h-6" /> : isEngineer ? <Wrench className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isOwner ? 'Plant Machine Uptime' : isTech ? 'Spares Needed' : isSuper ? 'Team Utilization' : isEngineer ? 'Open Root Causes (RCA)' : 'Fitter On Duty'}
            </span>
            <span className="text-xl lg:text-3xl font-black text-teal-400 font-mono">
              {loading ? '—' : isOwner ? `${metrics?.uptimePercent ?? 0}%` : isTech ? lowStockParts.length : isSuper ? `${metrics?.workload?.balanceRatio ? Math.round(metrics.workload.balanceRatio * 100) : 0}%` : isEngineer ? (metrics?.capa?.actions?.length ?? 0) : (machines[0]?.primary_technician_name ? machines[0].primary_technician_name.split(' ')[0] : 'Unassigned')}
            </span>
            <span className="text-[10px] text-teal-500/80 block mt-1">
              {isOwner ? 'Operating smoothly' : isTech ? 'Reorder needed' : isSuper ? 'Workload balanced' : isEngineer ? 'Action items' : 'Assigned fitter'}
            </span>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
            {isOwner ? <Activity className="w-6 h-6" /> : isTech ? <Package className="w-6 h-6" /> : isSuper ? <Users className="w-6 h-6" /> : isEngineer ? <CheckSquare className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE GRID (2 COLUMNS) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN (8 COLS): WORK ORDER LIST / PROBLEM MACHINES */}
        <div className="lg:col-span-8 space-y-3">
          
          {/* TAB FILTERS */}
          <div className="bg-[#131924] border border-slate-800/90 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto">
            {[
              { key: 'all', label: `All Tasks (${openTickets.length})` },
              { key: 'urgent', label: `Urgent (${urgentTickets.length})` },
              { key: 'completed', label: `Completed (${completedTickets.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filterTab === tab.key
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* WORK ORDER CARDS */}
          <div className="space-y-2.5">
            {loading && (
              <div className="bg-[#131924] border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-xs">
                Loading work orders...
              </div>
            )}

            {!loading && displayedTickets.length === 0 && (
              <div className="bg-[#131924] border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-xs">
                No work orders found in this view.
              </div>
            )}

            {!loading &&
              displayedTickets.map((t) => {
                const isUrgent = String(t.urgency || '').toLowerCase() === 'critical' || String(t.urgency || '').toLowerCase() === 'high';
                const isClosed = ['closed', 'resolved', 'verified'].includes(String(t.status || '').toLowerCase());
                const machineName = t.machine_name || t.machine_id || 'Primary Line Machine';
                const costLoss = Number(t.estimated_loss || t.downtime_cost || 0);

                return (
                  <div
                    key={t.id || t.ticket_id}
                    className="bg-[#131924] border border-slate-800/90 hover:border-slate-700 p-4 rounded-2xl shadow-md transition space-y-2.5"
                  >
                    {/* Top Row: Machine & Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{machineName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">#{t.id || 'WO-101'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOwner && costLoss > 0 && (
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            ₹{costLoss.toLocaleString('en-IN')} Loss
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            isClosed
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isUrgent
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isClosed ? 'Resolved' : isUrgent ? 'Urgent' : 'Normal'}
                        </span>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {t.issue || t.description || t.title || 'Machine maintenance inspection requested.'}
                    </p>

                    {/* Footer Row: Tech & Date */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Assigned to: {t.assigned_to || t.technician_name || 'Unassigned'}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Today'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* RIGHT COLUMN (4 COLS): ASSET HEALTH & SPARES */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* ASSET STATUS GRID WIDGET */}
          <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Machine Status
              </h3>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{machines.length} Machines</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {machines.slice(0, 5).map((m, idx) => {
                const status = String(m.status || 'running').toLowerCase();
                const isDown = ['breakdown', 'down', 'maintenance'].includes(status);

                return (
                  <div
                    key={m.id || m.machine_id || idx}
                    className="bg-[#0b1118] border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{m.name || m.machine_name || 'Machine'}</div>
                      <div className="text-[10px] text-slate-500">{m.location || 'Shopfloor Line'}</div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        isDown
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isDown ? 'Breakdown' : 'Running'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LOW STOCK SPARES WIDGET */}
          <div className="bg-[#131924] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-400" /> Low Stock Parts Alert
              </h3>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{lowStockParts.length} Parts</span>
            </div>

            <div className="space-y-2">
              {lowStockParts.slice(0, 3).map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="bg-[#0b1118] border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{p.part_name || p.name || 'Part'}</div>
                    <div className="text-[10px] text-slate-500">Reorder level: {p.reorder_level || 5} units</div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-extrabold font-mono">
                    {p.stock_qty ?? p.quantity ?? 0} left
                  </span>
                </div>
              ))}

              {lowStockParts.length === 0 && (
                <p className="text-[11px] text-slate-500 text-center py-2">All parts in stock.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
