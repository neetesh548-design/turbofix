/* ===========================================================
   TurboFix — Demo fleet
   ===========================================================

   Shown only when the signed-in company has no machines yet, so a
   brand-new workspace still demonstrates what the health board does
   instead of presenting an empty page.

   Dates are relative to "now" so the four cards always show a
   realistic spread of health states:

     M001  0 open tickets, PM due in 2 days              → green
     M002  2 open tickets, PM overdue                    → red
     M003  0 open tickets, PM due in 45 days             → green
     M004  1 critical open ticket, serviced 90 days ago  → yellow
   =========================================================== */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Local date (YYYY-MM-DD) `offsetDays` from today. Negative is the past.
 *
 * Built from local date parts rather than `toISOString()`, which would shift
 * the day by one for anyone east or west of UTC and make "PM due in 2 days"
 * read as 1 or 3 depending on the reader's timezone.
 */
const isoDate = (offsetDays) => {
  const date = new Date(Date.now() + offsetDays * DAY);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Full ISO timestamp `offsetDays` from now. */
const isoStamp = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

const emptyAssignments = { technician: null, supervisor: null, engineer: null, maintenance_head: null };

const demoPerson = (name, role) => ({
  user_id: `demo-${role}`,
  name,
  role,
  email_masked: null,
  phone_masked: null,
  has_email: false,
  has_phone: false,
  can_reveal_contact: false,
});

export const DEMO_MACHINES = [
  {
    machine_id: 'DEMO-M001',
    machine_name: 'CNC Lathe 1 (VTL-500)',
    location: 'Shop 1 · Machining Line A',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-MAC-CNC-VTL-001',
    category: 'CNC',
    department: 'Machining',
    criticality: 'high',
    maintenance_interval_days: 30,
    last_maintenance_date: isoDate(-28),
    next_maintenance_due: isoDate(2),
    track_record: {
      total: 6, open: 0, resolved: 6, recent: 1,
      last_issue: 'Coolant nozzle realigned',
      last_issue_at: isoStamp(-12),
      open_list: [],
      recent_closed: [
        { id: 'DEMO-T101', issue_text: 'Coolant nozzle realigned', urgency: 'low', created_at: isoStamp(-12), closed_at: isoStamp(-12) },
        { id: 'DEMO-T098', issue_text: 'Chuck jaws cleaned and re-seated', urgency: 'medium', created_at: isoStamp(-34), closed_at: isoStamp(-33) },
        { id: 'DEMO-T091', issue_text: 'Way-lube line topped up', urgency: 'low', created_at: isoStamp(-58), closed_at: isoStamp(-58) },
      ],
    },
    assignments: { ...emptyAssignments, technician: demoPerson('Anil Kumar (Shift A)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M002',
    machine_name: 'Hydraulic Press 250T',
    location: 'Shop 2 · Heavy Press Line',
    status: 'breakdown',
    is_demo: true,
    has_open_tickets: true,
    asset_code: 'P1-PRS-HYD-250-002',
    category: 'Press',
    department: 'Forming',
    criticality: 'critical',
    maintenance_interval_days: 60,
    last_maintenance_date: isoDate(-71),
    next_maintenance_due: isoDate(-11),
    track_record: {
      total: 14, open: 2, resolved: 12, recent: 3,
      last_issue: 'Pressure drops during final stroke phase',
      last_issue_at: isoStamp(-1),
      open_list: [
        { id: 'DEMO-T210', issue_text: 'Pressure drops during final stroke phase', urgency: 'high', created_at: isoStamp(-1) },
        { id: 'DEMO-T205', issue_text: 'Oil seepage near ram main seal', urgency: 'medium', created_at: isoStamp(-4) },
      ],
      recent_closed: [
        { id: 'DEMO-T188', issue_text: 'Relief valve replaced', urgency: 'high', created_at: isoStamp(-71), closed_at: isoStamp(-70) },
        { id: 'DEMO-T170', issue_text: 'Hydraulic filter changed', urgency: 'medium', created_at: isoStamp(-96), closed_at: isoStamp(-96) },
      ],
    },
    assignments: {
      ...emptyAssignments,
      technician: demoPerson('Ramesh Yadav (Shift B)', 'maintenance_technician'),
      supervisor: demoPerson('S. Patil', 'supervisor'),
    },
  },
  {
    machine_id: 'DEMO-M003',
    machine_name: 'Surface Grinder (SG-800)',
    location: 'Shop 1 · Tooling & Finishing',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-FIN-GRD-800-003',
    category: 'Grinding',
    department: 'Finishing',
    criticality: 'medium',
    maintenance_interval_days: 90,
    last_maintenance_date: isoDate(-45),
    next_maintenance_due: isoDate(45),
    track_record: {
      total: 3, open: 0, resolved: 3, recent: 0,
      last_issue: 'Wheel dressing cycle adjusted',
      last_issue_at: isoStamp(-40),
      open_list: [],
      recent_closed: [
        { id: 'DEMO-T150', issue_text: 'Wheel dressing cycle adjusted', urgency: 'low', created_at: isoStamp(-40), closed_at: isoStamp(-40) },
      ],
    },
    assignments: { ...emptyAssignments, technician: demoPerson('Anil Kumar (Shift A)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M004',
    machine_name: 'Screw Air Compressor 75kW',
    location: 'Utility Station 1',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: true,
    asset_code: 'P1-UTL-CMP-SCR-075',
    category: 'Utility',
    department: 'Utilities',
    criticality: 'critical',
    maintenance_interval_days: 180,
    last_maintenance_date: isoDate(-90),
    next_maintenance_due: isoDate(90),
    track_record: {
      total: 9, open: 1, resolved: 8, recent: 1,
      last_issue: 'High discharge temp alarm on full load',
      last_issue_at: isoStamp(-2),
      open_list: [
        { id: 'DEMO-T221', issue_text: 'High discharge temp alarm on full load', urgency: 'critical', created_at: isoStamp(-2) },
      ],
      recent_closed: [
        { id: 'DEMO-T160', issue_text: 'Air filter element replaced', urgency: 'low', created_at: isoStamp(-90), closed_at: isoStamp(-90) },
        { id: 'DEMO-T142', issue_text: 'Drain trap unblocked', urgency: 'medium', created_at: isoStamp(-121), closed_at: isoStamp(-121) },
      ],
    },
    assignments: {
      ...emptyAssignments,
      technician: demoPerson('Ramesh Yadav (Shift B)', 'maintenance_technician'),
      maintenance_head: demoPerson('K. Nair', 'maintenance_head'),
    },
  },
  {
    machine_id: 'DEMO-M005',
    machine_name: 'Automated Packaging Line',
    location: 'Dispatch Yard',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-DSP-PKG-AUT-005',
    category: 'Conveyor',
    department: 'Dispatch',
    criticality: 'low',
    maintenance_interval_days: 60,
    last_maintenance_date: isoDate(-20),
    next_maintenance_due: isoDate(40),
    track_record: {
      total: 2, open: 0, resolved: 2, recent: 1,
      last_issue: 'Belt tracking adjusted',
      last_issue_at: isoStamp(-8),
      open_list: [],
      recent_closed: [
        { id: 'DEMO-T230', issue_text: 'Belt tracking adjusted', urgency: 'low', created_at: isoStamp(-8), closed_at: isoStamp(-8) },
      ],
    },
    assignments: { ...emptyAssignments, technician: demoPerson('Vikram Patil (Shift C)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M006',
    machine_name: 'VMC Milling Center (VMC-1050)',
    location: 'Shop 1 · Machining Line B',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-MAC-VMC-1050-006',
    category: 'CNC',
    department: 'Machining',
    criticality: 'high',
    maintenance_interval_days: 30,
    last_maintenance_date: isoDate(-14),
    next_maintenance_due: isoDate(16),
    track_record: { total: 4, open: 0, resolved: 4, recent: 0, last_issue: 'Tool changer sensor cleaned', last_issue_at: isoStamp(-25), open_list: [], recent_closed: [] },
    assignments: { ...emptyAssignments, technician: demoPerson('Anil Kumar (Shift A)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M007',
    machine_name: 'Stamping Press 150T',
    location: 'Shop 2 · Light Stamping',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: true,
    asset_code: 'P1-PRS-STP-150-007',
    category: 'Press',
    department: 'Forming',
    criticality: 'high',
    maintenance_interval_days: 45,
    last_maintenance_date: isoDate(-30),
    next_maintenance_due: isoDate(15),
    track_record: {
      total: 7, open: 1, resolved: 6, recent: 1,
      last_issue: 'Die cushion pneumatic pressure fluctuates',
      last_issue_at: isoStamp(-3),
      open_list: [{ id: 'DEMO-T225', issue_text: 'Die cushion pneumatic pressure fluctuates', urgency: 'medium', created_at: isoStamp(-3) }],
      recent_closed: [],
    },
    assignments: { ...emptyAssignments, technician: demoPerson('Ramesh Yadav (Shift B)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M008',
    machine_name: 'Robotic Arm Welder 6-Axis',
    location: 'Shop 3 · Robotic Welding Line',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-ASY-ROB-WLD-008',
    category: 'Robotics',
    department: 'Assembly',
    criticality: 'critical',
    maintenance_interval_days: 90,
    last_maintenance_date: isoDate(-10),
    next_maintenance_due: isoDate(80),
    track_record: { total: 5, open: 0, resolved: 5, recent: 0, last_issue: 'Servo motor recalibrated', last_issue_at: isoStamp(-45), open_list: [], recent_closed: [] },
    assignments: { ...emptyAssignments, technician: demoPerson('Vikram Patil (Shift C)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M009',
    machine_name: 'Industrial Chiller Unit 50TR',
    location: 'Utility Station 2',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-UTL-CHL-050-009',
    category: 'Utility',
    department: 'Utilities',
    criticality: 'medium',
    maintenance_interval_days: 120,
    last_maintenance_date: isoDate(-80),
    next_maintenance_due: isoDate(40),
    track_record: { total: 3, open: 0, resolved: 3, recent: 0, last_issue: 'Refrigerant top-up completed', last_issue_at: isoStamp(-80), open_list: [], recent_closed: [] },
    assignments: { ...emptyAssignments, technician: demoPerson('Ramesh Yadav (Shift B)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M010',
    machine_name: 'Induction Hardening Furnace',
    location: 'Heat Treatment Cell',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: true,
    asset_code: 'P1-HT-IND-FUR-010',
    category: 'Heat Treatment',
    department: 'Heat Treatment',
    criticality: 'critical',
    maintenance_interval_days: 60,
    last_maintenance_date: isoDate(-50),
    next_maintenance_due: isoDate(10),
    track_record: {
      total: 8, open: 1, resolved: 7, recent: 1,
      last_issue: 'Quench tank temperature sensor drift',
      last_issue_at: isoStamp(-5),
      open_list: [{ id: 'DEMO-T226', issue_text: 'Quench tank temperature sensor drift', urgency: 'high', created_at: isoStamp(-5) }],
      recent_closed: [],
    },
    assignments: { ...emptyAssignments, technician: demoPerson('Anil Kumar (Shift A)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M011',
    machine_name: 'Overhead EOT Crane 10 Ton',
    location: 'Main Bay High Bay',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-UTL-CRN-EOT-011',
    category: 'Material Handling',
    department: 'Utilities',
    criticality: 'high',
    maintenance_interval_days: 90,
    last_maintenance_date: isoDate(-15),
    next_maintenance_due: isoDate(75),
    track_record: { total: 2, open: 0, resolved: 2, recent: 0, last_issue: 'Hoist brake lining replaced', last_issue_at: isoStamp(-15), open_list: [], recent_closed: [] },
    assignments: { ...emptyAssignments, technician: demoPerson('Ramesh Yadav (Shift B)', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M012',
    machine_name: 'Automatic Shot Blasting Machine',
    location: 'Surface Prep Cell',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'P1-FIN-SBL-AUT-012',
    category: 'Finishing',
    department: 'Finishing',
    criticality: 'medium',
    maintenance_interval_days: 30,
    last_maintenance_date: isoDate(-5),
    next_maintenance_due: isoDate(25),
    track_record: { total: 4, open: 0, resolved: 4, recent: 0, last_issue: 'Blast wheel blades replaced', last_issue_at: isoStamp(-5), open_list: [], recent_closed: [] },
    assignments: { ...emptyAssignments, technician: demoPerson('Vikram Patil (Shift C)', 'maintenance_technician') },
  },
];

/** Roster behind the assignments above — shown on Team when the signed-in
 *  demo account has no real Supabase auth session (so RLS blocks the real
 *  team query). Keeps the same names Machines/Tickets already show as
 *  "Assigned to" so the demo reads as one consistent company. */
export const DEMO_TEAM = [
  { user_id: 'demo-owner', name: 'Demo Owner', role: 'owner', email_masked: 'o***@turbofix.co.in', phone_masked: null, has_email: true, has_phone: false, has_contact: true, can_reveal_contact: false, portal_access: true, can_receive_alerts: true, manager_user_id: '', department: 'Plant Management', plant_location: 'Head Office', shift: '' },
  { user_id: 'demo-supervisor-1', name: 'S. Patil', role: 'supervisor', email_masked: 's***@turbofix.co.in', phone_masked: '98*****210', has_email: true, has_phone: true, has_contact: true, can_reveal_contact: false, portal_access: true, can_receive_alerts: true, manager_user_id: 'demo-owner', department: 'Forming', plant_location: 'Bay 1', shift: 'Day' },
  { user_id: 'demo-head-1', name: 'K. Nair', role: 'maintenance_head', email_masked: 'k***@turbofix.co.in', phone_masked: '98*****211', has_email: true, has_phone: true, has_contact: true, can_reveal_contact: false, portal_access: true, can_receive_alerts: true, manager_user_id: 'demo-owner', department: 'Utilities', plant_location: 'Utility Room', shift: 'Day' },
  { user_id: 'demo-tech-ramesh', name: 'Ramesh Yadav', role: 'maintenance_technician', email_masked: null, phone_masked: '98*****212', has_email: false, has_phone: true, has_contact: true, can_reveal_contact: false, portal_access: true, can_receive_alerts: true, manager_user_id: 'demo-supervisor-1', department: 'Forming', plant_location: 'Bay 1', shift: 'Day' },
  { user_id: 'demo-tech-anil', name: 'Anil Kumar', role: 'maintenance_technician', email_masked: null, phone_masked: '98*****213', has_email: false, has_phone: true, has_contact: true, can_reveal_contact: false, portal_access: true, can_receive_alerts: true, manager_user_id: 'demo-head-1', department: 'Machining', plant_location: 'Bay 2', shift: 'Day' },
  { user_id: 'demo-tech-vikram', name: 'Vikram Patil', role: 'maintenance_technician', email_masked: null, phone_masked: '98*****214', has_email: false, has_phone: true, has_contact: true, can_reveal_contact: false, portal_access: true, can_receive_alerts: false, manager_user_id: 'demo-supervisor-1', department: 'Dispatch', plant_location: 'Dispatch', shift: 'Night' },
];
