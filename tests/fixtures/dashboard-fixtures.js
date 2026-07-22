/**
 * Dashboard Test Fixtures & Data Generators
 * Provides mock datasets for unit and end-to-end testing of TurboFix Dashboard.
 */

export const mockMachines = [
  { id: 'm1', name: 'Hydraulic Press', location: 'Shop Floor A', hourly_downtime_cost: 1500, replacement_cost: 500000 },
  { id: 'm2', name: 'Laser Cutting Bed', location: 'Shop Floor B', hourly_downtime_cost: 1200, replacement_cost: 400000 },
  { id: 'm3', name: 'CNC Lathe 1', location: 'Shop Floor A', hourly_downtime_cost: 1000, replacement_cost: 350000 },
  { id: 'm4', name: 'Screw Air Compressor', location: 'Compressor Room', hourly_downtime_cost: 2000, replacement_cost: 600000 },
];

export const mockTickets = [
  { id: 't1', machine_id: 'm1', status: 'open', urgency: 'high', issue_text: 'Hydraulic pump pressure loss', created_at: new Date().toISOString() },
  { id: 't2', machine_id: 'm1', status: 'open', urgency: 'medium', issue_text: 'Frequent oil leakage', created_at: new Date().toISOString() },
  { id: 't3', machine_id: 'm4', status: 'open', urgency: 'critical', issue_text: 'Air discharge temperature high', created_at: new Date().toISOString() },
  { id: 't4', machine_id: 'm2', status: 'closed', urgency: 'low', issue_text: 'Filter replacement', downtime_minutes: 120, maintenance_cost: 4500, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
];

export const mockReflectiveMemory = {
  viewsCount: 5,
  lastFocus: 'Hydraulic Press',
  filterPreferences: '12m',
  inspectCount: 14,
  lastVisit: new Date().toISOString(),
};
