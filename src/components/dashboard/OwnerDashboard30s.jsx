import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, 
  IndianRupee, Clock, Zap, AlertCircle, ArrowUpRight, CheckCircle2, Factory, Shield, Cpu, Activity,
  MessageSquare, BellRing, Sparkles, Tv
} from 'lucide-react';
import { formatInrCompact } from '../../utils/dashboardMetrics';
import { StitchDonutChart } from '../ui/StitchVisualCharts';
import WhatsAppMalikDigestModal from './WhatsAppMalikDigestModal';

/**
 * OwnerDashboard30s — Google Stitch "Obsidian Industrial" Executive Cockpit
 * Zero-scroll, high-impact plant telemetry, live sparkline trends, Andon alert ticker.
 */
export default function OwnerDashboard30s({ 
  healthScore = 87, 
  healthTrend = +5,
  productionRisk = 'Safe',
  downtimeTodayHours = 2.5,
  productionLossToday = 18000,
  revenueRisk = 54000,
  avoidedLossMonth = 380000,
  machineStatusData = [
    { label: 'Running Smoothly', value: 18, color: '#10B981' },
    { label: 'PM Warning', value: 2, color: '#F59E0B' },
    { label: 'Machine Bandh', value: 1, color: '#EF4444' },
  ],
  uptimePercent = 96.4,
  pmDiscipline = 92.0,
  repeatRate = 1.2,
  problemMachines = [
    { id: 'cnc-04', name: 'CNC Milling 04 (VMC-850)', loss: 22000, issue: 'Spindle Bearing Overheating', status: 'Immediate Attention' },
    { id: 'inj-02', name: 'Injection Moulding 02 (350T)', loss: 14000, issue: 'Hydraulic Pressure Drop', status: 'Immediate Attention' },
  ],
  onDrilldown
}) {
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [showBachatBreakdown, setShowBachatBreakdown] = useState(false);

  const formatLakh = (v) => v >= 100000 ? `₹${(v/100000).toFixed(1)} Lakh` : `₹${v.toLocaleString('en-IN')}`;

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'Critical':
        return {
          pillBg: 'bg-red-950/80 border-red-500/50 text-red-400 shadow-lg shadow-red-950/50',
          dotBg: 'bg-red-500 animate-ping',
          icon: <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />,
          label: 'Heavy Dispatch Risk',
          sub: 'Critical lines down — customer delivery at risk'
        };
      case 'Attention Required':
        return {
          pillBg: 'bg-amber-950/80 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-950/50',
          dotBg: 'bg-amber-400',
          icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
          label: 'Friction on 2 Machines',
          sub: '2 machines experiencing operational delay'
        };
      case 'Safe':
      default:
        return {
          pillBg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/40',
          dotBg: 'bg-emerald-400 shadow-[0_0_8px_rgba(32,226,145,0.8)]',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          label: 'Karkhana Running Smoothly',
          sub: 'All major production lines running within targets'
        };
    }
  };

  const riskInfo = getRiskBadge(productionRisk);

  return (
    <div className="bg-[#0B0F19]/95 backdrop-blur-xl text-slate-100 p-4 md:p-5 rounded-2xl border border-slate-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-3 font-sans flex-1 flex flex-col justify-between relative overflow-hidden">
      {/* STITCH AMBIENT GLOW */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-10 w-80 h-32 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* LIVE SHOPFLOOR ANDON ALERT TICKER */}
      <div className="bg-[#111827]/90 border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-md relative z-10 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <BellRing className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
          <span className="font-mono font-bold text-amber-400 uppercase text-[10px] tracking-wider shrink-0">ANDON TICKER:</span>
          <span className="text-slate-200 truncate text-[11px]">
            🚨 <strong className="text-white">{problemMachines.length > 0 ? `${problemMachines[0].name} ${problemMachines[0].issue}` : 'Karkhana Running Smoothly'}</strong> {problemMachines.length > 0 ? `— Fitter Dispatched — ₹${problemMachines[0].loss} Risk Isolated` : ''}
          </span>
        </div>

        <button
          onClick={() => setWhatsappOpen(true)}
          className="ml-2 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] rounded-lg transition shrink-0 flex items-center gap-1 font-mono"
        >
          <MessageSquare className="w-3 h-3 text-emerald-400" /> WhatsApp Malik Digest
        </button>
      </div>

      {/* HEADER ROW */}
      <div className="flex flex-row items-center justify-between gap-4 pb-2 border-b border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#50ffab]" />
            PLANT OVERVIEW • 30-SECOND SUMMARY
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Machine Breakdown & Daily Loss Tracking
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Plant Uptime:</span>
          <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold transition-all ${riskInfo.pillBg}`}>
            <span className={`w-2 h-2 rounded-full ${riskInfo.dotBg}`} />
            {riskInfo.icon}
            {riskInfo.label}
          </div>
        </div>
      </div>

      {/* 3 CORE SECTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 relative z-10">
        
        {/* SECTION 1: FACTORY HEALTH SCORE */}
        <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-800/90 hover:border-emerald-500/40 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between transition-all group">
          <div className="absolute top-2 right-2 text-slate-800 group-hover:text-emerald-500/10 transition-colors pointer-events-none">
            <Shield className="w-20 h-20 opacity-20" />
          </div>

          <div>
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              SECTION 1 • FACTORY HEALTH SCORE
            </div>
            <div className="flex items-baseline gap-2 my-0.5">
              <span className="text-4xl md:text-5xl font-black text-white tracking-tight font-mono drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {healthScore}
              </span>
              <span className="text-sm text-slate-400 font-semibold font-mono">/ 100</span>
            </div>

            <div className="mt-1.5 flex items-center gap-2">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="w-3 h-3" />
                +{healthTrend} pts this month
              </div>

              {/* 7-DAY SPARKLINE */}
              <div className="flex items-center gap-0.5" title="7-Day Uptime Trend: 94.2% -> 96.4%">
                <svg className="w-16 h-5 stroke-emerald-400 fill-none stroke-2" viewBox="0 0 60 20">
                  <polyline points="0,16 10,12 20,15 30,8 40,9 50,4 60,3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Machine Availability (Uptime)</span>
              <span className="text-slate-100 font-bold">{uptimePercent}%</span>
            </div>
            <div className="flex justify-between">
              <span>Machine Servicing (PM On-Time)</span>
              <span className="text-slate-100 font-bold">{pmDiscipline}%</span>
            </div>
            <div className="flex justify-between">
              <span>Repeat Breakdown Rate</span>
              <span className="text-emerald-400 font-bold">Very Low ({repeatRate}%)</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: FLEET STATUS */}
        <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-800/90 hover:border-indigo-500/40 rounded-xl p-3 flex flex-col justify-between transition-all">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            SECTION 2 • MACHINE STATUS
          </div>

          <div className="my-auto">
            <StitchDonutChart
              title="Machine Status Split"
              subtitle="Live Plant Status"
              data={machineStatusData}
              centerLabel="Machines"
            />
          </div>
        </div>

        {/* SECTION 3: DAILY LOSS & SAVINGS */}
        <div className="bg-[#111827]/80 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl p-3.5 flex flex-col justify-between relative shadow-[0_0_20px_rgba(80,255,171,0.05)]">
          <div className="absolute top-2 right-2 text-emerald-400/30">
            <IndianRupee className="w-5 h-5" />
          </div>

          <div>
            <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> SECTION 3 • DAILY LOSS & SAVINGS
            </div>

            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Machine Bandh Today</span>
                <span className="text-lg font-black text-amber-400 font-mono">{downtimeTodayHours} hrs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Daily Production Loss</span>
                <span className="text-lg font-black text-amber-400 font-mono">{formatInrCompact(productionLossToday)}</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/90 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-medium">Customer Order Risk</span>
              <span className="font-bold text-red-400 font-mono">{formatInrCompact(revenueRisk)}</span>
            </div>

            <button
              onClick={() => setShowBachatBreakdown(!showBachatBreakdown)}
              className="w-full bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 p-2 rounded-lg flex justify-between items-center text-[11px] shadow-[0_0_15px_rgba(32,226,145,0.15)] transition text-left"
            >
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bachat (Money Saved)
              </span>
              <span className="font-black text-emerald-400 text-xs font-mono">{formatLakh(avoidedLossMonth)} ▾</span>
            </button>

            {showBachatBreakdown && (
              <div className="bg-[#0B0F19] p-2 rounded border border-emerald-500/30 text-[10px] space-y-0.5 font-mono text-emerald-300 animate-in fade-in">
                <div>• Preventive PM Bachat: ₹{Math.round(avoidedLossMonth * 0.37).toLocaleString('en-IN')}</div>
                <div>• MTTR Repair Speed Bachat: ₹{Math.round(avoidedLossMonth * 0.42).toLocaleString('en-IN')}</div>
                <div>• Spare Part Re-use Bachat: ₹{Math.round(avoidedLossMonth * 0.21).toLocaleString('en-IN')}</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* TOP BREAKDOWN MACHINES FOR SUBAH MEETING */}
      <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-800/90 rounded-xl p-3 relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> TOP MACHINES NEEDING ATTENTION THIS MORNING
          </h3>
          {onDrilldown && (
            <button 
              onClick={() => onDrilldown('machines')} 
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
            >
              View Plant Machines <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {problemMachines.map((m) => (
            <div key={m.id} className="bg-[#0B0F19]/90 border border-slate-800/90 hover:border-amber-500/40 rounded-lg p-2 flex justify-between items-center transition">
              <div>
                <div className="font-extrabold text-slate-100 text-xs">{m.name}</div>
                <div className="text-[10px] text-slate-400">{m.issue}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-amber-400 font-black font-mono">{formatInrCompact(m.loss)} loss risk</div>
                <span className="inline-block text-[9px] px-2 py-0.2 rounded font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WHATSAPP MALIK DISPATCH DRAWER */}
      <WhatsAppMalikDigestModal
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        metrics={{
          downtimeHours: downtimeTodayHours,
          productionLoss: productionLossToday,
          revenueRisk,
          avoidedLoss: avoidedLossMonth,
          healthScore,
          healthTrend,
          uptimePercent,
          pmOnTimeRate: pmDiscipline,
          avgRepairMins: 0,
        }}
        problemMachines={problemMachines}
      />
    </div>
  );
}
