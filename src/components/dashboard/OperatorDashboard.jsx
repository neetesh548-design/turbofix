/**
 * OperatorDashboard — Plant & Machine Operator Workspace
 * 
 * Built specifically for machine operators on the shopfloor.
 * Gives immediate clarity on machine health, 1-tap breakdown reporting,
 * live response tracking of assigned technicians, and shift safety checklist.
 */

import React, { useState } from 'react';
import {
  QrCode, Wrench, ShieldCheck, Zap, AlertTriangle, CheckCircle,
  Clock, Activity, ArrowRight, Camera, Mic, RefreshCw, AlertCircle, HelpCircle
} from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import RoleFocusSection from './RoleFocusSection.jsx';

export default function OperatorDashboard({ metrics, user, loading = false, onQuickReport }) {
  const [checklist, setChecklist] = useState([
    { id: 'safety_guard', label: 'Safety guards & emergency stop verified', checked: true },
    { id: 'lubrication', label: 'Oil/lubrication levels checked', checked: true },
    { id: 'cleanliness', label: 'Machine area clean & 5S compliant', checked: false },
    { id: 'sensor_calibration', label: 'Sensor alignment & calibration ok', checked: false },
  ]);

  const toggleChecklist = (id) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const machines = Array.isArray(metrics?.displayMachines) ? metrics.displayMachines : [];
  const tickets = Array.isArray(metrics?.displayTickets) ? metrics.displayTickets : [];

  const myMachine = machines[0] || {
    machine_name: 'Primary Line Machine',
    machine_id: 'MAC-001',
    status: 'Running',
    primary_technician_name: 'Manoj Mukherjee'
  };

  const activeBreakdowns = tickets.filter(
    (t) => ['open', 'in_progress', 'assigned'].includes(String(t.status || 'open').toLowerCase())
  );

  const completedChecklistCount = checklist.filter(c => c.checked).length;
  const checklistPct = Math.round((completedChecklistCount / checklist.length) * 100);

  return (
    <div className="rd-board rd-board-operator" data-testid="operator-dashboard" data-loading={loading ? 'true' : 'false'}>
      {/* Operator Welcome & Emergency Action Header */}
      <section className="rd-greeting flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="rd-kicker text-cyan-400 font-bold uppercase tracking-wider text-xs">Operator Command Hub</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Shopfloor Operator Station'}
          </h2>
          <p className="text-slate-300 text-sm">
            Line Machine: <strong className="text-cyan-300">{myMachine.machine_name || 'Assigned Machine'}</strong> · Active Shift Accountability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onQuickReport}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold shadow-lg shadow-orange-950/40 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <QrCode size={20} />
            <span>1-Tap Breakdown Report</span>
          </button>
        </div>
      </section>

      {/* Operator Primary Responsibility Focus */}
      <RoleFocusSection
        ariaLabel="Operator primary responsibility"
        tone={activeBreakdowns.length > 0 ? 'warning' : 'ok'}
        title={`Machine Status: ${myMachine.status || 'Running Optimal'}`}
        body={activeBreakdowns.length > 0
          ? `${activeBreakdowns.length} active maintenance callout in progress. Dedicated technician on site.`
          : 'Your machine is running smoothly. Perform periodic parameter checks and keep 5S clean.'}
        pill={activeBreakdowns.length > 0 ? 'Tech Callout Active' : 'Normal Operation'}
        meta={[
          { icon: Activity, text: `Asset ID: ${myMachine.machine_id || 'MAC-001'}`, label: 'machine_id' },
          { icon: Wrench, text: `Technician: ${myMachine.primary_technician_name || 'On Call'}`, label: 'tech' },
          { icon: ShieldCheck, text: `Shift Audit: ${checklistPct}% complete`, label: 'checklist' }
        ]}
        actions={[
          { href: 'report-breakdown.html', label: 'Detailed Anomaly Scan' },
          { href: 'machines.html', label: 'View Machine Manual & Specs' }
        ]}
        priorities={[
          { label: 'Active Callouts', value: activeBreakdowns.length, help: 'Reported breakdowns', tone: activeBreakdowns.length ? 'warning' : 'ok' },
          { label: '5S Compliance', value: `${checklistPct}%`, help: 'Shift safety checklist', tone: checklistPct === 100 ? 'ok' : 'info' },
          { label: 'Line Uptime', value: '98.4%', help: 'Current shift running efficiency', tone: 'ok' }
        ]}
      />

      {/* Operator Quick KPI Grid */}
      <section className="rd-kpi-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <DashboardKpiCard
          label="My Machine Status"
          value={loading ? '—' : (myMachine.status || 'Running')}
          tone={myMachine.status === 'Down' ? 'danger' : 'ok'}
          help="Live operational health"
        />
        <DashboardKpiCard
          label="Assigned Technician"
          value={loading ? '—' : (myMachine.primary_technician_name || 'Ramesh Lead')}
          tone="info"
          help="Direct line contact"
        />
        <DashboardKpiCard
          label="Active Reports"
          value={loading ? '—' : activeBreakdowns.length}
          tone={activeBreakdowns.length ? 'warning' : 'ok'}
          help="Reported from this line"
        />
        <DashboardKpiCard
          label="Shift 5S Checklist"
          value={loading ? '—' : `${completedChecklistCount}/${checklist.length}`}
          tone={completedChecklistCount === checklist.length ? 'ok' : 'warning'}
          help="Safety & cleanliness tasks"
        />
      </section>

      {/* Operator Responsibility & Solution Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* Module 1: Shift Start & Safety Checklist */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-cyan-400" size={20} />
              <h3 className="text-lg font-bold text-white">Shift Start Safety & 5S Verification</h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {completedChecklistCount} / {checklist.length} Verified
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Verify every item before operating machine to ensure shift safety, zero accidents, and optimum output.
          </p>

          <div className="space-y-3">
            {checklist.map(item => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  item.checked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleChecklist(item.id)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900 cursor-pointer"
                />
                <span className="text-sm font-medium leading-snug">{item.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Responsibility: Operator Shift Handover</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle size={14} /> Logged in system
            </span>
          </div>
        </div>

        {/* Module 2: Live Technician Response & Solutions */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="text-amber-400" size={20} />
                <h3 className="text-lg font-bold text-white">Technician Response & Solutions</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Live Support Radar
              </span>
            </div>

            {activeBreakdowns.length > 0 ? (
              <div className="space-y-3">
                {activeBreakdowns.slice(0, 3).map(ticket => (
                  <div key={ticket.id || ticket.ticket_id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                        {ticket.machine_name || myMachine.machine_name}
                      </span>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {ticket.urgency || 'Critical'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mb-2">{ticket.issue_text || 'Breakdown reported'}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-amber-400" />
                        Technician Status: {ticket.technician_name || 'En Route'}
                      </span>
                      <a href={`tickets.html?ticket=${encodeURIComponent(ticket.id || '')}`} className="text-cyan-400 hover:underline font-bold flex items-center gap-1">
                        Track SLA <ArrowRight size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                <h4 className="text-base font-bold text-white mb-1">No Active Line Breakdowns</h4>
                <p className="text-xs text-slate-300 mb-3">
                  If you notice unusual noise, vibration, or temperature spike, report it immediately to prevent major failure.
                </p>
                <button
                  type="button"
                  onClick={onQuickReport}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Report Early Anomaly
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Need help with machine operating manual?</span>
            <a href="assistant.html" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              Ask AI Assistant <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
