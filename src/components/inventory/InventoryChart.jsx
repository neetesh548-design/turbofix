/**
 * InventoryChart — the chart primitives the inventory boards need.
 *
 * Everything is CSS/SVG, so no charting library ships to the browser and
 * the visuals inherit the board theme automatically. The card frame and
 * the bar primitive already exist for the role dashboards, so they are
 * re-exported here rather than re-implemented — one import for callers,
 * one implementation in the codebase.
 *
 * Exports:
 * - InventoryChart   card frame (re-export of DashboardChart)
 * - HorizontalBars   labelled bars (re-export)
 * - CompositionDonut inventory value split by criticality
 * - TrendSmallMultiples 12-month value / spend / carrying-cost lines
 * - BudgetBars       daily PO spend against a budget marker
 *
 * Colour: every mark uses the four CVD-validated chart fills already
 * defined on the board (--md-green-deep / --md-blue-deep /
 * --md-amber-deep / --md-red-deep). They pass the lightness, chroma,
 * CVD-separation, normal-vision and contrast checks on both the dark and
 * light surfaces. Red↔amber separate weakly under tritanopia, so every
 * chart here carries secondary encoding — direct labels and 2px surface
 * gaps between fills — and never relies on hue alone.
 */

import React, { useCallback, useMemo, useState } from 'react';
import DashboardChart, { HorizontalBars, Sparkline } from '../dashboard/DashboardChart.jsx';
import { formatInr, formatInrCompact } from '../../utils/inventoryMetrics.js';

export default DashboardChart;
export { DashboardChart as InventoryChart, HorizontalBars, Sparkline };

/** The fixed categorical order. Never cycled, never reassigned by rank. */
const CRITICALITY_FILL = Object.freeze({
  critical: 'var(--md-red-deep)',
  high: 'var(--md-amber-deep)',
  medium: 'var(--md-blue-deep)',
  low: 'var(--md-green-deep)',
});

/* -----------------------------------------------------------
   Composition donut
   ----------------------------------------------------------- */

const DONUT_SIZE = 160;
const DONUT_STROKE = 26;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
/** 2px of surface between adjacent fills, per the mark spec. */
const DONUT_GAP = 2;

/**
 * Inventory value split by criticality.
 *
 * Four slices is inside the range a donut can be read at; the legend
 * carries the rupee value and share for each one so identity never
 * depends on telling two hues apart.
 */
export function CompositionDonut({ slices = [], total = 0, onSliceHover }) {
  const [active, setActive] = useState(null);

  const rows = useMemo(
    () => (Array.isArray(slices) ? slices : []).filter((slice) => Number(slice?.value) > 0),
    [slices],
  );
  const sum = total || rows.reduce((acc, slice) => acc + Number(slice.value || 0), 0);

  const hover = useCallback((key) => {
    setActive(key);
    if (typeof onSliceHover === 'function') onSliceHover(key);
  }, [onSliceHover]);

  if (!rows.length || sum <= 0) return <p className="rd-empty">No stock value to break down yet.</p>;

  let offset = 0;
  const arcs = rows.map((slice) => {
    const share = Number(slice.value) / sum;
    const length = share * DONUT_CIRCUMFERENCE;
    // Only carve a gap out of slices wide enough to survive it — a 1%
    // sliver must stay visible rather than being eaten by its own spacer.
    const gap = length > DONUT_GAP * 2 ? DONUT_GAP : 0;
    const arc = {
      ...slice,
      dash: `${Math.max(0.5, length - gap)} ${DONUT_CIRCUMFERENCE - Math.max(0.5, length - gap)}`,
      offset: -offset,
      fill: CRITICALITY_FILL[slice.key] || 'var(--md-blue-deep)',
    };
    offset += length;
    return arc;
  });

  return (
    <div className="inv-donut-wrap" data-testid="inv-composition-donut">
      <div className="inv-donut">
        <svg viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} role="img" aria-label="Inventory value by criticality">
          <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={DONUT_RADIUS}
                fill="none"
                stroke={arc.fill}
                strokeWidth={active === arc.key ? DONUT_STROKE + 4 : DONUT_STROKE}
                strokeDasharray={arc.dash}
                strokeDashoffset={arc.offset}
                opacity={active && active !== arc.key ? 0.45 : 1}
                onMouseEnter={() => hover(arc.key)}
                onMouseLeave={() => hover(null)}
              />
            ))}
          </g>
        </svg>
        <div className="inv-donut-center">
          <strong>{formatInrCompact(sum)}</strong>
          <span>at cost</span>
        </div>
      </div>

      <ul className="inv-donut-legend">
        {arcs.map((arc) => (
          <li
            key={arc.key}
            className={active === arc.key ? 'active' : ''}
            onMouseEnter={() => hover(arc.key)}
            onMouseLeave={() => hover(null)}
          >
            <span className="inv-legend-swatch" style={{ background: arc.fill }} aria-hidden="true" />
            <span className="inv-legend-label">{arc.label}</span>
            <b className="inv-legend-value">{formatInrCompact(arc.value)}</b>
            <small className="inv-legend-pct">{arc.pct}%</small>
          </li>
        ))}
      </ul>

      {active && (
        <div className="inv-donut-detail" role="status">
          {(() => {
            const slice = rows.find((row) => row.key === active);
            const items = Array.isArray(slice?.items) ? slice.items : [];
            if (!items.length) return <span>{slice?.label}: {formatInr(slice?.value)}</span>;
            return (
              <>
                <strong>{slice.label} — {items.length} item{items.length === 1 ? '' : 's'}</strong>
                <span>{items.slice(0, 4).map((item) => item.name).join(' · ')}{items.length > 4 ? ` +${items.length - 4} more` : ''}</span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------
   Trend small multiples
   ----------------------------------------------------------- */

const LINE_W = 260;
const LINE_H = 54;

function linePath(values, width, height) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Stock value, PO spend and carrying cost over the same 12 months.
 *
 * Three stacked panels rather than three lines on one plot: the value
 * line runs at lakhs while carrying cost runs at thousands, and putting
 * them on a shared axis would flatten two of the three into the
 * baseline. Small multiples keep one scale per panel and one axis per
 * chart — the alternative, a second y-axis, is never correct.
 *
 * A single hovered month drives all three panels, so the reader still
 * compares across series at a glance.
 */
export function TrendSmallMultiples({ months = [], series = [] }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const rows = Array.isArray(months) ? months : [];

  const onMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rows.length) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    setHoverIndex(Math.max(0, Math.min(rows.length - 1, Math.round(ratio * (rows.length - 1)))));
  }, [rows.length]);

  if (rows.length < 2) return <p className="rd-empty">Not enough history to draw a trend yet.</p>;

  return (
    <div
      className="inv-trend-grid"
      onMouseMove={onMove}
      onMouseLeave={() => setHoverIndex(null)}
      data-testid="inv-trend-chart"
    >
      {series.map((line) => {
        const values = rows.map((month) => Number(month[line.key]) || 0);
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const span = max - min || 1;
        const step = LINE_W / (rows.length - 1);
        const active = hoverIndex == null ? null : values[hoverIndex];

        return (
          <div className="inv-trend-panel" key={line.key}>
            <header>
              <span className="inv-trend-name">
                <span className="inv-legend-swatch" style={{ background: line.fill }} aria-hidden="true" />
                {line.label}
              </span>
              <b className="inv-trend-current">
                {formatInrCompact(active != null ? active : values[values.length - 1])}
                {hoverIndex != null && <small> · {rows[hoverIndex].label}</small>}
              </b>
            </header>
            <svg
              viewBox={`0 0 ${LINE_W} ${LINE_H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`${line.label} over ${rows.length} months`}
            >
              <polyline
                points={linePath(values, LINE_W, LINE_H)}
                fill="none"
                stroke={line.fill}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {hoverIndex != null && (
                <>
                  <line
                    x1={hoverIndex * step}
                    x2={hoverIndex * step}
                    y1="0"
                    y2={LINE_H}
                    className="inv-trend-crosshair"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={hoverIndex * step}
                    cy={LINE_H - ((values[hoverIndex] - min) / span) * (LINE_H - 4) - 2}
                    r="4"
                    fill={line.fill}
                    className="inv-trend-marker"
                  />
                </>
              )}
            </svg>
          </div>
        );
      })}

      <div className="inv-trend-axis" aria-hidden="true">
        {rows.map((month, index) => (
          <span key={month.key} className={hoverIndex === index ? 'active' : ''}>{month.label}</span>
        ))}
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   Budget bars
   ----------------------------------------------------------- */

/**
 * Daily PO spend against the daily budget line.
 *
 * One measure, one axis. The budget is a reference rule across the plot
 * rather than a second series, and bars that cross it are tinted red —
 * with the amount printed above, so the over-budget days are readable
 * without relying on the tint.
 */
export function BudgetBars({ days = [], budget = 0, total = 0 }) {
  const rows = Array.isArray(days) ? days : [];
  if (!rows.length) return <p className="rd-empty">No purchase orders raised in this window.</p>;

  const dailyBudget = rows[0]?.budget || (budget && rows.length ? budget / rows.length : 0);
  const max = Math.max(...rows.map((day) => day.value), dailyBudget, 1);
  const budgetAt = dailyBudget > 0 ? (dailyBudget / max) * 100 : null;

  return (
    <div className="inv-budget-chart" data-testid="inv-budget-chart">
      <div className="inv-budget-plot">
        {budgetAt != null && (
          <span
            className="inv-budget-rule"
            style={{ bottom: `${Math.min(100, budgetAt)}%` }}
            title={`Daily budget ${formatInr(dailyBudget)}`}
          >
            <small>budget {formatInrCompact(dailyBudget)}</small>
          </span>
        )}
        {rows.map((day) => {
          const over = dailyBudget > 0 && day.value > dailyBudget;
          return (
            <div className="inv-budget-col" key={day.key} title={`${day.label}: ${formatInr(day.value)}`}>
              <span className="inv-budget-amount">{day.value > 0 ? formatInrCompact(day.value) : ''}</span>
              <span
                className={`inv-budget-bar${over ? ' over' : ''}`}
                style={{ height: `${day.value > 0 ? Math.max(2, (day.value / max) * 100) : 0}%` }}
              />
              <small className="inv-budget-label">{day.label}</small>
            </div>
          );
        })}
      </div>
      <p className="inv-budget-total">
        <strong>{formatInr(total)}</strong> committed this week against a {formatInr(budget)} budget
      </p>
    </div>
  );
}
