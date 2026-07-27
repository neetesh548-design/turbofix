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
    machine_name: 'CNC Lathe 1',
    location: 'Bay 2 · Machining',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'CNC-04',
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
    assignments: { ...emptyAssignments, technician: demoPerson('Anil Kumar', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M002',
    machine_name: 'Hydraulic Press #2',
    location: 'Bay 1 · Forming',
    status: 'breakdown',
    is_demo: true,
    has_open_tickets: true,
    asset_code: 'HYD-01',
    category: 'Press',
    department: 'Forming',
    criticality: 'critical',
    maintenance_interval_days: 60,
    last_maintenance_date: isoDate(-71),
    next_maintenance_due: isoDate(-11),
    track_record: {
      total: 14, open: 2, resolved: 12, recent: 3,
      last_issue: 'Pressure drops during the final stroke',
      last_issue_at: isoStamp(-1),
      open_list: [
        { id: 'DEMO-T210', issue_text: 'Pressure drops during the final stroke', urgency: 'high', created_at: isoStamp(-1) },
        { id: 'DEMO-T205', issue_text: 'Oil seepage near the ram seal', urgency: 'medium', created_at: isoStamp(-4) },
      ],
      recent_closed: [
        { id: 'DEMO-T188', issue_text: 'Relief valve replaced', urgency: 'high', created_at: isoStamp(-71), closed_at: isoStamp(-70) },
        { id: 'DEMO-T170', issue_text: 'Hydraulic filter changed', urgency: 'medium', created_at: isoStamp(-96), closed_at: isoStamp(-96) },
      ],
    },
    assignments: {
      ...emptyAssignments,
      technician: demoPerson('Ramesh Yadav', 'maintenance_technician'),
      supervisor: demoPerson('S. Patil', 'supervisor'),
    },
  },
  {
    machine_id: 'DEMO-M003',
    machine_name: 'Surface Grinder',
    location: 'Bay 3 · Finishing',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'GRD-02',
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
    assignments: { ...emptyAssignments, technician: demoPerson('Anil Kumar', 'maintenance_technician') },
  },
  {
    machine_id: 'DEMO-M004',
    machine_name: 'Air Compressor 75kW',
    location: 'Utility Room',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: true,
    asset_code: 'CMP-01',
    category: 'Utility',
    department: 'Utilities',
    criticality: 'high',
    maintenance_interval_days: 180,
    last_maintenance_date: isoDate(-90),
    next_maintenance_due: isoDate(90),
    track_record: {
      total: 9, open: 1, resolved: 8, recent: 1,
      last_issue: 'Discharge temperature alarm at full load',
      last_issue_at: isoStamp(-2),
      open_list: [
        { id: 'DEMO-T221', issue_text: 'Discharge temperature alarm at full load', urgency: 'critical', created_at: isoStamp(-2) },
      ],
      recent_closed: [
        { id: 'DEMO-T160', issue_text: 'Air filter element replaced', urgency: 'low', created_at: isoStamp(-90), closed_at: isoStamp(-90) },
        { id: 'DEMO-T142', issue_text: 'Drain trap unblocked', urgency: 'medium', created_at: isoStamp(-121), closed_at: isoStamp(-121) },
      ],
    },
    assignments: {
      ...emptyAssignments,
      technician: demoPerson('Ramesh Yadav', 'maintenance_technician'),
      maintenance_head: demoPerson('K. Nair', 'maintenance_head'),
    },
  },
  {
    machine_id: 'DEMO-M005',
    machine_name: 'Packing Conveyor',
    location: 'Dispatch',
    status: 'healthy',
    is_demo: true,
    has_open_tickets: false,
    asset_code: 'CNV-03',
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
    assignments: { ...emptyAssignments, technician: demoPerson('Vikram Patil', 'maintenance_technician') },
  },
];
