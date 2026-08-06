import React, { useState } from 'react';
import { Calculator, TrendingUp, IndianRupee, ShieldCheck, ArrowRight, Zap, Factory } from 'lucide-react';
import { formatInrCompact } from '../../utils/dashboardMetrics';

/**
 * DowntimeSalesCalculator — Recommendation #13: Interactive Sales Lead-Gen Calculator
 * Allows prospective factory owners to calculate estimated annual downtime loss
 * and projected TurboFix ROI savings.
 */
export default function DowntimeSalesCalculator({ onGetDemo }) {
  const [machinesCount, setMachinesCount] = useState(15);
  const [shiftsPerDay, setShiftsPerDay] = useState(2);
  const [hourlyOutputValue, setHourlyOutputValue] = useState(12000); // ₹12,000 per hour output per machine
  const [avgBreakdownsPerMonth, setAvgBreakdownsPerMonth] = useState(25);
  const [avgDowntimeHoursPerBreakdown, setAvgDowntimeHoursPerBreakdown] = useState(3.5);

  // Calculations
  const monthlyDowntimeHours = avgBreakdownsPerMonth * avgDowntimeHoursPerBreakdown;
  const annualDowntimeHours = monthlyDowntimeHours * 12;
  const annualDowntimeCost = annualDowntimeHours * hourlyOutputValue;

  // TurboFix Impact Assumptions (Based on 30-40% downtime reduction benchmarks)
  const estimatedSavingsPct = 0.35; // 35% reduction in downtime
  const annualSavings = annualDowntimeCost * estimatedSavingsPct;
  const monthlySavings = annualSavings / 12;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-4xl mx-auto text-slate-100">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Calculator className="w-4 h-4" /> Free ROI Estimator
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">How Much Is Machine Downtime Costing Your Factory?</h2>
        <p className="text-slate-400 text-sm mt-2">
          Calculate your annual production loss and see how much revenue TurboFix protects.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* INPUT FORM */}
        <div className="space-y-5 bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700/60 pb-3 flex items-center gap-2">
            <Factory className="w-4 h-4 text-indigo-400" /> Factory Operational Details
          </h3>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Number of Machines</span>
              <span className="text-indigo-400 font-bold">{machinesCount} Machines</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="100" 
              value={machinesCount} 
              onChange={(e) => setMachinesCount(Number(e.target.value))} 
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Shifts Per Day</span>
              <span className="text-indigo-400 font-bold">{shiftsPerDay} Shift{shiftsPerDay > 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((shift) => (
                <button
                  key={shift}
                  onClick={() => setShiftsPerDay(shift)}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${shiftsPerDay === shift ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                >
                  {shift} Shift{shift > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Hourly Production Value / Machine</span>
              <span className="text-indigo-400 font-bold">{formatInrCompact(hourlyOutputValue)}/hr</span>
            </div>
            <input 
              type="range" 
              min="2000" 
              max="50000" 
              step="1000"
              value={hourlyOutputValue} 
              onChange={(e) => setHourlyOutputValue(Number(e.target.value))} 
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Avg Breakdowns / Month (Total Plant)</span>
              <span className="text-amber-400 font-bold">{avgBreakdownsPerMonth} Breakdowns</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="150" 
              value={avgBreakdownsPerMonth} 
              onChange={(e) => setAvgBreakdownsPerMonth(Number(e.target.value))} 
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Avg Downtime / Breakdown</span>
              <span className="text-amber-400 font-bold">{avgDowntimeHoursPerBreakdown} Hours</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="12" 
              step="0.5"
              value={avgDowntimeHoursPerBreakdown} 
              onChange={(e) => setAvgDowntimeHoursPerBreakdown(Number(e.target.value))} 
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* RESULTS MATRIX */}
        <div className="space-y-6 flex flex-col justify-between h-full">
          <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6">
            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Estimated Annual Downtime Cost</div>
            <div className="text-4xl font-extrabold text-red-400 tracking-tight my-1">
              {formatInrCompact(annualDowntimeCost)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Based on <span className="text-slate-200 font-medium">{Math.round(annualDowntimeHours)} hours</span> of total plant downtime lost per year.
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-32 h-32 text-emerald-400" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" /> Potential Savings With TurboFix
              </div>
              <div className="text-4xl font-extrabold text-emerald-400 tracking-tight my-1">
                {formatInrCompact(annualSavings)} <span className="text-xs font-medium text-emerald-300">/ year</span>
              </div>
              <div className="text-sm font-semibold text-emerald-200 mt-1">
                ≈ {formatInrCompact(monthlySavings)} protected every month
              </div>

              <ul className="mt-4 text-xs text-slate-300 space-y-2 border-t border-emerald-900/60 pt-3">
                <li className="flex items-center gap-2">
                  <CheckmarkIcon /> 35% reduction in breakdown resolution time (MTTR)
                </li>
                <li className="flex items-center gap-2">
                  <CheckmarkIcon /> Stop repeat failures with AI pattern detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckmarkIcon /> WhatsApp reporting in &lt;20 seconds with voice notes
                </li>
              </ul>
            </div>
          </div>

          {onGetDemo && (
            <button
              onClick={onGetDemo}
              className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg transition flex items-center justify-center gap-2 group"
            >
              Protect Factory Revenue Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckmarkIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
