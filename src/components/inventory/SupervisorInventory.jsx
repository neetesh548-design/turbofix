/**
 * SupervisorInventory — "control spending & prevent breakdowns".
 *
 * A supervisor is the gate between a store manager wanting stock and
 * money leaving the business. Two things belong at the top: the
 * shortages that will stop a machine (which they cannot fix by saying
 * no) and the queue of POs waiting on them (which they can). Spend
 * analysis sits underneath — it informs the decision, it is not the
 * decision.
 *
 * Props:
 * - metrics ({ poSummary, approvalQueue, stockoutRisks, weeklySpend, suppliers, … })
 * - onApprovePo       (fn) called with the PO
 * - onRequestChanges  (fn) called with (po, comment)
 * - onAutoOrder       (fn) called with the selected reorder rows
 * - loading (bool)
 */

import React, { useState } from 'react';
import {
  FileClock, Wallet, Boxes, AlertOctagon, Zap, TrendingUp, TrendingDown, Check,
} from 'lucide-react';
import InventoryKpiCard from './InventoryKpiCard.jsx';
import InventoryChart, { BudgetBars } from './InventoryChart.jsx';
import POApprovalCard from './POApprovalCard.jsx';
import { formatInr, formatInrCompact, formatPct } from '../../utils/inventoryMetrics.js';

export default function SupervisorInventory({
  metrics, onApprovePo, onRequestChanges, onAutoOrder, loading = false,
}) {
  const summary = metrics?.poSummary || {};
  const queue = Array.isArray(metrics?.approvalQueue) ? metrics.approvalQueue : [];
  const risks = Array.isArray(metrics?.stockoutRisks) ? metrics.stockoutRisks : [];
  const spend = metrics?.weeklySpend || {};
  const suppliers = Array.isArray(metrics?.suppliers) ? metrics.suppliers : [];
  const candidates = Array.isArray(metrics?.autoOrderCandidates) ? metrics.autoOrderCandidates : [];

  // Everything is pre-ticked: the recommendation is the default action,
  // and unticking is the deliberate choice rather than the other way round.
  // Tracking *exclusions* rather than selections means a row that appears
  // after the async load lands is ticked without an effect to re-sync it.
  const [excluded, setExcluded] = useState(() => new Set());

  // A filter over at most five rows — memoising it would cost more than
  // it saves, and `candidates` is a fresh array on every render anyway.
  const chosen = candidates.filter((row) => !excluded.has(row.id));
  const chosenCost = chosen.reduce((sum, row) => sum + row.suggestion.cost, 0);

  const toggle = (id) => setExcluded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Unlike auto-order candidates, PO approvals start unselected — approving
  // spend in bulk should be a deliberate opt-in, not a pre-ticked default.
  const [selectedPoIds, setSelectedPoIds] = useState(() => new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  const togglePoSelect = (po) => setSelectedPoIds((current) => {
    const next = new Set(current);
    if (next.has(po.id)) next.delete(po.id); else next.add(po.id);
    return next;
  });

  const allQueueSelected = queue.length > 0 && queue.every((po) => selectedPoIds.has(po.id));

  const toggleSelectAllPos = () => setSelectedPoIds((current) => {
    const everySelected = queue.length > 0 && queue.every((po) => current.has(po.id));
    return everySelected ? new Set() : new Set(queue.map((po) => po.id));
  });

  const selectedPos = queue.filter((po) => selectedPoIds.has(po.id));

  const bulkApprove = async () => {
    if (selectedPos.length === 0) return;
    setBulkApproving(true);
    try {
      await Promise.all(selectedPos.map((po) => onApprovePo?.(po)));
      setSelectedPoIds(new Set());
    } finally {
      setBulkApproving(false);
    }
  };

  const overspending = spend.overBudget;

  return (
    <div className="rd-board inv-board-supervisor" data-testid="supervisor-inventory" data-loading={loading ? 'true' : 'false'}>
      {risks.length > 0 && (
        <section className="rd-alert-panel" data-testid="inv-stockout-alert" aria-label="Critical shortages">
          <header>
            <AlertOctagon size={17} aria-hidden="true" />
            <h3>
              {risks.length} item{risks.length === 1 ? '' : 's'} will run out before a replacement can arrive
            </h3>
          </header>
          <ul>
            {risks.slice(0, 4).map((risk) => (
              <li key={risk.id}>
                <span className="rd-breach-who">{risk.machine}</span>
                <span className="rd-breach-what">
                  <strong>{risk.name}</strong>
                  {risk.partNumber ? <code className="rd-wo">{risk.partNumber}</code> : null}
                </span>
                <b className="rd-breach-time">
                  {risk.daysLeft === 0 ? 'out now' : `${risk.daysLeft}d left`}
                  {risk.shortfallDays > 0 && ` · ${risk.shortfallDays}d gap`}
                </b>
              </li>
            ))}
          </ul>

          {candidates.length > 0 && (
            <div className="inv-auto-order" data-testid="inv-auto-order">
              <p className="inv-auto-order-lead">Recommended auto-orders — untick anything you do not want raised.</p>
              <ul>
                {candidates.map((row) => (
                  <li key={row.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!excluded.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                      <span className="inv-auto-name">{row.name}</span>
                      <span className="inv-auto-detail">
                        {row.suggestion.qty} × {formatInr(row.unitCost)} · {row.supplier}
                      </span>
                      <b>{formatInr(row.suggestion.cost)}</b>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="inv-btn primary"
                disabled={chosen.length === 0}
                onClick={() => onAutoOrder?.(chosen)}
                data-testid="inv-approve-auto-orders"
              >
                <Zap size={13} aria-hidden="true" />
                Raise {chosen.length} PO{chosen.length === 1 ? '' : 's'} · {formatInr(chosenCost)}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="rd-kpi-row" aria-label="Spend and supply status">
        <InventoryKpiCard
          label="Open POs"
          icon={FileClock}
          tone={summary.openCount > 0 ? 'warning' : 'ok'}
          value={summary.openCount ?? 0}
          hint={`${formatInr(summary.openValue)} waiting on your approval`}
          data-testid="inv-kpi-open-pos"
        />
        <InventoryKpiCard
          label="Committed spend"
          icon={Wallet}
          money
          value={summary.committedValue ?? 0}
          hint={`${summary.committedCount ?? 0} approved, not yet received`}
          data-testid="inv-kpi-committed"
        />
        <InventoryKpiCard
          label="Inventory value"
          icon={Boxes}
          money
          value={metrics?.inventoryValue ?? 0}
          hint="Everything on the shelf, at cost"
          data-testid="inv-kpi-inventory-value"
        />
        <InventoryKpiCard
          label="Stockout risk"
          icon={AlertOctagon}
          tone={risks.length > 0 ? 'danger' : 'ok'}
          value={risks.length}
          hint="Items that could stop a machine"
          data-testid="inv-kpi-stockout-risk"
        />
      </section>

      <InventoryChart
        title="PO approval queue"
        subtitle="Waiting on you"
        caption={queue.length ? `${queue.length} PO${queue.length === 1 ? '' : 's'} · ${formatInr(summary.openValue)}` : 'Queue clear'}
      >
        {queue.length === 0 ? (
          <p className="rd-empty">Nothing waiting for approval. Every raised PO has been decided.</p>
        ) : (
          <>
            <div className="inv-po-select-row">
              <label className="inv-po-select-all">
                <input
                  type="checkbox"
                  checked={allQueueSelected}
                  onChange={toggleSelectAllPos}
                  aria-label="Select all POs waiting for approval"
                />
                Select all {queue.length}
              </label>

              {selectedPoIds.size > 0 && (
                <div className="inv-po-bulk-bar" role="region" aria-label="Bulk PO actions">
                  <strong>{selectedPoIds.size} selected</strong>
                  <div className="inv-po-bulk-spacer" />
                  <button
                    type="button"
                    className="inv-btn primary"
                    disabled={bulkApproving || loading}
                    onClick={bulkApprove}
                    data-testid="inv-bulk-approve"
                  >
                    <Check size={13} aria-hidden="true" />
                    Approve {selectedPoIds.size} · {formatInr(selectedPos.reduce((sum, po) => sum + po.total, 0))}
                  </button>
                  <button
                    type="button"
                    className="inv-btn ghost"
                    onClick={() => setSelectedPoIds(new Set())}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="inv-po-grid" data-testid="inv-po-queue">
              {queue.map((po) => (
                <POApprovalCard
                  key={po.id}
                  po={po}
                  onApprove={onApprovePo}
                  onRequestChanges={onRequestChanges}
                  busy={loading || bulkApproving}
                  selected={selectedPoIds.has(po.id)}
                  onToggleSelect={togglePoSelect}
                />
              ))}
            </div>
          </>
        )}
      </InventoryChart>

      <div className="rd-split">
        <InventoryChart
          title="Weekly spend"
          subtitle="Against budget"
          caption={spend.variancePct == null ? '—' : `${spend.variancePct > 0 ? '+' : ''}${spend.variancePct}% vs budget`}
        >
          <BudgetBars days={spend.days} budget={spend.budget} total={spend.total} />
          <p className={`rd-hint ${overspending ? 'warning' : 'ok'}`}>
            {overspending
              ? <><TrendingUp size={12} aria-hidden="true" /> {formatInrCompact(Math.abs(spend.variance))} over budget this week — approvals are outrunning the plan.</>
              : <><TrendingDown size={12} aria-hidden="true" /> {formatInrCompact(Math.abs(spend.variance || 0))} under budget this week.</>}
          </p>
        </InventoryChart>

        <InventoryChart
          title="Supplier performance"
          subtitle="Can we rely on them?"
          caption={`${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}`}
        >
          {suppliers.length === 0 ? (
            <p className="rd-empty">No supplier performance recorded yet.</p>
          ) : (
            <div className="inv-table-wrap">
              <table className="inv-table compact" data-testid="inv-supplier-performance">
                <thead>
                  <tr>
                    <th scope="col">Supplier</th>
                    <th scope="col" className="num">On time</th>
                    <th scope="col" className="num">Replies in</th>
                    <th scope="col" className="num">Avg lead</th>
                    <th scope="col" className="num">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => {
                    const variance = supplier.leadTimeAvg != null && supplier.observedLead != null
                      ? Math.round(supplier.observedLead - supplier.leadTimeAvg)
                      : null;
                    const tone = supplier.onTimePct == null ? '' : supplier.onTimePct >= 90 ? 'ok' : supplier.onTimePct >= 80 ? 'warning' : 'danger';
                    return (
                      <tr key={supplier.name}>
                        <td data-label="Supplier">{supplier.name}</td>
                        <td data-label="On time" className={`num ${tone}`}>{formatPct(supplier.onTimePct, '—')}</td>
                        <td data-label="Replies in" className="num">{supplier.responseTimeDays == null ? '—' : `${supplier.responseTimeDays}d`}</td>
                        <td data-label="Avg lead" className="num">{supplier.leadTimeAvg == null ? '—' : `${supplier.leadTimeAvg}d`}</td>
                        <td data-label="Variance" className="num">
                          {variance == null ? '—' : `${variance > 0 ? '+' : ''}${variance}d`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </InventoryChart>
      </div>
    </div>
  );
}
