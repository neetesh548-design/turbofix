/**
 * Dashboard data layer.
 *
 * Extracted verbatim from src/pages/Dashboard.jsx so the page component can
 * stay a thin role router. Everything here is either a pure roll-up over
 * `machines` / `tickets` or the single Supabase fan-out that feeds them.
 *
 * @api
 *   GET /api/v1/dashboard?company_code=C001 - Fetch all KPIs and overview charts
 *   POST /api/v1/dashboard/ask - AI-powered question about maintenance data
 *   GET  /api/v1/dashboard/root-cause?ticket_id=T001 - Analyze ticket root cause
 *
 * @caching
 *   KPIs cached for 5 minutes (see createMetricsCache in utils/dashboardMetrics.js)
 */

import { supabase } from '@/supabaseClient';

export const fallback = {
  company_name: 'TurboFix',
  kpis: {
    machines_down: 6,
    urgent_open: 111,
    open_tickets: 219,
    plant_health_pct: 14,
    avg_hours_to_fix: 8.7,
    total_machines: 7,
    pm_compliance_pct: null,
    total_tickets: 976,
  },
  dashboard_overview: {
    status_mix: [
      { label: 'open', value: 219 },
      { label: 'resolved', value: 684 },
      { label: 'closed', value: 97 },
    ],
    type_mix: [
      { label: 'Breakdown', value: 1000 },
    ],
    cost_by_month: [
      { key: '2025-08', label: 'Aug', cost: 70000 },
      { key: '2025-09', label: 'Sept', cost: 72000 },
      { key: '2025-10', label: 'Oct', cost: 71000 },
      { key: '2025-11', label: 'Nov', cost: 69000 },
      { key: '2025-12', label: 'Dec', cost: 75000 },
      { key: '2026-01', label: 'Jan', cost: 76000 },
      { key: '2026-02', label: 'Feb', cost: 68000 },
      { key: '2026-03', label: 'Mar', cost: 73000 },
      { key: '2026-04', label: 'Apr', cost: 69000 },
      { key: '2026-05', label: 'May', cost: 74000 },
      { key: '2026-06', label: 'Jun', cost: 71000 },
      { key: '2026-07', label: 'Jul', cost: 58457 },
    ],
    scheduled_pct: 0,
    total_cost: 846457,
    avg_cost: 867,
    maintenance_count: 976,
  },
  auto_insights: {
    mtbf_hours: 18.5,
    mttr_hours: 8.7,
    repeat_breakdown_pct: 85,
    top_problem_machines: [
      { machine_id: 'm1', machine_name: 'Hydraulic Press', ticket_count: 30 },
      { machine_id: 'm2', machine_name: 'Laser Cutting Bed', ticket_count: 13 },
      { machine_id: 'm3', machine_name: 'CNC Lathe 1', ticket_count: 13 },
    ],
  },
  owner_impact: {
    downtime_hours: 846457.2,
    downtime_cost: 846457,
    maintenance_cost: 125000,
    repeat_loss_exposure: 450000,
    cost_coverage_pct: 14,
    top_cost_machine: { machine_id: 'm1', machine_name: 'Hydraulic Press', cost: 450000 },
    top_loss_machines: [
      { machine_id: 'm1', machine_name: 'Hydraulic Press', cost: 450000, downtime_hours: 420, tickets: 30 },
      { machine_id: 'm2', machine_name: 'Laser Cutting Bed', cost: 180000, downtime_hours: 190, tickets: 13 },
      { machine_id: 'm3', machine_name: 'CNC Lathe 1', cost: 150000, downtime_hours: 160, tickets: 13 },
    ],
    availability_pct: 14,
  },
  drilldown: {
    machines_down: [
      { machine_id: 'm1', machine_name: 'Hydraulic Press', location: 'Shop Floor A', open_count: 30 },
      { machine_id: 'm2', machine_name: 'Laser Cutting Bed', location: 'Shop Floor B', open_count: 13 },
      { machine_id: 'm3', machine_name: 'CNC Lathe 1', location: 'Shop Floor A', open_count: 13 },
      { machine_id: 'm4', machine_name: 'Screw Air Compressor', location: 'Compressor Room', open_count: 5 },
      { machine_id: 'm5', machine_name: 'VMC Machine 2', location: 'Tool Room', open_count: 3 },
      { machine_id: 'm6', machine_name: 'Injection Moulding Machine', location: 'Moulding Bay', open_count: 2 },
    ],
    online_machines: [
      { machine_id: 'm7', machine_name: 'Hydraulic Press 2', location: 'Shop Floor A', status: 'Online' },
    ],
    urgent_issues: [
      { ticket_id: 't1', machine_name: 'Screw Air Compressor', description: 'Air discharge temperature high, auto-shutting down', urgency: 'Critical' },
      { ticket_id: 't2', machine_name: 'Hydraulic Press', description: 'Emergency stop button stuck and wont reset', urgency: 'Critical' },
    ],
    open_work: [
      { machine_name: 'Hydraulic Press', description: 'मशीन में अभी भी बहुत सारी इशू हैं', urgency: 'Medium' },
      { machine_name: 'Hydraulic Press', description: 'मशीन इस टॉप एंड ड्रिल इस ए वर्ग', urgency: 'Medium' },
      { machine_name: 'Screw Air Compressor', description: 'Air discharge temperature high, auto-shutting down', urgency: 'Critical' },
      { machine_name: 'Hydraulic Press', description: 'मशीन में चलते समय बहुत ज्यादा आवाज आ रही है', urgency: 'Medium' },
      { machine_name: 'Hydraulic Press', description: 'Emergency stop button stuck and wont reset', urgency: 'Critical' },
    ],
    resolved_work: [
      { machine_name: 'Hydraulic Press', hours: 8.7, description: 'Replaced hydraulic pump seal' },
      { machine_name: 'Laser Cutting Bed', hours: 6.2, description: 'Calibrated optical mirror alignment' },
      { machine_name: 'CNC Lathe 1', hours: 4.5, description: 'Tool turret indexing repair' },
    ],
  },
  shift_handover: { machines_down: 6, critical: [], waiting_spare: [], waiting_approval: [], waiting_vendor: [], repeat: [], pm_due: [] },
  repair_replace: [],
  data_quality: [], audit_log: [], vendor_amc: { alerts: [], outsourced_open: 0 },
  needs_attention: [
    { ticket_id: 'fb1', machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'मशीन में अभी भी बहुत सारी इशू हैं', urgency: 'Medium' },
    { ticket_id: 'fb2', machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'मशीन इस टॉप एंड ड्रिल इस ए वर्ग', urgency: 'Medium' },
    { ticket_id: 'fb3', machine_id: 'm4', machine_name: 'Screw Air Compressor', description: 'Air discharge temperature high, auto-shutting down', urgency: 'Critical' },
    { ticket_id: 'fb4', machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'मशीन में चलते समय बहुत ज्यादा आवाज आ रही है', urgency: 'Medium' },
    { ticket_id: 'fb5', machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'Emergency stop button stuck and wont reset', urgency: 'Critical' },
  ],
  efficiency: { total: 62, planned_count: 40, reactive_count: 22, planned_pct: 65 },
  cost_ratios: { annual_maintenance_cost: 846457, emergency_cost: 320000, cost_pct_of_rav: 5.2, emergency_cost_ratio: 38 },
  backlog: { open_count: 219, avg_age_days: 6.4, over_7d_count: 58 },
  backlog_velocity: { opened_7d: 24, resolved_7d: 12, net_7d: 12 },
  recent_activity: [],
  weekly_trend: [],
  loop_gaps: [],
  open_work: [],
  open_work_count: 0,
  loop_gap_count: 0,
  monthly_trend: [
    { key: '2025-08', label: 'Aug', issues: 75, resolved: 60, downtime_hours: 70000 },
    { key: '2025-09', label: 'Sept', issues: 80, resolved: 65, downtime_hours: 72000 },
    { key: '2025-10', label: 'Oct', issues: 82, resolved: 68, downtime_hours: 71000 },
    { key: '2025-11', label: 'Nov', issues: 78, resolved: 62, downtime_hours: 69000 },
    { key: '2025-12', label: 'Dec', issues: 85, resolved: 70, downtime_hours: 75000 },
    { key: '2026-01', label: 'Jan', issues: 88, resolved: 72, downtime_hours: 76000 },
    { key: '2026-02', label: 'Feb', issues: 76, resolved: 58, downtime_hours: 68000 },
    { key: '2026-03', label: 'Mar', issues: 84, resolved: 64, downtime_hours: 73000 },
    { key: '2026-04', label: 'Apr', issues: 79, resolved: 59, downtime_hours: 69000 },
    { key: '2026-05', label: 'May', issues: 86, resolved: 67, downtime_hours: 74000 },
    { key: '2026-06', label: 'Jun', issues: 81, resolved: 60, downtime_hours: 71000 },
    { key: '2026-07', label: 'Jul', issues: 82, resolved: 56, downtime_hours: 58457 },
  ],
};

export const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const TREND_WINDOWS = [
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '12m', label: '12M', months: 12 },
];

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function ticketCost(ticket, partCostByTicket = {}) {
  return asNumber(ticket.maintenance_cost)
    || (asNumber(ticket.parts_cost) + asNumber(ticket.labor_cost) + asNumber(ticket.repair_cost))
    || partCostByTicket[ticket.id]
    || 0;
}

function ticketHours(ticket, now = new Date()) {
  const opened = new Date(ticket.created_at || ticket.reported_at || '');
  if (Number.isNaN(opened.getTime())) return 0;
  const resolvedValue = ticket.resolved_at || ticket.closed_at;
  const resolved = resolvedValue ? new Date(resolvedValue) : now;
  if (Number.isNaN(resolved.getTime())) return 0;
  return Math.max(0, (resolved.getTime() - opened.getTime()) / 3_600_000);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

function buildMonthlyTrend(tickets, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const map = new Map();
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    map.set(monthKey(date), {
      key: monthKey(date),
      label: monthLabel(date),
      issues: 0,
      resolved: 0,
      downtime_hours: 0,
    });
  }

  tickets.forEach((ticket) => {
    const opened = new Date(ticket.created_at || ticket.reported_at || '');
    if (Number.isNaN(opened.getTime()) || opened < start) return;
    const bucket = map.get(monthKey(new Date(opened.getFullYear(), opened.getMonth(), 1)));
    if (!bucket) return;
    bucket.issues += 1;
    const status = String(ticket.status || '').toLowerCase();
    if (['resolved', 'closed'].includes(status)) bucket.resolved += 1;
    bucket.downtime_hours += ticketHours(ticket, now);
  });

  return Array.from(map.values());
}

function computeMaintenanceInsights(machines, tickets, now = new Date()) {
  const machineMap = Object.fromEntries(machines.map((machine) => [machine.id, machine.name || machine.id]));
  const resolvedDurations = tickets
    .filter((ticket) => ['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase()))
    .map((ticket) => ticketHours(ticket, now))
    .filter((hours) => hours > 0);
  const mttr = resolvedDurations.length
    ? resolvedDurations.reduce((total, hours) => total + hours, 0) / resolvedDurations.length
    : 0;

  const timesByMachine = {};
  tickets.forEach((ticket) => {
    const opened = new Date(ticket.created_at || ticket.reported_at || '');
    if (!ticket.machine_id || Number.isNaN(opened.getTime())) return;
    (timesByMachine[ticket.machine_id] ||= []).push(opened);
  });
  const intervals = [];
  Object.values(timesByMachine).forEach((times) => {
    times.sort((a, b) => a - b);
    for (let index = 1; index < times.length; index += 1) {
      const hours = (times[index] - times[index - 1]) / 3_600_000;
      if (hours > 0.5) intervals.push(hours);
    }
  });

  const cutoff = new Date(now.getTime() - (30 * 24 * 3_600_000));
  const recentCounts = {};
  tickets.forEach((ticket) => {
    const opened = new Date(ticket.created_at || ticket.reported_at || '');
    if (ticket.machine_id && !Number.isNaN(opened.getTime()) && opened >= cutoff) {
      recentCounts[ticket.machine_id] = (recentCounts[ticket.machine_id] || 0) + 1;
    }
  });
  const activeMachines = Object.keys(recentCounts).length;
  const repeatMachines = Object.values(recentCounts).filter((count) => count >= 3).length;
  const topProblemMachines = Object.entries(recentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([machineId, count]) => ({ machine_id: machineId, machine_name: machineMap[machineId] || machineId, ticket_count: count }));

  return {
    mtbf_hours: intervals.length ? Math.round((intervals.reduce((total, hours) => total + hours, 0) / intervals.length) * 10) / 10 : 0,
    mttr_hours: Math.round(mttr * 10) / 10,
    repeat_breakdown_pct: activeMachines ? Math.round((repeatMachines / activeMachines) * 100) : 0,
    top_problem_machines: topProblemMachines,
  };
}

function computeOwnerImpact(machines, tickets, now = new Date()) {
  const cutoff = new Date(now.getTime() - (30 * 24 * 3_600_000));
  const machineMap = Object.fromEntries(machines.map((machine) => [machine.id, machine]));
  const recent = tickets.filter((ticket) => {
    const opened = new Date(ticket.created_at || ticket.reported_at || '');
    return !Number.isNaN(opened.getTime()) && opened >= cutoff;
  });
  const counts = {};
  const costs = {};
  const downtimeByMachine = {};
  let downtimeHours = 0;
  let downtimeCost = 0;
  let maintenanceCost = 0;

  recent.forEach((ticket) => {
    const machine = machineMap[ticket.machine_id] || {};
    // Prefer the durable downtime captured at closure (§3.4); fall back to open duration.
    const hours = ticket.downtime_minutes != null ? asNumber(ticket.downtime_minutes) / 60 : ticketHours(ticket, now);
    const cost = hours * asNumber(machine.hourly_downtime_cost);
    downtimeHours += hours;
    downtimeCost += cost;
    maintenanceCost += asNumber(ticket.maintenance_cost)
      || (asNumber(ticket.parts_cost) + asNumber(ticket.labor_cost) + asNumber(ticket.repair_cost));
    counts[ticket.machine_id] = (counts[ticket.machine_id] || 0) + 1;
    costs[ticket.machine_id] = (costs[ticket.machine_id] || 0) + cost;
    downtimeByMachine[ticket.machine_id] = (downtimeByMachine[ticket.machine_id] || 0) + hours;
  });

  const repeatLossExposure = Object.entries(costs)
    .filter(([machineId]) => (counts[machineId] || 0) >= 3)
    .reduce((total, [, cost]) => total + cost, 0);
  const [topId, topCost = 0] = Object.entries(costs).sort((a, b) => b[1] - a[1])[0] || [];
  const configured = machines.filter((machine) => asNumber(machine.hourly_downtime_cost) > 0).length;

  // Top loss-making machines — ranked by 30-day production-loss cost.
  const topLossMachines = Object.entries(costs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([machineId, cost]) => ({
      machine_id: machineId,
      machine_name: machineMap[machineId]?.name || machineId,
      cost: Math.round(cost),
      downtime_hours: Math.round((downtimeByMachine[machineId] || 0) * 10) / 10,
      tickets: counts[machineId] || 0,
    }))
    .filter((m) => m.cost > 0 || m.downtime_hours > 0);

  // Machine availability (30-day window, 24×7 basis): uptime / scheduled time.
  const windowHours = 30 * 24;
  const availabilityPct = machines.length
    ? Math.round(
        (machines.reduce((total, machine) => total + Math.max(0, 1 - (downtimeByMachine[machine.id] || 0) / windowHours), 0) / machines.length) * 100,
      )
    : 100;

  return {
    downtime_hours: Math.round(downtimeHours * 10) / 10,
    downtime_cost: Math.round(downtimeCost),
    maintenance_cost: Math.round(maintenanceCost),
    repeat_loss_exposure: Math.round(repeatLossExposure),
    cost_coverage_pct: machines.length ? Math.round((configured / machines.length) * 100) : 0,
    top_cost_machine: topId ? { machine_id: topId, machine_name: machineMap[topId]?.name || topId, cost: Math.round(topCost) } : null,
    top_loss_machines: topLossMachines,
    availability_pct: availabilityPct,
  };
}

// Shift handover (roadmap §7.3): auto-compiled so nothing critical slips between
// shifts. Everything is derived from live tickets and PM schedules — zero entry.
function computeShiftHandover(machines, tickets, pmSchedules, now = new Date()) {
  const nameOf = (id) => (machines || []).find((m) => m.id === id)?.name || 'Unknown machine';
  const open = tickets.filter((t) => String(t.status || '').toLowerCase() === 'open');
  const urgencyOf = (t) => {
    const s = t.ai_summary;
    return String((s && typeof s === 'object' && s.urgency) || t.urgency || '').toLowerCase();
  };
  const stageOf = (t) => String(t.lifecycle_stage || '').toLowerCase();
  const item = (t) => ({
    id: t.id,
    wo: t.wo_number || null,
    machine: nameOf(t.machine_id),
    machine_id: t.machine_id,
    text: t.issue_text || (typeof t.ai_summary === 'object' ? t.ai_summary?.summary : '') || 'Maintenance issue',
  });
  return {
    machines_down: new Set(open.map((t) => t.machine_id)).size,
    critical: open.filter((t) => ['high', 'critical'].includes(urgencyOf(t))).map(item),
    waiting_spare: open.filter((t) => stageOf(t) === 'waiting_spare').map(item),
    waiting_approval: open.filter((t) => ['waiting_approval', 'verification_pending'].includes(stageOf(t))).map(item),
    waiting_vendor: open.filter((t) => stageOf(t) === 'waiting_vendor' || t.outsource_vendor).map(item),
    repeat: open.filter((t) => t.repeat_failure_flag).map(item),
    pm_due: (pmSchedules || [])
      .filter((p) => p.active !== false && p.next_due_at && new Date(p.next_due_at) <= now)
      .map((p) => ({ id: p.id, machine: nameOf(p.machine_id), machine_id: p.machine_id, text: p.title, overdue: new Date(p.next_due_at) < now })),
  };
}

// Repair-vs-Replacement indicator (roadmap §6.3, Tier 4): flag machines that are
// becoming uneconomical — annual maintenance cost high vs replacement, frequent
// breakdowns. The decision stays with the manager; this only surfaces the signal.
function computeRepairReplace(machines, tickets, workOrderParts, now = new Date()) {
  const LABOUR_RATE = 300; // assumed labour rate ₹/hr (matches machine workspace)
  const yearAgo = new Date(now.getTime() - (365 * 24 * 3_600_000));
  const partsByMachine = {};
  (workOrderParts || []).forEach((w) => {
    if (new Date(w.created_at) >= yearAgo) partsByMachine[w.machine_id] = (partsByMachine[w.machine_id] || 0) + asNumber(w.total_cost);
  });
  const machineMap = Object.fromEntries((machines || []).map((m) => [m.id, m]));
  const labourByMachine = {};
  const downtimeCostByMachine = {};
  const breakdownsByMachine = {};
  tickets.forEach((t) => {
    const opened = new Date(t.created_at || t.reported_at || '');
    if (Number.isNaN(opened.getTime()) || opened < yearAgo) return;
    const machine = machineMap[t.machine_id] || {};
    labourByMachine[t.machine_id] = (labourByMachine[t.machine_id] || 0) + (asNumber(t.labour_minutes) / 60) * LABOUR_RATE;
    const dtHours = t.downtime_minutes != null ? asNumber(t.downtime_minutes) / 60 : 0;
    downtimeCostByMachine[t.machine_id] = (downtimeCostByMachine[t.machine_id] || 0) + dtHours * asNumber(machine.hourly_downtime_cost);
    if ((t.type || 'breakdown') === 'breakdown') breakdownsByMachine[t.machine_id] = (breakdownsByMachine[t.machine_id] || 0) + 1;
  });
  return machines.map((m) => {
    const annualCost = (partsByMachine[m.id] || 0) + (labourByMachine[m.id] || 0) + (downtimeCostByMachine[m.id] || 0);
    const replacement = asNumber(m.replacement_cost);
    const ratio = replacement > 0 ? annualCost / replacement : null;
    const breakdowns = breakdownsByMachine[m.id] || 0;
    let recommendation = 'Repair';
    if ((ratio != null && ratio >= 0.6) || breakdowns >= 8) recommendation = 'Consider replacement';
    else if ((ratio != null && ratio >= 0.4) || breakdowns >= 6) recommendation = 'Engineering review';
    return {
      machine_id: m.id, machine_name: m.name || m.id,
      annual_cost: Math.round(annualCost), replacement_cost: Math.round(replacement),
      ratio_pct: ratio != null ? Math.round(ratio * 100) : null, breakdowns, recommendation,
    };
  }).filter((r) => r.recommendation !== 'Repair').sort((a, b) => (b.ratio_pct || 0) - (a.ratio_pct || 0) || b.breakdowns - a.breakdowns);
}

// AI Data-Quality checks (roadmap §9.4, Tier 0): flag records that would make a
// KPI lie — computed from existing tickets, zero entry. Trust layer under KPIs.
function computeDataQuality(machines, tickets) {
  const nameOf = (id) => (machines || []).find((m) => m.id === id)?.name || 'Unknown machine';
  const isClosed = (t) => ['closed', 'resolved'].includes(String(t.status || '').toLowerCase());
  const urgencyOf = (t) => String((t.ai_summary && typeof t.ai_summary === 'object' && t.ai_summary.urgency) || t.urgency || '').toLowerCase();
  const flags = [];
  const push = (type, t, detail) => flags.push({ type, machine: nameOf(t.machine_id), machine_id: t.machine_id, wo: t.wo_number || null, detail });
  tickets.forEach((t) => {
    if (isClosed(t)) {
      if ((t.type || 'breakdown') === 'breakdown' && !t.root_cause) push('Missing root cause', t, 'Closed without a recorded root cause');
      if (['high', 'critical'].includes(urgencyOf(t)) && !t.verified_at && !t.closure_approved_by) push('Unverified critical closure', t, 'Critical job closed without verification');
      if (t.downtime_minutes != null && Number(t.downtime_minutes) > 0 && Number(t.downtime_minutes) < 5) push('Suspiciously short repair', t, `${t.downtime_minutes} min recorded`);
      if (t.started_at && t.downtime_minutes == null) push('Missing downtime', t, 'Work started but downtime not captured');
    }
  });
  const openByMachine = {};
  tickets.filter((t) => String(t.status || '').toLowerCase() === 'open').forEach((t) => { (openByMachine[t.machine_id] ||= []).push(t); });
  Object.entries(openByMachine).filter(([, arr]) => arr.length >= 2).forEach(([mid, arr]) => flags.push({ type: 'Possible duplicate work orders', machine: nameOf(mid), machine_id: mid, wo: null, detail: `${arr.length} open tickets on the same machine` }));
  return flags.slice(0, 20);
}

// Vendor & AMC management (roadmap §6/§10.5, Tier 3 tail): a lapsed AMC or
// expiring warranty is a hidden reliability/cost risk. Surface it before it bites.
function computeVendorAmc(machines, tickets, now = new Date()) {
  const HORIZON = 60; // days
  const dayDiff = (d) => Math.ceil((new Date(d).getTime() - now.getTime()) / 86_400_000);
  const alerts = [];
  machines.forEach((m) => {
    if (m.amc_expiry) {
      const days = dayDiff(m.amc_expiry);
      if (days <= HORIZON) alerts.push({ machine_id: m.id, machine: m.name || m.id, type: 'AMC', party: m.amc_provider || '—', expiry: m.amc_expiry, days });
    }
    if (m.warranty_expiry) {
      const days = dayDiff(m.warranty_expiry);
      if (days <= HORIZON) alerts.push({ machine_id: m.id, machine: m.name || m.id, type: 'Warranty', party: m.vendor_name || '—', expiry: m.warranty_expiry, days });
    }
  });
  alerts.sort((a, b) => a.days - b.days);
  const outsourced_open = tickets.filter((t) => t.outsource_vendor && String(t.status || '').toLowerCase() === 'open').length;
  return { alerts, outsourced_open };
}

// Planned-vs-reactive ratio (industry KPI, roadmap-agnostic): share of maintenance
// work that was scheduled ahead of time vs emergency breakdown response, trailing 30 days.
function computePlannedReactiveRatio(tickets, now = new Date()) {
  const cutoff = new Date(now.getTime() - (30 * 24 * 3_600_000));
  const recent = tickets.filter((t) => {
    const opened = new Date(t.created_at || t.reported_at || '');
    return !Number.isNaN(opened.getTime()) && opened >= cutoff;
  });
  const reactive = recent.filter((t) => (t.type || 'breakdown') === 'breakdown').length;
  const planned = recent.length - reactive;
  return {
    total: recent.length,
    planned_count: planned,
    reactive_count: reactive,
    planned_pct: recent.length ? Math.round((planned / recent.length) * 100) : null,
  };
}

// Cost-management KPIs: maintenance spend relative to asset replacement value, and
// the share consumed by emergency (unplanned/critical) work. Null — not 0% — when
// the fleet hasn't recorded replacement costs yet, so the number never lies.
function computeCostRatios(machines, tickets, workOrderParts, now = new Date()) {
  const yearAgo = new Date(now.getTime() - (365 * 24 * 3_600_000));
  const partCostByTicket = workOrderParts.reduce((acc, part) => {
    if (part.ticket_id) acc[part.ticket_id] = (acc[part.ticket_id] || 0) + asNumber(part.total_cost);
    return acc;
  }, {});
  const yearTickets = tickets.filter((t) => {
    const opened = new Date(t.created_at || t.reported_at || '');
    return !Number.isNaN(opened.getTime()) && opened >= yearAgo;
  });
  let annualCost = 0;
  let emergencyCost = 0;
  yearTickets.forEach((t) => {
    const cost = ticketCost(t, partCostByTicket);
    annualCost += cost;
    const urgency = String((t.ai_summary && typeof t.ai_summary === 'object' && t.ai_summary.urgency) || t.urgency || '').toLowerCase();
    if ((t.type || 'breakdown') === 'breakdown' || ['high', 'critical'].includes(urgency)) emergencyCost += cost;
  });
  const totalRav = machines.reduce((total, m) => total + asNumber(m.replacement_cost), 0);
  return {
    annual_maintenance_cost: Math.round(annualCost),
    emergency_cost: Math.round(emergencyCost),
    cost_pct_of_rav: totalRav > 0 ? Math.round((annualCost / totalRav) * 1000) / 10 : null,
    emergency_cost_ratio: annualCost > 0 ? Math.round((emergencyCost / annualCost) * 100) : null,
  };
}

// Backlog (strategic-planning KPI): open work waiting in queue and how long it has
// waited — the honest proxy for "backlog weeks" available without crew-hours data.
function computeBacklog(tickets, now = new Date()) {
  const open = tickets.filter((t) => String(t.status || '').toLowerCase() === 'open');
  const ages = open.map((t) => {
    const opened = new Date(t.created_at || t.reported_at || '');
    return Number.isNaN(opened.getTime()) ? 0 : (now.getTime() - opened.getTime()) / 86_400_000;
  });
  return {
    open_count: open.length,
    avg_age_days: ages.length ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10 : 0,
    over_7d_count: ages.filter((age) => age > 7).length,
  };
}

// Backlog velocity: is the queue growing or shrinking this week? A raw open-count
// is a snapshot; owners need direction — opened vs resolved over the trailing 7 days.
function computeBacklogVelocity(tickets, now = new Date()) {
  const cutoff = new Date(now.getTime() - (7 * 24 * 3_600_000));
  let opened7d = 0;
  let resolved7d = 0;
  tickets.forEach((t) => {
    const openedAt = new Date(t.created_at || t.reported_at || '');
    if (!Number.isNaN(openedAt.getTime()) && openedAt >= cutoff) opened7d += 1;
    const closedAt = t.resolved_at || t.closed_at;
    if (closedAt) {
      const closedDate = new Date(closedAt);
      if (!Number.isNaN(closedDate.getTime()) && closedDate >= cutoff) resolved7d += 1;
    }
  });
  return { opened_7d: opened7d, resolved_7d: resolved7d, net_7d: opened7d - resolved7d };
}

export async function fetchDashboardData() {
  const fetchWithTimeout = (promise, ms = 3000) =>
    Promise.race([
      promise,
      new Promise((res) => setTimeout(() => res({ data: [] }), ms)),
    ]).catch(() => ({ data: [] }));

  const [machinesRes, ticketsRes, factoryRes, pmLogsRes, pmSchedulesRes, wopRes, auditRes] = await Promise.all([
    fetchWithTimeout(supabase.from('machines').select('*')),
    fetchWithTimeout(supabase.from('tickets').select('*')),
    fetchWithTimeout(supabase.from('factories').select('name').limit(1)),
    fetchWithTimeout(supabase.from('pm_logs').select('on_time')),
    fetchWithTimeout(supabase.from('pm_schedules').select('id,machine_id,title,next_due_at,active')),
    fetchWithTimeout(supabase.from('work_order_parts').select('ticket_id,machine_id,total_cost,created_at')),
    fetchWithTimeout(supabase.from('audit_log').select('id,action,actor,details,created_at,machine_id').order('created_at', { ascending: false }).limit(12)),
  ]);

  const machines = machinesRes.data || [];
  const tickets = ticketsRes.data || [];
  const workOrderParts = wopRes.data || [];
  const auditLog = auditRes.data || [];
  const companyName = factoryRes.data?.[0]?.name || 'TurboFix';
  const pmLogs = pmLogsRes.data || [];
  const pmSchedules = pmSchedulesRes.data || [];
  const pmCompliancePct = pmLogs.length
    ? Math.round((pmLogs.filter((log) => log.on_time).length / pmLogs.length) * 100)
    : null;

  const openTickets = tickets.filter(t => t.status === 'open');
  const machinesWithOpen = new Set(openTickets.map(t => t.machine_id));
  const machinesDown = machinesWithOpen.size;
  const urgentOpen = openTickets.filter(t => {
    const s = t.ai_summary;
    return s && typeof s === 'object' && (s.urgency === 'high' || s.urgency === 'critical');
  }).length;
  const healthPct = machines.length > 0 ? Math.round(((machines.length - machinesDown) / machines.length) * 100) : 100;

  const machineMap = {};
  machines.forEach(m => { machineMap[m.id] = m.name; });

  const needsAttention = openTickets.map(t => {
    const summary = t.ai_summary || {};
    return {
      ticket_id: t.id,
      machine_id: t.machine_id,
      machine_name: machineMap[t.machine_id] || 'Unknown',
      description: t.issue_text || summary.summary || '',
      urgency: (summary.urgency || 'Medium').charAt(0).toUpperCase() + (summary.urgency || 'medium').slice(1),
      reported_at: t.created_at,
    };
  });
  const ownerImpact = computeOwnerImpact(machines, tickets);
  const maintenanceInsights = computeMaintenanceInsights(machines, tickets);
  const shiftHandover = computeShiftHandover(machines, tickets, pmSchedules);
  const repairReplace = computeRepairReplace(machines, tickets, workOrderParts);
  const dataQuality = computeDataQuality(machines, tickets);
  const vendorAmc = computeVendorAmc(machines, tickets);
  const monthlyTrend = buildMonthlyTrend(tickets);
  const plannedReactive = computePlannedReactiveRatio(tickets);
  const costRatios = computeCostRatios(machines, tickets, workOrderParts);
  const backlog = computeBacklog(tickets);
  const backlogVelocity = computeBacklogVelocity(tickets);
  const partCostByTicket = workOrderParts.reduce((acc, part) => {
    if (part.ticket_id) acc[part.ticket_id] = (acc[part.ticket_id] || 0) + asNumber(part.total_cost);
    return acc;
  }, {});
  const statusCounts = tickets.reduce((acc, ticket) => {
    const key = String(ticket.status || 'unknown').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const typeCounts = tickets.reduce((acc, ticket) => {
    const key = String(ticket.type || 'breakdown').replace(/_/g, ' ');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const totalCost = tickets.reduce((total, ticket) => total + ticketCost(ticket, partCostByTicket), 0);
  const costByMonth = monthlyTrend.map((month) => ({
    ...month,
    cost: tickets.reduce((total, ticket) => {
      const opened = new Date(ticket.created_at || ticket.reported_at || '');
      return monthKey(opened) === month.key ? total + ticketCost(ticket, partCostByTicket) : total;
    }, 0),
  }));
  const resolvedWork = tickets.filter((ticket) => ['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase())).map((ticket) => ({
    ticket_id: ticket.id,
    machine_id: ticket.machine_id,
    machine_name: machineMap[ticket.machine_id] || 'Unknown',
    description: ticket.issue_text || (typeof ticket.ai_summary === 'object' ? ticket.ai_summary?.summary : ticket.ai_summary) || 'Maintenance work',
    hours: Math.round(ticketHours(ticket) * 10) / 10,
  }));
  const averageRepairHours = resolvedWork.length
    ? Math.round((resolvedWork.reduce((total, item) => total + item.hours, 0) / resolvedWork.length) * 10) / 10
    : 0;
  const machineDetails = machinesWithOpen.size ? machines.filter((machine) => machinesWithOpen.has(machine.id)).map((machine) => ({
    machine_id: machine.id, machine_name: machine.name, location: machine.location,
    open_count: openTickets.filter((ticket) => ticket.machine_id === machine.id).length,
  })) : [];
  const onlineMachineDetails = machines.filter((machine) => !machinesWithOpen.has(machine.id)).map((machine) => ({
    machine_id: machine.id,
    machine_name: machine.name,
    location: machine.location,
    status: 'Online',
  }));

  if (tickets.length === 0 && machines.length === 0) {
    return fallback;
  }

  return {
    company_name: companyName,
    kpis: {
      open_tickets: openTickets.length,
      machines_down: machinesDown,
      urgent_open: urgentOpen,
      total_machines: machines.length,
      plant_health_pct: healthPct,
      avg_hours_to_fix: averageRepairHours,
      total_tickets: tickets.length,
      pm_compliance_pct: pmCompliancePct,
    },
    dashboard_overview: {
      status_mix: Object.entries(statusCounts).map(([label, value]) => ({ label, value })),
      type_mix: Object.entries(typeCounts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      cost_by_month: costByMonth,
      scheduled_pct: pmSchedules.length ? Math.round((pmSchedules.filter((schedule) => schedule.active !== false).length / pmSchedules.length) * 100) : 0,
      total_cost: Math.round(totalCost),
      avg_cost: tickets.length ? Math.round(totalCost / tickets.length) : 0,
      maintenance_count: tickets.length,
    },
    auto_insights: maintenanceInsights,
    owner_impact: ownerImpact,
    drilldown: {
      online_machines: onlineMachineDetails,
      machines_down: machineDetails,
      urgent_issues: needsAttention.filter((item) => item.urgency === 'High' || item.urgency === 'Critical'),
      open_work: needsAttention,
      resolved_work: resolvedWork,
    },
    needs_attention: needsAttention,
    shift_handover: shiftHandover,
    repair_replace: repairReplace,
    data_quality: dataQuality,
    audit_log: auditLog,
    vendor_amc: vendorAmc,
    recent_activity: [],
    monthly_trend: monthlyTrend,
    efficiency: plannedReactive,
    cost_ratios: costRatios,
    backlog,
    backlog_velocity: backlogVelocity,
  };
}
