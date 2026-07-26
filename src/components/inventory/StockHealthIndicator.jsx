/**
 * StockHealthIndicator — the red / yellow / green / blue / gray badge.
 *
 * One component for every place a stock status is shown, so the colour
 * language can never drift between the store table, the finance table
 * and the bin map. The `title` carries the *reason* for the colour —
 * a badge that says "Critical" without saying "1 left against a reorder
 * level of 5" makes the reader go hunting.
 *
 * Props:
 * - status (string)  a STOCK_STATUS key
 * - item   (object)  optional normalised item; enriches the tooltip
 * - compact (bool)   dot only, for dense table cells and mobile cards
 * - showLabel (bool) force the text label on even in compact mode
 */

import React from 'react';
import { STOCK_STATUS, STOCK_STATUS_META } from '../../utils/inventoryMetrics.js';

/** The one-line "why is this red?" that rides along with the badge. */
function stockReason(item, status) {
  if (!item) return STOCK_STATUS_META[status]?.label || '';
  switch (status) {
    case STOCK_STATUS.CRITICAL:
      return item.available <= 0
        ? `Out of stock — ${item.leadTimeDays}-day lead time`
        : `${item.available} available against a reorder level of ${item.reorder}`;
    case STOCK_STATUS.AT_RISK:
      return item.daysOfSupply != null
        ? `${item.daysOfSupply} days of cover left`
        : `At the reorder point (${item.available} of ${item.reorder})`;
    case STOCK_STATUS.OVERSTOCKED:
      return `${item.available} held against a max level of ${item.maxLevel}`;
    case STOCK_STATUS.OBSOLETE:
      return `Not issued in ${item.daysSinceLastUse} days`;
    default:
      return `${item.available} available, above the reorder level of ${item.reorder}`;
  }
}

export default function StockHealthIndicator({
  status,
  item,
  compact = false,
  showLabel = false,
  'data-testid': testId,
}) {
  const key = status || item?.status || STOCK_STATUS.HEALTHY;
  const meta = STOCK_STATUS_META[key] || STOCK_STATUS_META[STOCK_STATUS.HEALTHY];
  const reason = stockReason(item, key);
  const withLabel = showLabel || !compact;

  return (
    <span
      className={`inv-status inv-status-${meta.colour}${compact ? ' compact' : ''}`}
      title={reason}
      data-status={key}
      data-testid={testId || 'inv-stock-status'}
    >
      <span className="inv-status-dot" aria-hidden="true" />
      {withLabel ? <span className="inv-status-label">{meta.label}</span> : null}
      <span className="sr-only">{`${meta.label}. ${reason}`}</span>
    </span>
  );
}
