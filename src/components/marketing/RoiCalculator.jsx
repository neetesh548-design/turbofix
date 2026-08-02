import React, { useState } from 'react';
import { IndianRupee, TrendingUp, Clock, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

export default function RoiCalculator() {
  const [machines, setMachines] = useState(12);
  const [hourlyCost, setHourlyCost] = useState(15000); // INR/hr
  const [breakdownsPerMonth, setBreakdownsPerMonth] = useState(6);
  const [avgRepairHours, setAvgRepairHours] = useState(3);

  const totalMonthlyDowntimeHours = breakdownsPerMonth * avgRepairHours;
  const currentMonthlyLoss = totalMonthlyDowntimeHours * hourlyCost;
  const estimatedPlatformCostMonthly = machines * 299;

  const formatInr = (val) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="stitch-glass-tile p-6 sm:p-8 rounded-2xl relative overflow-hidden border border-emerald-500/30 my-10 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <TrendingUp size={14} />
            <span>Plant downtime estimate</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Estimate unplanned downtime exposure in ₹
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Use the sliders to see a simple monthly cost view for the machines you want to cover.
            </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="text-emerald-400 size-4" />
          <span>Tuned for Indian SMEs (Auto, Pharma, Textile, Engineering)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Input Controls Sliders */}
        <div className="lg:col-span-7 space-y-6">
          {/* Slider 1: Machines */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-2 text-xs sm:text-sm">
              <label htmlFor="roi-machines" className="font-semibold text-slate-200">Active Fleet Machines in Plant</label>
              <span className="font-extrabold text-emerald-400 text-base">{machines} Machines</span>
            </div>
            <input
              id="roi-machines"
              type="range"
              min="2"
              max="100"
              value={machines}
              onChange={(e) => setMachines(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>2</span>
              <span>25</span>
              <span>50</span>
              <span>100 machines</span>
            </div>
          </div>

          {/* Slider 2: Hourly Downtime Cost */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-2 text-xs sm:text-sm">
              <label htmlFor="roi-hourly-cost" className="font-semibold text-slate-200">Average Production Loss per Hour (₹)</label>
              <span className="font-extrabold text-emerald-400 text-base">₹{hourlyCost.toLocaleString('en-IN')}/hr</span>
            </div>
            <input
              id="roi-hourly-cost"
              type="range"
              min="2000"
              max="100000"
              step="1000"
              value={hourlyCost}
              onChange={(e) => setHourlyCost(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>₹2,000/hr</span>
              <span>₹25,000/hr</span>
              <span>₹50,000/hr</span>
              <span>₹1,00,000/hr</span>
            </div>
          </div>

          {/* Slider 3 & 4 Grid: Breakdowns & Avg Repair Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-2 text-xs">
                <label htmlFor="roi-breakdowns" className="font-semibold text-slate-200">Monthly Breakdowns</label>
                <span className="font-bold text-amber-400">{breakdownsPerMonth} / month</span>
              </div>
              <input
                id="roi-breakdowns"
                type="range"
                min="1"
                max="30"
                value={breakdownsPerMonth}
                onChange={(e) => setBreakdownsPerMonth(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-2 text-xs">
                <label htmlFor="roi-repair-time" className="font-semibold text-slate-200">Avg MTTR Repair Time</label>
                <span className="font-bold text-sky-400">{avgRepairHours} Hours</span>
              </div>
              <input
                id="roi-repair-time"
                type="range"
                min="1"
                max="12"
                value={avgRepairHours}
                onChange={(e) => setAvgRepairHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </div>

        {/* Financial Results Column */}
        <div className="lg:col-span-5 bg-slate-950/90 rounded-2xl p-6 border border-emerald-500/40 relative shadow-inner">
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Current Estimated Monthly Losses</span>
              <div className="text-2xl font-extrabold text-rose-400 mt-1">
                {formatInr(currentMonthlyLoss)} <span className="text-xs font-normal text-slate-400">({totalMonthlyDowntimeHours} hrs down)</span>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                <Zap size={13} className="text-emerald-400" /> Monthly exposure
              </span>
              <div className="text-3xl font-black text-emerald-300">
                {formatInr(currentMonthlyLoss)} <small className="text-xs text-emerald-400 font-normal">/ month</small>
              </div>
              <p className="text-[11px] text-slate-300">
                This is the downtime cost implied by the sliders you set.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center pt-2">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Downtime hours</span>
                <span className="text-base font-extrabold text-sky-400">{totalMonthlyDowntimeHours.toFixed(1)} hrs/mo</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Plan estimate</span>
                <span className="text-base font-extrabold text-emerald-400">{formatInr(estimatedPlatformCostMonthly)}/mo</span>
              </div>
            </div>

            <a
              href="/contact.html"
              className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] text-sm"
            >
              <span>Book Plant ROI Walkthrough</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
