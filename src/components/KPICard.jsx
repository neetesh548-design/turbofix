import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * KPICard — Aesthetic key performance indicator card
 *
 * A refined, token-based KPI display component with:
 * - Semantic color tokens (success, warning, destructive, info)
 * - Proper typography hierarchy
 * - 4px spacing grid
 * - Dark mode support via [data-theme]
 * - Trend indicators (up/down)
 * - Responsive layout
 *
 * Props:
 * - label (string): KPI title (e.g., "Machines Down")
 * - value (string | number): Main metric
 * - tone (string): success | warning | destructive | info | neutral
 * - trend (string): up | down (optional)
 * - trendValue (string): Trend text (e.g., "↑ 20/wk")
 * - hint (string): Subtitle or explanation
 * - prefix (string): Text before value (e.g., "₹")
 * - suffix (string): Text after value (e.g., "h")
 * - onClick (fn): Optional click handler
 * - icon (ReactNode): Optional icon component
 */
export function KPICard({
  label,
  value,
  tone = 'neutral',
  trend,
  trendValue,
  hint,
  prefix,
  suffix,
  onClick,
  icon: Icon,
  className,
}) {
  const toneStyles = {
    success: {
      border: 'border-success/20',
      bg: 'bg-success/5',
      text: 'text-success',
      trend: 'text-success',
    },
    warning: {
      border: 'border-warning/20',
      bg: 'bg-warning/5',
      text: 'text-warning',
      trend: 'text-warning',
    },
    destructive: {
      border: 'border-destructive/20',
      bg: 'bg-destructive/5',
      text: 'text-destructive',
      trend: 'text-destructive',
    },
    info: {
      border: 'border-info/20',
      bg: 'bg-info/5',
      text: 'text-info',
      trend: 'text-info',
    },
    neutral: {
      border: 'border-slate-700/40',
      bg: 'bg-slate-900/20',
      text: 'text-slate-200',
      trend: 'text-slate-400',
    },
  };

  const style = toneStyles[tone] || toneStyles.neutral;
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : '';

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-lg rounded-lg border-2 p-lg',
        style.border,
        style.bg,
        onClick && 'cursor-pointer hover:shadow-lg hover:border-opacity-50 transition-all',
        className,
      )}
    >
      {/* Header: Label + Icon */}
      <div className="flex items-center justify-between gap-md">
        <div>
          <div className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            {label}
          </div>
        </div>
        {Icon && <div className={cn('h-5 w-5', style.text)}>{Icon}</div>}
      </div>

      {/* Main Metric */}
      <div className="flex items-baseline gap-md">
        <div className={cn('text-3xl font-bold', style.text)}>
          {prefix}
          {value}
          {suffix}
        </div>

        {/* Trend Badge */}
        {trend && trendValue && (
          <div className={cn('flex items-center gap-xs text-xs font-medium', trendColor)}>
            <TrendIcon size={14} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Hint/Description */}
      {hint && (
        <div className="text-xs leading-relaxed text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
}

export default KPICard;
