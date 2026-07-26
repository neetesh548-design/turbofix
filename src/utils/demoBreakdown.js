/* ===========================================================
   TurboFix — Demo data for the breakdown logger
   ===========================================================

   Shown when a workspace has no machines or no breakdown history
   yet, so a brand-new plant still sees a working logger rather
   than an empty machine picker and a dead Submit button.

   Shaped deliberately, not randomly — the same set has to light
   up all four role forms at once:

     - every machine has an assigned technician except DEMO-M005,
       which is how the "nobody assigned" routing branch gets seen,
     - DEMO-M002 carries a vendor contract, so the vendor form has
       exactly one machine to find and the filter visibly bites,
     - DEMO-M001 has three spindle reports inside the 90-day
       window, so the history insight has a real repeat to call,
     - reports span this shift and earlier ones so the supervisor
       strip reads a believable "this shift" number.

   Timestamps are relative to load, so the demo never goes stale.
   =========================================================== */

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

const minutesAgo = (n) => new Date(Date.now() - n * MINUTE).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

const person = (name, role, userId) => ({ user_id: userId, name, role });

/**
 * Machines carry the four things the logger actually needs from a
 * machine — who owns it, what it costs to stand still, whether a
 * vendor watches it, and what its QR sticker says.
 */
export const DEMO_BREAKDOWN_MACHINES = [
  {
    machine_id: 'DEMO-M001',
    machine_name: 'CNC Lathe 1',
    asset_code: 'CNC-04',
    location: 'Bay 2 · Machining',
    department: 'Machining',
    model: 'DX-200',
    serial_no: 'CNC200-8841',
    criticality: 'high',
    status: 'healthy',
    is_demo: true,
    hourly_downtime_cost: 18000,
    qr_payload: 'turbofix://machine/DEMO-M001',
    assignments: {
      technician: person('Rajesh Kumar', 'maintenance_technician', 'demo-tech-1'),
      supervisor: person('S. Patil', 'supervisor', 'demo-sup-1'),
      engineer: person('K. Nair', 'maintenance_engineer', 'demo-eng-1'),
    },
  },
  {
    machine_id: 'DEMO-M002',
    machine_name: 'Hydraulic Press #2',
    asset_code: 'HYD-01',
    location: 'Bay 1 · Forming',
    department: 'Forming',
    model: 'HP-200T',
    serial_no: 'HYD200-1190',
    criticality: 'critical',
    status: 'breakdown',
    is_demo: true,
    hourly_downtime_cost: 25000,
    qr_payload: 'turbofix://machine/DEMO-M002',
    vendor_id: 'VND-HYDROTECH',
    vendor_contract: { vendor_id: 'VND-HYDROTECH', vendor_name: 'Hydrotech Services', expires_in_days: 210 },
    assignments: {
      technician: person('Ramesh Yadav', 'maintenance_technician', 'demo-tech-2'),
      supervisor: person('S. Patil', 'supervisor', 'demo-sup-1'),
    },
  },
  {
    machine_id: 'DEMO-M003',
    machine_name: 'Surface Grinder',
    asset_code: 'GRD-02',
    location: 'Bay 3 · Finishing',
    department: 'Finishing',
    model: 'SG-450',
    serial_no: 'SG450-2201',
    criticality: 'medium',
    status: 'healthy',
    is_demo: true,
    hourly_downtime_cost: 9000,
    qr_payload: 'turbofix://machine/DEMO-M003',
    assignments: {
      technician: person('Anil Kumar', 'maintenance_technician', 'demo-tech-3'),
      supervisor: person('S. Patil', 'supervisor', 'demo-sup-1'),
    },
  },
  {
    machine_id: 'DEMO-M004',
    machine_name: 'Air Compressor 75kW',
    asset_code: 'CMP-01',
    location: 'Utility Room',
    department: 'Utilities',
    model: 'AC-75',
    serial_no: 'AC75-7730',
    criticality: 'high',
    status: 'healthy',
    is_demo: true,
    hourly_downtime_cost: 32000,
    qr_payload: 'turbofix://machine/DEMO-M004',
    assignments: {
      technician: person('Ramesh Yadav', 'maintenance_technician', 'demo-tech-2'),
      maintenance_head: person('K. Nair', 'maintenance_head', 'demo-head-1'),
    },
  },
  {
    // Deliberately unassigned: exercises the "goes to the supervisor
    // queue" fallback in routeBreakdown, live, in the demo.
    machine_id: 'DEMO-M005',
    machine_name: 'Packing Conveyor',
    asset_code: 'CNV-03',
    location: 'Dispatch',
    department: 'Dispatch',
    criticality: 'low',
    status: 'healthy',
    is_demo: true,
    hourly_downtime_cost: 4000,
    qr_payload: 'turbofix://machine/DEMO-M005',
    assignments: {},
  },
];

/** Who a supervisor can hand a report to. */
export const DEMO_TECHNICIANS = [
  { user_id: 'demo-tech-1', name: 'Rajesh Kumar', role: 'maintenance_technician', open_jobs: 2 },
  { user_id: 'demo-tech-2', name: 'Ramesh Yadav', role: 'maintenance_technician', open_jobs: 4 },
  { user_id: 'demo-tech-3', name: 'Anil Kumar', role: 'maintenance_technician', open_jobs: 1 },
  { user_id: 'demo-eng-1', name: 'K. Nair', role: 'maintenance_engineer', open_jobs: 0 },
];

export const DEMO_VENDOR_CONTACT = {
  vendor_id: 'VND-HYDROTECH',
  name: 'Hydrotech Services',
  contact_name: 'Vikram Shah',
  phone: '+91 98200 41188',
  availability: 'On site within 4 hours, Mon–Sat',
};

/**
 * History. DEMO-M001 carries three spindle reports inside the
 * window on purpose — that is the repeat the insight box calls out,
 * and the closed one carries the repair note it links to.
 */
export const DEMO_BREAKDOWN_REPORTS = [
  {
    id: 'BRK-0007',
    wo_number: 'WO-00007',
    machine_id: 'DEMO-M001',
    machine_name: 'CNC Lathe 1',
    issue_text: 'Spindle making a knocking noise above 2000 rpm',
    urgency: 'medium',
    category: 'mechanical',
    status: 'reported',
    reported_by: 'Suresh (Operator)',
    reported_by_role: 'operator',
    assigned_to: 'Rajesh Kumar',
    queue: 'technician',
    created_at: minutesAgo(35),
  },
  {
    id: 'BRK-0006',
    wo_number: 'WO-00006',
    machine_id: 'DEMO-M002',
    machine_name: 'Hydraulic Press #2',
    issue_text: 'Oil leak from cylinder, pressure gauge shows 40 PSI',
    urgency: 'high',
    category: 'hydraulic',
    status: 'in_progress',
    reported_by: 'S. Patil',
    reported_by_role: 'supervisor',
    assigned_to: 'Ramesh Yadav',
    queue: 'technician',
    downtime_cost_per_hour: 25000,
    created_at: minutesAgo(95),
  },
  {
    id: 'BRK-0005',
    wo_number: 'WO-00005',
    machine_id: 'DEMO-M004',
    machine_name: 'Air Compressor 75kW',
    issue_text: 'Discharge temperature alarm at full load, smells hot',
    urgency: 'critical',
    category: 'thermal',
    status: 'in_progress',
    reported_by: 'Vikram Shah',
    reported_by_role: 'vendor',
    vendor_id: 'VND-HYDROTECH',
    assigned_to: 'Ramesh Yadav',
    queue: 'technician',
    created_at: minutesAgo(150),
  },
  {
    id: 'BRK-0004',
    wo_number: 'WO-00004',
    machine_id: 'DEMO-M001',
    machine_name: 'CNC Lathe 1',
    issue_text: 'Spindle vibration returned after restart',
    urgency: 'high',
    category: 'mechanical',
    status: 'closed',
    reported_by: 'Suresh (Operator)',
    reported_by_role: 'operator',
    assigned_to: 'Rajesh Kumar',
    queue: 'technician',
    resolution_note: 'Front spindle bearing replaced. Re-check alignment at the next PM.',
    closed_at: daysAgo(21),
    created_at: daysAgo(22),
  },
  {
    id: 'BRK-0003',
    wo_number: 'WO-00003',
    machine_id: 'DEMO-M001',
    machine_name: 'CNC Lathe 1',
    issue_text: 'Spindle bearing noise on cold start',
    urgency: 'medium',
    category: 'mechanical',
    status: 'closed',
    reported_by: 'Anil Kumar',
    reported_by_role: 'technician',
    assigned_to: 'Anil Kumar',
    queue: 'technician',
    resolution_note: 'Greased and re-tensioned the drive belt.',
    closed_at: daysAgo(54),
    created_at: daysAgo(55),
  },
  {
    id: 'BRK-0002',
    wo_number: 'WO-00002',
    machine_id: 'DEMO-M002',
    machine_name: 'Hydraulic Press #2',
    issue_text: 'Ram seal seepage during the final stroke',
    urgency: 'medium',
    category: 'hydraulic',
    status: 'closed',
    reported_by: 'Vikram Shah',
    reported_by_role: 'vendor',
    vendor_id: 'VND-HYDROTECH',
    assigned_to: 'Ramesh Yadav',
    queue: 'technician',
    resolution_note: 'Seal kit replaced under contract.',
    closed_at: daysAgo(38),
    created_at: daysAgo(40),
  },
  {
    id: 'BRK-0001',
    wo_number: 'WO-00001',
    machine_id: 'DEMO-M003',
    machine_name: 'Surface Grinder',
    issue_text: 'Coolant pump not circulating',
    urgency: 'high',
    category: 'hydraulic',
    status: 'closed',
    reported_by: 'Suresh (Operator)',
    reported_by_role: 'operator',
    assigned_to: 'Anil Kumar',
    queue: 'technician',
    resolution_note: 'Impeller unblocked, strainer cleaned.',
    closed_at: daysAgo(66),
    created_at: daysAgo(67),
  },
];

/** Stand-in identity so a signed-out visitor still sees a filled form. */
export const DEMO_REPORTER = {
  user_id: 'demo-operator-1',
  name: 'Suresh (Operator)',
  role: 'operator',
  phone: '+91 99000 11115',
};

export function shouldUseDemoMachines(machines) {
  return !Array.isArray(machines) || machines.length === 0;
}

export function shouldUseDemoReports(reports) {
  return !Array.isArray(reports) || reports.length === 0;
}
