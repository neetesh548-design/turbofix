/**
 * DashboardKpiCard — the single KPI tile used by every role board.
 *
 * Props:
 * - label   (string)   headline for the number, e.g. "SLA compliance"
 * - value   (node)     the number itself; pass a formatted string
 * - hint    (string)   the benchmark or context line under the value
 * - tone    ('' | 'ok' | 'warning' | 'danger' | 'info')
 * - icon    (component) a lucide-react icon
 * - trend   ({ delta, unit, goodWhenNegative }) optional direction badge
 * - onClick (fn)       renders as a button and drills down when supplied
 *
 * Renders a <div> when there is nothing to drill into, so a static tile
 * never advertises itself to a screen reader as an interactive control.
 */

import React from 'react';

export function KpiTrendBadge({ delta, unit = '', goodWhenNegative = true }) {
  const value = Number(delta);
  if (!Number.isFinite(value) || value === 0) {
    return <span className="rd-trend flat">no change</span>;
  }
  const rising = value > 0;
  const good = goodWhenNegative ? !rising : rising;
  return (
    <span className={`rd-trend ${good ? 'good' : 'bad'}`}>
      {rising ? '▲' : '▼'} {Math.abs(value)}{unit}
    </span>
  );
}

export default function DashboardKpiCard({
  label,
  value,
  hint,
  tone = '',
  icon: Icon,
  trend,
  onClick,
  'data-testid': testId,
}) {
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      className={`rd-kpi ${tone}`}
      onClick={interactive ? onClick : undefined}
      data-testid={testId || 'rd-kpi-card'}
    >
      <span className="rd-kpi-label">
        {Icon ? <Icon size={14} aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="rd-kpi-value-row">
        <strong className="rd-kpi-value">{value ?? '—'}</strong>
        {trend ? <KpiTrendBadge {...trend} /> : null}
      </span>
      {hint ? <small className="rd-kpi-hint">{hint}</small> : null}
    </Tag>
  );
}
