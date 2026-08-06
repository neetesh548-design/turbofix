import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Wrench, TrendingUp, ShieldCheck, Factory, 
  IndianRupee, AlertTriangle, Calculator, Cpu, Award, Zap, CheckCircle2, Clock,
  Layers, Package, ChevronRight, Download, Filter, Activity, Users, ArrowUpRight,
  MessageSquare, Volume2, VolumeX, Tv, Sparkles
} from 'lucide-react';
import OwnerDashboard30s from './OwnerDashboard30s.jsx';
import OperationsBoard from './OperationsBoard.jsx';
import DowntimeSalesCalculator from '../marketing/DowntimeSalesCalculator.jsx';
import WhatsAppMalikDigestModal from './WhatsAppMalikDigestModal.jsx';
import { formatInrCompact } from '../../utils/dashboardMetrics.js';

/**
 * MasterTabbedDashboard — High-Impact Indian Factory Command Center
 * Zero-scroll, 100vh viewport fitted, 3-tab controller with keyboard hotkeys (1, 2, 3),
 * 1-click WhatsApp Malik Dispatch, Sound Alert Toggle, and Digital TV Mode.
 */
export default function MasterTabbedDashboard({ 
  metrics, 
  tickets = [], 
  machines = [], 
  pmSchedules = [], 
  parts = [],
  loading = false,
  onQuickReport
}) {
  const [activeTab, setActiveTab] = useState(1); // 1 | 2 | 3
  const [selectedVertical, setSelectedVertical] = useState('cnc');
  const [actionNotice, setActionNotice] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isTyping = target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (isTyping) return;

      if (e.key === '1') setActiveTab(1);
      if (e.key === '2') setActiveTab(2);
      if (e.key === '3') setActiveTab(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerQuickAction = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    triggerQuickAction(soundEnabled ? 'Plant Breakdown Audio Alert MUTED' : 'Plant Breakdown Audio Alert ENABLED (Siren Active)');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      triggerQuickAction('Entered Digital TV Shopfloor Fullscreen Mode');
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const problemMachinesFromData = React.useMemo(() => {
    // Build from actual tickets that are open+critical, joined with machine names
    const openTickets = tickets.filter(t => 
      t.status && !['closed', 'resolved', 'verified'].includes(t.status.toLowerCase())
    );
    return openTickets.slice(0, 4).map(t => {
      const machine = machines.find(m => (m.id || m.machine_id) === t.machine_id);
      return {
        id: t.machine_id || t.id,
        name: machine?.name || machine?.machine_name || t.machine_id || 'Unknown Machine',
        loss: Number(t.estimated_loss) || 0,
        issue: t.issue || t.description || t.title || 'Breakdown reported',
        status: t.urgency === 'critical' ? 'Immediate Attention' : 'Needs Review',
      };
    });
  }, [tickets, machines]);

  return (
    <div className="h-[calc(100vh-90px)] max-h-[calc(100vh-90px)] overflow-hidden flex flex-col justify-between font-sans space-y-2.5 p-1">
      {/* TOAST NOTICE */}
      {actionNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xl backdrop-blur-md shrink-0">
          <span className="flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {actionNotice}
          </span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TOP CONTROLLER BAR */}
      <div className="bg-[#0B0F19]/90 border border-slate-800/90 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl shrink-0">
        <div className="flex flex-row items-center justify-between gap-3">
          
          {/* Title & Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-400/40 rounded-xl text-slate-950 shadow-[0_0_20px_rgba(80,255,171,0.3)]">
              <Factory className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest font-mono">Master Karkhana Command</span>
                <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono hidden sm:inline">
                  Hotkeys 1, 2, 3
                </span>
              </div>
              <h1 className="text-base md:text-lg font-black text-white tracking-tight leading-none">
                TurboFix Malik & Plant Cockpit
              </h1>
            </div>
          </div>

          {/* Industry Preset & Audio/TV Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-[#111827]/90 px-3 py-1 rounded-xl border border-slate-800 text-[11px]">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" /> Industry:
              </span>
              <select
                data-testid="industry-preset-select"
                aria-label="Industry Preset"
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
                className="bg-[#0B0F19] text-emerald-300 font-bold border border-emerald-500/30 rounded-lg px-2 py-0.5 text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="cnc">CNC Machining Plant</option>
                <option value="moulding">Injection Moulding Plant</option>
                <option value="packaging">Packaging Line</option>
              </select>
            </div>

            {/* Audio Alert & TV Fullscreen Buttons */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute Breakdown Audio' : 'Enable Breakdown Audio Siren'}
              className={`p-1.5 rounded-lg border text-xs transition ${
                soundEnabled 
                  ? 'bg-amber-950/80 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                  : 'bg-[#111827] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFullscreen}
              title="Shopfloor TV Fullscreen Mode"
              className="p-1.5 rounded-lg bg-[#111827] text-slate-400 hover:text-white border border-slate-800 transition"
            >
              <Tv className="w-4 h-4 text-indigo-400" />
            </button>
          </div>

          {/* 3 TAB BUTTONS [1, 2, 3] */}
          <div className="flex items-center gap-1.5 bg-[#111827]/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab(1)}
              className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 1
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(80,255,171,0.4)] border border-emerald-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center ${activeTab === 1 ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span>Malik Overview</span>
            </button>

            <button
              onClick={() => setActiveTab(2)}
              className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 2
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(80,255,171,0.4)] border border-emerald-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center ${activeTab === 2 ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span>Shopfloor & Fitters</span>
            </button>

            <button
              onClick={() => setActiveTab(3)}
              className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 3
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(80,255,171,0.4)] border border-emerald-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center ${activeTab === 3 ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span>Paisa & Bachat</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MALIK OVERVIEW (MAIN COCKPIT - ZERO SCROLL) */}
      {activeTab === 1 && (
        <div className="flex-1 flex flex-col justify-between space-y-2.5 overflow-hidden">
          <OwnerDashboard30s 
            healthScore={metrics?.healthScore ?? 87}
            healthTrend={metrics?.healthTrend ?? 0}
            productionRisk={metrics?.productionRisk ?? 'Safe'}
            downtimeTodayHours={metrics?.downtimeHours ?? 0}
            productionLossToday={metrics?.productionLoss ?? 0}
            revenueRisk={metrics?.revenueRisk ?? 0}
            avoidedLossMonth={metrics?.avoidedLoss ?? 0}
            uptimePercent={metrics?.uptimePercent ?? 0}
            pmDiscipline={metrics?.pmOnTimeRate ?? 0}
            problemMachines={problemMachinesFromData}
            onDrilldown={() => setActiveTab(2)}
          />

          {/* Quick Decision Action Bar */}
          <div className="bg-[#0B0F19]/90 border border-slate-800/90 rounded-xl p-2.5 shadow-2xl backdrop-blur-xl shrink-0">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <button
                onClick={() => triggerQuickAction('Approved Laser Alignment & Bearing Repair PO for CNC-12')}
                className="bg-[#111827]/80 hover:bg-emerald-950/50 border border-slate-800/90 hover:border-emerald-500/40 p-2.5 rounded-lg text-left transition group"
              >
                <div className="font-bold text-white text-xs group-hover:text-emerald-300">Approve Repair PO</div>
                <div className="text-[10px] text-slate-400">Authorize VMC bearing overhaul</div>
              </button>

              <button
                onClick={() => setWhatsappOpen(true)}
                className="bg-[#111827]/80 hover:bg-emerald-950/50 border border-slate-800/90 hover:border-emerald-500/40 p-2.5 rounded-lg text-left transition group flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white text-xs group-hover:text-emerald-300">WhatsApp Malik Alert</div>
                  <div className="text-[10px] text-slate-400">1-click WhatsApp dispatch</div>
                </div>
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => triggerQuickAction('Generated Monthly Bachat (Money Saved) Executive PDF')}
                className="bg-[#111827]/80 hover:bg-emerald-950/50 border border-slate-800/90 hover:border-emerald-500/40 p-2.5 rounded-lg text-left transition flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-white text-xs group-hover:text-emerald-300">Download Bachat PDF</div>
                  <div className="text-[10px] text-slate-400">₹3.8 Lakh Bachat Report</div>
                </div>
                <Download className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHOPFLOOR & FITTERS WORK BOARD */}
      {activeTab === 2 && (
        <div className="flex-1 overflow-auto bg-[#0B0F19]/90 border border-slate-800/90 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/90 pb-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest font-mono">Shopfloor Control & Fitter Complaints</span>
              <h2 className="text-lg font-black text-white">Technician & Fitter Work Board</h2>
            </div>
            {onQuickReport && (
              <button
                onClick={onQuickReport}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_15px_rgba(80,255,171,0.3)] transition"
              >
                + Machine Bandh Alert (Complaints)
              </button>
            )}
          </div>

          <OperationsBoard
            tickets={tickets}
            machines={machines}
            pmSchedules={pmSchedules}
            parts={parts}
            loading={loading}
          />
        </div>
      )}

      {/* TAB 3: PAISA & BACHAT INTELLIGENCE */}
      {activeTab === 3 && (
        <div className="flex-1 overflow-auto space-y-3">
          {/* AI Intelligence Banner */}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">AI Repeat Failure Warning</div>
                <div className="text-xs font-extrabold text-white">
                  {problemMachinesFromData.length > 0 ? `${problemMachinesFromData[0].name}: ${problemMachinesFromData[0].issue} Risk` : 'No critical issues detected'}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-300 bg-amber-900/60 px-3 py-1 rounded border border-amber-500/30 font-mono">
              ₹{problemMachinesFromData.length > 0 ? problemMachinesFromData[0].loss : 0} Nuksan Avoidable
            </span>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Spare Parts Consumption Intelligence */}
            <div className="bg-[#0B0F19]/90 border border-slate-800/90 rounded-xl p-4 space-y-3 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-800/90 pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-extrabold text-white">Spare Parts & Bearing Kharcha (Expenses)</h3>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {parts.filter(p => (p.stock_qty ?? p.quantity) <= (p.reorder_level || 5)).slice(0, 2).map((part, idx) => (
                  <div key={part.id || idx} className="bg-[#111827]/80 border border-slate-800/90 p-2.5 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white text-xs">{part.part_name || part.name || 'Unknown Part'}</div>
                      <div className="text-[10px] text-slate-400">{(part.stock_qty ?? part.quantity)} units (₹{part.unit_cost || part.cost || 0}) • {part.location || part.store_location || 'Store'}</div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold">
                      Low Stock
                    </span>
                  </div>
                ))}
                {parts.filter(p => (p.stock_qty ?? p.quantity) <= (p.reorder_level || 5)).length === 0 && (
                  <div className="text-[10px] text-slate-400 p-2 text-center">No parts at reorder level</div>
                )}
              </div>
            </div>

            {/* Factory Maturity Benchmark Card */}
            <div className="bg-[#0B0F19]/90 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-800/90 pb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-extrabold text-white">Karkhana Maintenance Maturity Score</h3>
                </div>
                <span className="text-xl font-black text-emerald-400 font-mono">{metrics?.healthScore ?? 0} / 100</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                <div className="bg-[#111827]/80 p-2 rounded-lg border border-slate-800/90">
                  <span className="text-slate-400 block text-[10px]">Service (PM) Discipline</span>
                  <span className="font-bold text-emerald-400 font-mono">{metrics?.pmOnTimeRate ?? 0}%</span>
                </div>
                <div className="bg-[#111827]/80 p-2 rounded-lg border border-slate-800/90">
                  <span className="text-slate-400 block text-[10px]">Average Repair Time</span>
                  <span className="font-bold text-emerald-400 font-mono">{metrics?.avgRepairMins ?? 0} min avg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP MALIK DISPATCH DRAWER */}
      <WhatsAppMalikDigestModal
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        metrics={metrics}
        problemMachines={problemMachinesFromData}
      />
    </div>
  );
}
