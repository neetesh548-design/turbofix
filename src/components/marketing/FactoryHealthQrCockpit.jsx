import React from 'react';
import { 
  ShieldCheck, BellRing, BarChart3, Clock, Shield, TrendingUp, IndianRupee, QrCode, Cpu, CheckCircle2, Zap
} from 'lucide-react';

/**
 * FactoryHealthQrCockpit — Replicates the exact visual feature cockpit:
 * 1. Factory Health UI Card (92% Uptime ring, 48/52 Machines, 18m Downtime)
 * 2. Industrial Motor with Scannable Machine QR Code Tag
 * 3. 3 Floating Micro-Feature Pills (Prevent Breakdowns, Instant Alerts, Actionable Insights)
 */
export default function FactoryHealthQrCockpit({ compact = false }) {
  return (
    <div className="relative w-full bg-[#070D14]/90 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-4 sm:p-5 shadow-[0_0_40px_rgba(16,185,129,0.12)] overflow-hidden font-sans">
      
      {/* Ambient Radial Glows */}
      <div className="absolute -top-10 -right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
        
        {/* LEFT/TOP: FACTORY HEALTH CARD */}
        <div className="md:col-span-7 bg-[#0E1724]/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#50ffab]" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">FACTORY HEALTH</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Live Telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Status & Ring */}
            <div className="sm:col-span-6 flex items-center justify-between sm:justify-start gap-4">
              <div>
                <h4 className="text-xl font-extrabold text-emerald-400 tracking-tight">Healthy</h4>
                <p className="text-[11px] text-slate-400">Everything running smoothly</p>
              </div>

              {/* 92% Uptime Radial Ring */}
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-slate-900 border-2 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
                <div className="text-center">
                  <span className="block font-mono font-black text-sm text-white leading-none">92%</span>
                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-tighter">Uptime</span>
                </div>
              </div>
            </div>

            {/* 4 Stat Metrics */}
            <div className="sm:col-span-6 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">Machines Active</span>
                <span className="font-bold text-emerald-400 text-sm">48 <span className="text-slate-500 text-xs">/ 52</span></span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">Downtime Today</span>
                <span className="font-bold text-amber-400 text-sm">18 <span className="text-slate-400 text-[10px]">mins</span></span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">Work Orders</span>
                <span className="font-bold text-cyan-400 text-sm">12 <span className="text-slate-400 text-[10px]">Open</span></span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">MTTR (Avg.)</span>
                <span className="font-bold text-slate-200 text-sm">28 <span className="text-slate-400 text-[10px]">mins</span></span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT/BOTTOM: MACHINE WITH SCANNABLE QR & FLOATING FEATURE CHIPS */}
        <div className="md:col-span-5 flex flex-col sm:flex-row md:flex-col items-center justify-between gap-3">
          
          {/* Industrial Machine with QR Tag Visual */}
          <div className="relative bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 w-full flex items-center justify-between gap-3 shadow-md">
            
            {/* Machine Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <QrCode className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">MACHINE QR TAG</span>
                <h5 className="text-xs font-extrabold text-white">VMC CNC Motor #04</h5>
                <span className="text-[10px] text-slate-400 font-medium">&lt;10s WhatsApp Reporting</span>
              </div>
            </div>

            {/* QR Scan Pill */}
            <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-[10px] font-bold text-emerald-300 font-mono shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Scannable
            </div>
          </div>

          {/* 3 Floating Feature Pills */}
          <div className="w-full space-y-1.5 text-xs font-sans">
            <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-lg p-2 hover:border-emerald-500/40 transition">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-[11px] block leading-none">Prevent Breakdowns</span>
                <span className="text-[10px] text-slate-400">Fix issues before they stop you</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-lg p-2 hover:border-emerald-500/40 transition">
              <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-[11px] block leading-none">Instant Alerts</span>
                <span className="text-[10px] text-slate-400">Right person. Right time.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-lg p-2 hover:border-emerald-500/40 transition">
              <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-[11px] block leading-none">Actionable Insights</span>
                <span className="text-[10px] text-slate-400">Data that helps you decide faster</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Strip */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 text-center">
        <span className="text-[11px] font-bold text-slate-300 inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <strong className="text-emerald-400">Every minute saved is profit earned.</strong> TurboFix turns maintenance into a competitive advantage.
        </span>
      </div>

    </div>
  );
}
