/* ===========================================================
   TurboFix — Role-aware inventory metrics
   ===========================================================

   Every number on the inventory boards is computed here, as a pure
   function over the same `parts` / `consumables` / `purchaseOrders` /
   `suppliers` arrays the page already fetches. Same contract as
   dashboardMetrics.js:

     - inputs are defensively coerced; a missing table yields an
       empty metric rather than a TypeError,
     - "no data" is `null`, never `0` — an item nobody has ever issued
       has `daysSinceLastUse === null`, which is not the same fact as
       "issued today",
     - `now` is always injectable so tests never depend on the clock.

   Money convention: every rupee figure is a plain Number of rupees.
   Formatting happens at the edge (formatInr / formatInrCompact),
   never inside a calculation.

   Shared helpers (asArray, round1, formatInr, …) are imported from
   dashboardMetrics rather than re-implemented, so the inventory board
   and the maintenance board cannot disagree about what "₹4.8L" means.
   They are re-exported here so inventory components have one import.
   =========================================================== */

import {
  asArray,
  asNumber,
  round1,
  formatInr,
  formatInrCompact,
  formatPct,
  createMetricsCache,
  readStoredUser,
  MS_PER_DAY,
} from './dashboardMetrics.js';

export {
  asArray,
  asNumber,
  round1,
  formatInr,
  formatInrCompact,
  formatPct,
  readStoredUser,
  MS_PER_DAY,
};

/** One cache factory for the whole app — inventory just reuses it. */
export const createInventoryCache = createMetricsCache;

/* -----------------------------------------------------------
   Tunables — every assumption the board makes, in one place
   ----------------------------------------------------------- */

/** Working capital tied up in stock is charged at this annual rate. */
export const INTEREST_RATE = 0.15;
/** Warehouse space, insurance and handling, as a share of stock value. */
export const STORAGE_RATE = 0.05;
/** Total annual carrying cost = value × 20%. */
export const CARRYING_RATE = INTEREST_RATE + STORAGE_RATE;

/** Nothing issued for this long is dead capital, not inventory. */
export const OBSOLETE_AFTER_DAYS = 180;
/** Issued inside this window counts as actively moving stock. */
export const ACTIVE_WITHIN_DAYS = 30;

/** A critical machine with less than a week of cover is already a risk. */
export const CRITICAL_COVER_DAYS = 7;

/** Lead time at or above this is "long lead" — it cannot be recovered fast. */
export const LONG_LEAD_DAYS = 14;

/** Weekly procurement budget used as the bar-chart baseline (₹). */
export const DEFAULT_WEEKLY_PO_BUDGET = 150_000;

/* -----------------------------------------------------------
   Role resolution
   ----------------------------------------------------------- */

export const INVENTORY_ROLES = Object.freeze({
  STORE: 'store',
  SUPERVISOR: 'supervisor',
  FINANCE: 'finance',
});

/**
 * The store manager is the default. Unlike the dashboard — where a
 * signed-out visitor gets the business summary — an unrecognised role
 * landing on /inventory is almost always stores staff, and the store
 * board is the only one that is useful without approval rights.
 */
export const DEFAULT_INVENTORY_ROLE = INVENTORY_ROLES.STORE;

const ROLE_VIEW_MAP = Object.freeze({
  store: INVENTORY_ROLES.STORE,
  stores: INVENTORY_ROLES.STORE,
  store_manager: INVENTORY_ROLES.STORE,
  storekeeper: INVENTORY_ROLES.STORE,
  store_keeper: INVENTORY_ROLES.STORE,
  inventory_manager: INVENTORY_ROLES.STORE,
  technician: INVENTORY_ROLES.STORE,
  maintenance_technician: INVENTORY_ROLES.STORE,

  supervisor: INVENTORY_ROLES.SUPERVISOR,
  maintenance_supervisor: INVENTORY_ROLES.SUPERVISOR,
  shift_supervisor: INVENTORY_ROLES.SUPERVISOR,
  engineer: INVENTORY_ROLES.SUPERVISOR,
  maintenance_engineer: INVENTORY_ROLES.SUPERVISOR,
  reliability_engineer: INVENTORY_ROLES.SUPERVISOR,

  finance: INVENTORY_ROLES.FINANCE,
  accounts: INVENTORY_ROLES.FINANCE,
  accountant: INVENTORY_ROLES.FINANCE,
  cfo: INVENTORY_ROLES.FINANCE,
  owner: INVENTORY_ROLES.FINANCE,
  admin: INVENTORY_ROLES.FINANCE,
  plant_manager: INVENTORY_ROLES.FINANCE,
  maintenance_head: INVENTORY_ROLES.FINANCE,
});

export function resolveInventoryRole(role) {
  const key = String(role || '').toLowerCase().trim();
  return ROLE_VIEW_MAP[key] || DEFAULT_INVENTORY_ROLE;
}

/* -----------------------------------------------------------
   Item normalisation
   ----------------------------------------------------------- */

export const STOCK_STATUS = Object.freeze({
  CRITICAL: 'critical',
  AT_RISK: 'at_risk',
  HEALTHY: 'healthy',
  OVERSTOCKED: 'overstocked',
  OBSOLETE: 'obsolete',
});

export const STOCK_STATUS_META = Object.freeze({
  [STOCK_STATUS.CRITICAL]: { label: 'Critical', tone: 'danger', colour: 'red' },
  [STOCK_STATUS.AT_RISK]: { label: 'At risk', tone: 'warning', colour: 'yellow' },
  [STOCK_STATUS.HEALTHY]: { label: 'Healthy', tone: 'ok', colour: 'green' },
  [STOCK_STATUS.OVERSTOCKED]: { label: 'Overstocked', tone: 'info', colour: 'blue' },
  [STOCK_STATUS.OBSOLETE]: { label: 'Obsolete', tone: 'muted', colour: 'gray' },
});

const PRIORITY_WEIGHT = Object.freeze({ critical: 50, high: 35, medium: 20, low: 10 });

function toDate(now) {
  return now instanceof Date ? now : new Date(now || Date.now());
}

/** Normalise the many spellings of priority that reach us from imports. */
export function normalizePriority(value) {
  const key = String(value || '').toLowerCase().trim();
  if (key.startsWith('crit') || key === 'a' || key === 'p1') return 'critical';
  if (key.startsWith('high') || key === 'b' || key === 'p2') return 'high';
  if (key.startsWith('med') || key === 'c' || key === 'p3') return 'medium';
  if (key.startsWith('low') || key === 'd' || key === 'p4') return 'low';
  return 'medium';
}

/** Whole days between `iso` and `now`; null when the date is missing/unparseable. */
export function daysSince(iso, now = new Date()) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((toDate(now).getTime() - then) / MS_PER_DAY));
}

/**
 * How urgent this item is *before* looking at how much is on the shelf.
 *
 * Three things make a spare part scary: the machine it protects, how
 * long it takes to replace, and how much it costs to hold. A ₹550 belt
 * for a compressor and a ₹28,000 PLC module for a welding cell are not
 * the same risk even when both are down to one unit.
 */
export function partCriticality(item) {
  const priority = normalizePriority(item?.machine_priority);
  const lead = asNumber(item?.lead_time_days);
  const cost = asNumber(item?.unit_cost);

  const machineWeight = PRIORITY_WEIGHT[priority] ?? PRIORITY_WEIGHT.medium;
  const leadWeight = lead >= 30 ? 30 : lead >= 21 ? 24 : lead >= LONG_LEAD_DAYS ? 18 : lead >= 7 ? 10 : 4;
  const costWeight = cost >= 20_000 ? 20 : cost >= 10_000 ? 14 : cost >= 3_000 ? 8 : 3;

  const score = machineWeight + leadWeight + costWeight;
  const level = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';

  const reasons = [];
  if (priority === 'critical') reasons.push('Protects a critical machine');
  if (lead >= LONG_LEAD_DAYS) reasons.push(`${lead}-day lead time`);
  if (cost >= 10_000) reasons.push('High unit cost');

  return { level, score, priority, reasons };
}

/**
 * One inventory row, enriched with everything all three boards need.
 * Every board reads this shape; none of them recompute availability,
 * cover or status on their own.
 */
export function normalizeItem(item, { type = 'part', now = new Date() } = {}) {
  const reference = toDate(now);
  const stock = asNumber(item?.stock_qty);
  const reserved = asNumber(item?.reserved_qty);
  const available = stock - reserved;
  const reorder = asNumber(item?.reorder_level);
  const unitCost = asNumber(item?.unit_cost);
  const leadTimeDays = asNumber(item?.lead_time_days);
  const monthlyUsage = asNumber(item?.monthly_usage);

  // Nobody sets a max level by hand, so infer one: four reorder-levels of
  // cover is comfortably more than any reorder cycle needs.
  const maxLevel = asNumber(item?.max_level) || (reorder > 0 ? reorder * 4 : 0);

  // The band between "order now" and "comfortable" — half a reorder level
  // wide, minimum one unit, so a reorder level of 2 still has a warning zone.
  const safetyBand = reorder > 0 ? reorder + Math.max(1, Math.ceil(reorder * 0.5)) : 0;

  const dailyUsage = monthlyUsage > 0 ? monthlyUsage / 30 : 0;
  const daysOfSupply = dailyUsage > 0 ? round1(Math.max(0, available) / dailyUsage) : null;

  const daysSinceLastUse = daysSince(item?.last_used_date, reference);
  const obsolete = daysSinceLastUse != null && daysSinceLastUse >= OBSOLETE_AFTER_DAYS;

  const criticality = partCriticality(item);
  const stockValue = Math.max(0, stock) * unitCost;

  const status = classifyStock({
    available, reorder, safetyBand, maxLevel, obsolete, daysOfSupply, criticality,
  });

  return {
    id: item?.id ?? item?.part_number ?? item?.name,
    name: item?.name || 'Unnamed item',
    partNumber: item?.part_number || '',
    machine: item?.associated_machine || 'Unassigned',
    machinePriority: criticality.priority,
    itemType: item?.item_type || (type === 'consumable' ? 'Consumable' : 'Part'),
    supplier: item?.supplier || 'Unassigned supplier',
    location: item?.location || '',
    binSection: binSectionOf(item?.location),
    note: item?.store_manager_note || '',
    autoOrder: Boolean(item?.auto_order),

    stock,
    reserved,
    available,
    reorder,
    safetyBand,
    maxLevel,
    unitCost,
    leadTimeDays,
    monthlyUsage,
    daysOfSupply,
    daysSinceLastUse,
    lastUsedDate: item?.last_used_date || null,

    stockValue,
    obsolete,
    criticality: criticality.level,
    criticalityScore: criticality.score,
    criticalityReasons: criticality.reasons,
    status,
    statusMeta: STOCK_STATUS_META[status],
  };
}

/**
 * Red / yellow / green / blue / gray, in strict precedence order.
 *
 * Ordering matters more than the individual rules: an item that is both
 * below its reorder level *and* has not moved in a year is a stockout
 * first and dead capital second — the store manager still has to answer
 * for it today. Overstock is checked before the at-risk band so a large
 * cushion never reads as a warning.
 */
export function classifyStock({
  available, reorder, safetyBand, maxLevel, obsolete, daysOfSupply, criticality,
}) {
  if (available <= 0) return STOCK_STATUS.CRITICAL;
  if (reorder > 0 && available < reorder) return STOCK_STATUS.CRITICAL;
  if (obsolete) return STOCK_STATUS.OBSOLETE;
  if (maxLevel > 0 && available > maxLevel) return STOCK_STATUS.OVERSTOCKED;
  if (safetyBand > 0 && available <= safetyBand) return STOCK_STATUS.AT_RISK;
  if (
    criticality?.priority === 'critical'
    && daysOfSupply != null
    && daysOfSupply < CRITICAL_COVER_DAYS
  ) return STOCK_STATUS.AT_RISK;
  return STOCK_STATUS.HEALTHY;
}

/** "Bin A-04 (High Security)" → "A". Anything unparseable lands in "Unzoned". */
export function binSectionOf(location) {
  const match = String(location || '').match(/\b([A-Z])[\s-]?\d/i);
  return match ? match[1].toUpperCase() : 'Unzoned';
}

/** Parts + consumables as one normalised list — the input to every metric below. */
export function buildInventoryItems({ parts = [], consumables = [] } = {}, now = new Date()) {
  const reference = toDate(now);
  return [
    ...asArray(parts).map((part) => normalizeItem(part, { type: 'part', now: reference })),
    ...asArray(consumables).map((item) => normalizeItem(item, { type: 'consumable', now: reference })),
  ];
}

/* -----------------------------------------------------------
   Stock health
   ----------------------------------------------------------- */

/** Counts and rupee value per status — the four-tile KPI row. */
export function stockHealthSummary(items) {
  const rows = asArray(items);
  const empty = () => ({ count: 0, value: 0 });
  const byStatus = {
    [STOCK_STATUS.CRITICAL]: empty(),
    [STOCK_STATUS.AT_RISK]: empty(),
    [STOCK_STATUS.HEALTHY]: empty(),
    [STOCK_STATUS.OVERSTOCKED]: empty(),
    [STOCK_STATUS.OBSOLETE]: empty(),
  };

  rows.forEach((item) => {
    const bucket = byStatus[item.status] || byStatus[STOCK_STATUS.HEALTHY];
    bucket.count += 1;
    bucket.value += item.stockValue;
  });

  return {
    total: rows.length,
    totalValue: rows.reduce((sum, item) => sum + item.stockValue, 0),
    byStatus,
    critical: byStatus[STOCK_STATUS.CRITICAL].count,
    atRisk: byStatus[STOCK_STATUS.AT_RISK].count,
    healthy: byStatus[STOCK_STATUS.HEALTHY].count,
    overstocked: byStatus[STOCK_STATUS.OVERSTOCKED].count,
    obsolete: byStatus[STOCK_STATUS.OBSOLETE].count,
  };
}

/**
 * How much to order, what it costs, and when it lands.
 *
 * Target is two reorder levels — one to clear the shortage and one to
 * cover the next cycle — capped at the max level so a reorder never
 * creates the overstock the same board is trying to eliminate.
 */
export function reorderSuggestion(item, now = new Date()) {
  const reorder = asNumber(item?.reorder);
  const available = asNumber(item?.available);
  const maxLevel = asNumber(item?.maxLevel);

  const rawTarget = reorder > 0 ? reorder * 2 : Math.max(1, available + 1);
  const target = maxLevel > 0 ? Math.min(maxLevel, Math.max(rawTarget, reorder)) : rawTarget;
  const qty = Math.max(1, Math.ceil(target - available));
  const cost = qty * asNumber(item?.unitCost);

  const lead = asNumber(item?.leadTimeDays);
  const eta = new Date(toDate(now).getTime() + lead * MS_PER_DAY);

  return { qty, cost, leadTimeDays: lead, etaIso: eta.toISOString(), eta };
}

/**
 * Everything that needs a purchase order today, worst first.
 * Sorted by status (critical before at-risk), then by criticality score,
 * so a ₹28k long-lead PLC module outranks a ₹550 belt at the same status.
 */
export function reorderQueue(items, { now = new Date(), limit = null } = {}) {
  const reference = toDate(now);
  const statusRank = { [STOCK_STATUS.CRITICAL]: 0, [STOCK_STATUS.AT_RISK]: 1 };

  const rows = asArray(items)
    .filter((item) => item.status === STOCK_STATUS.CRITICAL || item.status === STOCK_STATUS.AT_RISK)
    .map((item) => ({ ...item, suggestion: reorderSuggestion(item, reference) }))
    .sort((a, b) => (statusRank[a.status] - statusRank[b.status])
      || (b.criticalityScore - a.criticalityScore)
      || (b.suggestion.cost - a.suggestion.cost));

  return limit ? rows.slice(0, limit) : rows;
}

/** Items whose cover runs out inside `withinDays` — the stockout banner. */
export function stockoutRisks(items, { withinDays = CRITICAL_COVER_DAYS } = {}) {
  return asArray(items)
    .filter((item) => {
      if (item.available <= 0) return true;
      if (item.daysOfSupply == null) return false;
      return item.daysOfSupply <= withinDays;
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      partNumber: item.partNumber,
      machine: item.machine,
      available: item.available,
      daysLeft: item.available <= 0 ? 0 : item.daysOfSupply,
      leadTimeDays: item.leadTimeDays,
      criticality: item.criticality,
      // A part that runs out before its replacement can arrive is already
      // late — that gap is the number a supervisor actually reacts to.
      shortfallDays: Math.max(
        0,
        Math.round(item.leadTimeDays - (item.available <= 0 ? 0 : item.daysOfSupply ?? 0)),
      ),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft || b.shortfallDays - a.shortfallDays);
}

/* -----------------------------------------------------------
   Grouping — machines, bins, suppliers
   ----------------------------------------------------------- */

/** Items grouped by the machine they protect, worst status first. */
export function groupByMachine(items) {
  const map = new Map();
  asArray(items).forEach((item) => {
    if (!map.has(item.machine)) {
      map.set(item.machine, {
        machine: item.machine, priority: item.machinePriority, items: [], value: 0, critical: 0,
      });
    }
    const group = map.get(item.machine);
    group.items.push(item);
    group.value += item.stockValue;
    if (item.status === STOCK_STATUS.CRITICAL) group.critical += 1;
  });
  return [...map.values()].sort((a, b) => b.critical - a.critical || b.value - a.value);
}

/** Warehouse zones (A, B, C…) with what is stored in each. */
export function binMap(items) {
  const map = new Map();
  asArray(items).forEach((item) => {
    const section = item.binSection || 'Unzoned';
    if (!map.has(section)) {
      map.set(section, { section, items: [], value: 0, critical: 0 });
    }
    const bin = map.get(section);
    bin.items.push(item);
    bin.value += item.stockValue;
    if (item.status === STOCK_STATUS.CRITICAL) bin.critical += 1;
  });
  return [...map.values()].sort((a, b) => a.section.localeCompare(b.section));
}

/**
 * Supplier roll-up: what they hold for us, and how they perform.
 * Reliability blends on-time delivery with responsiveness, because a
 * vendor who always delivers late but answers the phone is not reliable.
 */
export function supplierNetwork(items, suppliers = []) {
  const directory = new Map(
    asArray(suppliers).map((supplier) => [
      String(supplier?.supplier_name || supplier?.name || '').toLowerCase(),
      supplier,
    ]),
  );

  const map = new Map();
  asArray(items).forEach((item) => {
    const key = item.supplier;
    if (!map.has(key)) {
      const record = directory.get(String(key).toLowerCase()) || {};
      const onTime = record.on_time_delivery_pct == null ? null : asNumber(record.on_time_delivery_pct);
      const responseDays = record.response_time_days == null ? null : asNumber(record.response_time_days);

      map.set(key, {
        name: key,
        contact: record.contact || record.phone || '',
        email: record.email || '',
        onTimePct: onTime,
        responseTimeDays: responseDays,
        leadTimeAvg: record.lead_time_avg == null ? null : asNumber(record.lead_time_avg),
        items: [],
        value: 0,
        criticalItems: 0,
      });
    }
    const supplier = map.get(key);
    supplier.items.push(item);
    supplier.value += item.stockValue;
    if (item.status === STOCK_STATUS.CRITICAL) supplier.criticalItems += 1;
  });

  return [...map.values()]
    .map((supplier) => {
      const leads = supplier.items.map((item) => item.leadTimeDays).filter((days) => days > 0);
      const observedLead = leads.length
        ? round1(leads.reduce((sum, days) => sum + days, 0) / leads.length)
        : null;
      const leadTimeAvg = supplier.leadTimeAvg ?? observedLead;

      // Blended 0–100. Missing signals fall back to the other one rather
      // than scoring the supplier as if it had failed.
      const onTimeScore = supplier.onTimePct;
      const responseScore = supplier.responseTimeDays == null
        ? null
        : Math.max(0, 100 - supplier.responseTimeDays * 20);
      const parts = [onTimeScore, responseScore].filter((score) => score != null);
      const reliability = parts.length
        ? Math.round(parts.reduce((sum, score) => sum + score, 0) / parts.length)
        : null;

      return {
        ...supplier,
        itemCount: supplier.items.length,
        leadTimeAvg,
        observedLead,
        reliability,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * The same part quoted by more than one vendor.
 * Matched on part number when there is one, otherwise on the normalised
 * name — an import without part numbers should still surface duplicates.
 */
export function supplierCostComparison(items) {
  const map = new Map();
  asArray(items).forEach((item) => {
    const key = (item.partNumber || item.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });

  return [...map.entries()]
    .map(([key, group]) => {
      const vendors = new Map();
      group.forEach((item) => {
        if (!vendors.has(item.supplier)) vendors.set(item.supplier, item);
      });
      if (vendors.size < 2) return null;

      const options = [...vendors.values()]
        .map((item) => ({
          supplier: item.supplier,
          unitCost: item.unitCost,
          leadTimeDays: item.leadTimeDays,
        }))
        .sort((a, b) => a.unitCost - b.unitCost);

      const cheapest = options[0];
      const dearest = options[options.length - 1];
      const fastest = [...options].sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0];
      const usage = group.reduce((sum, item) => sum + asNumber(item.monthlyUsage), 0);

      return {
        key,
        name: group[0].name,
        partNumber: group[0].partNumber,
        options,
        cheapest,
        fastest,
        // Annualised: what consolidating onto the cheapest vendor saves.
        savingPerUnit: dearest.unitCost - cheapest.unitCost,
        annualSaving: Math.round((dearest.unitCost - cheapest.unitCost) * usage * 12),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.annualSaving - a.annualSaving);
}

/* -----------------------------------------------------------
   Purchase orders
   ----------------------------------------------------------- */

export const PO_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  ORDERED: 'ordered',
  RECEIVED: 'received',
  REJECTED: 'rejected',
});

export function normalizePoStatus(status) {
  const key = String(status || '').toLowerCase().trim();
  if (key === 'awaiting_approval' || key === 'draft' || key === 'requested') return PO_STATUS.PENDING;
  if (key === 'complete' || key === 'delivered' || key === 'closed') return PO_STATUS.RECEIVED;
  if (key === 'cancelled' || key === 'declined') return PO_STATUS.REJECTED;
  return Object.values(PO_STATUS).includes(key) ? key : PO_STATUS.PENDING;
}

/** A PO row with the derived fields the approval queue sorts on. */
export function normalizePo(po, { now = new Date() } = {}) {
  const reference = toDate(now);
  const items = asArray(po?.items);
  const total = asNumber(po?.total_amount)
    || items.reduce((sum, line) => sum + asNumber(line?.qty) * asNumber(line?.unit_cost), 0);

  const expected = po?.expected_delivery_date ? new Date(po.expected_delivery_date) : null;
  const daysToDelivery = expected && Number.isFinite(expected.getTime())
    ? Math.round((expected.getTime() - reference.getTime()) / MS_PER_DAY)
    : null;

  const blocks = items
    .map((line) => line?.machine)
    .filter(Boolean);

  return {
    id: po?.id ?? po?.po_number,
    poNumber: po?.po_number || (po?.id ? `PO-${String(po.id).slice(0, 8)}` : 'PO-—'),
    vendor: po?.vendor || po?.vendor_id || 'Unassigned vendor',
    items,
    itemCount: items.length,
    total,
    status: normalizePoStatus(po?.status),
    requestedBy: po?.requested_by || 'Stores',
    createdDate: po?.created_date || po?.created_at || null,
    ageDays: daysSince(po?.created_date || po?.created_at, reference),
    expectedDelivery: po?.expected_delivery_date || null,
    daysToDelivery,
    priority: normalizePriority(po?.priority),
    unblocks: [...new Set(blocks)],
  };
}

export function normalizePos(purchaseOrders, { now = new Date() } = {}) {
  const reference = toDate(now);
  return asArray(purchaseOrders).map((po) => normalizePo(po, { now: reference }));
}

/**
 * Spend position: what is waiting on a signature, what is already
 * committed, and how big the pending decision is.
 *
 * "Committed" deliberately includes `ordered` but not `received` —
 * money is gone the moment the PO is placed, not when it arrives.
 */
export function poSummary(pos) {
  const rows = asArray(pos);
  const pending = rows.filter((po) => po.status === PO_STATUS.PENDING);
  const committed = rows.filter(
    (po) => po.status === PO_STATUS.APPROVED || po.status === PO_STATUS.ORDERED,
  );
  const received = rows.filter((po) => po.status === PO_STATUS.RECEIVED);

  const sum = (list) => list.reduce((total, po) => total + po.total, 0);

  return {
    openCount: pending.length,
    openValue: sum(pending),
    committedCount: committed.length,
    committedValue: sum(committed),
    receivedCount: received.length,
    receivedValue: sum(received),
    pending,
    committed,
    received,
  };
}

/**
 * The approval queue, ordered the way a supervisor should work it:
 * critical machines first, then the oldest request, then the biggest
 * number. Age breaks ties before value so a small PO is never starved.
 */
export function poApprovalQueue(pos) {
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  return asArray(pos)
    .filter((po) => po.status === PO_STATUS.PENDING)
    .slice()
    .sort((a, b) => (priorityRank[a.priority] - priorityRank[b.priority])
      || ((b.ageDays ?? 0) - (a.ageDays ?? 0))
      || (b.total - a.total));
}

/** PO spend per day for the last `days` days, against a daily budget. */
export function weeklySpend(pos, { now = new Date(), days = 7, budget = DEFAULT_WEEKLY_PO_BUDGET } = {}) {
  const reference = toDate(now);
  const dailyBudget = budget / days;

  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(reference.getTime() - (days - 1 - index) * MS_PER_DAY);
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: 0,
      budget: Math.round(dailyBudget),
    };
  });
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  asArray(pos).forEach((po) => {
    if (po.status === PO_STATUS.REJECTED) return;
    const key = String(po.createdDate || '').slice(0, 10);
    const bucket = index.get(key);
    if (bucket) bucket.value += po.total;
  });

  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  return {
    days: buckets,
    total,
    budget,
    overBudget: total > budget,
    variance: total - budget,
    variancePct: budget > 0 ? Math.round(((total - budget) / budget) * 100) : null,
  };
}

/* -----------------------------------------------------------
   Financial metrics
   ----------------------------------------------------------- */

/** Stock at cost. The number every other financial metric divides by. */
export function inventoryValue(items) {
  return asArray(items).reduce((sum, item) => sum + item.stockValue, 0);
}

/** Annual cost of simply owning the stock: interest + storage. */
export function carryingCost(value, { rate = CARRYING_RATE } = {}) {
  return Math.round(asNumber(value) * rate);
}

/** Value split by criticality band — the composition donut. */
export function valueByCriticality(items) {
  const rows = asArray(items);
  const buckets = { critical: 0, high: 0, medium: 0, low: 0 };
  const members = { critical: [], high: [], medium: [], low: [] };

  rows.forEach((item) => {
    const key = buckets[item.criticality] == null ? 'medium' : item.criticality;
    buckets[key] += item.stockValue;
    members[key].push(item);
  });

  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  return ['critical', 'high', 'medium', 'low'].map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: buckets[key],
    pct: total > 0 ? round1((buckets[key] / total) * 100) : 0,
    items: members[key],
  }));
}

/**
 * Monthly spare-parts ROI, read as a turn rate: the value consumed this
 * month over the value sitting on the shelf. 8% means the store turns
 * over roughly once a year — low turn is capital doing nothing.
 *
 * Returns null rather than 0 when there is no stock to divide by.
 */
export function sparePartsRoi(items) {
  const rows = asArray(items);
  const value = inventoryValue(rows);
  if (value <= 0) return { pct: null, usageValue: 0, inventoryValue: 0, turnsPerYear: null };

  const usageValue = rows.reduce(
    (sum, item) => sum + asNumber(item.monthlyUsage) * item.unitCost,
    0,
  );
  const pct = round1((usageValue / value) * 100);

  return {
    pct,
    usageValue: Math.round(usageValue),
    inventoryValue: value,
    turnsPerYear: round1((usageValue * 12) / value),
  };
}

/** Capital tied up in items nothing has consumed in 180+ days. */
export function obsolescenceRisk(items, { thresholdDays = OBSOLETE_AFTER_DAYS } = {}) {
  const rows = asArray(items).filter(
    (item) => item.daysSinceLastUse != null && item.daysSinceLastUse >= thresholdDays,
  );
  return {
    count: rows.length,
    value: rows.reduce((sum, item) => sum + item.stockValue, 0),
    items: rows.slice().sort((a, b) => b.stockValue - a.stockValue),
  };
}

/** Green / amber / red usage bands for the parts-analytics table. */
export function usageBand(daysSinceLastUse) {
  if (daysSinceLastUse == null) return 'never';
  if (daysSinceLastUse <= ACTIVE_WITHIN_DAYS) return 'active';
  if (daysSinceLastUse < OBSOLETE_AFTER_DAYS) return 'slow';
  return 'obsolete';
}

/** Every item with its usage band and a disposal recommendation. */
export function usageAnalytics(items) {
  return asArray(items)
    .map((item) => {
      const band = usageBand(item.daysSinceLastUse);
      return {
        ...item,
        usageBand: band,
        recommendDisposal: band === 'obsolete' && item.criticality !== 'critical',
        recoverableValue: band === 'obsolete' ? item.stockValue : 0,
      };
    })
    .sort((a, b) => (b.daysSinceLastUse ?? Number.MAX_SAFE_INTEGER)
      - (a.daysSinceLastUse ?? Number.MAX_SAFE_INTEGER));
}

/**
 * Three concrete ways to release cash, largest first.
 *
 * Deliberately conservative: obsolete critical spares are excluded from
 * the disposal figure (you do not scrap the insurance policy for a
 * ₹40L machine because it sat unused), and the JIT figure only counts
 * stock above the max level, not everything above reorder.
 */
export function savingsOpportunities(items, { now = new Date() } = {}) {
  const rows = asArray(items);
  const reference = toDate(now);

  const disposal = usageAnalytics(rows).filter((item) => item.recommendDisposal);
  const disposalValue = disposal.reduce((sum, item) => sum + item.stockValue, 0);

  const overstocked = rows.filter((item) => item.status === STOCK_STATUS.OVERSTOCKED);
  const jitValue = overstocked.reduce(
    (sum, item) => sum + Math.max(0, item.available - item.maxLevel) * item.unitCost,
    0,
  );

  const duplicates = supplierCostComparison(rows);
  const consolidationValue = duplicates.reduce((sum, row) => sum + row.annualSaving, 0);

  const opportunities = [
    {
      key: 'obsolete',
      title: 'Remove obsolete stock',
      value: Math.round(disposalValue),
      detail: `${disposal.length} item${disposal.length === 1 ? '' : 's'} unused for ${OBSOLETE_AFTER_DAYS}+ days`,
      items: disposal,
    },
    {
      key: 'jit',
      title: 'Just-in-time ordering',
      value: Math.round(jitValue),
      detail: `${overstocked.length} item${overstocked.length === 1 ? '' : 's'} held above max level`,
      items: overstocked,
    },
    {
      key: 'consolidation',
      title: 'Supplier consolidation',
      value: Math.round(consolidationValue),
      detail: `${duplicates.length} part${duplicates.length === 1 ? '' : 's'} sourced from more than one vendor`,
      items: duplicates,
    },
  ].sort((a, b) => b.value - a.value);

  return {
    opportunities,
    total: opportunities.reduce((sum, row) => sum + row.value, 0),
    generatedAt: reference.toISOString(),
  };
}

/**
 * Twelve months of inventory value and PO spend.
 *
 * Only PO spend is real history — we do not keep monthly stock
 * snapshots, so the value line is reconstructed backwards from today's
 * value net of each month's receipts. It is explicitly an estimate and
 * the chart labels it as one.
 */
export function costTrends(items, pos, { now = new Date(), months = 12 } = {}) {
  const reference = toDate(now);
  const currentValue = inventoryValue(items);

  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth() - (months - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      spend: 0,
      value: 0,
      carrying: 0,
    };
  });
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  asArray(pos).forEach((po) => {
    if (po.status === PO_STATUS.REJECTED) return;
    const key = String(po.createdDate || '').slice(0, 7);
    const bucket = index.get(key);
    if (bucket) bucket.spend += po.total;
  });

  // Walk backwards from today: last month's value is this month's value
  // minus what we bought this month. Floored at 0 so a heavy month never
  // renders a negative stock level.
  let running = currentValue;
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    buckets[i].value = Math.round(Math.max(0, running));
    buckets[i].carrying = Math.round((buckets[i].value * CARRYING_RATE) / 12);
    running -= buckets[i].spend;
  }

  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const totalSpend = buckets.reduce((sum, bucket) => sum + bucket.spend, 0);

  return {
    months: buckets,
    totalSpend,
    valueChangePct: first.value > 0
      ? Math.round(((last.value - first.value) / first.value) * 100)
      : null,
    estimated: true,
  };
}

/* -----------------------------------------------------------
   Alerts
   ----------------------------------------------------------- */

/**
 * The three sentences that matter, in the order a human would say them.
 * Critical first (a machine is about to stop), then warnings (it will
 * stop soon), then opportunities (you are holding too much).
 */
export function inventoryAlerts(items, { limit = 6 } = {}) {
  const alerts = [];

  asArray(items).forEach((item) => {
    if (item.status === STOCK_STATUS.CRITICAL) {
      const zero = item.available <= 0;
      alerts.push({
        id: `critical-${item.id}`,
        level: 'critical',
        itemId: item.id,
        title: `${item.name}${item.partNumber ? ` (${item.partNumber})` : ''}`,
        message: zero
          ? `stock = 0, lead time ${item.leadTimeDays} days. Order immediately.`
          : `${item.available} left against a reorder level of ${item.reorder}. Order now.`,
        weight: 1000 + item.criticalityScore,
      });
      return;
    }

    if (item.status === STOCK_STATUS.AT_RISK) {
      alerts.push({
        id: `warning-${item.id}`,
        level: 'warning',
        itemId: item.id,
        title: `${item.name}${item.partNumber ? ` (${item.partNumber})` : ''}`,
        message: `at reorder point. Supplier has a ${item.leadTimeDays}-day lead time.`,
        weight: 500 + item.criticalityScore,
      });
      return;
    }

    if (item.status === STOCK_STATUS.OVERSTOCKED && item.monthlyUsage > 0) {
      const target = Math.max(item.reorder, Math.ceil(item.monthlyUsage * 2));
      alerts.push({
        id: `opportunity-${item.id}`,
        level: 'opportunity',
        itemId: item.id,
        title: item.name,
        message: `used ${item.monthlyUsage}× last month, ${item.available} in stock. Consider reducing to ${target}.`,
        weight: 100 + Math.round(item.stockValue / 1000),
      });
    }
  });

  return alerts.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

/* -----------------------------------------------------------
   Filtering — shared by all three boards
   ----------------------------------------------------------- */

/**
 * One filter function for every board, so "Critical" means the same
 * thing on the store board and the finance table.
 */
export function filterItems(items, {
  search = '', status = 'all', criticality = 'all', supplier = 'all', machine = 'all',
} = {}) {
  const needle = String(search || '').toLowerCase().trim();

  return asArray(items).filter((item) => {
    if (needle) {
      const haystack = `${item.name} ${item.partNumber} ${item.machine} ${item.supplier}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (status !== 'all' && item.status !== status) return false;
    if (criticality !== 'all' && item.criticality !== criticality) return false;
    if (supplier !== 'all' && item.supplier !== supplier) return false;
    if (machine !== 'all' && item.machine !== machine) return false;
    return true;
  });
}

/* -----------------------------------------------------------
   Role assembly
   ----------------------------------------------------------- */

/**
 * Everything one role's board needs, in a single pass over the data.
 *
 * Each role gets only its own numbers — the finance board never pays to
 * compute the reorder queue, and the store board never walks 12 months
 * of PO history.
 */
export function buildInventoryMetrics(role, input = {}) {
  const now = toDate(input.now);
  const items = input.items || buildInventoryItems(input, now);
  const pos = input.pos || normalizePos(input.purchaseOrders, { now });
  // Idempotent: the three board keys are themselves valid role strings,
  // so callers may pass either a raw app role or an already-resolved one.
  const resolved = resolveInventoryRole(role);

  const shared = {
    items,
    pos,
    health: stockHealthSummary(items),
    alerts: inventoryAlerts(items),
    machines: groupByMachine(items),
  };

  if (resolved === INVENTORY_ROLES.SUPERVISOR) {
    const summary = poSummary(pos);
    const risks = stockoutRisks(items);
    return {
      ...shared,
      role: resolved,
      poSummary: summary,
      approvalQueue: poApprovalQueue(pos),
      stockoutRisks: risks,
      inventoryValue: inventoryValue(items),
      weeklySpend: weeklySpend(pos, { now }),
      suppliers: supplierNetwork(items, input.suppliers),
      autoOrderCandidates: reorderQueue(items, { now, limit: 5 }),
    };
  }

  if (resolved === INVENTORY_ROLES.FINANCE) {
    const value = inventoryValue(items);
    return {
      ...shared,
      role: resolved,
      inventoryValue: value,
      carryingCost: carryingCost(value),
      roi: sparePartsRoi(items),
      obsolescence: obsolescenceRisk(items),
      composition: valueByCriticality(items),
      trends: costTrends(items, pos, { now }),
      savings: savingsOpportunities(items, { now }),
      usage: usageAnalytics(items),
      costComparison: supplierCostComparison(items),
    };
  }

  return {
    ...shared,
    role: INVENTORY_ROLES.STORE,
    reorderQueue: reorderQueue(items, { now }),
    suppliers: supplierNetwork(items, input.suppliers),
    bins: binMap(items),
    inventoryValue: inventoryValue(items),
  };
}
