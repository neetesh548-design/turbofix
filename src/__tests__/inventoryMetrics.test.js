/* ===========================================================
   inventoryMetrics — unit tests
   ===========================================================

   Every number on the three inventory boards is derived here, so these
   tests are the contract for what the store manager, the supervisor and
   finance actually see.

   Two rules the suite holds the module to:

     1. "No data" is null, never 0. An item nobody has ever issued has
        daysSinceLastUse === null; that is not the same fact as "issued
        today", and a board that renders 0 for both is lying.
     2. The clock is always injected. Nothing below reads Date.now(), so
        a test that passes in July still passes in December.

   Fixtures use one frozen NOW and express every date as `daysAgo(n)`,
   so the shelf ages consistently no matter when the suite runs.
   =========================================================== */

import { describe, it, expect } from 'vitest';
import {
  // constants
  INTEREST_RATE,
  STORAGE_RATE,
  CARRYING_RATE,
  OBSOLETE_AFTER_DAYS,
  ACTIVE_WITHIN_DAYS,
  CRITICAL_COVER_DAYS,
  LONG_LEAD_DAYS,
  DEFAULT_WEEKLY_PO_BUDGET,
  INVENTORY_ROLES,
  DEFAULT_INVENTORY_ROLE,
  STOCK_STATUS,
  STOCK_STATUS_META,
  PO_STATUS,
  MS_PER_DAY,
  // role
  resolveInventoryRole,
  // item normalisation
  normalizePriority,
  daysSince,
  partCriticality,
  binSectionOf,
  classifyStock,
  normalizeItem,
  buildInventoryItems,
  // stock health
  stockHealthSummary,
  reorderSuggestion,
  reorderQueue,
  stockoutRisks,
  // grouping
  groupByMachine,
  binMap,
  supplierNetwork,
  supplierCostComparison,
  // purchase orders
  normalizePoStatus,
  normalizePo,
  normalizePos,
  poSummary,
  poApprovalQueue,
  weeklySpend,
  // finance
  inventoryValue,
  carryingCost,
  valueByCriticality,
  sparePartsRoi,
  obsolescenceRisk,
  usageBand,
  usageAnalytics,
  savingsOpportunities,
  costTrends,
  // alerts + filtering
  inventoryAlerts,
  filterItems,
  // assembly
  buildInventoryMetrics,
  createInventoryCache,
  // re-exported edge helpers
  asArray,
  asNumber,
  round1,
  formatInr,
  formatInrCompact,
  formatPct,
  readStoredUser,
} from '../utils/inventoryMetrics.js';

/* -----------------------------------------------------------
   Fixtures
   ----------------------------------------------------------- */

const NOW = new Date('2026-07-26T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * MS_PER_DAY).toISOString();
const daysAhead = (n) => new Date(NOW.getTime() + n * MS_PER_DAY).toISOString();

/** A shelf row with sane defaults; every test overrides only what it means to. */
function makePart(overrides = {}) {
  return {
    id: 'p-default',
    name: 'Generic Part',
    part_number: 'PN-DEF',
    associated_machine: 'CNC-01',
    machine_priority: 'medium',
    supplier: 'Acme',
    location: 'Bin A-01',
    stock_qty: 10,
    reserved_qty: 0,
    reorder_level: 5,
    unit_cost: 1000,
    lead_time_days: 7,
    monthly_usage: 3,
    last_used_date: daysAgo(5),
    ...overrides,
  };
}

const one = (overrides) => normalizeItem(makePart(overrides), { now: NOW });

/**
 * A six-row shelf that covers all five stock statuses exactly once
 * (critical twice — zero stock and below-reorder are different stories).
 *
 *   crit-zero  Spindle Bearing  0 on hand              → critical, ₹0
 *   crit-low   PLC Module       3 against a reorder 10 → critical, ₹36,000
 *   risk       Drive Belt       inside the safety band → at risk,  ₹21,000
 *   healthy    Hydraulic Seal   comfortable            → healthy,  ₹30,000
 *   over       Cotton Rag       above max level        → over,     ₹10,000
 *   dead       Legacy Coupling  unused 300 days        → obsolete, ₹20,000
 *                                             total value ₹117,000
 */
const SHELF_PARTS = [
  makePart({
    id: 'crit-zero',
    name: 'Spindle Bearing',
    part_number: 'PN-SB1',
    associated_machine: 'CNC-01',
    machine_priority: 'critical',
    supplier: 'PrecisionCo',
    location: 'Bin A-04',
    stock_qty: 0,
    reorder_level: 2,
    unit_cost: 28000,
    lead_time_days: 30,
    monthly_usage: 1,
    last_used_date: daysAgo(10),
  }),
  makePart({
    id: 'crit-low',
    name: 'PLC Module',
    part_number: 'PN-PLC',
    associated_machine: 'WELD-02',
    machine_priority: 'critical',
    supplier: 'AutoParts',
    location: 'Bin B-02',
    stock_qty: 3,
    reorder_level: 10,
    unit_cost: 12000,
    lead_time_days: 21,
    monthly_usage: 1,
    last_used_date: daysAgo(3),
  }),
  makePart({
    id: 'risk',
    name: 'Drive Belt',
    part_number: 'PN-BLT',
    associated_machine: 'CNC-01',
    machine_priority: 'high',
    supplier: 'BeltWorks',
    location: 'Bin A-07',
    stock_qty: 7,
    reorder_level: 5,
    unit_cost: 3000,
    lead_time_days: 14,
    monthly_usage: 6,
    last_used_date: daysAgo(2),
  }),
  makePart({
    id: 'healthy',
    name: 'Hydraulic Seal',
    part_number: 'PN-SEAL',
    associated_machine: 'PRESS-03',
    machine_priority: 'medium',
    supplier: 'AutoParts',
    location: 'Bin B-05',
    stock_qty: 30,
    reorder_level: 5,
    max_level: 100,
    unit_cost: 1000,
    lead_time_days: 7,
    monthly_usage: 3,
    last_used_date: daysAgo(4),
  }),
  makePart({
    id: 'over',
    name: 'Cotton Rag',
    part_number: 'PN-RAG',
    associated_machine: 'PRESS-03',
    machine_priority: 'low',
    supplier: 'GenSupply',
    location: 'Bin C-01',
    stock_qty: 50,
    reorder_level: 5,
    unit_cost: 200,
    lead_time_days: 3,
    monthly_usage: 10,
    last_used_date: daysAgo(1),
  }),
  makePart({
    id: 'dead',
    name: 'Legacy Coupling',
    part_number: 'PN-CPL',
    associated_machine: 'PRESS-03',
    machine_priority: 'medium',
    supplier: 'GenSupply',
    location: 'Bin C-09',
    stock_qty: 5,
    reorder_level: 2,
    unit_cost: 4000,
    lead_time_days: 10,
    monthly_usage: 0,
    last_used_date: daysAgo(300),
  }),
];

const SHELF = buildInventoryItems({ parts: SHELF_PARTS }, NOW);
const item = (id) => SHELF.find((row) => row.id === id);

const SUPPLIERS = [
  {
    supplier_name: 'AutoParts',
    contact: '+91 98200 11111',
    email: 'sales@autoparts.in',
    on_time_delivery_pct: 92,
    response_time_days: 1,
    lead_time_avg: 12,
  },
  { name: 'BeltWorks', phone: '+91 98200 22222', on_time_delivery_pct: 70 },
  { supplier_name: 'GenSupply', response_time_days: 3 },
];

const PO_ROWS = [
  {
    id: 'po-1',
    po_number: 'PO-2026-001',
    vendor: 'AutoParts',
    status: 'pending',
    priority: 'critical',
    requested_by: 'Ravi',
    created_date: daysAgo(3),
    expected_delivery_date: daysAhead(5),
    total_amount: 48000,
    items: [{ name: 'PLC Module', machine: 'WELD-02', qty: 4, unit_cost: 12000 }],
  },
  {
    id: 'po-2',
    po_number: 'PO-2026-002',
    vendor: 'BeltWorks',
    status: 'pending',
    priority: 'medium',
    requested_by: 'Ravi',
    created_date: daysAgo(6),
    expected_delivery_date: daysAhead(10),
    total_amount: 21000,
    items: [{ name: 'Drive Belt', machine: 'CNC-01', qty: 7, unit_cost: 3000 }],
  },
  {
    id: 'po-3',
    po_number: 'PO-2026-003',
    vendor: 'PrecisionCo',
    status: 'approved',
    priority: 'critical',
    created_date: daysAgo(2),
    expected_delivery_date: daysAhead(28),
    total_amount: 56000,
    items: [{ name: 'Spindle Bearing', machine: 'CNC-01', qty: 2, unit_cost: 28000 }],
  },
  {
    id: 'po-4',
    po_number: 'PO-2026-004',
    vendor: 'GenSupply',
    status: 'ordered',
    priority: 'low',
    created_date: daysAgo(4),
    total_amount: 6000,
    items: [],
  },
  {
    id: 'po-5',
    po_number: 'PO-2026-005',
    vendor: 'GenSupply',
    status: 'delivered',
    priority: 'low',
    created_date: daysAgo(20),
    total_amount: 9000,
    items: [],
  },
  {
    id: 'po-6',
    po_number: 'PO-2026-006',
    vendor: 'BeltWorks',
    status: 'cancelled',
    priority: 'high',
    created_date: daysAgo(1),
    total_amount: 99000,
    items: [],
  },
];

const POS = normalizePos(PO_ROWS, { now: NOW });
const po = (id) => POS.find((row) => row.id === id);

/* ===========================================================
   Constants — the assumptions the boards are built on
   =========================================================== */

describe('tunable constants', () => {
  it('charges working capital at 15% a year', () => {
    expect(INTEREST_RATE).toBe(0.15);
  });

  it('charges storage, insurance and handling at 5% a year', () => {
    expect(STORAGE_RATE).toBe(0.05);
  });

  it('carries stock at the sum of interest and storage — 20%', () => {
    expect(CARRYING_RATE).toBeCloseTo(0.2, 10);
    expect(CARRYING_RATE).toBeCloseTo(INTEREST_RATE + STORAGE_RATE, 10);
  });

  it('treats 180 days without an issue as obsolete', () => {
    expect(OBSOLETE_AFTER_DAYS).toBe(180);
  });

  it('treats 30 days as the active-usage window', () => {
    expect(ACTIVE_WITHIN_DAYS).toBe(30);
  });

  it('treats less than a week of cover on a critical machine as a risk', () => {
    expect(CRITICAL_COVER_DAYS).toBe(7);
  });

  it('treats a fortnight or more as a long lead time', () => {
    expect(LONG_LEAD_DAYS).toBe(14);
  });

  it('baselines the weekly procurement chart at ₹1.5L', () => {
    expect(DEFAULT_WEEKLY_PO_BUDGET).toBe(150_000);
  });

  it('names exactly three boards', () => {
    expect(Object.values(INVENTORY_ROLES).sort()).toEqual(['finance', 'store', 'supervisor']);
  });

  it('freezes the role map so a caller cannot mutate it', () => {
    expect(Object.isFrozen(INVENTORY_ROLES)).toBe(true);
  });

  it('defaults an unknown visitor to the store board', () => {
    expect(DEFAULT_INVENTORY_ROLE).toBe(INVENTORY_ROLES.STORE);
  });
});

describe('STOCK_STATUS_META', () => {
  it('covers every status', () => {
    Object.values(STOCK_STATUS).forEach((status) => {
      expect(STOCK_STATUS_META[status]).toBeDefined();
    });
  });

  it('paints critical red', () => {
    expect(STOCK_STATUS_META[STOCK_STATUS.CRITICAL].colour).toBe('red');
  });

  it('paints at-risk yellow', () => {
    expect(STOCK_STATUS_META[STOCK_STATUS.AT_RISK].colour).toBe('yellow');
  });

  it('paints healthy green', () => {
    expect(STOCK_STATUS_META[STOCK_STATUS.HEALTHY].colour).toBe('green');
  });

  it('paints overstocked blue', () => {
    expect(STOCK_STATUS_META[STOCK_STATUS.OVERSTOCKED].colour).toBe('blue');
  });

  it('paints obsolete gray', () => {
    expect(STOCK_STATUS_META[STOCK_STATUS.OBSOLETE].colour).toBe('gray');
  });

  it('gives every status a human label', () => {
    Object.values(STOCK_STATUS).forEach((status) => {
      expect(STOCK_STATUS_META[status].label).toMatch(/\S/);
    });
  });

  it('is frozen', () => {
    expect(Object.isFrozen(STOCK_STATUS_META)).toBe(true);
  });
});

/* ===========================================================
   Role resolution
   =========================================================== */

describe('resolveInventoryRole', () => {
  it.each([
    'store', 'stores', 'store_manager', 'storekeeper', 'store_keeper',
    'inventory_manager', 'technician', 'maintenance_technician',
  ])('routes %s to the store board', (role) => {
    expect(resolveInventoryRole(role)).toBe(INVENTORY_ROLES.STORE);
  });

  it.each([
    'supervisor', 'maintenance_supervisor', 'shift_supervisor',
    'engineer', 'maintenance_engineer', 'reliability_engineer',
  ])('routes %s to the supervisor board', (role) => {
    expect(resolveInventoryRole(role)).toBe(INVENTORY_ROLES.SUPERVISOR);
  });

  it.each([
    'finance', 'accounts', 'accountant', 'cfo',
    'owner', 'admin', 'plant_manager', 'maintenance_head',
  ])('routes %s to the finance board', (role) => {
    expect(resolveInventoryRole(role)).toBe(INVENTORY_ROLES.FINANCE);
  });

  it('is case-insensitive', () => {
    expect(resolveInventoryRole('STORE_MANAGER')).toBe(INVENTORY_ROLES.STORE);
    expect(resolveInventoryRole('Supervisor')).toBe(INVENTORY_ROLES.SUPERVISOR);
    expect(resolveInventoryRole('CFO')).toBe(INVENTORY_ROLES.FINANCE);
  });

  it('tolerates padding from a sloppy import', () => {
    expect(resolveInventoryRole('  supervisor  ')).toBe(INVENTORY_ROLES.SUPERVISOR);
  });

  it.each([null, undefined, '', '   ', 0, false])('falls back to the store board for %p', (value) => {
    expect(resolveInventoryRole(value)).toBe(INVENTORY_ROLES.STORE);
  });

  it('falls back to the store board for an unrecognised role', () => {
    expect(resolveInventoryRole('visiting_auditor')).toBe(INVENTORY_ROLES.STORE);
  });

  it('is idempotent — a resolved board key resolves to itself', () => {
    Object.values(INVENTORY_ROLES).forEach((role) => {
      expect(resolveInventoryRole(role)).toBe(role);
    });
  });
});

/* ===========================================================
   Priority, dates and criticality
   =========================================================== */

describe('normalizePriority', () => {
  it.each(['critical', 'Critical', 'CRIT', 'a', 'p1'])('reads %s as critical', (value) => {
    expect(normalizePriority(value)).toBe('critical');
  });

  it.each(['high', 'HIGH', 'b', 'p2'])('reads %s as high', (value) => {
    expect(normalizePriority(value)).toBe('high');
  });

  it.each(['medium', 'med', 'c', 'p3'])('reads %s as medium', (value) => {
    expect(normalizePriority(value)).toBe('medium');
  });

  it.each(['low', 'Low', 'd', 'p4'])('reads %s as low', (value) => {
    expect(normalizePriority(value)).toBe('low');
  });

  it.each([null, undefined, '', 'unknown'])('defaults %p to medium', (value) => {
    expect(normalizePriority(value)).toBe('medium');
  });
});

describe('daysSince', () => {
  it('counts whole days between a date and now', () => {
    expect(daysSince(daysAgo(30), NOW)).toBe(30);
  });

  it('reports 0 for something issued today', () => {
    expect(daysSince(daysAgo(0), NOW)).toBe(0);
  });

  it('never returns a negative age for a future date', () => {
    expect(daysSince(daysAhead(5), NOW)).toBe(0);
  });

  it('returns null — not 0 — when the date is missing', () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince(undefined, NOW)).toBeNull();
    expect(daysSince('', NOW)).toBeNull();
  });

  it('returns null for an unparseable date rather than NaN', () => {
    expect(daysSince('not-a-date', NOW)).toBeNull();
  });

  it('accepts a timestamp for `now` as well as a Date', () => {
    expect(daysSince(daysAgo(7), NOW.getTime())).toBe(7);
  });

  it('floors a partial day rather than rounding it up', () => {
    const halfPast = new Date(NOW.getTime() - 1.5 * MS_PER_DAY).toISOString();
    expect(daysSince(halfPast, NOW)).toBe(1);
  });
});

describe('partCriticality', () => {
  it('scores a critical, long-lead, expensive part at the top of the scale', () => {
    const result = partCriticality({
      machine_priority: 'critical', lead_time_days: 30, unit_cost: 28000,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe('critical');
  });

  it('scores a cheap, fast, low-priority part at the bottom', () => {
    const result = partCriticality({
      machine_priority: 'low', lead_time_days: 2, unit_cost: 100,
    });
    expect(result.score).toBe(17);
    expect(result.level).toBe('low');
  });

  it('weights the machine it protects most heavily', () => {
    const base = { lead_time_days: 7, unit_cost: 1000 };
    const critical = partCriticality({ ...base, machine_priority: 'critical' }).score;
    const low = partCriticality({ ...base, machine_priority: 'low' }).score;
    expect(critical - low).toBe(40);
  });

  it('escalates the level as lead time grows, holding everything else equal', () => {
    const at = (lead) => partCriticality({
      machine_priority: 'high', lead_time_days: lead, unit_cost: 1000,
    }).score;
    expect(at(2)).toBeLessThan(at(7));
    expect(at(7)).toBeLessThan(at(14));
    expect(at(14)).toBeLessThan(at(21));
    expect(at(21)).toBeLessThan(at(30));
  });

  it('escalates the level as unit cost grows, holding everything else equal', () => {
    const at = (cost) => partCriticality({
      machine_priority: 'medium', lead_time_days: 7, unit_cost: cost,
    }).score;
    expect(at(500)).toBeLessThan(at(3000));
    expect(at(3000)).toBeLessThan(at(10_000));
    expect(at(10_000)).toBeLessThan(at(20_000));
  });

  it('bands 80+ as critical', () => {
    expect(partCriticality({
      machine_priority: 'critical', lead_time_days: 14, unit_cost: 10_000,
    })).toMatchObject({ score: 82, level: 'critical' });
  });

  it('bands 60–79 as high', () => {
    expect(partCriticality({
      machine_priority: 'high', lead_time_days: 21, unit_cost: 10_000,
    })).toMatchObject({ score: 73, level: 'high' });
  });

  it('bands 40–59 as medium', () => {
    expect(partCriticality({
      machine_priority: 'medium', lead_time_days: 14, unit_cost: 3000,
    })).toMatchObject({ score: 46, level: 'medium' });
  });

  it('bands below 40 as low', () => {
    expect(partCriticality({
      machine_priority: 'medium', lead_time_days: 7, unit_cost: 3000,
    })).toMatchObject({ score: 38, level: 'low' });
  });

  it('explains a critical machine in the reasons', () => {
    expect(partCriticality({ machine_priority: 'critical' }).reasons)
      .toContain('Protects a critical machine');
  });

  it('explains a long lead time in the reasons, naming the days', () => {
    expect(partCriticality({ lead_time_days: 21 }).reasons).toContain('21-day lead time');
  });

  it('does not call a 13-day lead time long', () => {
    expect(partCriticality({ lead_time_days: 13 }).reasons).not.toContain('13-day lead time');
  });

  it('explains a high unit cost in the reasons', () => {
    expect(partCriticality({ unit_cost: 15_000 }).reasons).toContain('High unit cost');
  });

  it('gives a comfortable part no reasons at all', () => {
    expect(partCriticality({
      machine_priority: 'low', lead_time_days: 2, unit_cost: 100,
    }).reasons).toEqual([]);
  });

  it('survives a completely empty row', () => {
    const result = partCriticality({});
    expect(result.priority).toBe('medium');
    expect(result.score).toBe(27);
    expect(result.level).toBe('low');
  });

  it('survives null', () => {
    expect(() => partCriticality(null)).not.toThrow();
    expect(partCriticality(null).level).toBe('low');
  });
});

describe('binSectionOf', () => {
  it.each([
    ['Bin A-04', 'A'],
    ['Bin A-04 (High Security)', 'A'],
    ['C12', 'C'],
    ['b-07', 'B'],
    ['Rack D 9', 'D'],
  ])('reads %s as section %s', (location, section) => {
    expect(binSectionOf(location)).toBe(section);
  });

  it('upper-cases a lower-case bin label', () => {
    expect(binSectionOf('bin b-02')).toBe('B');
  });

  it.each([null, undefined, '', 'shelf', 'loose stock'])('files %p under Unzoned', (value) => {
    expect(binSectionOf(value)).toBe('Unzoned');
  });
});

/* ===========================================================
   classifyStock — the red/yellow/green/blue/gray contract
   =========================================================== */

describe('classifyStock', () => {
  const base = {
    available: 10, reorder: 5, safetyBand: 8, maxLevel: 20,
    obsolete: false, daysOfSupply: 100, criticality: { priority: 'medium' },
  };

  it('calls zero stock critical', () => {
    expect(classifyStock({ ...base, available: 0 })).toBe(STOCK_STATUS.CRITICAL);
  });

  it('calls negative availability — over-reserved stock — critical', () => {
    expect(classifyStock({ ...base, available: -3 })).toBe(STOCK_STATUS.CRITICAL);
  });

  it('calls anything below the reorder level critical', () => {
    expect(classifyStock({ ...base, available: 4 })).toBe(STOCK_STATUS.CRITICAL);
  });

  it('does not call stock exactly at the reorder level critical', () => {
    expect(classifyStock({ ...base, available: 5 })).toBe(STOCK_STATUS.AT_RISK);
  });

  it('calls an unused item obsolete once it is above its reorder level', () => {
    expect(classifyStock({ ...base, obsolete: true })).toBe(STOCK_STATUS.OBSOLETE);
  });

  it('ranks a stockout above obsolescence — the shortage is today\'s problem', () => {
    expect(classifyStock({ ...base, available: 0, obsolete: true })).toBe(STOCK_STATUS.CRITICAL);
  });

  it('ranks obsolescence above overstock', () => {
    expect(classifyStock({ ...base, available: 50, obsolete: true })).toBe(STOCK_STATUS.OBSOLETE);
  });

  it('calls stock above the max level overstocked', () => {
    expect(classifyStock({ ...base, available: 21 })).toBe(STOCK_STATUS.OVERSTOCKED);
  });

  it('does not call stock exactly at the max level overstocked', () => {
    expect(classifyStock({ ...base, available: 20 })).toBe(STOCK_STATUS.HEALTHY);
  });

  it('ranks overstock above the at-risk band so a big cushion never reads as a warning', () => {
    expect(classifyStock({
      ...base, available: 50, reorder: 40, safetyBand: 60, maxLevel: 45,
    })).toBe(STOCK_STATUS.OVERSTOCKED);
  });

  it('calls stock inside the safety band at risk', () => {
    expect(classifyStock({ ...base, available: 7 })).toBe(STOCK_STATUS.AT_RISK);
  });

  it('includes the top of the safety band in the warning', () => {
    expect(classifyStock({ ...base, available: 8 })).toBe(STOCK_STATUS.AT_RISK);
  });

  it('calls a critical machine with under a week of cover at risk, even above the band', () => {
    expect(classifyStock({
      ...base, available: 12, daysOfSupply: 3, criticality: { priority: 'critical' },
    })).toBe(STOCK_STATUS.AT_RISK);
  });

  it('leaves the same cover alone on a non-critical machine', () => {
    expect(classifyStock({
      ...base, available: 12, daysOfSupply: 3, criticality: { priority: 'medium' },
    })).toBe(STOCK_STATUS.HEALTHY);
  });

  it('does not warn a critical machine at exactly a week of cover', () => {
    expect(classifyStock({
      ...base, available: 12, daysOfSupply: 7, criticality: { priority: 'critical' },
    })).toBe(STOCK_STATUS.HEALTHY);
  });

  it('does not treat unknown cover as low cover', () => {
    expect(classifyStock({
      ...base, available: 12, daysOfSupply: null, criticality: { priority: 'critical' },
    })).toBe(STOCK_STATUS.HEALTHY);
  });

  it('calls comfortable stock healthy', () => {
    expect(classifyStock(base)).toBe(STOCK_STATUS.HEALTHY);
  });

  it('ignores a reorder level of 0 rather than flagging everything critical', () => {
    expect(classifyStock({
      ...base, available: 1, reorder: 0, safetyBand: 0, maxLevel: 0,
    })).toBe(STOCK_STATUS.HEALTHY);
  });

  it('tolerates a missing criticality object', () => {
    expect(() => classifyStock({ ...base, criticality: undefined })).not.toThrow();
  });
});

/* ===========================================================
   normalizeItem
   =========================================================== */

describe('normalizeItem', () => {
  it('nets reserved stock out of what is actually available', () => {
    const row = one({ stock_qty: 10, reserved_qty: 4 });
    expect(row.stock).toBe(10);
    expect(row.reserved).toBe(4);
    expect(row.available).toBe(6);
  });

  it('turns over-reservation critical instead of hiding it', () => {
    const row = one({ stock_qty: 10, reserved_qty: 9, reorder_level: 5 });
    expect(row.available).toBe(1);
    expect(row.status).toBe(STOCK_STATUS.CRITICAL);
  });

  it('infers a max level of four reorder cycles when nobody set one', () => {
    expect(one({ reorder_level: 5 }).maxLevel).toBe(20);
  });

  it('prefers an explicit max level over the inferred one', () => {
    expect(one({ reorder_level: 5, max_level: 60 }).maxLevel).toBe(60);
  });

  it('leaves the max level at 0 when there is no reorder level to infer from', () => {
    expect(one({ reorder_level: 0 }).maxLevel).toBe(0);
  });

  it('sets a safety band half a reorder level above the reorder point', () => {
    expect(one({ reorder_level: 10 }).safetyBand).toBe(15);
  });

  it('gives even a tiny reorder level a one-unit warning zone', () => {
    expect(one({ reorder_level: 1 }).safetyBand).toBe(2);
    expect(one({ reorder_level: 2 }).safetyBand).toBe(3);
  });

  it('has no safety band when there is no reorder level', () => {
    expect(one({ reorder_level: 0 }).safetyBand).toBe(0);
  });

  it('converts monthly usage into days of cover', () => {
    // 30 available against 3 a month is 300 days of cover.
    expect(one({ stock_qty: 30, monthly_usage: 3, max_level: 100 }).daysOfSupply).toBe(300);
  });

  it('reports unknown cover as null — not infinite, not zero', () => {
    expect(one({ monthly_usage: 0 }).daysOfSupply).toBeNull();
  });

  it('reports zero cover for an item that is out of stock but does move', () => {
    expect(one({ stock_qty: 0, monthly_usage: 3 }).daysOfSupply).toBe(0);
  });

  it('values stock at cost', () => {
    expect(one({ stock_qty: 12, unit_cost: 2500 }).stockValue).toBe(30_000);
  });

  it('never books a negative stock value from a bad import', () => {
    expect(one({ stock_qty: -5, unit_cost: 1000 }).stockValue).toBe(0);
  });

  it('flags an item unused for 180 days as obsolete', () => {
    expect(one({ last_used_date: daysAgo(180) }).obsolete).toBe(true);
  });

  it('does not flag an item used 179 days ago', () => {
    expect(one({ last_used_date: daysAgo(179) }).obsolete).toBe(false);
  });

  it('does not flag an item that has never been issued as obsolete', () => {
    const row = one({ last_used_date: null });
    expect(row.daysSinceLastUse).toBeNull();
    expect(row.obsolete).toBe(false);
  });

  it('parses the bin section out of the location', () => {
    expect(one({ location: 'Bin D-11' }).binSection).toBe('D');
  });

  it('labels a part a Part and a consumable a Consumable', () => {
    expect(normalizeItem(makePart(), { type: 'part', now: NOW }).itemType).toBe('Part');
    expect(normalizeItem(makePart(), { type: 'consumable', now: NOW }).itemType).toBe('Consumable');
  });

  it('lets an explicit item_type win over the table it came from', () => {
    expect(normalizeItem(makePart({ item_type: 'Tool' }), { type: 'consumable', now: NOW }).itemType)
      .toBe('Tool');
  });

  it('falls back from id to part number to name for its key', () => {
    expect(normalizeItem({ id: 'x', part_number: 'PN', name: 'N' }, { now: NOW }).id).toBe('x');
    expect(normalizeItem({ part_number: 'PN', name: 'N' }, { now: NOW }).id).toBe('PN');
    expect(normalizeItem({ name: 'N' }, { now: NOW }).id).toBe('N');
  });

  it('names an unnamed row rather than rendering "undefined"', () => {
    expect(normalizeItem({}, { now: NOW }).name).toBe('Unnamed item');
  });

  it('files a part with no machine under Unassigned', () => {
    expect(one({ associated_machine: null }).machine).toBe('Unassigned');
  });

  it('files a part with no supplier under an unassigned supplier', () => {
    expect(one({ supplier: null }).supplier).toBe('Unassigned supplier');
  });

  it('carries the store manager note through', () => {
    expect(one({ store_manager_note: 'Kept for the old press' }).note).toBe('Kept for the old press');
  });

  it('coerces the auto-order flag to a boolean', () => {
    expect(one({ auto_order: 1 }).autoOrder).toBe(true);
    expect(one({ auto_order: null }).autoOrder).toBe(false);
  });

  it('attaches the matching status metadata so components never look it up', () => {
    const row = one({ stock_qty: 0 });
    expect(row.status).toBe(STOCK_STATUS.CRITICAL);
    expect(row.statusMeta).toBe(STOCK_STATUS_META[STOCK_STATUS.CRITICAL]);
  });

  it('exposes criticality as a level, a score and the reasons behind it', () => {
    const row = one({ machine_priority: 'critical', lead_time_days: 30, unit_cost: 28_000 });
    expect(row.criticality).toBe('critical');
    expect(row.criticalityScore).toBe(100);
    expect(row.criticalityReasons.length).toBeGreaterThan(0);
  });

  it('coerces junk numerics to 0 rather than propagating NaN', () => {
    const row = one({
      stock_qty: 'lots', reserved_qty: null, unit_cost: undefined, lead_time_days: 'soon',
    });
    expect(row.stock).toBe(0);
    expect(row.unitCost).toBe(0);
    expect(row.leadTimeDays).toBe(0);
    expect(Number.isNaN(row.stockValue)).toBe(false);
  });

  it('normalises an entirely empty row without throwing', () => {
    expect(() => normalizeItem({}, { now: NOW })).not.toThrow();
    expect(() => normalizeItem(null, { now: NOW })).not.toThrow();
  });

  it('defaults its options so a bare call still works', () => {
    expect(() => normalizeItem(makePart())).not.toThrow();
  });
});

describe('buildInventoryItems', () => {
  it('merges parts and consumables into one list', () => {
    const rows = buildInventoryItems({
      parts: [makePart({ id: 'a' })],
      consumables: [makePart({ id: 'b' })],
    }, NOW);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('tags each side with the right item type', () => {
    const rows = buildInventoryItems({
      parts: [makePart({ id: 'a' })],
      consumables: [makePart({ id: 'b' })],
    }, NOW);
    expect(rows[0].itemType).toBe('Part');
    expect(rows[1].itemType).toBe('Consumable');
  });

  it('returns an empty list rather than throwing when a table is missing', () => {
    expect(buildInventoryItems({})).toEqual([]);
    expect(buildInventoryItems()).toEqual([]);
  });

  it('ignores a non-array table', () => {
    expect(buildInventoryItems({ parts: 'oops', consumables: null })).toEqual([]);
  });

  it('builds the fixture shelf at the expected size', () => {
    expect(SHELF).toHaveLength(6);
  });
});

/* ===========================================================
   Stock health
   =========================================================== */

describe('stockHealthSummary', () => {
  const health = stockHealthSummary(SHELF);

  it('counts every row exactly once', () => {
    expect(health.total).toBe(6);
    expect(health.critical + health.atRisk + health.healthy + health.overstocked + health.obsolete)
      .toBe(6);
  });

  it('counts the two critical rows — a stockout and a below-reorder row', () => {
    expect(health.critical).toBe(2);
  });

  it('counts one at-risk row', () => {
    expect(health.atRisk).toBe(1);
  });

  it('counts one healthy row', () => {
    expect(health.healthy).toBe(1);
  });

  it('counts one overstocked row', () => {
    expect(health.overstocked).toBe(1);
  });

  it('counts one obsolete row', () => {
    expect(health.obsolete).toBe(1);
  });

  it('totals the shelf at cost', () => {
    expect(health.totalValue).toBe(117_000);
  });

  it('splits value by status', () => {
    expect(health.byStatus[STOCK_STATUS.CRITICAL].value).toBe(36_000);
    expect(health.byStatus[STOCK_STATUS.AT_RISK].value).toBe(21_000);
    expect(health.byStatus[STOCK_STATUS.HEALTHY].value).toBe(30_000);
    expect(health.byStatus[STOCK_STATUS.OVERSTOCKED].value).toBe(10_000);
    expect(health.byStatus[STOCK_STATUS.OBSOLETE].value).toBe(20_000);
  });

  it('adds the per-status values back to the total', () => {
    const sum = Object.values(health.byStatus).reduce((total, row) => total + row.value, 0);
    expect(sum).toBe(health.totalValue);
  });

  it('returns a fully zeroed shape for an empty shelf rather than undefined buckets', () => {
    const empty = stockHealthSummary([]);
    expect(empty.total).toBe(0);
    expect(empty.totalValue).toBe(0);
    Object.values(STOCK_STATUS).forEach((status) => {
      expect(empty.byStatus[status]).toEqual({ count: 0, value: 0 });
    });
  });

  it('tolerates a missing list', () => {
    expect(stockHealthSummary(undefined).total).toBe(0);
    expect(stockHealthSummary(null).total).toBe(0);
  });
});

describe('reorderSuggestion', () => {
  it('orders back up to two reorder levels', () => {
    const suggestion = reorderSuggestion(
      { reorder: 10, available: 3, maxLevel: 40, unitCost: 1000, leadTimeDays: 7 }, NOW,
    );
    expect(suggestion.qty).toBe(17);
  });

  it('prices the order at the unit cost', () => {
    const suggestion = reorderSuggestion(
      { reorder: 10, available: 3, maxLevel: 40, unitCost: 1000, leadTimeDays: 7 }, NOW,
    );
    expect(suggestion.cost).toBe(17_000);
  });

  it('caps the order at the max level so a reorder never creates an overstock', () => {
    const suggestion = reorderSuggestion(
      { reorder: 10, available: 3, maxLevel: 15, unitCost: 100, leadTimeDays: 5 }, NOW,
    );
    expect(suggestion.qty).toBe(12);
  });

  it('never suggests ordering nothing', () => {
    const suggestion = reorderSuggestion(
      { reorder: 10, available: 25, maxLevel: 40, unitCost: 100, leadTimeDays: 5 }, NOW,
    );
    expect(suggestion.qty).toBe(1);
  });

  it('suggests a single unit for an item with no reorder level set', () => {
    const suggestion = reorderSuggestion(
      { reorder: 0, available: 4, maxLevel: 0, unitCost: 100, leadTimeDays: 5 }, NOW,
    );
    expect(suggestion.qty).toBe(1);
  });

  it('rounds a fractional target up — you cannot order 2.5 bearings', () => {
    const suggestion = reorderSuggestion(
      { reorder: 3, available: 0.5, maxLevel: 0, unitCost: 100, leadTimeDays: 1 }, NOW,
    );
    expect(Number.isInteger(suggestion.qty)).toBe(true);
    expect(suggestion.qty).toBe(6);
  });

  it('dates arrival by the supplier lead time', () => {
    const suggestion = reorderSuggestion(
      { reorder: 5, available: 0, maxLevel: 0, unitCost: 10, leadTimeDays: 21 }, NOW,
    );
    expect(suggestion.leadTimeDays).toBe(21);
    expect(suggestion.eta.getTime()).toBe(NOW.getTime() + 21 * MS_PER_DAY);
  });

  it('exposes the arrival date as an ISO string for persistence', () => {
    const suggestion = reorderSuggestion(
      { reorder: 5, available: 0, maxLevel: 0, unitCost: 10, leadTimeDays: 21 }, NOW,
    );
    expect(suggestion.etaIso).toBe(new Date(NOW.getTime() + 21 * MS_PER_DAY).toISOString());
  });

  it('arrives today when the supplier holds stock', () => {
    const suggestion = reorderSuggestion(
      { reorder: 5, available: 0, maxLevel: 0, unitCost: 10, leadTimeDays: 0 }, NOW,
    );
    expect(suggestion.eta.getTime()).toBe(NOW.getTime());
  });

  it('survives an empty item', () => {
    expect(() => reorderSuggestion({}, NOW)).not.toThrow();
    expect(reorderSuggestion({}, NOW).qty).toBe(1);
  });

  it('accepts raw inventory columns as well as normalized ones', () => {
    const suggestion = reorderSuggestion(
      { reorder_level: 10, stock_qty: 3, max_level: 40, unit_cost: 1000, lead_time_days: 7 }, NOW,
    );
    expect(suggestion.qty).toBe(17);
  });
});

describe('reorderQueue', () => {
  const queue = reorderQueue(SHELF, { now: NOW });

  it('lists only what actually needs a purchase order', () => {
    expect(queue.map((row) => row.id)).toEqual(['crit-zero', 'crit-low', 'risk']);
  });

  it('leaves healthy, overstocked and obsolete rows out of it', () => {
    const ids = queue.map((row) => row.id);
    expect(ids).not.toContain('healthy');
    expect(ids).not.toContain('over');
    expect(ids).not.toContain('dead');
  });

  it('puts every critical row ahead of every at-risk row', () => {
    const lastCritical = queue.map((row) => row.status).lastIndexOf(STOCK_STATUS.CRITICAL);
    const firstAtRisk = queue.map((row) => row.status).indexOf(STOCK_STATUS.AT_RISK);
    expect(lastCritical).toBeLessThan(firstAtRisk);
  });

  it('breaks a status tie by criticality — the long-lead PLC outranks the belt', () => {
    expect(queue[0].criticalityScore).toBeGreaterThanOrEqual(queue[1].criticalityScore);
  });

  it('attaches a costed suggestion to every row', () => {
    queue.forEach((row) => {
      expect(row.suggestion.qty).toBeGreaterThan(0);
      expect(row.suggestion).toHaveProperty('cost');
      expect(row.suggestion).toHaveProperty('etaIso');
    });
  });

  it('costs the stockout at four bearings', () => {
    expect(queue[0].suggestion).toMatchObject({ qty: 4, cost: 112_000, leadTimeDays: 30 });
  });

  it('honours a limit for the supervisor auto-order strip', () => {
    expect(reorderQueue(SHELF, { now: NOW, limit: 2 })).toHaveLength(2);
  });

  it('ignores a limit larger than the queue', () => {
    expect(reorderQueue(SHELF, { now: NOW, limit: 99 })).toHaveLength(3);
  });

  it('does not mutate the shelf it was given', () => {
    const before = SHELF.map((row) => row.id);
    reorderQueue(SHELF, { now: NOW });
    expect(SHELF.map((row) => row.id)).toEqual(before);
  });

  it('returns an empty queue for a healthy shelf', () => {
    expect(reorderQueue([item('healthy')], { now: NOW })).toEqual([]);
  });

  it('tolerates a missing list', () => {
    expect(reorderQueue(undefined)).toEqual([]);
  });
});

describe('stockoutRisks', () => {
  it('always includes anything already at zero', () => {
    const risks = stockoutRisks(SHELF);
    expect(risks.map((row) => row.id)).toContain('crit-zero');
  });

  it('reports zero days left for a stockout', () => {
    const risk = stockoutRisks(SHELF).find((row) => row.id === 'crit-zero');
    expect(risk.daysLeft).toBe(0);
  });

  it('measures the shortfall against the lead time — how late the fix already is', () => {
    const risk = stockoutRisks(SHELF).find((row) => row.id === 'crit-zero');
    expect(risk.shortfallDays).toBe(30);
  });

  it('excludes an item with plenty of cover', () => {
    expect(stockoutRisks([item('healthy')])).toEqual([]);
  });

  it('excludes an item whose cover is unknown rather than guessing', () => {
    expect(stockoutRisks([item('dead')])).toEqual([]);
  });

  it('includes an item running out inside the window', () => {
    // 2 available against 30 a month is two days of cover.
    const tight = one({ id: 'tight', stock_qty: 2, reorder_level: 1, monthly_usage: 30 });
    expect(stockoutRisks([tight]).map((row) => row.id)).toEqual(['tight']);
  });

  it('includes an item at exactly the window boundary', () => {
    const boundary = one({ id: 'edge', stock_qty: 7, reorder_level: 1, monthly_usage: 30 });
    expect(boundary.daysOfSupply).toBe(7);
    expect(stockoutRisks([boundary])).toHaveLength(1);
  });

  it('honours a custom window', () => {
    const slow = one({ id: 'slow', stock_qty: 10, reorder_level: 1, monthly_usage: 30 });
    expect(stockoutRisks([slow], { withinDays: 7 })).toHaveLength(0);
    expect(stockoutRisks([slow], { withinDays: 14 })).toHaveLength(1);
  });

  it('sorts the soonest stockout first', () => {
    const soon = one({ id: 'soon', stock_qty: 1, reorder_level: 1, monthly_usage: 30 });
    const later = one({ id: 'later', stock_qty: 5, reorder_level: 1, monthly_usage: 30 });
    const risks = stockoutRisks([later, soon]);
    expect(risks.map((row) => row.id)).toEqual(['soon', 'later']);
  });

  it('never reports a negative shortfall for a part that arrives in time', () => {
    const fine = one({ id: 'fine', stock_qty: 6, reorder_level: 1, monthly_usage: 30, lead_time_days: 1 });
    expect(stockoutRisks([fine])[0].shortfallDays).toBe(0);
  });

  it('tolerates a missing list', () => {
    expect(stockoutRisks(undefined)).toEqual([]);
  });
});

/* ===========================================================
   Grouping
   =========================================================== */

describe('groupByMachine', () => {
  const groups = groupByMachine(SHELF);

  it('groups the shelf by the machine each part protects', () => {
    expect(groups.map((group) => group.machine).sort()).toEqual(['CNC-01', 'PRESS-03', 'WELD-02']);
  });

  it('totals the stock value held for each machine', () => {
    const byName = Object.fromEntries(groups.map((group) => [group.machine, group.value]));
    expect(byName['CNC-01']).toBe(21_000);
    expect(byName['WELD-02']).toBe(36_000);
    expect(byName['PRESS-03']).toBe(60_000);
  });

  it('counts the critical shortages per machine', () => {
    const byName = Object.fromEntries(groups.map((group) => [group.machine, group.critical]));
    expect(byName['CNC-01']).toBe(1);
    expect(byName['WELD-02']).toBe(1);
    expect(byName['PRESS-03']).toBe(0);
  });

  it('puts machines with shortages first, then the most valuable', () => {
    expect(groups.map((group) => group.machine)).toEqual(['WELD-02', 'CNC-01', 'PRESS-03']);
  });

  it('keeps every item inside its group', () => {
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    expect(total).toBe(SHELF.length);
  });

  it('tolerates a missing list', () => {
    expect(groupByMachine(undefined)).toEqual([]);
  });
});

describe('binMap', () => {
  const bins = binMap(SHELF);

  it('maps the warehouse into its lettered sections', () => {
    expect(bins.map((bin) => bin.section)).toEqual(['A', 'B', 'C']);
  });

  it('sorts sections alphabetically so the map matches the walk', () => {
    const sections = bins.map((bin) => bin.section);
    expect(sections).toEqual([...sections].sort());
  });

  it('totals the value stored in each section', () => {
    const byName = Object.fromEntries(bins.map((bin) => [bin.section, bin.value]));
    expect(byName.A).toBe(21_000);
    expect(byName.B).toBe(66_000);
    expect(byName.C).toBe(30_000);
  });

  it('counts the critical rows in each section', () => {
    const byName = Object.fromEntries(bins.map((bin) => [bin.section, bin.critical]));
    expect(byName.A).toBe(1);
    expect(byName.B).toBe(1);
    expect(byName.C).toBe(0);
  });

  it('collects unlabelled stock into an Unzoned section rather than dropping it', () => {
    const loose = one({ id: 'loose', location: '' });
    expect(binMap([loose])[0].section).toBe('Unzoned');
  });

  it('accounts for every item', () => {
    expect(bins.reduce((sum, bin) => sum + bin.items.length, 0)).toBe(SHELF.length);
  });

  it('tolerates a missing list', () => {
    expect(binMap(undefined)).toEqual([]);
  });
});

describe('supplierNetwork', () => {
  const network = supplierNetwork(SHELF, SUPPLIERS);
  const byName = Object.fromEntries(network.map((row) => [row.name, row]));

  it('lists every supplier on the shelf', () => {
    expect(network.map((row) => row.name).sort())
      .toEqual(['AutoParts', 'BeltWorks', 'GenSupply', 'PrecisionCo']);
  });

  it('ranks suppliers by the value they hold for us', () => {
    expect(network.map((row) => row.name))
      .toEqual(['AutoParts', 'GenSupply', 'BeltWorks', 'PrecisionCo']);
  });

  it('counts the items each supplier covers', () => {
    expect(byName.AutoParts.itemCount).toBe(2);
    expect(byName.PrecisionCo.itemCount).toBe(1);
  });

  it('counts the critical shortages each supplier is sitting on', () => {
    expect(byName.AutoParts.criticalItems).toBe(1);
    expect(byName.GenSupply.criticalItems).toBe(0);
  });

  it('matches a directory record on supplier_name', () => {
    expect(byName.AutoParts.contact).toBe('+91 98200 11111');
    expect(byName.AutoParts.email).toBe('sales@autoparts.in');
  });

  it('matches a directory record on the alternative `name` key', () => {
    expect(byName.BeltWorks.contact).toBe('+91 98200 22222');
  });

  it('matches the directory case-insensitively', () => {
    const network2 = supplierNetwork([one({ supplier: 'autoparts' })], SUPPLIERS);
    expect(network2[0].onTimePct).toBe(92);
  });

  it('blends on-time delivery with responsiveness into one reliability score', () => {
    // 92% on time, 1-day response → (92 + 80) / 2
    expect(byName.AutoParts.reliability).toBe(86);
  });

  it('falls back to the only signal it has rather than scoring a gap as a failure', () => {
    expect(byName.BeltWorks.reliability).toBe(70);
    expect(byName.GenSupply.reliability).toBe(40);
  });

  it('reports no reliability at all for a supplier with no record', () => {
    expect(byName.PrecisionCo.reliability).toBeNull();
    expect(byName.PrecisionCo.onTimePct).toBeNull();
  });

  it('floors a very slow responder at zero rather than going negative', () => {
    const network2 = supplierNetwork(
      [one({ supplier: 'Slowpoke' })],
      [{ supplier_name: 'Slowpoke', response_time_days: 9 }],
    );
    expect(network2[0].reliability).toBe(0);
  });

  it('prefers the supplier record lead time over the observed average', () => {
    expect(byName.AutoParts.leadTimeAvg).toBe(12);
    expect(byName.AutoParts.observedLead).toBe(14);
  });

  it('falls back to the observed lead time when the record has none', () => {
    expect(byName.GenSupply.leadTimeAvg).toBe(6.5);
    expect(byName.PrecisionCo.leadTimeAvg).toBe(30);
  });

  it('ignores zero lead times when averaging', () => {
    const network2 = supplierNetwork([
      one({ id: 'a', supplier: 'Solo', lead_time_days: 0 }),
      one({ id: 'b', supplier: 'Solo', lead_time_days: 10 }),
    ], []);
    expect(network2[0].observedLead).toBe(10);
  });

  it('reports no observed lead time when nothing has one', () => {
    const network2 = supplierNetwork([one({ supplier: 'Solo', lead_time_days: 0 })], []);
    expect(network2[0].observedLead).toBeNull();
  });

  it('works with no directory at all', () => {
    expect(() => supplierNetwork(SHELF)).not.toThrow();
    expect(supplierNetwork(SHELF)).toHaveLength(4);
  });

  it('tolerates a missing list', () => {
    expect(supplierNetwork(undefined, SUPPLIERS)).toEqual([]);
  });
});

describe('supplierCostComparison', () => {
  const dual = [
    one({
      id: 'a', name: 'Drive Belt', part_number: 'PN-BLT',
      supplier: 'BeltWorks', unit_cost: 1000, lead_time_days: 5, monthly_usage: 2,
    }),
    one({
      id: 'b', name: 'Drive Belt', part_number: 'PN-BLT',
      supplier: 'GenSupply', unit_cost: 1400, lead_time_days: 10, monthly_usage: 3,
    }),
  ];

  it('finds nothing when every part has a single vendor', () => {
    expect(supplierCostComparison(SHELF)).toEqual([]);
  });

  it('surfaces a part quoted by two vendors', () => {
    expect(supplierCostComparison(dual)).toHaveLength(1);
  });

  it('lists the options cheapest first', () => {
    expect(supplierCostComparison(dual)[0].options.map((option) => option.supplier))
      .toEqual(['BeltWorks', 'GenSupply']);
  });

  it('names the cheapest vendor', () => {
    expect(supplierCostComparison(dual)[0].cheapest).toMatchObject({
      supplier: 'BeltWorks', unitCost: 1000,
    });
  });

  it('names the fastest vendor separately from the cheapest', () => {
    expect(supplierCostComparison(dual)[0].fastest.supplier).toBe('BeltWorks');
  });

  it('quotes the per-unit saving from consolidating', () => {
    expect(supplierCostComparison(dual)[0].savingPerUnit).toBe(400);
  });

  it('annualises the saving across combined monthly usage', () => {
    // ₹400 × 5 a month × 12 months
    expect(supplierCostComparison(dual)[0].annualSaving).toBe(24_000);
  });

  it('matches on the normalised name when there is no part number', () => {
    const noNumbers = [
      one({ id: 'a', name: 'Drive  Belt', part_number: '', supplier: 'S1', unit_cost: 100 }),
      one({ id: 'b', name: 'drive belt', part_number: '', supplier: 'S2', unit_cost: 150 }),
    ];
    expect(supplierCostComparison(noNumbers)).toHaveLength(1);
  });

  it('does not count the same vendor twice as a second source', () => {
    const same = [
      one({ id: 'a', part_number: 'PN-X', supplier: 'S1', unit_cost: 100 }),
      one({ id: 'b', part_number: 'PN-X', supplier: 'S1', unit_cost: 150 }),
    ];
    expect(supplierCostComparison(same)).toEqual([]);
  });

  it('ranks the biggest annual saving first', () => {
    const many = [
      ...dual,
      one({ id: 'c', name: 'Gasket', part_number: 'PN-G', supplier: 'S1', unit_cost: 10, monthly_usage: 1 }),
      one({ id: 'd', name: 'Gasket', part_number: 'PN-G', supplier: 'S2', unit_cost: 20, monthly_usage: 1 }),
    ];
    const rows = supplierCostComparison(many);
    expect(rows[0].annualSaving).toBeGreaterThanOrEqual(rows[1].annualSaving);
  });

  it('tolerates a missing list', () => {
    expect(supplierCostComparison(undefined)).toEqual([]);
  });
});

/* ===========================================================
   Purchase orders
   =========================================================== */

describe('normalizePoStatus', () => {
  it.each(['pending', 'awaiting_approval', 'draft', 'requested'])('reads %s as pending', (value) => {
    expect(normalizePoStatus(value)).toBe(PO_STATUS.PENDING);
  });

  it.each(['received', 'complete', 'delivered', 'closed'])('reads %s as received', (value) => {
    expect(normalizePoStatus(value)).toBe(PO_STATUS.RECEIVED);
  });

  it.each(['rejected', 'cancelled', 'declined'])('reads %s as rejected', (value) => {
    expect(normalizePoStatus(value)).toBe(PO_STATUS.REJECTED);
  });

  it('passes approved and ordered through unchanged', () => {
    expect(normalizePoStatus('approved')).toBe(PO_STATUS.APPROVED);
    expect(normalizePoStatus('ordered')).toBe(PO_STATUS.ORDERED);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(normalizePoStatus('  APPROVED ')).toBe(PO_STATUS.APPROVED);
  });

  it.each([null, undefined, '', 'who knows'])('treats %p as still pending a decision', (value) => {
    expect(normalizePoStatus(value)).toBe(PO_STATUS.PENDING);
  });
});

describe('normalizePo', () => {
  it('prefers the stated total', () => {
    expect(po('po-1').total).toBe(48_000);
  });

  it('derives a total from the lines when none was stated', () => {
    const derived = normalizePo({
      items: [{ qty: 2, unit_cost: 500 }, { qty: 3, unit_cost: 100 }],
    }, { now: NOW });
    expect(derived.total).toBe(1300);
  });

  it('totals to 0 for an empty PO rather than NaN', () => {
    expect(normalizePo({}, { now: NOW }).total).toBe(0);
  });

  it('ages a PO from its creation date', () => {
    expect(po('po-1').ageDays).toBe(3);
    expect(po('po-2').ageDays).toBe(6);
  });

  it('reports an unknown age as null, not zero', () => {
    expect(normalizePo({ po_number: 'X' }, { now: NOW }).ageDays).toBeNull();
  });

  it('counts the days to delivery', () => {
    expect(po('po-1').daysToDelivery).toBe(5);
  });

  it('reports a delivery already overdue as a negative number', () => {
    const late = normalizePo({ expected_delivery_date: daysAgo(3) }, { now: NOW });
    expect(late.daysToDelivery).toBe(-3);
  });

  it('reports no delivery date as null', () => {
    expect(po('po-4').daysToDelivery).toBeNull();
  });

  it('lists the machines the PO unblocks', () => {
    expect(po('po-1').unblocks).toEqual(['WELD-02']);
  });

  it('de-duplicates the machines it unblocks', () => {
    const row = normalizePo({
      items: [{ machine: 'CNC-01' }, { machine: 'CNC-01' }, { machine: 'WELD-02' }],
    }, { now: NOW });
    expect(row.unblocks).toEqual(['CNC-01', 'WELD-02']);
  });

  it('leaves unblocks empty when no line names a machine', () => {
    expect(normalizePo({ items: [{ name: 'Grease' }] }, { now: NOW }).unblocks).toEqual([]);
  });

  it('counts the lines', () => {
    expect(po('po-1').itemCount).toBe(1);
    expect(po('po-4').itemCount).toBe(0);
  });

  it('derives a PO number from the id when there is none', () => {
    expect(normalizePo({ id: 'abcdefghijkl' }, { now: NOW }).poNumber).toBe('PO-abcdefgh');
  });

  it('falls back to a placeholder rather than rendering "undefined"', () => {
    expect(normalizePo({}, { now: NOW }).poNumber).toBe('PO-—');
  });

  it('attributes an unattributed PO to Stores', () => {
    expect(normalizePo({}, { now: NOW }).requestedBy).toBe('Stores');
    expect(po('po-1').requestedBy).toBe('Ravi');
  });

  it('names an unassigned vendor rather than leaving it blank', () => {
    expect(normalizePo({}, { now: NOW }).vendor).toBe('Unassigned vendor');
  });

  it('normalises the priority', () => {
    expect(normalizePo({ priority: 'p1' }, { now: NOW }).priority).toBe('critical');
    expect(normalizePo({}, { now: NOW }).priority).toBe('medium');
  });

  it('accepts created_at as well as created_date', () => {
    expect(normalizePo({ created_at: daysAgo(4) }, { now: NOW }).ageDays).toBe(4);
  });

  it('survives a null row', () => {
    expect(() => normalizePo(null, { now: NOW })).not.toThrow();
  });
});

describe('normalizePos', () => {
  it('normalises every row', () => {
    expect(POS).toHaveLength(6);
  });

  it('collapses vendor spellings of status onto the canonical five', () => {
    expect(po('po-5').status).toBe(PO_STATUS.RECEIVED);
    expect(po('po-6').status).toBe(PO_STATUS.REJECTED);
  });

  it('tolerates a missing list', () => {
    expect(normalizePos(undefined)).toEqual([]);
    expect(normalizePos(null)).toEqual([]);
  });
});

describe('poSummary', () => {
  const summary = poSummary(POS);

  it('counts what is waiting on a signature', () => {
    expect(summary.openCount).toBe(2);
    expect(summary.openValue).toBe(69_000);
  });

  it('treats approved and ordered alike as committed — the money is gone either way', () => {
    expect(summary.committedCount).toBe(2);
    expect(summary.committedValue).toBe(62_000);
  });

  it('counts what has landed', () => {
    expect(summary.receivedCount).toBe(1);
    expect(summary.receivedValue).toBe(9000);
  });

  it('leaves rejected POs out of every bucket', () => {
    const all = [...summary.pending, ...summary.committed, ...summary.received];
    expect(all.map((row) => row.id)).not.toContain('po-6');
  });

  it('returns the underlying rows alongside the totals', () => {
    expect(summary.pending.map((row) => row.id)).toEqual(['po-1', 'po-2']);
  });

  it('zeroes cleanly with no purchase orders', () => {
    expect(poSummary([])).toMatchObject({
      openCount: 0, openValue: 0, committedCount: 0, committedValue: 0,
    });
  });

  it('tolerates a missing list', () => {
    expect(poSummary(undefined).openCount).toBe(0);
  });
});

describe('poApprovalQueue', () => {
  it('shows only what is actually awaiting a decision', () => {
    expect(poApprovalQueue(POS).map((row) => row.id)).toEqual(['po-1', 'po-2']);
  });

  it('puts critical machines at the top', () => {
    const queue = poApprovalQueue(POS);
    expect(queue[0].priority).toBe('critical');
  });

  it('breaks a priority tie with the oldest request, so a small PO is never starved', () => {
    const rows = normalizePos([
      { id: 'young', status: 'pending', priority: 'critical', created_date: daysAgo(1), total_amount: 90_000 },
      { id: 'old', status: 'pending', priority: 'critical', created_date: daysAgo(9), total_amount: 5000 },
    ], { now: NOW });
    expect(poApprovalQueue(rows).map((row) => row.id)).toEqual(['old', 'young']);
  });

  it('breaks an age tie with the larger number', () => {
    const rows = normalizePos([
      { id: 'small', status: 'pending', priority: 'critical', created_date: daysAgo(4), total_amount: 5000 },
      { id: 'big', status: 'pending', priority: 'critical', created_date: daysAgo(4), total_amount: 90_000 },
    ], { now: NOW });
    expect(poApprovalQueue(rows).map((row) => row.id)).toEqual(['big', 'small']);
  });

  it('orders the four priority bands correctly', () => {
    const rows = normalizePos(
      ['low', 'critical', 'medium', 'high'].map((priority, index) => ({
        id: priority, status: 'pending', priority, created_date: daysAgo(index), total_amount: 1000,
      })),
      { now: NOW },
    );
    expect(poApprovalQueue(rows).map((row) => row.priority))
      .toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('does not mutate the list it was given', () => {
    const before = POS.map((row) => row.id);
    poApprovalQueue(POS);
    expect(POS.map((row) => row.id)).toEqual(before);
  });

  it('tolerates a missing list', () => {
    expect(poApprovalQueue(undefined)).toEqual([]);
  });
});

describe('weeklySpend', () => {
  const week = weeklySpend(POS, { now: NOW });

  it('buckets seven days', () => {
    expect(week.days).toHaveLength(7);
  });

  it('ends on today', () => {
    expect(week.days[6].key).toBe(NOW.toISOString().slice(0, 10));
  });

  it('totals the spend raised inside the window', () => {
    expect(week.total).toBe(131_000);
  });

  it('excludes a rejected PO from the spend', () => {
    // po-6 was raised yesterday for ₹99,000 but was cancelled.
    expect(week.total).toBeLessThan(131_000 + 99_000);
  });

  it('excludes a PO older than the window', () => {
    const older = weeklySpend(
      normalizePos([{ id: 'x', status: 'approved', created_date: daysAgo(30), total_amount: 5000 }], { now: NOW }),
      { now: NOW },
    );
    expect(older.total).toBe(0);
  });

  it('books each PO into the day it was raised', () => {
    const day = week.days.find((bucket) => bucket.key === daysAgo(3).slice(0, 10));
    expect(day.value).toBe(48_000);
  });

  it('spreads the budget evenly across the days', () => {
    expect(week.days[0].budget).toBe(Math.round(DEFAULT_WEEKLY_PO_BUDGET / 7));
  });

  it('reports the week as inside budget when it is', () => {
    expect(week.overBudget).toBe(false);
    expect(week.variance).toBe(131_000 - DEFAULT_WEEKLY_PO_BUDGET);
  });

  it('states the variance as a percentage of budget', () => {
    expect(week.variancePct).toBe(-13);
  });

  it('flags an overspent week', () => {
    const tight = weeklySpend(POS, { now: NOW, budget: 100_000 });
    expect(tight.overBudget).toBe(true);
    expect(tight.variance).toBe(31_000);
    expect(tight.variancePct).toBe(31);
  });

  it('reports no variance percentage against a zero budget rather than dividing by it', () => {
    expect(weeklySpend(POS, { now: NOW, budget: 0 }).variancePct).toBeNull();
  });

  it('honours a custom window length', () => {
    expect(weeklySpend(POS, { now: NOW, days: 14 }).days).toHaveLength(14);
  });

  it('labels each day for the axis', () => {
    week.days.forEach((day) => expect(day.label).toMatch(/\S/));
  });

  it('tolerates a missing list', () => {
    expect(weeklySpend(undefined, { now: NOW }).total).toBe(0);
  });
});

/* ===========================================================
   Financial metrics
   =========================================================== */

describe('inventoryValue', () => {
  it('values the shelf at cost', () => {
    expect(inventoryValue(SHELF)).toBe(117_000);
  });

  it('is zero for an empty shelf', () => {
    expect(inventoryValue([])).toBe(0);
  });

  it('tolerates a missing list', () => {
    expect(inventoryValue(undefined)).toBe(0);
  });
});

describe('carryingCost', () => {
  it('charges 20% a year against the stock value', () => {
    expect(carryingCost(117_000)).toBe(23_400);
  });

  it('rounds to whole rupees', () => {
    expect(Number.isInteger(carryingCost(12_345))).toBe(true);
  });

  it('honours a custom rate', () => {
    expect(carryingCost(100_000, { rate: 0.1 })).toBe(10_000);
  });

  it('is zero on an empty shelf', () => {
    expect(carryingCost(0)).toBe(0);
  });

  it('coerces junk to zero rather than NaN', () => {
    expect(carryingCost('lots')).toBe(0);
    expect(carryingCost(null)).toBe(0);
  });
});

describe('valueByCriticality', () => {
  const composition = valueByCriticality(SHELF);
  const band = (key) => composition.find((row) => row.key === key);

  it('always returns the four bands, in descending order of importance', () => {
    expect(composition.map((row) => row.key)).toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('labels each band for the legend', () => {
    expect(composition.map((row) => row.label)).toEqual(['Critical', 'High', 'Medium', 'Low']);
  });

  it('splits the shelf value across the bands', () => {
    expect(band('critical').value).toBe(36_000);
    expect(band('high').value).toBe(21_000);
    expect(band('medium').value).toBe(0);
    expect(band('low').value).toBe(60_000);
  });

  it('adds back to the whole shelf', () => {
    expect(composition.reduce((sum, row) => sum + row.value, 0)).toBe(117_000);
  });

  it('states each band as a share of the total', () => {
    expect(band('critical').pct).toBe(30.8);
    expect(band('high').pct).toBe(17.9);
    expect(band('low').pct).toBe(51.3);
  });

  it('keeps the members of each band for the drill-down', () => {
    expect(band('critical').items.map((row) => row.id).sort()).toEqual(['crit-low', 'crit-zero']);
  });

  it('shows an empty band as 0% rather than NaN', () => {
    expect(band('medium').pct).toBe(0);
  });

  it('renders all-zero percentages on an empty shelf rather than dividing by zero', () => {
    valueByCriticality([]).forEach((row) => {
      expect(row.value).toBe(0);
      expect(row.pct).toBe(0);
    });
  });

  it('tolerates a missing list', () => {
    expect(valueByCriticality(undefined)).toHaveLength(4);
  });
});

describe('sparePartsRoi', () => {
  const roi = sparePartsRoi(SHELF);

  it('reads monthly consumption against the value on the shelf', () => {
    expect(roi.usageValue).toBe(63_000);
    expect(roi.inventoryValue).toBe(117_000);
  });

  it('states the turn as a percentage', () => {
    expect(roi.pct).toBe(53.8);
  });

  it('annualises the turn rate', () => {
    expect(roi.turnsPerYear).toBe(6.5);
  });

  it('returns null — not 0% — when there is no stock to divide by', () => {
    const empty = sparePartsRoi([]);
    expect(empty.pct).toBeNull();
    expect(empty.turnsPerYear).toBeNull();
    expect(empty.inventoryValue).toBe(0);
  });

  it('reports a genuine 0% for stock that nothing consumes', () => {
    const dead = sparePartsRoi([one({ monthly_usage: 0, stock_qty: 10, unit_cost: 1000 })]);
    expect(dead.pct).toBe(0);
    expect(dead.usageValue).toBe(0);
  });

  it('tolerates a missing list', () => {
    expect(sparePartsRoi(undefined).pct).toBeNull();
  });
});

describe('obsolescenceRisk', () => {
  const risk = obsolescenceRisk(SHELF);

  it('counts only what has not moved in 180 days', () => {
    expect(risk.count).toBe(1);
    expect(risk.items[0].id).toBe('dead');
  });

  it('totals the capital tied up in it', () => {
    expect(risk.value).toBe(20_000);
  });

  it('does not count an item that has never been issued — that is unknown, not dead', () => {
    expect(obsolescenceRisk([one({ last_used_date: null })]).count).toBe(0);
  });

  it('excludes an item used 179 days ago', () => {
    expect(obsolescenceRisk([one({ last_used_date: daysAgo(179) })]).count).toBe(0);
  });

  it('includes an item used exactly 180 days ago', () => {
    expect(obsolescenceRisk([one({ last_used_date: daysAgo(180) })]).count).toBe(1);
  });

  it('honours a custom threshold', () => {
    // Ages on the shelf: 300, 10, 4, 3, 2, 1 days.
    expect(obsolescenceRisk(SHELF, { thresholdDays: 90 }).count).toBe(1);
    expect(obsolescenceRisk(SHELF, { thresholdDays: 5 }).count).toBe(2);
    expect(obsolescenceRisk(SHELF, { thresholdDays: 4 }).count).toBe(3);
  });

  it('lists the most expensive dead stock first', () => {
    const rows = obsolescenceRisk([
      one({ id: 'cheap', last_used_date: daysAgo(200), stock_qty: 1, unit_cost: 100 }),
      one({ id: 'dear', last_used_date: daysAgo(200), stock_qty: 1, unit_cost: 90_000 }),
    ]);
    expect(rows.items.map((row) => row.id)).toEqual(['dear', 'cheap']);
  });

  it('tolerates a missing list', () => {
    expect(obsolescenceRisk(undefined).count).toBe(0);
  });
});

describe('usageBand', () => {
  it('calls something never issued "never" rather than obsolete', () => {
    expect(usageBand(null)).toBe('never');
  });

  it('calls anything inside 30 days active', () => {
    expect(usageBand(0)).toBe('active');
    expect(usageBand(30)).toBe('active');
  });

  it('calls 31 to 179 days slow', () => {
    expect(usageBand(31)).toBe('slow');
    expect(usageBand(179)).toBe('slow');
  });

  it('calls 180 days and beyond obsolete', () => {
    expect(usageBand(180)).toBe('obsolete');
    expect(usageBand(400)).toBe('obsolete');
  });
});

describe('usageAnalytics', () => {
  const rows = usageAnalytics(SHELF);

  it('covers every item', () => {
    expect(rows).toHaveLength(SHELF.length);
  });

  it('lists the stalest stock first — the red rows a reader scans for', () => {
    expect(rows.map((row) => row.id))
      .toEqual(['dead', 'crit-zero', 'healthy', 'crit-low', 'risk', 'over']);
  });

  it('sorts never-issued stock to the very top', () => {
    const never = one({ id: 'never', last_used_date: null });
    expect(usageAnalytics([...SHELF, never])[0].id).toBe('never');
  });

  it('bands each row', () => {
    expect(rows.find((row) => row.id === 'dead').usageBand).toBe('obsolete');
    expect(rows.find((row) => row.id === 'over').usageBand).toBe('active');
  });

  it('recommends disposing of dead, non-critical stock', () => {
    expect(rows.find((row) => row.id === 'dead').recommendDisposal).toBe(true);
  });

  it('never recommends scrapping a critical spare, however long it has sat', () => {
    const insurance = one({
      id: 'insurance', machine_priority: 'critical', lead_time_days: 30,
      unit_cost: 28_000, last_used_date: daysAgo(500), stock_qty: 1, reorder_level: 0,
    });
    const analysed = usageAnalytics([insurance])[0];
    expect(analysed.usageBand).toBe('obsolete');
    expect(analysed.criticality).toBe('critical');
    expect(analysed.recommendDisposal).toBe(false);
  });

  it('quotes recoverable value only for obsolete rows', () => {
    expect(rows.find((row) => row.id === 'dead').recoverableValue).toBe(20_000);
    expect(rows.find((row) => row.id === 'over').recoverableValue).toBe(0);
  });

  it('keeps the underlying item fields intact for the table', () => {
    const row = rows.find((entry) => entry.id === 'dead');
    expect(row.name).toBe('Legacy Coupling');
    expect(row.unitCost).toBe(4000);
    expect(row.daysSinceLastUse).toBe(300);
  });

  it('tolerates a missing list', () => {
    expect(usageAnalytics(undefined)).toEqual([]);
  });
});

describe('savingsOpportunities', () => {
  const savings = savingsOpportunities(SHELF, { now: NOW });
  const opp = (key) => savings.opportunities.find((row) => row.key === key);

  it('always offers the same three levers', () => {
    expect(savings.opportunities.map((row) => row.key).sort())
      .toEqual(['consolidation', 'jit', 'obsolete']);
  });

  it('ranks the biggest opportunity first', () => {
    const values = savings.opportunities.map((row) => row.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it('values removing obsolete stock at what can actually be released', () => {
    expect(opp('obsolete').value).toBe(20_000);
  });

  it('values JIT ordering only on the stock held above the max level', () => {
    // 50 on hand against a max of 20, at ₹200 each.
    expect(opp('jit').value).toBe(6000);
  });

  it('finds no consolidation saving when every part has one vendor', () => {
    expect(opp('consolidation').value).toBe(0);
  });

  it('finds a consolidation saving when a part is dual-sourced', () => {
    const dual = [
      one({ id: 'a', part_number: 'PN-D', supplier: 'S1', unit_cost: 1000, monthly_usage: 2 }),
      one({ id: 'b', part_number: 'PN-D', supplier: 'S2', unit_cost: 1400, monthly_usage: 3 }),
    ];
    const result = savingsOpportunities(dual, { now: NOW });
    expect(result.opportunities.find((row) => row.key === 'consolidation').value).toBe(24_000);
  });

  it('totals the three levers', () => {
    expect(savings.total).toBe(26_000);
  });

  it('explains each lever in a sentence', () => {
    expect(opp('obsolete').detail).toBe('1 item unused for 180+ days');
    expect(opp('jit').detail).toBe('1 item held above max level');
    expect(opp('consolidation').detail).toBe('0 parts sourced from more than one vendor');
  });

  it('pluralises the explanations correctly', () => {
    const two = savingsOpportunities([
      one({ id: 'd1', last_used_date: daysAgo(300), stock_qty: 1 }),
      one({ id: 'd2', last_used_date: daysAgo(300), stock_qty: 1 }),
    ], { now: NOW });
    expect(two.opportunities.find((row) => row.key === 'obsolete').detail)
      .toBe('2 items unused for 180+ days');
  });

  it('excludes obsolete critical spares from the disposal figure', () => {
    const insurance = one({
      id: 'insurance', machine_priority: 'critical', lead_time_days: 30,
      unit_cost: 28_000, last_used_date: daysAgo(500), stock_qty: 2, reorder_level: 0,
    });
    const result = savingsOpportunities([insurance], { now: NOW });
    expect(result.opportunities.find((row) => row.key === 'obsolete').value).toBe(0);
  });

  it('stamps when it was generated', () => {
    expect(savings.generatedAt).toBe(NOW.toISOString());
  });

  it('offers nothing but still returns the shape on an empty shelf', () => {
    const empty = savingsOpportunities([], { now: NOW });
    expect(empty.total).toBe(0);
    expect(empty.opportunities).toHaveLength(3);
  });

  it('tolerates a missing list', () => {
    expect(savingsOpportunities(undefined, { now: NOW }).total).toBe(0);
  });
});

describe('costTrends', () => {
  const TREND_POS = normalizePos([
    { id: 't1', status: 'ordered', created_date: daysAgo(5), total_amount: 10_000 },
    { id: 't2', status: 'received', created_date: daysAgo(40), total_amount: 20_000 },
    { id: 't3', status: 'received', created_date: daysAgo(70), total_amount: 15_000 },
    { id: 't4', status: 'cancelled', created_date: daysAgo(45), total_amount: 99_000 },
  ], { now: NOW });
  const trends = costTrends(SHELF, TREND_POS, { now: NOW });

  it('covers twelve months', () => {
    expect(trends.months).toHaveLength(12);
  });

  it('ends on the current month', () => {
    expect(trends.months[11].key).toBe('2026-07');
  });

  it('walks back a year', () => {
    expect(trends.months[0].key).toBe('2025-08');
  });

  it('books each PO into the month it was raised', () => {
    expect(trends.months[11].spend).toBe(10_000);
    expect(trends.months[10].spend).toBe(20_000);
    expect(trends.months[9].spend).toBe(15_000);
  });

  it('excludes a cancelled PO from the spend line', () => {
    expect(trends.totalSpend).toBe(45_000);
  });

  it('anchors the value line on today\'s actual stock value', () => {
    expect(trends.months[11].value).toBe(117_000);
  });

  it('reconstructs earlier months backwards, net of each month\'s receipts', () => {
    expect(trends.months[10].value).toBe(107_000);
    expect(trends.months[9].value).toBe(87_000);
    expect(trends.months[8].value).toBe(72_000);
  });

  it('charges carrying cost monthly at a twelfth of the annual rate', () => {
    expect(trends.months[11].carrying).toBe(1950);
    expect(trends.months[8].carrying).toBe(1200);
  });

  it('states the year-on-year change in stock value', () => {
    expect(trends.valueChangePct).toBe(63);
  });

  it('never renders a negative stock level, however heavy a month was', () => {
    const heavy = costTrends(
      SHELF,
      normalizePos([{ id: 'h', status: 'ordered', created_date: daysAgo(2), total_amount: 5_000_000 }], { now: NOW }),
      { now: NOW },
    );
    expect(heavy.months.every((month) => month.value >= 0)).toBe(true);
  });

  it('reports no change percentage when the series starts at zero', () => {
    const heavy = costTrends(
      SHELF,
      normalizePos([{ id: 'h', status: 'ordered', created_date: daysAgo(2), total_amount: 5_000_000 }], { now: NOW }),
      { now: NOW },
    );
    expect(heavy.valueChangePct).toBeNull();
  });

  it('labels itself an estimate, because we keep no monthly stock snapshots', () => {
    expect(trends.estimated).toBe(true);
  });

  it('honours a custom window', () => {
    expect(costTrends(SHELF, TREND_POS, { now: NOW, months: 6 }).months).toHaveLength(6);
  });

  it('labels every month for the axis', () => {
    trends.months.forEach((month) => expect(month.label).toMatch(/\S/));
  });

  it('tolerates missing inputs', () => {
    expect(costTrends(undefined, undefined, { now: NOW }).months).toHaveLength(12);
  });
});

/* ===========================================================
   Alerts and filtering
   =========================================================== */

describe('inventoryAlerts', () => {
  const alerts = inventoryAlerts(SHELF);

  it('raises one alert per item that needs attention, and none for the rest', () => {
    expect(alerts.map((alert) => alert.itemId))
      .toEqual(['crit-zero', 'crit-low', 'risk', 'over']);
  });

  it('says nothing about healthy or obsolete stock — neither needs a decision today', () => {
    const ids = alerts.map((alert) => alert.itemId);
    expect(ids).not.toContain('healthy');
    expect(ids).not.toContain('dead');
  });

  it('orders critical, then warning, then opportunity', () => {
    expect(alerts.map((alert) => alert.level))
      .toEqual(['critical', 'critical', 'warning', 'opportunity']);
  });

  it('tells a stockout apart from a low shelf', () => {
    expect(alerts[0].message).toBe('stock = 0, lead time 30 days. Order immediately.');
    expect(alerts[1].message).toBe('3 left against a reorder level of 10. Order now.');
  });

  it('names the part and its number in the title', () => {
    expect(alerts[0].title).toBe('Spindle Bearing (PN-SB1)');
  });

  it('omits the brackets when there is no part number', () => {
    const alert = inventoryAlerts([one({ id: 'x', part_number: '', stock_qty: 0 })])[0];
    expect(alert.title).toBe('Generic Part');
  });

  it('quotes the lead time in the at-risk warning', () => {
    expect(alerts[2].message).toBe('at reorder point. Supplier has a 14-day lead time.');
  });

  it('suggests a concrete target when something is overstocked', () => {
    expect(alerts[3].message)
      .toBe('used 10× last month, 50 in stock. Consider reducing to 20.');
  });

  it('stays quiet about overstock nobody ever uses — that is an obsolescence story', () => {
    const idle = one({ id: 'idle', stock_qty: 50, reorder_level: 5, monthly_usage: 0 });
    expect(inventoryAlerts([idle])).toEqual([]);
  });

  it('ranks a more critical part above a less critical one at the same level', () => {
    expect(alerts[0].weight).toBeGreaterThan(alerts[1].weight);
  });

  it('gives every alert a stable, unique id', () => {
    const ids = alerts.map((alert) => alert.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('caps the list at six by default so the banner stays readable', () => {
    const many = Array.from({ length: 20 }, (_, index) => one({ id: `z${index}`, stock_qty: 0 }));
    expect(inventoryAlerts(many)).toHaveLength(6);
  });

  it('honours a custom limit', () => {
    expect(inventoryAlerts(SHELF, { limit: 2 })).toHaveLength(2);
  });

  it('tolerates a missing list', () => {
    expect(inventoryAlerts(undefined)).toEqual([]);
  });
});

describe('filterItems', () => {
  it('returns everything by default', () => {
    expect(filterItems(SHELF)).toHaveLength(6);
    expect(filterItems(SHELF, {})).toHaveLength(6);
  });

  it('searches the part name', () => {
    expect(filterItems(SHELF, { search: 'belt' }).map((row) => row.id)).toEqual(['risk']);
  });

  it('searches the part number', () => {
    expect(filterItems(SHELF, { search: 'PN-PLC' }).map((row) => row.id)).toEqual(['crit-low']);
  });

  it('searches the machine', () => {
    expect(filterItems(SHELF, { search: 'WELD' }).map((row) => row.id)).toEqual(['crit-low']);
  });

  it('searches the supplier', () => {
    expect(filterItems(SHELF, { search: 'GenSupply' }).map((row) => row.id))
      .toEqual(['over', 'dead']);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(filterItems(SHELF, { search: '  DRIVE belt ' })).toHaveLength(1);
  });

  it('returns nothing for a search that matches nothing', () => {
    expect(filterItems(SHELF, { search: 'flux capacitor' })).toEqual([]);
  });

  it('filters by stock status', () => {
    expect(filterItems(SHELF, { status: STOCK_STATUS.CRITICAL })).toHaveLength(2);
    expect(filterItems(SHELF, { status: STOCK_STATUS.OBSOLETE })).toHaveLength(1);
  });

  it('filters by criticality band', () => {
    expect(filterItems(SHELF, { criticality: 'critical' }).map((row) => row.id))
      .toEqual(['crit-zero', 'crit-low']);
  });

  it('filters by supplier', () => {
    expect(filterItems(SHELF, { supplier: 'AutoParts' })).toHaveLength(2);
  });

  it('filters by machine', () => {
    expect(filterItems(SHELF, { machine: 'PRESS-03' })).toHaveLength(3);
  });

  it('combines filters as AND, not OR', () => {
    expect(filterItems(SHELF, { machine: 'PRESS-03', status: STOCK_STATUS.OBSOLETE }))
      .toHaveLength(1);
    expect(filterItems(SHELF, { machine: 'CNC-01', status: STOCK_STATUS.OBSOLETE }))
      .toHaveLength(0);
  });

  it('treats "all" as no filter at all', () => {
    expect(filterItems(SHELF, {
      status: 'all', criticality: 'all', supplier: 'all', machine: 'all',
    })).toHaveLength(6);
  });

  it('does not mutate the list it filters', () => {
    filterItems(SHELF, { status: STOCK_STATUS.CRITICAL });
    expect(SHELF).toHaveLength(6);
  });

  it('tolerates a missing list', () => {
    expect(filterItems(undefined, { search: 'belt' })).toEqual([]);
  });
});

/* ===========================================================
   Role assembly
   =========================================================== */

describe('buildInventoryMetrics', () => {
  const input = { items: SHELF, pos: POS, suppliers: SUPPLIERS, now: NOW };

  describe('shared across every board', () => {
    it.each(Object.values(INVENTORY_ROLES))('gives the %s board the shared block', (role) => {
      const metrics = buildInventoryMetrics(role, input);
      expect(metrics.items).toHaveLength(6);
      expect(metrics.pos).toHaveLength(6);
      expect(metrics.health.total).toBe(6);
      expect(Array.isArray(metrics.alerts)).toBe(true);
      expect(Array.isArray(metrics.machines)).toBe(true);
    });

    it.each(Object.values(INVENTORY_ROLES))('stamps the resolved role on the %s board', (role) => {
      expect(buildInventoryMetrics(role, input).role).toBe(role);
    });

    it('reports the same shelf value to every board', () => {
      Object.values(INVENTORY_ROLES).forEach((role) => {
        expect(buildInventoryMetrics(role, input).inventoryValue).toBe(117_000);
      });
    });
  });

  describe('store manager board', () => {
    const metrics = buildInventoryMetrics('store_manager', input);

    it('is what an unknown role gets too', () => {
      expect(buildInventoryMetrics('nobody', input).role).toBe(INVENTORY_ROLES.STORE);
    });

    it('gets the reorder queue', () => {
      expect(metrics.reorderQueue.map((row) => row.id))
        .toEqual(['crit-zero', 'crit-low', 'risk']);
    });

    it('gets the supplier directory', () => {
      expect(metrics.suppliers).toHaveLength(4);
      expect(metrics.suppliers[0]).toHaveProperty('contact');
    });

    it('gets the bin map', () => {
      expect(metrics.bins.map((bin) => bin.section)).toEqual(['A', 'B', 'C']);
    });

    it('does not pay to compute the finance board', () => {
      expect(metrics.trends).toBeUndefined();
      expect(metrics.savings).toBeUndefined();
      expect(metrics.usage).toBeUndefined();
    });

    it('does not pay to compute the approval queue', () => {
      expect(metrics.approvalQueue).toBeUndefined();
    });
  });

  describe('supervisor board', () => {
    const metrics = buildInventoryMetrics('supervisor', input);

    it('gets the open and committed spend position', () => {
      expect(metrics.poSummary.openCount).toBe(2);
      expect(metrics.poSummary.openValue).toBe(69_000);
      expect(metrics.poSummary.committedValue).toBe(62_000);
    });

    it('gets the approval queue', () => {
      expect(metrics.approvalQueue.map((row) => row.id)).toEqual(['po-1', 'po-2']);
    });

    it('gets the stockout risks behind the red banner', () => {
      expect(metrics.stockoutRisks.map((row) => row.id)).toEqual(['crit-zero']);
    });

    it('gets the weekly spend chart', () => {
      expect(metrics.weeklySpend.days).toHaveLength(7);
      expect(metrics.weeklySpend.total).toBe(131_000);
    });

    it('gets supplier performance', () => {
      expect(metrics.suppliers.find((row) => row.name === 'AutoParts').reliability).toBe(86);
    });

    it('gets a short auto-order shortlist rather than the whole queue', () => {
      expect(metrics.autoOrderCandidates.length).toBeLessThanOrEqual(5);
      expect(metrics.autoOrderCandidates[0].suggestion).toBeDefined();
    });

    it('does not pay to compute the finance board', () => {
      expect(metrics.trends).toBeUndefined();
      expect(metrics.roi).toBeUndefined();
    });

    it('does not pay to compute the bin map', () => {
      expect(metrics.bins).toBeUndefined();
    });
  });

  describe('finance board', () => {
    const metrics = buildInventoryMetrics('finance', input);

    it('gets the four headline numbers', () => {
      expect(metrics.inventoryValue).toBe(117_000);
      expect(metrics.carryingCost).toBe(23_400);
      expect(metrics.roi.pct).toBe(53.8);
      expect(metrics.obsolescence.value).toBe(20_000);
    });

    it('gets the composition split', () => {
      expect(metrics.composition).toHaveLength(4);
    });

    it('gets twelve months of trend', () => {
      expect(metrics.trends.months).toHaveLength(12);
    });

    it('gets the savings levers', () => {
      expect(metrics.savings.opportunities).toHaveLength(3);
      expect(metrics.savings.total).toBe(26_000);
    });

    it('gets the usage table', () => {
      expect(metrics.usage).toHaveLength(6);
      expect(metrics.usage[0].usageBand).toBe('obsolete');
    });

    it('gets the dual-sourcing comparison', () => {
      expect(Array.isArray(metrics.costComparison)).toBe(true);
    });

    it('does not pay to compute the reorder queue', () => {
      expect(metrics.reorderQueue).toBeUndefined();
      expect(metrics.bins).toBeUndefined();
    });
  });

  describe('input handling', () => {
    it('builds items from raw tables when none were pre-normalised', () => {
      const metrics = buildInventoryMetrics('store', {
        parts: SHELF_PARTS, purchaseOrders: PO_ROWS, suppliers: SUPPLIERS, now: NOW,
      });
      expect(metrics.items).toHaveLength(6);
      expect(metrics.pos).toHaveLength(6);
      expect(metrics.inventoryValue).toBe(117_000);
    });

    it('accepts an already-resolved board key as the role', () => {
      expect(buildInventoryMetrics(INVENTORY_ROLES.FINANCE, input).role)
        .toBe(INVENTORY_ROLES.FINANCE);
    });

    it('returns a usable store board with no arguments at all', () => {
      const metrics = buildInventoryMetrics();
      expect(metrics.role).toBe(INVENTORY_ROLES.STORE);
      expect(metrics.items).toEqual([]);
      expect(metrics.health.total).toBe(0);
      expect(metrics.inventoryValue).toBe(0);
    });

    it('returns a usable finance board with an empty workspace', () => {
      const metrics = buildInventoryMetrics('finance', { now: NOW });
      expect(metrics.inventoryValue).toBe(0);
      expect(metrics.carryingCost).toBe(0);
      expect(metrics.roi.pct).toBeNull();
      expect(metrics.trends.months).toHaveLength(12);
    });

    it('returns a usable supervisor board with an empty workspace', () => {
      const metrics = buildInventoryMetrics('supervisor', { now: NOW });
      expect(metrics.poSummary.openCount).toBe(0);
      expect(metrics.approvalQueue).toEqual([]);
      expect(metrics.stockoutRisks).toEqual([]);
    });

    it('does not mutate the items it was handed', () => {
      const snapshot = JSON.stringify(SHELF);
      buildInventoryMetrics('finance', input);
      buildInventoryMetrics('supervisor', input);
      buildInventoryMetrics('store', input);
      expect(JSON.stringify(SHELF)).toBe(snapshot);
    });

    it('is deterministic — the same input twice gives the same numbers', () => {
      const a = buildInventoryMetrics('finance', input);
      const b = buildInventoryMetrics('finance', input);
      expect(a.inventoryValue).toBe(b.inventoryValue);
      expect(a.savings.total).toBe(b.savings.total);
      expect(a.trends.totalSpend).toBe(b.trends.totalSpend);
    });
  });
});

/* ===========================================================
   Cache
   =========================================================== */

describe('createInventoryCache', () => {
  it('computes a key once and reuses it', () => {
    const cache = createInventoryCache();
    let calls = 0;
    const compute = () => { calls += 1; return 'value'; };

    expect(cache.resolve('k', compute)).toBe('value');
    expect(cache.resolve('k', compute)).toBe('value');
    expect(calls).toBe(1);
  });

  it('keeps different keys apart', () => {
    const cache = createInventoryCache();
    cache.resolve('a', () => 1);
    cache.resolve('b', () => 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('recomputes after a clear — what the page does on every write', () => {
    const cache = createInventoryCache();
    let calls = 0;
    const compute = () => { calls += 1; return calls; };

    cache.resolve('k', compute);
    cache.clear();
    cache.resolve('k', compute);
    expect(calls).toBe(2);
  });

  it('expires an entry once its TTL passes', () => {
    let clock = 0;
    const cache = createInventoryCache({ ttlMs: 1000, clock: () => clock });
    cache.resolve('k', () => 'first');
    clock = 1500;
    expect(cache.resolve('k', () => 'second')).toBe('second');
  });

  it('reports a miss as undefined', () => {
    expect(createInventoryCache().get('nothing')).toBeUndefined();
  });
});

/* ===========================================================
   Re-exported helpers — one import for inventory components
   =========================================================== */

describe('re-exported helpers', () => {
  it('re-exports the array and number coercions', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray([1])).toEqual([1]);
    expect(asNumber('12')).toBe(12);
    expect(asNumber('twelve')).toBe(0);
  });

  it('re-exports the one-decimal rounder', () => {
    expect(round1(2.349)).toBe(2.3);
  });

  it('re-exports the rupee day constant', () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });

  it('re-exports the rupee formatter, which renders no data as a dash', () => {
    expect(formatInr(null)).toBe('—');
    expect(formatInr(1000)).toContain('1,000');
  });

  it('re-exports the compact rupee formatter with Indian units', () => {
    expect(formatInrCompact(480_000)).toBe('₹4.8L');
    expect(formatInrCompact(12_000_000)).toBe('₹1.2Cr');
    expect(formatInrCompact(null)).toBe('—');
  });

  it('re-exports the percentage formatter, which distinguishes 0% from no data', () => {
    expect(formatPct(0)).toBe('0%');
    expect(formatPct(null)).toBe('No data yet');
  });

  it('re-exports the stored-user reader', () => {
    const storage = { getItem: () => JSON.stringify({ role: 'supervisor' }) };
    expect(readStoredUser(storage)).toEqual({ role: 'supervisor' });
  });

  it('reads a signed-out visitor as null rather than throwing', () => {
    expect(readStoredUser({ getItem: () => null })).toBeNull();
    expect(readStoredUser({ getItem: () => 'not json' })).toBeNull();
  });

  it('resolves a stored user straight onto a board', () => {
    const storage = { getItem: () => JSON.stringify({ role: 'cfo' }) };
    expect(resolveInventoryRole(readStoredUser(storage)?.role)).toBe(INVENTORY_ROLES.FINANCE);
  });
});
