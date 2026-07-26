/* ===========================================================
   TurboFix — Demo inventory
   ===========================================================

   Shown only when the signed-in company has no parts, consumables or
   purchase orders yet, so a brand-new workspace still demonstrates what
   the three inventory boards do instead of presenting an empty page.

   The set is tuned so every status, band and opportunity the boards can
   render actually appears at least once:

     SB-4410-X   stock 0, critical machine, 21d lead     → red    (critical)
     PLC-IO-32X  1 available vs reorder 2, 30d lead      → red    (critical)
     HS-9021-HP  1 available vs reorder 5                → red    (critical)
     PS-24V-OPT  4 available, reorder 4, safety band 6   → yellow (at risk)
     OIL-VG68    7 available vs reorder 25               → red    (critical)
     GR-EP2-HT   10 available, reorder 12                → red    (critical)
     VB-45B-HD   26 available vs max 24                  → blue   (overstocked)
     FLT-HYD-40  22 available, reorder 4, max 16         → blue   (overstocked)
     BRK-PAD-77  8 available, unused 240 days            → gray   (obsolete)
     RLY-24DC-O  6 available, unused 310 days            → gray   (obsolete)
     CB-M8-STD   30 available, reorder 10, max 60        → green  (healthy)
     ...

   Two parts (CB-M8-STD and BRG-6204) are deliberately stocked from two
   different vendors at different prices so the supplier-consolidation
   saving on the finance board is a real number, not a placeholder.

   Dates are relative to "now" so the boards always show a realistic
   spread regardless of when the demo is opened.
   =========================================================== */

const DAY = 24 * 60 * 60 * 1000;

/** Local date (YYYY-MM-DD) `offsetDays` from today. Negative is the past. */
const isoDate = (offsetDays) => {
  const date = new Date(Date.now() + offsetDays * DAY);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/* -----------------------------------------------------------
   Spare parts
   ----------------------------------------------------------- */

export const DEMO_PARTS = [
  {
    id: 'p-1',
    name: 'CNC Spindle High-Precision Bearing',
    part_number: 'SB-4410-X',
    associated_machine: 'CNC Milling Center #01',
    machine_priority: 'Critical',
    lead_time_days: 21,
    stock_qty: 0,
    reserved_qty: 0,
    reorder_level: 2,
    max_level: 6,
    unit_cost: 14500,
    monthly_usage: 1,
    supplier: 'SKF Precision Ltd',
    location: 'Bin A-04 (High Security)',
    last_used_date: isoDate(-12),
    auto_order: true,
    store_manager_note: 'Imported from Germany. Must maintain min 2 units buffer.',
  },
  {
    id: 'p-2',
    name: 'Hydraulic High-Pressure Seal Kit',
    part_number: 'HS-9021-HP',
    associated_machine: '50-Ton Hydraulic Press',
    machine_priority: 'Critical',
    lead_time_days: 14,
    stock_qty: 2,
    reserved_qty: 1,
    reorder_level: 5,
    max_level: 20,
    unit_cost: 3200,
    monthly_usage: 3,
    supplier: 'Bosch Rexroth',
    location: 'Bin H-12',
    last_used_date: isoDate(-6),
    store_manager_note: 'Prone to blowout under high tonnage continuous shifts.',
  },
  {
    id: 'p-3',
    name: 'Proximity Optical Sensor 24V',
    part_number: 'PS-24V-OPT',
    associated_machine: 'Main Automated Conveyor',
    machine_priority: 'High',
    lead_time_days: 7,
    stock_qty: 4,
    reserved_qty: 0,
    reorder_level: 4,
    max_level: 16,
    unit_cost: 2100,
    monthly_usage: 2,
    supplier: 'Omron Automation',
    location: 'Bin E-02',
    last_used_date: isoDate(-18),
    store_manager_note: 'Used across Line 1 & Line 2 conveyor interlocks.',
  },
  {
    id: 'p-4',
    name: 'Heavy-Duty Reinforced V-Belt 45-B',
    part_number: 'VB-45B-HD',
    associated_machine: 'Air Compressor Unit #02',
    machine_priority: 'Medium',
    lead_time_days: 3,
    stock_qty: 28,
    reserved_qty: 2,
    reorder_level: 6,
    max_level: 24,
    unit_cost: 550,
    monthly_usage: 2,
    supplier: 'Fenner Drives',
    location: 'Bin B-18',
    last_used_date: isoDate(-9),
    store_manager_note: 'Standard wear item. Local supplier delivers within 72 hrs.',
  },
  {
    id: 'p-5',
    name: 'PLC I/O Digital Extension Module',
    part_number: 'PLC-IO-32X',
    associated_machine: 'Robotic Welding Cell B',
    machine_priority: 'Critical',
    lead_time_days: 30,
    stock_qty: 2,
    reserved_qty: 1,
    reorder_level: 2,
    max_level: 4,
    unit_cost: 28000,
    monthly_usage: 0.5,
    supplier: 'Siemens Industrial',
    location: 'Bin E-01 (ESD Safe)',
    last_used_date: isoDate(-41),
    auto_order: true,
    store_manager_note: 'Longest lead time in factory. Auto-trigger PO when stock = 1.',
  },
  {
    id: 'p-6',
    name: 'Hydraulic Return Line Filter 40µ',
    part_number: 'FLT-HYD-40',
    associated_machine: '50-Ton Hydraulic Press',
    machine_priority: 'Critical',
    lead_time_days: 5,
    stock_qty: 22,
    reserved_qty: 0,
    reorder_level: 4,
    max_level: 16,
    unit_cost: 1250,
    monthly_usage: 2,
    supplier: 'Bosch Rexroth',
    location: 'Bin H-14',
    last_used_date: isoDate(-21),
    store_manager_note: 'Over-ordered during last shutdown. Draw down before reordering.',
  },
  {
    id: 'p-7',
    name: 'Furnace Brake Pad Set 77mm',
    part_number: 'BRK-PAD-77',
    associated_machine: 'Heat Treatment Furnace',
    machine_priority: 'Medium',
    lead_time_days: 10,
    stock_qty: 8,
    reserved_qty: 0,
    reorder_level: 2,
    max_level: 12,
    unit_cost: 4600,
    monthly_usage: 0,
    supplier: 'Fenner Drives',
    location: 'Bin C-07',
    last_used_date: isoDate(-240),
    store_manager_note: 'Held for the retired charging trolley. Review for disposal.',
  },
  {
    id: 'p-8',
    name: 'Control Relay 24VDC Omron-Type',
    part_number: 'RLY-24DC-O',
    associated_machine: 'Main Automated Conveyor',
    machine_priority: 'Low',
    lead_time_days: 4,
    stock_qty: 6,
    reserved_qty: 0,
    reorder_level: 2,
    max_level: 10,
    unit_cost: 1900,
    monthly_usage: 0,
    supplier: 'Omron Automation',
    location: 'Bin E-05',
    last_used_date: isoDate(-310),
    store_manager_note: 'Superseded by the solid-state relay on the Line 2 retrofit.',
  },
  {
    id: 'p-9',
    name: 'Cable Gland M8 Standard',
    part_number: 'CB-M8-STD',
    associated_machine: 'Robotic Welding Cell B',
    machine_priority: 'Low',
    lead_time_days: 2,
    stock_qty: 30,
    reserved_qty: 0,
    reorder_level: 10,
    max_level: 60,
    unit_cost: 180,
    monthly_usage: 6,
    supplier: 'Omron Automation',
    location: 'Bin B-02',
    last_used_date: isoDate(-3),
    store_manager_note: 'Fast-moving consumable hardware.',
  },
  {
    id: 'p-10',
    // Same part, second vendor — drives the consolidation saving.
    name: 'Cable Gland M8 Standard',
    part_number: 'CB-M8-STD',
    associated_machine: 'Main Automated Conveyor',
    machine_priority: 'Low',
    lead_time_days: 6,
    stock_qty: 18,
    reserved_qty: 0,
    reorder_level: 10,
    max_level: 60,
    unit_cost: 260,
    monthly_usage: 4,
    supplier: 'Fenner Drives',
    location: 'Bin B-03',
    last_used_date: isoDate(-5),
    store_manager_note: 'Legacy vendor line — same spec, 44% dearer than Omron.',
  },
  {
    id: 'p-11',
    name: 'Deep Groove Ball Bearing 6204-2RS',
    part_number: 'BRG-6204',
    associated_machine: 'Air Compressor Unit #02',
    machine_priority: 'High',
    lead_time_days: 4,
    stock_qty: 14,
    reserved_qty: 1,
    reorder_level: 4,
    max_level: 24,
    unit_cost: 720,
    monthly_usage: 3,
    supplier: 'SKF Precision Ltd',
    location: 'Bin A-11',
    last_used_date: isoDate(-8),
    store_manager_note: 'Common across three machines. Keep healthy cover.',
  },
  {
    id: 'p-12',
    // Same bearing, dearer vendor.
    name: 'Deep Groove Ball Bearing 6204-2RS',
    part_number: 'BRG-6204',
    associated_machine: 'Heat Treatment Furnace',
    machine_priority: 'High',
    lead_time_days: 9,
    stock_qty: 9,
    reserved_qty: 0,
    reorder_level: 4,
    max_level: 24,
    unit_cost: 1050,
    monthly_usage: 2,
    supplier: 'Bosch Rexroth',
    location: 'Bin C-11',
    last_used_date: isoDate(-15),
    store_manager_note: 'Sourced separately by the furnace team. Consolidate to SKF.',
  },
];

/* -----------------------------------------------------------
   Consumables
   ----------------------------------------------------------- */

export const DEMO_CONSUMABLES = [
  {
    id: 'c-1',
    name: 'Synthetic Hydro-Gear Oil ISO VG 68',
    part_number: 'OIL-VG68-SYN',
    associated_machine: '50-Ton Hydraulic Press',
    machine_priority: 'Critical',
    lead_time_days: 5,
    stock_qty: 15,
    reserved_qty: 8,
    reorder_level: 25,
    max_level: 80,
    unit_cost: 4200,
    monthly_usage: 12,
    supplier: 'Castrol Industrial',
    location: 'Drum Bay D-01',
    last_used_date: isoDate(-2),
    store_manager_note: '200L barrels. Required for the monthly PM shutdown oil change.',
  },
  {
    id: 'c-2',
    name: 'High-Temp Lithium Complex Grease EP2',
    part_number: 'GR-EP2-HT',
    associated_machine: 'Heat Treatment Furnace',
    machine_priority: 'High',
    lead_time_days: 4,
    stock_qty: 12,
    reserved_qty: 2,
    reorder_level: 12,
    max_level: 48,
    unit_cost: 850,
    monthly_usage: 8,
    supplier: 'Mobil Grease',
    location: 'Shelf G-03',
    last_used_date: isoDate(-1),
    store_manager_note: 'Daily lubrication consumable for furnace conveyor bearings.',
  },
  {
    id: 'c-3',
    name: 'MIG Welding Wire ER70S-6 1.2mm',
    part_number: 'WLD-ER70-12',
    associated_machine: 'Robotic Welding Cell B',
    machine_priority: 'Critical',
    lead_time_days: 6,
    stock_qty: 40,
    reserved_qty: 6,
    reorder_level: 15,
    max_level: 90,
    unit_cost: 620,
    monthly_usage: 18,
    supplier: 'Ador Welding',
    location: 'Shelf G-08',
    last_used_date: isoDate(-1),
    store_manager_note: '15kg spools. Consumption tracks welding-cell utilisation.',
  },
  {
    id: 'c-4',
    name: 'Industrial Lint-Free Wipe Roll',
    part_number: 'CLN-LF-ROLL',
    associated_machine: 'Plant General',
    machine_priority: 'Low',
    lead_time_days: 2,
    stock_qty: 55,
    reserved_qty: 0,
    reorder_level: 10,
    max_level: 40,
    unit_cost: 240,
    monthly_usage: 9,
    supplier: 'Ador Welding',
    location: 'Shelf G-01',
    last_used_date: isoDate(-1),
    store_manager_note: 'Bulk-bought at year end. Running well above max level.',
  },
];

/* -----------------------------------------------------------
   Purchase orders
   ----------------------------------------------------------- */

export const DEMO_PURCHASE_ORDERS = [
  {
    id: 'po-1',
    po_number: 'PO-2026-001',
    vendor: 'SKF Precision Ltd',
    status: 'pending',
    priority: 'Critical',
    requested_by: 'R. Sharma (Stores)',
    created_date: isoDate(-2),
    expected_delivery_date: isoDate(19),
    total_amount: 29000,
    items: [
      {
        name: 'CNC Spindle High-Precision Bearing',
        part_number: 'SB-4410-X',
        machine: 'CNC Milling Center #01',
        qty: 2,
        unit_cost: 14500,
      },
    ],
  },
  {
    id: 'po-2',
    po_number: 'PO-2026-002',
    vendor: 'Castrol Industrial',
    status: 'pending',
    priority: 'Critical',
    requested_by: 'R. Sharma (Stores)',
    created_date: isoDate(-1),
    expected_delivery_date: isoDate(4),
    total_amount: 84000,
    items: [
      {
        name: 'Synthetic Hydro-Gear Oil ISO VG 68',
        part_number: 'OIL-VG68-SYN',
        machine: '50-Ton Hydraulic Press',
        qty: 20,
        unit_cost: 4200,
      },
    ],
  },
  {
    id: 'po-3',
    po_number: 'PO-2026-003',
    vendor: 'Omron Automation',
    status: 'pending',
    priority: 'High',
    requested_by: 'A. Verma (Maintenance)',
    created_date: isoDate(-5),
    expected_delivery_date: isoDate(2),
    total_amount: 12600,
    items: [
      {
        name: 'Proximity Optical Sensor 24V',
        part_number: 'PS-24V-OPT',
        machine: 'Main Automated Conveyor',
        qty: 6,
        unit_cost: 2100,
      },
    ],
  },
  {
    id: 'po-4',
    po_number: 'PO-2026-004',
    vendor: 'Siemens Industrial',
    status: 'approved',
    priority: 'Critical',
    requested_by: 'R. Sharma (Stores)',
    created_date: isoDate(-9),
    expected_delivery_date: isoDate(21),
    total_amount: 56000,
    items: [
      {
        name: 'PLC I/O Digital Extension Module',
        part_number: 'PLC-IO-32X',
        machine: 'Robotic Welding Cell B',
        qty: 2,
        unit_cost: 28000,
      },
    ],
  },
  {
    id: 'po-5',
    po_number: 'PO-2026-005',
    vendor: 'Bosch Rexroth',
    status: 'ordered',
    priority: 'High',
    requested_by: 'A. Verma (Maintenance)',
    created_date: isoDate(-16),
    expected_delivery_date: isoDate(-1),
    total_amount: 32000,
    items: [
      {
        name: 'Hydraulic High-Pressure Seal Kit',
        part_number: 'HS-9021-HP',
        machine: '50-Ton Hydraulic Press',
        qty: 10,
        unit_cost: 3200,
      },
    ],
  },
  {
    id: 'po-6',
    po_number: 'PO-2026-006',
    vendor: 'Ador Welding',
    status: 'received',
    priority: 'Medium',
    requested_by: 'R. Sharma (Stores)',
    created_date: isoDate(-34),
    expected_delivery_date: isoDate(-26),
    total_amount: 24800,
    items: [
      {
        name: 'MIG Welding Wire ER70S-6 1.2mm',
        part_number: 'WLD-ER70-12',
        machine: 'Robotic Welding Cell B',
        qty: 40,
        unit_cost: 620,
      },
    ],
  },
  {
    id: 'po-7',
    po_number: 'PO-2026-007',
    vendor: 'Fenner Drives',
    status: 'received',
    priority: 'Low',
    requested_by: 'A. Verma (Maintenance)',
    created_date: isoDate(-62),
    expected_delivery_date: isoDate(-58),
    total_amount: 15400,
    items: [
      {
        name: 'Heavy-Duty Reinforced V-Belt 45-B',
        part_number: 'VB-45B-HD',
        machine: 'Air Compressor Unit #02',
        qty: 28,
        unit_cost: 550,
      },
    ],
  },
  {
    id: 'po-8',
    po_number: 'PO-2026-008',
    vendor: 'Mobil Grease',
    status: 'received',
    priority: 'Medium',
    requested_by: 'R. Sharma (Stores)',
    created_date: isoDate(-95),
    expected_delivery_date: isoDate(-91),
    total_amount: 20400,
    items: [
      {
        name: 'High-Temp Lithium Complex Grease EP2',
        part_number: 'GR-EP2-HT',
        machine: 'Heat Treatment Furnace',
        qty: 24,
        unit_cost: 850,
      },
    ],
  },
];

/* -----------------------------------------------------------
   Suppliers
   ----------------------------------------------------------- */

export const DEMO_SUPPLIERS = [
  {
    supplier_name: 'SKF Precision Ltd',
    contact: '+91 98200 41100',
    email: 'orders@skf-precision.example',
    response_time_days: 1,
    on_time_delivery_pct: 94,
    lead_time_avg: 19,
  },
  {
    supplier_name: 'Bosch Rexroth',
    contact: '+91 98200 41210',
    email: 'india.orders@rexroth.example',
    response_time_days: 2,
    on_time_delivery_pct: 88,
    lead_time_avg: 12,
  },
  {
    supplier_name: 'Omron Automation',
    contact: '+91 98200 41355',
    email: 'support@omron-auto.example',
    response_time_days: 1,
    on_time_delivery_pct: 97,
    lead_time_avg: 5,
  },
  {
    supplier_name: 'Siemens Industrial',
    contact: '+91 98200 41477',
    email: 'spares@siemens-ind.example',
    response_time_days: 3,
    on_time_delivery_pct: 79,
    lead_time_avg: 28,
  },
  {
    supplier_name: 'Fenner Drives',
    contact: '+91 98200 41588',
    email: 'sales@fennerdrives.example',
    response_time_days: 1,
    on_time_delivery_pct: 91,
    lead_time_avg: 4,
  },
  {
    supplier_name: 'Castrol Industrial',
    contact: '+91 98200 41699',
    email: 'bulk@castrol-ind.example',
    response_time_days: 2,
    on_time_delivery_pct: 85,
    lead_time_avg: 6,
  },
  {
    supplier_name: 'Mobil Grease',
    contact: '+91 98200 41733',
    email: 'orders@mobilgrease.example',
    response_time_days: 2,
    on_time_delivery_pct: 90,
    lead_time_avg: 5,
  },
  {
    supplier_name: 'Ador Welding',
    contact: '+91 98200 41844',
    email: 'consumables@ador.example',
    response_time_days: 1,
    on_time_delivery_pct: 96,
    lead_time_avg: 4,
  },
];

/**
 * True when the workspace has nothing to show. Purchase orders alone are
 * not enough — a store with POs but no parts still needs the demo shelf
 * for the health board to mean anything.
 */
export function shouldUseDemoInventory(parts, consumables) {
  const hasParts = Array.isArray(parts) && parts.length > 0;
  const hasConsumables = Array.isArray(consumables) && consumables.length > 0;
  return !hasParts && !hasConsumables;
}
