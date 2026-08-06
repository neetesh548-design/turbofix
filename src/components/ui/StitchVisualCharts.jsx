import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, TrendingDown, Wrench, Package, Sparkles } from 'lucide-react';

/**
 * StitchVisualCharts — Premium Google Stitch Chart & Visual Indicator Library
 *
 * Includes:
 * 1. StitchDonutChart (Conic SVG Ring chart with center metrics & legend)
 * 2. StitchBarChart (Horizontal/Vertical bars with target markers)
 * 3. StitchPieChart (Radial SVG Pie chart with percent callouts)
 * 4. StitchMetricBadge (Neon progress ring & percentage pill)
 */

export function StitchDonutChart({
  title = 'Fleet Distribution',
  subtitle = 'Current Status',
  data = [
    { label: 'Running', value: 18, color: '#10B981' },
    { label: 'Issues', value: 3, color: '#F59E0B' },
    { label: 'Breakdown', value: 2, color: '#EF4444' },
    { label: 'Maintenance', value: 1, color: '#3B82F6' },
  ],
  centerLabel = 'Total',
}) {
  const total = data.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  let accumulatedPercent = 0;

  const gradientStops = data.map((item) => {
    const start = accumulatedPercent;
    const itemPercent = total ? (item.value / total) * 100 : 0;
    accumulatedPercent += itemPercent;
    return `${item.color} ${start}% ${accumulatedPercent}%`;
  });

  const backgroundStyle = total
    ? { background: `conic-gradient(${gradientStops.join(', ')})` }
    : { background: 'rgba(148, 163, 184, 0.2)' };

  return (
    <div className="bg-white dark:bg-[#12161e]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{subtitle}</span>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 my-2 overflow-hidden">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center flex-shrink-0 shadow-md dark:shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={backgroundStyle}>
          {/* Inner cutout for Donut effect */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 dark:bg-[#0f141d] rounded-full flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800/80 shadow-inner">
            <span className="font-mono font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white leading-none">{total}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">{centerLabel}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 space-y-2 text-xs">
          {data.map((item) => {
            const pct = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.label} className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                  <span className="text-slate-700 dark:text-slate-300 truncate font-semibold text-[11px] sm:text-xs">{item.label}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 font-mono text-[11px] sm:text-xs">
                  <span className="text-slate-900 dark:text-white font-bold">{item.value}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StitchBarChart({
  title = 'Downtime & Repair Cost Trend',
  subtitle = 'Monthly Overview',
  items = [
    { label: 'Line 1 (Casting)', value: 45, max: 60, unit: 'hrs', color: '#EF4444' },
    { label: 'Line 2 (Pasting)', value: 28, max: 60, unit: 'hrs', color: '#F59E0B' },
    { label: 'Line 3 (Assembly)', value: 12, max: 60, unit: 'hrs', color: '#10B981' },
    { label: 'Line 4 (Formation)', value: 8, max: 60, unit: 'hrs', color: '#3B82F6' },
  ],
}) {
  return (
    <div className="bg-white dark:bg-[#12161e]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{subtitle}</span>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
      </div>

      <div className="space-y-3 my-1">
        {items.map((item) => {
          const pct = Math.min(100, Math.round((item.value / (item.max || 100)) * 100));
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700 dark:text-slate-300 truncate">{item.label}</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">{item.value} {item.unit || ''}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 flex">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: item.color || '#10B981',
                    boxShadow: `0 0 10px ${item.color || '#10B981'}80`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StitchPieChart({
  title = 'Root Cause Categories (Ishikawa)',
  subtitle = 'RCA Breakdown',
  data = [
    { label: 'Machine / Spindle', value: 40, color: '#EF4444' },
    { label: 'Material / Parts', value: 25, color: '#F59E0B' },
    { label: 'Method / Procedure', value: 20, color: '#3B82F6' },
    { label: 'Environment / Temp', value: 15, color: '#10B981' },
  ],
}) {
  const total = data.reduce((acc, i) => acc + i.value, 0);
  let accumulated = 0;
  const slices = data.map((item) => {
    const start = accumulated;
    const pct = total ? (item.value / total) * 100 : 0;
    accumulated += pct;
    return `${item.color} ${start}% ${accumulated}%`;
  });

  return (
    <div className="bg-white dark:bg-[#12161e]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{subtitle}</span>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
      </div>

      <div className="flex items-center gap-6 my-2">
        <div className="w-24 h-24 rounded-full shadow-md dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] flex-shrink-0" style={{ background: `conic-gradient(${slices.join(', ')})` }} />
        <div className="flex-1 space-y-2 text-xs">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-slate-700 dark:text-slate-300 truncate">{item.label}</span>
              </div>
              <span className="text-slate-900 dark:text-white font-mono font-bold">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
