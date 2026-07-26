/**
 * StoreManagerInventory — "know your stock".
 *
 * The store manager's whole job on this page is answering one question:
 * what do I have to order today? So the reorder queue leads, and it
 * leads with the answer already computed — quantity, cost and arrival
 * date on the row, not behind a modal. Everything else (suppliers, bin
 * map, the add form) sits below it, in the order a shift actually uses
 * them.
 *
 * Props:
 * - metrics ({ health, reorderQueue, suppliers, bins, items, alerts })
 * - onOrder      (fn) called with (item, suggestion) → raises a PO
 * - onEditItem   (fn) called with the item being edited
 * - onAddItem    (fn) called with a new-part form payload
 * - loading      (bool)
 */

import React, { useState } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Layers, Plus, Phone, Mail,
  Truck, Boxes, PackagePlus, Pencil,
} from 'lucide-react';
import InventoryKpiCard from './InventoryKpiCard.jsx';
import StockHealthIndicator from './StockHealthIndicator.jsx';
import InventoryChart from './InventoryChart.jsx';
import {
  STOCK_STATUS, formatInr, formatInrCompact,
} from '../../utils/inventoryMetrics.js';

const EMPTY_FORM = {
  name: '', part_number: '', associated_machine: '', machine_priority: 'Medium',
  stock_qty: '', reorder_level: '', unit_cost: '', lead_time_days: '',
  supplier: '', location: '',
};

function etaLabel(suggestion) {
  const days = suggestion.leadTimeDays;
  const date = suggestion.eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (!days) return `arrives ${date}`;
  return `arrives in ${days} day${days === 1 ? '' : 's'} (${date})`;
}

export default function StoreManagerInventory({
  metrics, onOrder, onEditItem, onAddItem, canModify = true, loading = false,
}) {
  const [openBin, setOpenBin] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const health = metrics?.health || {};
  const queue = Array.isArray(metrics?.reorderQueue) ? metrics.reorderQueue : [];
  const suppliers = Array.isArray(metrics?.suppliers) ? metrics.suppliers : [];
  const bins = Array.isArray(metrics?.bins) ? metrics.bins : [];
  const criticalRows = queue.filter((row) => row.status === STOCK_STATUS.CRITICAL);
  const queueCost = queue.reduce((sum, row) => sum + row.suggestion.cost, 0);

  const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submitAdd = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onAddItem?.({
      ...form,
      stock_qty: Number(form.stock_qty) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      lead_time_days: Number(form.lead_time_days) || 0,
    });
    setForm(EMPTY_FORM);
    setAddOpen(false);
  };

  return (
    <div className="rd-board inv-board-store" data-testid="store-inventory" data-loading={loading ? 'true' : 'false'}>
      {criticalRows.length > 0 && (
        <section className="rd-alert-panel" data-testid="inv-critical-banner" aria-label="Parts that need ordering">
          <header>
            <ShieldAlert size={17} aria-hidden="true" />
            <h3>
              {criticalRows.length} critical part{criticalRows.length === 1 ? '' : 's'} need ordering now
            </h3>
          </header>
          <ul>
            {criticalRows.slice(0, 3).map((row) => (
              <li key={row.id}>
                <span className="rd-breach-who">{row.machine}</span>
                <span className="rd-breach-what">
                  <strong>{row.name}</strong>
                  {row.partNumber ? <code className="rd-wo">{row.partNumber}</code> : null}
                </span>
                <b className="rd-breach-time">{row.available} left · {row.leadTimeDays}d lead</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rd-kpi-row" aria-label="Stock health">
        <InventoryKpiCard
          label="Critical stock"
          icon={ShieldAlert}
          status={STOCK_STATUS.CRITICAL}
          value={health.critical ?? 0}
          hint={`${formatInrCompact(health.byStatus?.critical?.value)} of stock below reorder level`}
          data-testid="inv-kpi-critical"
        />
        <InventoryKpiCard
          label="At risk"
          icon={AlertTriangle}
          status={STOCK_STATUS.AT_RISK}
          value={health.atRisk ?? 0}
          hint="Inside the safety band or under a week of cover"
          data-testid="inv-kpi-at-risk"
        />
        <InventoryKpiCard
          label="Healthy"
          icon={CheckCircle2}
          status={STOCK_STATUS.HEALTHY}
          value={health.healthy ?? 0}
          hint="Comfortably above the reorder level"
          data-testid="inv-kpi-healthy"
        />
        <InventoryKpiCard
          label="Overstocked"
          icon={Layers}
          status={STOCK_STATUS.OVERSTOCKED}
          value={health.overstocked ?? 0}
          hint={`${formatInrCompact(health.byStatus?.overstocked?.value)} held above max level`}
          data-testid="inv-kpi-overstocked"
        />
      </section>

      {!canModify && (
        <p className="rd-hint" data-testid="inv-read-only-note">
          View only: ask a store manager or purchase user to edit reorder levels, raise orders, or add stock.
        </p>
      )}

      <InventoryChart
        title="Action required"
        subtitle="Order today"
        caption={queue.length ? `${queue.length} item${queue.length === 1 ? '' : 's'} · ${formatInr(queueCost)} to clear` : 'Nothing to order'}
      >
        {queue.length === 0 ? (
          <p className="rd-empty">Every part is above its reorder level. Nothing to raise today.</p>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table" data-testid="inv-reorder-table">
              <thead>
                <tr>
                  <th scope="col">Part</th>
                  <th scope="col">Machine</th>
                  <th scope="col" className="num">Stock</th>
                  <th scope="col" className="num">Reorder at</th>
                  <th scope="col">Supplier</th>
                  <th scope="col" className="num">Lead</th>
                  <th scope="col">Order</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((row) => (
                  <tr key={row.id} data-status={row.status}>
                    <td data-label="Part">
                      {canModify ? (
                        <button
                          type="button"
                          className="inv-row-link"
                          onClick={() => onEditItem?.(row)}
                          title="Edit reorder level, location and supplier"
                        >
                          <span className="inv-row-name">{row.name}</span>
                          {row.partNumber ? <code>{row.partNumber}</code> : null}
                          <Pencil size={11} aria-hidden="true" className="inv-row-pencil" />
                        </button>
                      ) : (
                        <span className="inv-row-link readonly" title="View only">
                          <span className="inv-row-name">{row.name}</span>
                          {row.partNumber ? <code>{row.partNumber}</code> : null}
                        </span>
                      )}
                      <StockHealthIndicator item={row} compact />
                    </td>
                    <td data-label="Machine">
                      <span className="inv-machine">{row.machine}</span>
                      <small className={`inv-priority inv-priority-${row.machinePriority}`}>{row.machinePriority}</small>
                    </td>
                    <td data-label="Stock" className="num">
                      <strong>{row.available}</strong>
                      {row.reserved > 0 && <small> ({row.reserved} reserved)</small>}
                    </td>
                    <td data-label="Reorder at" className="num">{row.reorder}</td>
                    <td data-label="Supplier">{row.supplier}</td>
                    <td data-label="Lead" className="num">{row.leadTimeDays}d</td>
                    <td data-label="Order" className="inv-order-cell">
                      {canModify ? (
                        <>
                          <button
                            type="button"
                            className="inv-btn primary sm"
                            onClick={() => onOrder?.(row, row.suggestion)}
                            data-testid="inv-order-now"
                          >
                            Order {row.suggestion.qty}
                          </button>
                          <small className="inv-order-hint">
                            {etaLabel(row.suggestion)} · {formatInr(row.suggestion.cost)}
                          </small>
                        </>
                      ) : (
                        <small className="inv-order-hint">Order actions are store / purchase only.</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InventoryChart>

      <div className="rd-split">
        <InventoryChart
          title="Supplier network"
          subtitle="Who we buy from"
          caption={`${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}`}
        >
          {suppliers.length === 0 ? (
            <p className="rd-empty">No suppliers linked to stock yet.</p>
          ) : (
            <ul className="inv-supplier-list" data-testid="inv-supplier-list">
              {suppliers.map((supplier) => (
                <li key={supplier.name}>
                  <div className="inv-supplier-main">
                    <strong>{supplier.name}</strong>
                    <small>
                      {supplier.itemCount} item{supplier.itemCount === 1 ? '' : 's'} · {formatInrCompact(supplier.value)}
                      {supplier.leadTimeAvg != null && ` · ~${supplier.leadTimeAvg}d lead`}
                      {supplier.responseTimeDays != null && ` · replies in ${supplier.responseTimeDays}d`}
                    </small>
                  </div>
                  <div className="inv-supplier-contact">
                    {supplier.contact && (
                      <a className="inv-icon-btn" href={`tel:${supplier.contact.replace(/\s+/g, '')}`} title={`Call ${supplier.name}`}>
                        <Phone size={13} aria-hidden="true" />
                        <span className="sr-only">Call {supplier.name}</span>
                      </a>
                    )}
                    {supplier.email && (
                      <a className="inv-icon-btn" href={`mailto:${supplier.email}`} title={`Email ${supplier.name}`}>
                        <Mail size={13} aria-hidden="true" />
                        <span className="sr-only">Email {supplier.name}</span>
                      </a>
                    )}
                    {supplier.criticalItems > 0 && (
                      <span className="inv-supplier-flag" title="Holds parts we are short of">
                        <Truck size={12} aria-hidden="true" /> {supplier.criticalItems}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </InventoryChart>

        <InventoryChart
          title="Bin locations"
          subtitle="Warehouse map"
          caption={openBin ? `Section ${openBin}` : 'Pick a section'}
        >
          <div className="inv-bin-grid" data-testid="inv-bin-map">
            {bins.map((bin) => (
              <button
                type="button"
                key={bin.section}
                className={`inv-bin${openBin === bin.section ? ' active' : ''}${bin.critical ? ' has-critical' : ''}`}
                onClick={() => setOpenBin((current) => (current === bin.section ? null : bin.section))}
                aria-pressed={openBin === bin.section}
              >
                <Boxes size={15} aria-hidden="true" />
                <strong>{bin.section}</strong>
                <small>{bin.items.length} item{bin.items.length === 1 ? '' : 's'}</small>
                {bin.critical > 0 && <em>{bin.critical} short</em>}
              </button>
            ))}
            {bins.length === 0 && <p className="rd-empty">No bin locations recorded.</p>}
          </div>

          {openBin && (
            <ul className="inv-bin-contents">
              {bins.find((bin) => bin.section === openBin)?.items.map((item) => (
                <li key={item.id}>
                  <StockHealthIndicator item={item} compact />
                  <span className="inv-bin-item-name">{item.name}</span>
                  <code>{item.location}</code>
                  <b>{item.available}</b>
                </li>
              ))}
            </ul>
          )}
        </InventoryChart>
      </div>

      <InventoryChart
        title="Add a part"
        subtitle="Quick add"
        action={(
          canModify ? (
            <button type="button" className="inv-btn sm" onClick={() => setAddOpen((open) => !open)} aria-expanded={addOpen}>
              <Plus size={13} aria-hidden="true" /> {addOpen ? 'Close' : 'New part'}
            </button>
          ) : null
        )}
      >
        {canModify && addOpen ? (
          <form className="inv-add-form" onSubmit={submitAdd} data-testid="inv-add-form">
            <label>
              <span>Part name</span>
              <input value={form.name} onChange={setField('name')} required placeholder="e.g. Spindle bearing" />
            </label>
            <label>
              <span>Part number</span>
              <input value={form.part_number} onChange={setField('part_number')} placeholder="SB-4410-X" />
            </label>
            <label>
              <span>Machine</span>
              <input value={form.associated_machine} onChange={setField('associated_machine')} placeholder="CNC Milling Center #01" />
            </label>
            <label>
              <span>Machine priority</span>
              <select value={form.machine_priority} onChange={setField('machine_priority')}>
                <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
              </select>
            </label>
            <label>
              <span>Stock qty</span>
              <input type="number" min="0" value={form.stock_qty} onChange={setField('stock_qty')} />
            </label>
            <label>
              <span>Reorder level</span>
              <input type="number" min="0" value={form.reorder_level} onChange={setField('reorder_level')} />
            </label>
            <label>
              <span>Unit cost (₹)</span>
              <input type="number" min="0" value={form.unit_cost} onChange={setField('unit_cost')} />
            </label>
            <label>
              <span>Lead time (days)</span>
              <input type="number" min="0" value={form.lead_time_days} onChange={setField('lead_time_days')} />
            </label>
            <label>
              <span>Supplier</span>
              <input value={form.supplier} onChange={setField('supplier')} placeholder="SKF Precision Ltd" />
            </label>
            <label>
              <span>Bin location</span>
              <input value={form.location} onChange={setField('location')} placeholder="Bin A-04" />
            </label>
            <div className="inv-add-actions">
              <button type="submit" className="inv-btn primary">
                <PackagePlus size={13} aria-hidden="true" /> Add to store
              </button>
            </div>
          </form>
        ) : (
          <p className="rd-hint">
            Adding a part here sets its reorder level and lead time, which is what the board uses to
            decide when it turns red. {canModify ? 'Click any row above to edit an existing one.' : 'Only store / purchase users can change stock details.'}
          </p>
        )}
      </InventoryChart>
    </div>
  );
}
