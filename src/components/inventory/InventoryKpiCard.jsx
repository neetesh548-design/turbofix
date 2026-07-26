/**
 * InventoryKpiCard — the KPI tile used by all three inventory boards.
 *
 * Deliberately a thin wrapper over DashboardKpiCard rather than a second
 * tile implementation: the inventory board and the maintenance board are
 * one product and their KPI rows must stay pixel-identical. This adds
 * only what inventory needs on top:
 *
 *   - `status`  a STOCK_STATUS key, mapped to the shared tone vocabulary
 *               so a red tile means the same thing here as on Machines
 *   - `money`   formats the value as compact ₹ (₹4.8L / ₹1.2Cr)
 *
 * Props:
 * - label   (string)    headline, e.g. "Critical stock"
 * - value   (node|num)  the number; formatted when `money` is set
 * - hint    (string)    the context line under the value
 * - status  (string)    STOCK_STATUS key — overrides `tone` when given
 * - tone    ('' | 'ok' | 'warning' | 'danger' | 'info')
 * - money   (bool)      render `value` through formatInrCompact
 * - icon    (component) a lucide-react icon
 * - trend   ({ delta, unit, goodWhenNegative })
 * - onClick (fn)        renders as a button and drills down when supplied
 */

import React from 'react';
import DashboardKpiCard from '../dashboard/DashboardKpiCard.jsx';
import { STOCK_STATUS_META, formatInrCompact } from '../../utils/inventoryMetrics.js';

export default function InventoryKpiCard({
  label,
  value,
  hint,
  status,
  tone = '',
  money = false,
  icon,
  trend,
  onClick,
  'data-testid': testId,
}) {
  // A gray "obsolete" tile has no equivalent in the shared tone set —
  // it should read as muted, which is the default (empty) tone.
  const statusTone = status ? STOCK_STATUS_META[status]?.tone : null;
  const resolvedTone = statusTone === 'muted' ? '' : (statusTone || tone);

  return (
    <DashboardKpiCard
      label={label}
      value={money ? formatInrCompact(value) : value}
      hint={hint}
      tone={resolvedTone}
      icon={icon}
      trend={trend}
      onClick={onClick}
      data-testid={testId || 'inv-kpi-card'}
    />
  );
}
