/**
 * FinanceInventory — "track value & ROI".
 *
 * Finance does not care which bin a bearing is in; they care that
 * ₹4.8L of working capital is sitting on a shelf costing ₹96k a year to
 * hold, and that ₹48k of it has not moved since last winter. So this
 * board leads with the four money numbers, then shows where the money
 * is, then — the only actionable part — where it can be released.
 *
 * The savings cards are deliberately specific ("₹85k from removing
 * obsolete stock") rather than a single "optimise inventory" score.
 * A number with a named cause is something a finance manager can take
 * to a meeting.
 *
 * Props:
 * - metrics ({ inventoryValue, carryingCost, roi, obsolescence,
 *              composition, trends, savings, usage, costComparison })
 * - loading (bool)
 */

import React, { useState } from 'react';
import {
  Wallet, Warehouse, Recycle, TrendingDown, PiggyBank, ArrowUpRight,
} from 'lucide-react';
import InventoryKpiCard from './InventoryKpiCard.jsx';
import InventoryChart, { CompositionDonut, TrendSmallMultiples } from './InventoryChart.jsx';
import {
  INTEREST_RATE, STORAGE_RATE, OBSOLETE_AFTER_DAYS,
  formatInr, formatInrCompact,
} from '../../utils/inventoryMetrics.js';

const TREND_SERIES = [
  { key: 'value', label: 'Inventory value (estimated)', fill: 'var(--md-blue-deep)' },
  { key: 'spend', label: 'PO spend', fill: 'var(--md-amber-deep)' },
  { key: 'carrying', label: 'Carrying cost', fill: 'var(--md-green-deep)' },
];

const USAGE_TONE = {
  active: 'ok',
  slow: 'warning',
  obsolete: 'danger',
  never: 'danger',
};

const USAGE_LABEL = {
  active: 'Active',
  slow: 'Slow',
  obsolete: 'Obsolete',
  never: 'Never issued',
};

const SORTS = {
  lastUsed: (a, b) => (b.daysSinceLastUse ?? Number.MAX_SAFE_INTEGER) - (a.daysSinceLastUse ?? Number.MAX_SAFE_INTEGER),
  value: (a, b) => b.stockValue - a.stockValue,
  usage: (a, b) => b.monthlyUsage - a.monthlyUsage,
  name: (a, b) => a.name.localeCompare(b.name),
};

export default function FinanceInventory({ metrics, loading = false }) {
  const [sortKey, setSortKey] = useState('lastUsed');

  const value = metrics?.inventoryValue ?? 0;
  const carrying = metrics?.carryingCost ?? 0;
  const roi = metrics?.roi || {};
  const obsolescence = metrics?.obsolescence || { count: 0, value: 0 };
  const composition = Array.isArray(metrics?.composition) ? metrics.composition : [];
  const trends = metrics?.trends || {};
  const savings = metrics?.savings || { opportunities: [], total: 0 };
  const usage = Array.isArray(metrics?.usage) ? metrics.usage : [];
  const comparison = Array.isArray(metrics?.costComparison) ? metrics.costComparison : [];

  const sorted = usage.slice().sort(SORTS[sortKey] || SORTS.lastUsed);

  return (
    <div className="rd-board inv-board-finance" data-testid="finance-inventory" data-loading={loading ? 'true' : 'false'}>
      <section className="rd-kpi-row" aria-label="Inventory financial health">
        <InventoryKpiCard
          label="Total inventory value"
          icon={Wallet}
          money
          value={value}
          hint="Every part and consumable, at cost"
          data-testid="inv-kpi-total-value"
        />
        <InventoryKpiCard
          label="Carrying cost (annual)"
          icon={Warehouse}
          money
          tone="warning"
          value={carrying}
          hint={`${Math.round(INTEREST_RATE * 100)}% interest + ${Math.round(STORAGE_RATE * 100)}% storage on ${formatInrCompact(value)}`}
          data-testid="inv-kpi-carrying-cost"
        />
        <InventoryKpiCard
          label="Spare-parts ROI"
          icon={TrendingDown}
          value={roi.pct == null ? 'No stock' : `${roi.pct}%`}
          hint={roi.turnsPerYear == null
            ? 'Nothing on the shelf to turn over'
            : `${formatInrCompact(roi.usageValue)} consumed monthly · ${roi.turnsPerYear} turns/yr`}
          tone={roi.pct == null ? '' : roi.pct >= 8 ? 'ok' : 'warning'}
          data-testid="inv-kpi-roi"
        />
        <InventoryKpiCard
          label="Obsolescence risk"
          icon={Recycle}
          money
          tone={obsolescence.value > 0 ? 'danger' : 'ok'}
          value={obsolescence.value}
          hint={`${obsolescence.count} item${obsolescence.count === 1 ? '' : 's'} unmoved for ${OBSOLETE_AFTER_DAYS}+ days`}
          data-testid="inv-kpi-obsolescence"
        />
      </section>

      <div className="rd-split">
        <InventoryChart
          title="Where the money sits"
          subtitle="Composition"
          caption="By criticality"
        >
          <CompositionDonut slices={composition} total={value} />
        </InventoryChart>

        <InventoryChart
          title="Cost trends"
          subtitle={`Last ${trends.months?.length || 12} months`}
          caption={trends.valueChangePct == null
            ? '—'
            : `Value ${trends.valueChangePct > 0 ? '↑' : '↓'} ${Math.abs(trends.valueChangePct)}%`}
        >
          <TrendSmallMultiples months={trends.months} series={TREND_SERIES} />
          {trends.estimated && (
            <p className="rd-hint">
              Monthly stock value is reconstructed backwards from today&rsquo;s balance net of each
              month&rsquo;s receipts — it is an estimate. PO spend is actual.
            </p>
          )}
        </InventoryChart>
      </div>

      <InventoryChart
        title="Savings opportunities"
        subtitle="Cash you can release"
        caption={savings.total > 0 ? `${formatInr(savings.total)} identified` : 'Nothing to release'}
      >
        <div className="inv-savings-grid" data-testid="inv-savings">
          {savings.opportunities.map((opportunity) => (
            <article className={`inv-saving-card${opportunity.value > 0 ? '' : ' empty'}`} key={opportunity.key}>
              <PiggyBank size={16} aria-hidden="true" />
              <strong>{formatInrCompact(opportunity.value)}</strong>
              <span>{opportunity.title}</span>
              <small>{opportunity.detail}</small>
            </article>
          ))}
        </div>
      </InventoryChart>

      <InventoryChart
        title="Parts usage analytics"
        subtitle="What is actually moving"
        caption={`${sorted.length} item${sorted.length === 1 ? '' : 's'}`}
        action={(
          <label className="inv-sort">
            <span className="sr-only">Sort parts usage table</span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)} data-testid="inv-usage-sort">
              <option value="lastUsed">Sort: last used</option>
              <option value="value">Sort: stock value</option>
              <option value="usage">Sort: monthly usage</option>
              <option value="name">Sort: name</option>
            </select>
          </label>
        )}
      >
        {sorted.length === 0 ? (
          <p className="rd-empty">No stock to analyse yet.</p>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table" data-testid="inv-usage-table">
              <thead>
                <tr>
                  <th scope="col">Part</th>
                  <th scope="col">Criticality</th>
                  <th scope="col" className="num">Stock cost</th>
                  <th scope="col" className="num">Used / month</th>
                  <th scope="col" className="num">Last used</th>
                  <th scope="col">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr key={item.id} data-usage={item.usageBand}>
                    <td data-label="Part">
                      <span className="inv-row-name">{item.name}</span>
                      {item.partNumber ? <code>{item.partNumber}</code> : null}
                    </td>
                    <td data-label="Criticality">
                      <span className={`inv-priority inv-priority-${item.criticality}`}>{item.criticality}</span>
                    </td>
                    <td data-label="Stock cost" className="num">{formatInr(item.stockValue)}</td>
                    <td data-label="Used / month" className="num">{item.monthlyUsage || 0}</td>
                    <td data-label="Last used" className={`num ${USAGE_TONE[item.usageBand] || ''}`}>
                      <span className={`inv-usage-pill inv-usage-${item.usageBand}`}>
                        {item.daysSinceLastUse == null ? USAGE_LABEL.never : `${item.daysSinceLastUse}d ago`}
                      </span>
                    </td>
                    <td data-label="Recommendation">
                      {item.recommendDisposal ? (
                        <span className="inv-dispose">
                          Recommend disposal · recover {formatInr(item.recoverableValue)}
                        </span>
                      ) : item.usageBand === 'obsolete' ? (
                        <span className="inv-hold">Hold — critical spare, keep despite low turn</span>
                      ) : (
                        <span className="inv-keep">{USAGE_LABEL[item.usageBand]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InventoryChart>

      {comparison.length > 0 && (
        <InventoryChart
          title="Supplier cost comparison"
          subtitle="Same part, two vendors"
          caption={`${formatInr(comparison.reduce((sum, row) => sum + row.annualSaving, 0))}/yr on the table`}
        >
          <ul className="inv-comparison-list" data-testid="inv-cost-comparison">
            {comparison.map((row) => (
              <li key={row.key}>
                <div className="inv-comparison-head">
                  <strong>{row.name}</strong>
                  {row.partNumber ? <code>{row.partNumber}</code> : null}
                  <b className="inv-comparison-saving">{formatInr(row.annualSaving)}/yr</b>
                </div>
                <ul className="inv-comparison-options">
                  {row.options.map((option) => (
                    <li
                      key={option.supplier}
                      className={option.supplier === row.cheapest.supplier ? 'best' : ''}
                    >
                      <span>{option.supplier}</span>
                      <b>{formatInr(option.unitCost)}</b>
                      <small>{option.leadTimeDays}d lead</small>
                      {option.supplier === row.cheapest.supplier && <em>cheapest</em>}
                      {option.supplier === row.fastest.supplier && option.supplier !== row.cheapest.supplier && <em>fastest</em>}
                    </li>
                  ))}
                </ul>
                <p className="rd-hint">
                  Consolidate onto {row.cheapest.supplier} — {formatInr(row.savingPerUnit)} cheaper per unit
                  {row.fastest.supplier !== row.cheapest.supplier && `, though ${row.fastest.supplier} delivers ${row.cheapest.leadTimeDays - row.fastest.leadTimeDays}d sooner`}.
                </p>
              </li>
            ))}
          </ul>
          <a className="rd-link" href="settings.html">Manage vendor records <ArrowUpRight size={13} /></a>
        </InventoryChart>
      )}
    </div>
  );
}
