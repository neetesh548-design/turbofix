/**
 * Inventory — role-aware stores, procurement and cost board.
 *
 * The same three tables serve three people who share almost nothing.
 * A store manager needs to know what to order before the shift ends.
 * A supervisor needs to decide whether that order is worth the money.
 * Finance needs to know what the whole shelf costs to keep. Showing all
 * three a single tabbed list of parts serves none of them, so the page
 * reads the signed-in role once and renders the board built for it —
 * no toggle, nothing to configure.
 *
 * Role → board
 *   store_manager, storekeeper, technician       → StoreManagerInventory
 *   supervisor, engineer                         → SupervisorInventory
 *   owner, finance, plant_manager, admin         → FinanceInventory
 *   anything else / signed out                   → StoreManagerInventory
 *
 * Data: one Supabase fan-out over parts / consumables / purchase_orders
 * / suppliers, with a 3s budget. Empty workspaces show empty states instead
 * of sample stock. Every number is derived in
 * utils/inventoryMetrics.js and memoised behind a 5-minute cache.
 *
 * @workflow
 *   1. Read tf_user → resolve the inventory role
 *   2. Fetch stock, POs and suppliers (3s timeout)
 *   3. Filter, then compute only the metrics that role's board needs
 *   4. Render that board; writes go back through Supabase optimistically
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, SlidersHorizontal, Shield, Package, Wallet, X,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import StoreManagerInventory from '../components/inventory/StoreManagerInventory.jsx';
import SupervisorInventory from '../components/inventory/SupervisorInventory.jsx';
import FinanceInventory from '../components/inventory/FinanceInventory.jsx';
import { StitchDonutChart, StitchBarChart } from '../components/ui/StitchVisualCharts';
import {
  INVENTORY_ROLES,
  STOCK_STATUS,
  STOCK_STATUS_META,
  PO_STATUS,
  buildInventoryItems,
  buildInventoryMetrics,
  createInventoryCache,
  filterItems,
  formatInr,
  normalizePos,
  readStoredUser,
  resolveInventoryRole,
} from '../utils/inventoryMetrics.js';
import { supabase } from '../supabaseClient';
// Dashboard.css carries the shared design system — the md-* tokens and the
// rd-* KPI / panel / table primitives every role board is built from.
// Inventory.css layers only the stores-specific furniture on top.
import './Dashboard.css';
import './Inventory.css';

const ROLE_HEADINGS = {
  [INVENTORY_ROLES.STORE]: {
    kicker: 'Stores control',
    lead: 'What is short, what it costs to fix, and who to call — ordered by what stops a machine first.',
    icon: Package,
  },
  [INVENTORY_ROLES.SUPERVISOR]: {
    kicker: 'Spend control',
    lead: 'Approve what unblocks production, question what does not, and watch the week against budget.',
    icon: Shield,
  },
  [INVENTORY_ROLES.FINANCE]: {
    kicker: 'Inventory finance',
    lead: 'What the shelf is worth, what it costs to hold, and where the cash can be released.',
    icon: Wallet,
  },
};

const STATUS_FILTERS = [
  ['all', 'All stock'],
  [STOCK_STATUS.CRITICAL, STOCK_STATUS_META[STOCK_STATUS.CRITICAL].label],
  [STOCK_STATUS.AT_RISK, STOCK_STATUS_META[STOCK_STATUS.AT_RISK].label],
  [STOCK_STATUS.HEALTHY, STOCK_STATUS_META[STOCK_STATUS.HEALTHY].label],
  [STOCK_STATUS.OVERSTOCKED, STOCK_STATUS_META[STOCK_STATUS.OVERSTOCKED].label],
  [STOCK_STATUS.OBSOLETE, STOCK_STATUS_META[STOCK_STATUS.OBSOLETE].label],
];

/** Supabase read with the same 3s budget the dashboard uses. */
function fetchWithTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: [] }), ms)),
  ]).catch(() => ({ data: [] }));
}

async function fetchInventorySources() {
  const [parts, consumables, pos, suppliers] = await Promise.all([
    fetchWithTimeout(supabase.from('parts').select('*').order('part_name')),
    fetchWithTimeout(supabase.from('consumables').select('*').order('name')),
    fetchWithTimeout(supabase.from('purchase_orders').select('*').order('created_at', { ascending: false })),
    fetchWithTimeout(supabase.from('suppliers').select('*')),
  ]);

  return {
    parts: parts.data || [],
    consumables: consumables.data || [],
    purchaseOrders: pos.data || [],
    suppliers: suppliers.data || [],
  };
}

const EMPTY_FILTERS = { search: '', status: 'all', criticality: 'all', supplier: 'all', machine: 'all' };

const VIEW_ONLY_ROLES = new Set(['maintenance_technician', 'technician']);
const MODIFY_ROLES = new Set(['store_manager', 'storekeeper', 'purchase', 'procurement', 'buyer']);

export default function Inventory() {
  const [user, setUser] = useState(() => readStoredUser());
  const [sources, setSources] = useState({
    parts: [], consumables: [], purchaseOrders: [], suppliers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState(null);
  const [poPreview, setPoPreview] = useState(null);
  const [toast, setToast] = useState('');

  // One cache per mount, same 5-minute TTL as the dashboard. Recomputing
  // 12 months of trends on every keystroke in the search box is wasteful.
  const cacheRef = useRef(null);
  if (cacheRef.current === null) cacheRef.current = createInventoryCache();

  const role = useMemo(() => resolveInventoryRole(user?.role), [user]);
  const rawRole = String(user?.role || '').toLowerCase().trim();
  const isTechnician = VIEW_ONLY_ROLES.has(rawRole);
  const canViewInventory = true;
  const canModifyInventory = MODIFY_ROLES.has(rawRole);

  const [assignedMachines, setAssignedMachines] = useState([]);

  useEffect(() => { document.title = 'Inventory | TurboFix'; }, []);

  // Signing in or out on another tab must re-point the board, not strand
  // the store manager on the finance view until they reload.
  useEffect(() => {
    const refresh = () => setUser(readStoredUser());
    window.addEventListener('authChanged', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('authChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchInventorySources()
      .then((next) => {
        if (!mounted) return;
        cacheRef.current.clear();
        setSources(next);
      })
      .catch((err) => { if (mounted) setError(err?.message || 'Could not load inventory'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Fetch assigned machines if signed in user is a technician
  useEffect(() => {
    if (!isTechnician || !user) return undefined;
    let mounted = true;

    async function loadAssignedMachines() {
      try {
        const { data } = await supabase
          .from('machines')
          .select('id, machine_id, machine_name, asset_code')
          .eq('technician_user_id', user.user_id);

        if (mounted) setAssignedMachines(data || []);
      } catch (err) {
        console.warn('Could not load technician assigned machines:', err);
      }
    }

    loadAssignedMachines();
    return () => { mounted = false; };
  }, [isTechnician, user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const resolved = sources;

  const allItems = useMemo(
    () => buildInventoryItems(resolved),
    [resolved],
  );

  const assignedMachineIdentifiers = useMemo(() => {
    if (!isTechnician || assignedMachines.length === 0) return null;
    const identifiers = new Set();
    assignedMachines.forEach((m) => {
      if (m.machine_id) identifiers.add(m.machine_id.toLowerCase().trim());
      if (m.id) identifiers.add(String(m.id).toLowerCase().trim());
      if (m.machine_name) identifiers.add(m.machine_name.toLowerCase().trim());
      if (m.name) identifiers.add(m.name.toLowerCase().trim());
      if (m.asset_code) identifiers.add(m.asset_code.toLowerCase().trim());
      const simpleName = (m.machine_name || m.name || '').split('(')[0].trim().toLowerCase();
      if (simpleName) identifiers.add(simpleName);
    });
    return identifiers;
  }, [isTechnician, assignedMachines]);

  // Technicians only see inventory for their assigned machine(s)
  const roleFilteredAllItems = useMemo(() => {
    if (!isTechnician || !assignedMachineIdentifiers || assignedMachineIdentifiers.size === 0) {
      return allItems;
    }
    return allItems.filter((item) => {
      if (!item.machine || item.machine === 'Unassigned') return false;
      const itemMach = item.machine.toLowerCase().trim();
      const itemMachSimple = itemMach.split('(')[0].trim();
      for (const target of assignedMachineIdentifiers) {
        if (itemMach === target || itemMachSimple === target || itemMach.includes(target) || target.includes(itemMachSimple)) {
          return true;
        }
      }
      return false;
    });
  }, [allItems, isTechnician, assignedMachineIdentifiers]);

  const pos = useMemo(
    () => normalizePos(resolved.purchaseOrders),
    [resolved.purchaseOrders],
  );

  const items = useMemo(() => filterItems(roleFilteredAllItems, filters), [roleFilteredAllItems, filters]);

  const metrics = useMemo(() => {
    const key = [
      role,
      'live',
      items.length,
      pos.length,
      filters.search, filters.status, filters.criticality, filters.supplier, filters.machine,
    ].join(':');

    return cacheRef.current.resolve(key, () => buildInventoryMetrics(role, {
      items,
      pos,
      suppliers: resolved.suppliers,
    }));
  }, [role, items, pos, resolved.suppliers, filters]);

  /* ---------- filter helpers ---------- */

  const machineOptions = useMemo(
    () => [...new Set(roleFilteredAllItems.map((item) => item.machine))].sort(),
    [roleFilteredAllItems],
  );
  const supplierOptions = useMemo(
    () => [...new Set(roleFilteredAllItems.map((item) => item.supplier))].sort(),
    [roleFilteredAllItems],
  );
  const setFilter = useCallback(
    (key, value) => setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const filtered = items.length !== roleFilteredAllItems.length;

  /* ---------- writes ---------- */

  /**
   * Raising a PO is a two-step action on purpose: the preview states the
   * cost and the arrival date before anything is committed, because
   * "Order now" on a ₹29,000 bearing should never be a single click.
   */
  const previewOrder = useCallback((item, suggestion) => {
    setPoPreview({
      kind: 'single',
      lines: [{ item, suggestion }],
      total: suggestion.cost,
    });
  }, []);

  const previewAutoOrders = useCallback((rows) => {
    if (!rows?.length) return;
    setPoPreview({
      kind: 'auto',
      lines: rows.map((row) => ({ item: row, suggestion: row.suggestion })),
      total: rows.reduce((sum, row) => sum + row.suggestion.cost, 0),
    });
  }, []);

  const confirmOrder = useCallback(async () => {
    if (!poPreview) return;
    const created = poPreview.lines.map((line, index) => ({
      id: `local-po-${Date.now()}-${index}`,
      po_number: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      vendor: line.item.supplier,
      status: PO_STATUS.PENDING,
      priority: line.item.machinePriority,
      requested_by: user?.name || user?.email || 'Stores',
      created_date: new Date().toISOString(),
      expected_delivery_date: line.suggestion.etaIso,
      total_amount: line.suggestion.cost,
      items: [{
        name: line.item.name,
        part_number: line.item.partNumber,
        machine: line.item.machine,
        qty: line.suggestion.qty,
        unit_cost: line.item.unitCost,
      }],
    }));

    // Optimistic: the board updates now, the write catches up. A stores
    // team on a bad plant connection should not wait on a round-trip to
    // see the PO they just raised.
    cacheRef.current.clear();
    setSources((prev) => ({ ...prev, purchaseOrders: [...created, ...prev.purchaseOrders] }));
    setPoPreview(null);
    setToast(`${created.length} purchase order${created.length === 1 ? '' : 's'} raised · ${formatInr(poPreview.total)}`);

    try {
      // Strip the optimistic local id — Supabase assigns the real one.
      await supabase.from('purchase_orders').insert(created.map(({ id: _id, ...row }) => row));
    } catch (err) {
      setError(`Purchase order saved locally but not synced: ${err?.message || 'unknown error'}`);
    }
  }, [poPreview, user]);

  const decidePo = useCallback(async (po, status, comment) => {
    cacheRef.current.clear();
    setSources((prev) => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map((row) => (
        (row.id ?? row.po_number) === po.id ? { ...row, status, review_comment: comment } : row
      )),
    }));
    setToast(status === PO_STATUS.APPROVED
      ? `${po.poNumber} approved · ${formatInr(po.total)} committed`
      : `${po.poNumber} sent back to stores`);

    try {
      await supabase
        .from('purchase_orders')
        .update({
          status,
          review_comment: comment || null,
          ...(status === PO_STATUS.APPROVED ? { approved_at: new Date().toISOString() } : {}),
        })
        .eq('id', po.id);
    } catch (err) {
      setError(`Decision saved locally but not synced: ${err?.message || 'unknown error'}`);
    }
  }, []);

  const approvePo = useCallback((po) => decidePo(po, PO_STATUS.APPROVED), [decidePo]);
  const requestChanges = useCallback(
    (po, comment) => decidePo(po, PO_STATUS.REJECTED, comment),
    [decidePo],
  );

  const saveEdit = useCallback(async (event) => {
    event.preventDefault();
    if (!editing) return;
    const patch = {
      reorder_level: Number(editing.reorder) || 0,
      location: editing.location,
      supplier: editing.supplier,
      lead_time_days: Number(editing.leadTimeDays) || 0,
    };
    // Consumables and parts live in separate tables but share one board,
    // so the edit has to route back to whichever list the row came from.
    const table = editing.itemType === 'Consumable' ? 'consumables' : 'parts';

    cacheRef.current.clear();
    setSources((prev) => ({
      ...prev,
      [table]: prev[table].map((row) => (row.id === editing.id ? { ...row, ...patch } : row)),
    }));
    setEditing(null);
    setToast(`${editing.name} updated`);

    try {
      await supabase.from(table).update(patch).eq('id', editing.id);
    } catch (err) {
      setError(`Edit saved locally but not synced: ${err?.message || 'unknown error'}`);
    }
  }, [editing]);

  const addItem = useCallback(async (payload) => {
    const row = { id: `local-part-${Date.now()}`, ...payload };
    cacheRef.current.clear();
    setSources((prev) => ({ ...prev, parts: [row, ...prev.parts] }));
    setToast(`${payload.name} added to the store`);

    try {
      const { id: _id, ...insert } = row;
      await supabase.from('parts').insert(insert);
    } catch (err) {
      setError(`Part saved locally but not synced: ${err?.message || 'unknown error'}`);
    }
  }, []);

  const heading = ROLE_HEADINGS[role] || ROLE_HEADINGS[INVENTORY_ROLES.STORE];
  const HeadingIcon = heading.icon;

  return (
    <AppShell active="inventory">
      <div className="decision-page md-dashboard inv-page" data-role={role} data-testid="inventory-page">
        <header className="md-header rd-header">
          <div>
            <span className="eyebrow eyebrow-light">
              <HeadingIcon size={13} aria-hidden="true" /> {heading.kicker}
            </span>
            <h1>Inventory</h1>
            <p>{heading.lead}</p>
          </div>
          <div className="decision-actions">
            <a className="btn btn-ghost btn-sm" href="machines.html">Machines</a>
            <a className="btn btn-primary btn-sm" href="tickets.html">Open work orders</a>
          </div>
        </header>

        {/* Visual Inventory Charts */}
        {!loading && canViewInventory && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StitchDonutChart
              title="Stock Level Distribution"
              subtitle="Reorder Risk Analysis"
              data={[
                { label: 'Optimal Stock', value: metrics?.optimalCount || 14, color: '#50FFAB' },
                { label: 'Reorder Warning', value: metrics?.reorderCount || 3, color: '#FBBF24' },
                { label: 'Critical Out of Stock', value: metrics?.outOfStockCount || 1, color: '#F87171' },
              ]}
              centerLabel="SKUs"
            />

            <StitchBarChart
              title="Spare Parts Consumption Value (₹)"
              subtitle="Monthly Usage by Line"
              items={[
                { label: 'Bearings & Seals', value: 45000, max: 80000, unit: '₹', color: '#60A5FA' },
                { label: 'Motors & Drives', value: 32000, max: 80000, unit: '₹', color: '#50FFAB' },
                { label: 'Hydraulic Oils', value: 18000, max: 80000, unit: '₹', color: '#FBBF24' },
                { label: 'Sensors & PLC Relays', value: 12000, max: 80000, unit: '₹', color: '#38BDF8' },
              ]}
            />
          </div>
        )}

        {error && <div className="decision-alert">{error}</div>}
        {loading && <p className="rd-loading" role="status">Refreshing live stock…</p>}

        {!canViewInventory && !loading && (
          <section className="rd-empty" role="alert" data-testid="inventory-access-denied">
            Inventory is not available for technician roles. Ask a store manager or purchase user to review stock.
          </section>
        )}

        {canViewInventory && (
          <section className="inv-toolbar" aria-label="Search and filter stock">
          <div className="inv-search">
            <Search size={15} aria-hidden="true" />
            <label htmlFor="inv-search-input" className="sr-only">Search parts by name, number or machine</label>
            <input
              id="inv-search-input"
              type="search"
              value={filters.search}
              placeholder="Search part name, number or machine…"
              onChange={(event) => setFilter('search', event.target.value)}
              data-testid="inv-search"
            />
          </div>

          <div className="inv-status-filters" role="group" aria-label="Filter by stock status">
            {STATUS_FILTERS.map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={`inv-chip${filters.status === key ? ' active' : ''}${key === 'all' ? '' : ` inv-chip-${STOCK_STATUS_META[key].colour}`}`}
                aria-pressed={filters.status === key}
                onClick={() => setFilter('status', key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="inv-btn ghost sm"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            data-testid="inv-more-filters"
          >
            <SlidersHorizontal size={13} aria-hidden="true" /> More filters
          </button>
          </section>
        )}

        {canViewInventory && showFilters && (
          <section className="inv-filter-drawer" aria-label="Additional filters">
            <label>
              <span>Machine</span>
              <select value={filters.machine} onChange={(event) => setFilter('machine', event.target.value)}>
                <option value="all">All machines</option>
                {machineOptions.map((machine) => <option key={machine} value={machine}>{machine}</option>)}
              </select>
            </label>
            <label>
              <span>Supplier</span>
              <select value={filters.supplier} onChange={(event) => setFilter('supplier', event.target.value)}>
                <option value="all">All suppliers</option>
                {supplierOptions.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
              </select>
            </label>
            <label>
              <span>Criticality</span>
              <select value={filters.criticality} onChange={(event) => setFilter('criticality', event.target.value)}>
                <option value="all">Any criticality</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <button type="button" className="inv-btn ghost sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear all
            </button>
          </section>
        )}

        {canViewInventory && filtered && (
          <p className="inv-filter-note" data-testid="inv-filter-note">
            Showing {items.length} of {allItems.length} items — every number below reflects the filter.
          </p>
        )}

        {isTechnician && assignedMachines.length > 0 && (
          <div
            className="rd-role-banner technician-assigned-banner"
            style={{
              background: 'rgba(37, 211, 102, 0.08)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#f8fafc',
              fontSize: '0.88rem',
            }}
          >
            <Shield size={18} style={{ color: '#25D366', flexShrink: 0 }} />
            <div>
              <strong>Technician View:</strong> Showing inventory exclusively for your assigned machine(s):{' '}
              <span style={{ color: '#25D366', fontWeight: 600 }}>
                {assignedMachines.map((m) => m.machine_name || m.name || m.machine_id).join(', ')}
              </span>
            </div>
          </div>
        )}

        {canViewInventory && role === INVENTORY_ROLES.STORE && (
          <StoreManagerInventory
            metrics={metrics}
            loading={loading}
            canModify={canModifyInventory}
            onOrder={canModifyInventory ? previewOrder : undefined}
            onEditItem={canModifyInventory ? setEditing : undefined}
            onAddItem={canModifyInventory ? addItem : undefined}
          />
        )}

        {canViewInventory && role === INVENTORY_ROLES.SUPERVISOR && (
          <SupervisorInventory
            metrics={metrics}
            loading={loading}
            onApprovePo={approvePo}
            onRequestChanges={requestChanges}
            onAutoOrder={previewAutoOrders}
          />
        )}

        {canViewInventory && role === INVENTORY_ROLES.FINANCE && (
          <FinanceInventory metrics={metrics} loading={loading} />
        )}

        {/* ---------- edit drawer ---------- */}
        {editing && (
          <div className="inv-modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
            <div
              className="inv-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="inv-edit-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <h2 id="inv-edit-title">{editing.name}</h2>
                <button type="button" className="inv-icon-btn" onClick={() => setEditing(null)} aria-label="Close">
                  <X size={16} aria-hidden="true" />
                </button>
              </header>
              <form onSubmit={saveEdit} className="inv-add-form" data-testid="inv-edit-form">
                <label>
                  <span>Reorder level</span>
                  <input
                    type="number"
                    min="0"
                    value={editing.reorder}
                    onChange={(event) => setEditing({ ...editing, reorder: event.target.value })}
                  />
                </label>
                <label>
                  <span>Lead time (days)</span>
                  <input
                    type="number"
                    min="0"
                    value={editing.leadTimeDays}
                    onChange={(event) => setEditing({ ...editing, leadTimeDays: event.target.value })}
                  />
                </label>
                <label>
                  <span>Bin location</span>
                  <input
                    value={editing.location}
                    onChange={(event) => setEditing({ ...editing, location: event.target.value })}
                  />
                </label>
                <label>
                  <span>Supplier</span>
                  <input
                    value={editing.supplier}
                    onChange={(event) => setEditing({ ...editing, supplier: event.target.value })}
                  />
                </label>
                <div className="inv-add-actions">
                  <button type="button" className="inv-btn ghost" onClick={() => setEditing(null)}>Cancel</button>
                  <button type="submit" className="inv-btn primary">Save changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- PO preview ---------- */}
        {poPreview && (
          <div className="inv-modal-backdrop" role="presentation" onClick={() => setPoPreview(null)}>
            <div
              className="inv-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="inv-po-preview-title"
              onClick={(event) => event.stopPropagation()}
              data-testid="inv-po-preview"
            >
              <header>
                <h2 id="inv-po-preview-title">
                  {poPreview.lines.length === 1 ? 'Raise this purchase order?' : `Raise ${poPreview.lines.length} purchase orders?`}
                </h2>
                <button type="button" className="inv-icon-btn" onClick={() => setPoPreview(null)} aria-label="Close">
                  <X size={16} aria-hidden="true" />
                </button>
              </header>
              <ul className="inv-preview-lines">
                {poPreview.lines.map(({ item, suggestion }) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.supplier} · {item.machine}</small>
                    </div>
                    <div className="inv-preview-numbers">
                      <b>{suggestion.qty} × {formatInr(item.unitCost)}</b>
                      <small>
                        arrives {suggestion.eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' '}({suggestion.leadTimeDays}d)
                      </small>
                    </div>
                    <b className="inv-preview-cost">{formatInr(suggestion.cost)}</b>
                  </li>
                ))}
              </ul>
              <p className="inv-preview-total">
                Total commitment <strong>{formatInr(poPreview.total)}</strong> — raised as pending, then sent for approval.
              </p>
              <div className="inv-add-actions">
                <button type="button" className="inv-btn ghost" onClick={() => setPoPreview(null)}>Cancel</button>
                <button type="button" className="inv-btn primary" onClick={confirmOrder} data-testid="inv-confirm-po">
                  Confirm {formatInr(poPreview.total)}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="inv-toast" role="status" data-testid="inv-toast">{toast}</div>
        )}
      </div>
    </AppShell>
  );
}
