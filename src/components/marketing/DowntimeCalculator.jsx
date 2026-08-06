import React, { useState } from 'react';
import { Calculator, ArrowRight, ShieldCheck, TrendingDown, DollarSign, Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DowntimeCalculator() {
  const [machines, setMachines] = useState(10);
  const [downtimeHours, setDowntimeHours] = useState(12); // hrs per machine/month
  const [hourlyLoss, setHourlyLoss] = useState(3500); // ₹ per hour

  // Calculations
  const totalMonthlyDowntimeHours = machines * downtimeHours;
  const monthlyCost = totalMonthlyDowntimeHours * hourlyLoss;
  const annualCost = monthlyCost * 12;

  // Expected 35% reduction with TurboFix closed-loop QR reporting & RCA
  const hoursSavedMonthly = Math.round(totalMonthlyDowntimeHours * 0.35);
  const hoursSavedAnnual = hoursSavedMonthly * 12;
  const annualSavings = Math.round(annualCost * 0.35);

  const formatLakhs = (amount) => {
    const lakhs = amount / 100000;
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Cr`;
    }
    return `₹${lakhs.toFixed(2)} Lakhs`;
  };

  return (
    <div className="downtime-calc-container my-12" id="downtime-calculator">
      <div className="stitch-glass-tile p-6 sm:p-10 rounded-3xl border border-emerald-500/30 bg-slate-950/80 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-3">
            <Calculator size={14} />
            <span>Interactive MSME Downtime ROI Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            How Much Revenue is Machine Downtime Costing You?
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            Enter your factory numbers below to calculate your current annual downtime loss and see how much production TurboFix can protect.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Controls Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            
            {/* Slider 1: Machines */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Number of Operating Machines</span>
                </label>
                <span className="text-lg font-extrabold text-emerald-400 font-mono bg-emerald-500/10 px-3 py-0.5 rounded-lg border border-emerald-500/20">
                  {machines} machines
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                value={machines}
                onChange={(e) => setMachines(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>2 machines</span>
                <span>50 machines</span>
                <span>100 machines</span>
              </div>
            </div>

            {/* Slider 2: Breakdown hours */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Unplanned Downtime (Hrs / Machine / Month)</span>
                </label>
                <span className="text-lg font-extrabold text-amber-400 font-mono bg-amber-500/10 px-3 py-0.5 rounded-lg border border-amber-500/20">
                  {downtimeHours} hrs/mo
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                value={downtimeHours}
                onChange={(e) => setDowntimeHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>2 hrs (Industry Low)</span>
                <span>20 hrs (MSME Avg)</span>
                <span>50 hrs (High Risk)</span>
              </div>
            </div>

            {/* Slider 3: Hourly Loss */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Average Production / Machine Loss (₹ / Hr)</span>
                </label>
                <span className="text-lg font-extrabold text-sky-400 font-mono bg-sky-500/10 px-3 py-0.5 rounded-lg border border-sky-500/20">
                  ₹{hourlyLoss.toLocaleString('en-IN')}/hr
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="25000"
                step="500"
                value={hourlyLoss}
                onChange={(e) => setHourlyLoss(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>₹500 (Small Tooling)</span>
                <span>₹5,000 (CNC / Press)</span>
                <span>₹25,000 (Line Unit)</span>
              </div>
            </div>

            {/* Summary Metrics Banner */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block uppercase font-bold">Total Monthly Lost Hours</span>
                <strong className="text-base text-rose-400 font-mono">{totalMonthlyDowntimeHours} hrs / mo</strong>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase font-bold">Downtime Reduction Target</span>
                <strong className="text-base text-emerald-400 font-mono">35% Recovery Rate</strong>
              </div>
            </div>

          </div>

          {/* Results Column (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/30 shadow-xl space-y-6">
            
            {/* Current Loss Card */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <TrendingDown size={14} /> Estimated Annual Revenue Lost
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                {formatLakhs(annualCost)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Direct production loss + operator idle time across {machines} machines.
              </p>
            </div>

            {/* Protected Revenue Card */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 relative overflow-hidden">
              <div className="absolute right-2 top-2 opacity-10">
                <Sparkles size={60} className="text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <ShieldCheck size={14} /> Annual Value Protected with TurboFix
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono mt-1">
                {formatLakhs(annualSavings)}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-emerald-300">
                <Clock size={14} />
                <span>Recover {hoursSavedAnnual} production hours every year</span>
              </div>
            </div>

            {/* CTA Action */}
            <div className="space-y-2 pt-2">
              <Link
                to="/contact.html"
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-center"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <span>Protect Factory Revenue Now</span>
                <ArrowRight size={16} />
              </Link>
              <p className="text-[11px] text-center text-slate-400">
                Start with 1 machine · Zero setup fee · Factory live in 24 hours
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
