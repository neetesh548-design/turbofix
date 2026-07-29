/**
 * DashboardChart — chart shell plus the two chart primitives the role
 * boards need. Everything is CSS/SVG so no charting library ships to the
 * browser and the visuals inherit the vault theme automatically.
 *
 * Exports:
 * - DashboardChart   card frame: title, subtitle, caption, children
 * - HorizontalBars   labelled bars, optional capacity marker
 * - Sparkline        tiny SVG trend line for a handful of points
 * - StatusGrid       criticality × health matrix used by the Owner board
 */

import React from 'react';

export default function DashboardChart({ title, subtitle, caption, children, action }) {
  return (
    <section className="rd-chart-card">
      <header className="rd-chart-head">
        <div>
          <span className="rd-chart-kicker">{subtitle}</span>
          <h2>{title}</h2>
        </div>
        {action || (caption ? <span className="rd-chart-caption">{caption}</span> : null)}
      </header>
      <div className="rd-chart-body">{children}</div>
    </section>
  );
}

/**
 * Bars sized against the largest value in the set. When `capacity` is
 * given the bar is sized against capacity instead, so an overloaded row
 * visibly overshoots the marker rather than merely being longest.
 */
export function HorizontalBars({ items = [], emptyText = 'Nothing to show yet.', showCapacity = false }) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return <p className="rd-empty">{emptyText}</p>;

  const max = Math.max(...rows.map((row) => Number(row.value) || 0), 1);

  return (
    <div className="rd-bars">
      {rows.map((row, index) => {
        const value = Number(row.value) || 0;
        const capacity = Number(row.capacity) || 0;
        const scale = showCapacity && capacity > 0 ? Math.max(max, capacity) : max;
        const width = Math.max(4, Math.min(100, (value / scale) * 100));
        const markerAt = showCapacity && capacity > 0 ? (capacity / scale) * 100 : null;

        return (
          <div className="rd-bar-row" key={row.id || row.label || index}>
            <span className="rd-bar-label" title={row.label}>{row.label}</span>
            <span className="rd-bar-track">
              <span className={`rd-bar-fill ${row.tone || ''}`} style={{ width: `${width}%` }} />
              {row.secondaryValue != null && (
                <span
                  className="rd-bar-fill secondary"
                  style={{ width: `${Math.max(2, Math.min(100, ((Number(row.secondaryValue) || 0) / scale) * 100))}%` }}
                />
              )}
              {markerAt != null && (
                <span className="rd-bar-marker" style={{ left: `${Math.min(100, markerAt)}%` }} title={`Capacity ${capacity}`} />
              )}
            </span>
            <b className="rd-bar-value">{row.display ?? value}</b>
          </div>
        );
      })}
    </div>
  );
}

/** Minimal trend line. Nulls in the series are skipped, not drawn as zero. */
export function Sparkline({ points = [], width = 120, height = 32, tone = '' }) {
  const values = (Array.isArray(points) ? points : [])
    .map((point) => (point == null ? null : Number(point)))
    .filter((point) => point === null || Number.isFinite(point));
  const known = values.filter((point) => point !== null);

  if (known.length < 2) return <span className="rd-empty small">Not enough history</span>;

  const max = Math.max(...known);
  const min = Math.min(...known);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const path = values
    .map((point, index) => {
      if (point === null) return null;
      const x = index * step;
      const y = height - ((point - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  return (
    <svg className={`rd-sparkline ${tone}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend">
      <polyline points={path} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HEALTH_COLUMNS = [
  ['running', 'Running'],
  ['issues', 'Issues'],
  ['down', 'Down'],
  ['maintenance', 'Maintenance'],
];

const CRITICALITY_ROWS = [
  ['critical', 'Critical'],
  ['high', 'High'],
  ['medium', 'Medium'],
  ['low', 'Low'],
];

/** Criticality × health matrix. Zero cells stay muted so the eye finds the counts. */
export function StatusGrid({ map, onCellClick }) {
  const grid = map?.grid || {};
  const totals = map?.byStatus || {};

  return (
    <div className="rd-status-grid-wrap">
      <table className="rd-status-grid">
        <thead>
          <tr>
            <th scope="col" className="rd-sg-crit">Criticality</th>
            {HEALTH_COLUMNS.map(([key, label]) => (
              <th scope="col" key={key} className={`rd-sg-${key}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CRITICALITY_ROWS.map(([rowKey, rowLabel]) => (
            <tr key={rowKey}>
              <th scope="row" className={`rd-sg-crit rd-sg-crit-${rowKey}`}>{rowLabel}</th>
              {HEALTH_COLUMNS.map(([colKey]) => {
                const count = grid?.[rowKey]?.[colKey] ?? 0;
                return (
                  <td key={colKey} className={`rd-sg-cell rd-sg-${colKey} ${count ? '' : 'zero'}`}>
                    {onCellClick ? (
                      <button type="button" onClick={() => onCellClick(rowKey, colKey, count)}>{count}</button>
                    ) : count}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="rd-sg-crit">Fleet total</th>
            {HEALTH_COLUMNS.map(([key]) => (
              <td key={key} className={`rd-sg-total rd-sg-${key}`}>{totals?.[key] ?? 0}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function StatusDonut({ values = {}, total = 0 }) {
  const items = [
    ['running', 'Running', '#22c55e'],
    ['issues', 'Issues', '#eab308'],
    ['down', 'Down', '#ef4444'],
    ['maintenance', 'Maintenance', '#38bdf8'],
  ];
  const safeTotal = Number(total) || items.reduce((sum, [key]) => sum + (Number(values[key]) || 0), 0);
  let cursor = 0;
  const stops = items.map(([key, , color]) => {
    const value = Number(values[key]) || 0;
    const start = safeTotal ? (cursor / safeTotal) * 100 : 0;
    cursor += value;
    const end = safeTotal ? (cursor / safeTotal) * 100 : 0;
    return `${color} ${start}% ${end}%`;
  });

  return (
    <div className="rd-donut-layout">
      <div className="rd-donut" style={{ background: safeTotal ? `conic-gradient(${stops.join(', ')})` : '#243142' }} aria-label={`${safeTotal} machines by status`} role="img">
        <strong>{safeTotal}</strong>
        <span>machines</span>
      </div>
      <div className="rd-donut-legend">
        {items.map(([key, label, color]) => (
          <div className="rd-donut-item" key={key}>
            <span className="rd-donut-dot" style={{ background: color }} />
            <span>{label}</span>
            <strong>{Number(values[key]) || 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
