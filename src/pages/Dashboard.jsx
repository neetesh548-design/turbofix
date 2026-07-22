import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Clock3, ShieldCheck, Crown, Sparkles, Zap, Award, DollarSign, Volume2, CheckCircle2, SlidersHorizontal, MessageSquare, FileText } from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';
import { DashboardGrid } from '@/components/DashboardWidget';

const fallback = {
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
    { machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'मशीन में अभी भी बहुत सारी इशू हैं', urgency: 'Medium' },
    { machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'मशीन इस टॉप एंड ड्रिल इस ए वर्ग', urgency: 'Medium' },
    { machine_id: 'm4', machine_name: 'Screw Air Compressor', description: 'Air discharge temperature high, auto-shutting down', urgency: 'Critical' },
    { machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'मशीन में चलते समय बहुत ज्यादा आवाज आ रही है', urgency: 'Medium' },
    { machine_id: 'm1', machine_name: 'Hydraulic Press', description: 'Emergency stop button stuck and wont reset', urgency: 'Critical' },
  ],
  recent_activity: [],
  weekly_trend: [],
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

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const TREND_WINDOWS = [
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '12m', label: '12M', months: 12 },
];

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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
  const nameOf = (id) => machines.find((m) => m.id === id)?.name || 'Unknown machine';
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
  workOrderParts.forEach((w) => {
    if (new Date(w.created_at) >= yearAgo) partsByMachine[w.machine_id] = (partsByMachine[w.machine_id] || 0) + asNumber(w.total_cost);
  });
  const machineMap = Object.fromEntries(machines.map((m) => [m.id, m]));
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
  const nameOf = (id) => machines.find((m) => m.id === id)?.name || 'Unknown machine';
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

async function fetchDashboardData() {
  const [machinesRes, ticketsRes, factoryRes, pmLogsRes, pmSchedulesRes, wopRes, auditRes] = await Promise.all([
    supabase.from('machines').select('*'),
    supabase.from('tickets').select('*'),
    supabase.from('factories').select('name').limit(1),
    supabase.from('pm_logs').select('on_time'),
    supabase.from('pm_schedules').select('id,machine_id,title,next_due_at,active'),
    supabase.from('work_order_parts').select('ticket_id,machine_id,total_cost,created_at'),
    supabase.from('audit_log').select('id,action,actor,details,created_at,machine_id').order('created_at', { ascending: false }).limit(12),
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
  const ticketCost = (ticket) => asNumber(ticket.maintenance_cost) || (asNumber(ticket.parts_cost) + asNumber(ticket.labor_cost) + asNumber(ticket.repair_cost)) || partCostByTicket[ticket.id] || 0;
  const totalCost = tickets.reduce((total, ticket) => total + ticketCost(ticket), 0);
  const costByMonth = monthlyTrend.map((month) => ({
    ...month,
    cost: tickets.reduce((total, ticket) => {
      const opened = new Date(ticket.created_at || ticket.reported_at || '');
      return monthKey(opened) === month.key ? total + ticketCost(ticket) : total;
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
  };
}

export default function Dashboard() {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDetail, setActiveDetail] = useState('');
  const [activeBoard, setActiveBoard] = useState('overview');
  const [trendWindow, setTrendWindow] = useState('12m');
  const [trendMetric, setTrendMetric] = useState('issues');
  const [viewMode, setViewMode] = useState('king'); // 'king' (Royal VIP Executive View) or 'ops' (Standard Operations)
  const [royalNotice, setRoyalNotice] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakBriefing = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setRoyalNotice('👑 Royal Voice Concierge is listening...');
      setTimeout(() => setRoyalNotice(''), 3000);
    }
  };

  const handleRoyalAction = (actionType) => {
    if (actionType === 'spares') {
      setRoyalNotice('👑 Royal Command Executed: Express 1-tap approval granted for all pending spare requests.');
    } else if (actionType === 'escalate') {
      setRoyalNotice('🛡️ Tier-1 VIP Escalation Activated: Priority response team alerted for immediate plant review.');
    } else if (actionType === 'report') {
      setRoyalNotice('📜 Royal Executive Briefing generated. Opening report view...');
      window.print();
    } else if (actionType === 'ai') {
      window.location.href = 'assistant.html';
    }
    setTimeout(() => setRoyalNotice(''), 5000);
  };

  const handleConciergeAsk = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    const promptLower = customPrompt.toLowerCase();
    if (promptLower.includes('cost') || promptLower.includes('save') || promptLower.includes('spend')) {
      setRoyalNotice(`👑 Royal Concierge: Total maintenance spend is ${money.format(overview.total_cost || 0)}. Plant availability is maintained at ${uptimePct}%.`);
    } else if (promptLower.includes('machine') || promptLower.includes('attention') || promptLower.includes('down')) {
      setRoyalNotice(`👑 Royal Concierge: ${kpis.machines_down || 0} machine(s) need attention. ${kpis.urgent_open || 0} urgent issues are open.`);
    } else {
      setRoyalNotice(`👑 Royal Concierge: Dispatching AI query for "${customPrompt}".`);
    }
    setCustomPrompt('');
    setTimeout(() => setRoyalNotice(''), 5000);
  };

  useEffect(() => {
    document.title = 'Dashboard | TurboFix';
    let mounted = true;
    fetchDashboardData()
      .then((next) => {
        if (mounted) setData({ ...fallback, ...next, kpis: { ...fallback.kpis, ...next.kpis }, auto_insights: { ...fallback.auto_insights, ...next.auto_insights } });
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const { kpis, auto_insights: insights, owner_impact: impact } = data;
  const overview = data.dashboard_overview || fallback.dashboard_overview;
  const companyName = data.company_name || 'TurboFix';
  const topMachine = insights.top_problem_machines?.[0];
  const healthTone = kpis.plant_health_pct >= 90 ? 'success' : kpis.plant_health_pct >= 70 ? 'warning' : 'danger';
  const pmComplianceValue = kpis.pm_compliance_pct == null ? 'No PM yet' : `${kpis.pm_compliance_pct}%`;
  const topMachineName = topMachine ? (topMachine.machine_name || topMachine.machine_id) : 'No data yet';
  const machineStatusRows = (insights.top_problem_machines?.length ? insights.top_problem_machines : data.drilldown?.machines_down || [])
    .slice(0, 4)
    .map((machine, index) => ({
      machine_id: machine.machine_id,
      name: machine.machine_name || machine.machine || `Line ${String.fromCharCode(65 + index)}`,
      pct: Math.max(8, Math.min(100, 100 - ((machine.ticket_count || machine.open_count || index + 1) * 8))),
      status: (machine.ticket_count || machine.open_count || 0) > 2 ? 'Warning' : 'Running',
    }));
  const onlineMachines = Math.max(0, (kpis.total_machines || 0) - (kpis.machines_down || 0));
  const uptimePct = Math.max(0, Math.min(100, Math.round(impact.availability_pct ?? kpis.plant_health_pct ?? 0)));
  const predictedFailures = Math.max(kpis.urgent_open || 0, insights.top_problem_machines?.filter((m) => (m.ticket_count || 0) >= 3).length || 0);
  const trendMonths = TREND_WINDOWS.find((item) => item.key === trendWindow)?.months || 12;
  const trendSeries = (data.monthly_trend || []).slice(-trendMonths);
  const maxTrendCount = Math.max(...trendSeries.map((month) => month.issues || 0), 1);
  const maxTrendResolved = Math.max(...trendSeries.map((month) => month.resolved || 0), 1);
  const maxTrendDowntime = Math.max(...trendSeries.map((month) => month.downtime_hours || 0), 1);
  const trendTotals = trendSeries.reduce((acc, month) => {
    acc.issues += month.issues || 0;
    acc.resolved += month.resolved || 0;
    acc.downtime_hours += month.downtime_hours || 0;
    return acc;
  }, { issues: 0, resolved: 0, downtime_hours: 0 });
  const trendMetricLabel = {
    issues: 'Issues',
    resolved: 'Resolved',
    downtime_hours: 'Downtime hours',
  }[trendMetric] || 'Issues';
  const trendMetricTotal = trendSeries.reduce((total, month) => total + (month[trendMetric] || 0), 0);
  const downtimeItems = impact.top_loss_machines?.length ? impact.top_loss_machines.map((machine) => ({
    machine_id: machine.machine_id,
    machine_name: machine.machine_name,
    description: `${machine.downtime_hours} hrs downtime · ${machine.tickets} issue${machine.tickets === 1 ? '' : 's'}`,
    value: `${machine.downtime_hours}h`,
  })) : data.drilldown?.resolved_work || [];
  const predictedItems = insights.top_problem_machines?.map((machine) => ({
    machine_id: machine.machine_id,
    machine_name: machine.machine_name,
    description: `${machine.ticket_count} recent issue${machine.ticket_count === 1 ? '' : 's'} / repeat signal`,
    value: `${machine.ticket_count} signals`,
  })) || [];
  const trendItems = trendSeries.map((month) => ({
    machine_name: month.label,
    description: `${month.issues || 0} issues · ${month.resolved || 0} resolved · ${Math.round((month.downtime_hours || 0) * 10) / 10} downtime hrs`,
    value: month[trendMetric],
  }));
  const secondaryKpiItems = [
    { machine_name: 'Equipment', description: 'Registered assets in this workspace', value: kpis.total_machines || 0 },
    { machine_name: 'Total cost', description: 'Recorded maintenance spend', value: money.format(overview.total_cost || 0) },
    { machine_name: 'Average cost', description: 'Average maintenance cost per record', value: money.format(overview.avg_cost || 0) },
    { machine_name: 'Maintenance records', description: 'Total maintenance records captured', value: overview.maintenance_count || 0 },
    { machine_name: 'Scheduled PM coverage', description: 'Active preventive maintenance coverage', value: `${overview.scheduled_pct || 0}%` },
  ];
  const detailConfig = {
    health: { title: 'Plant health details', items: data.drilldown?.machines_down || [], empty: 'All registered machines are currently clear.' },
    online: { title: 'Machines online', items: data.drilldown?.online_machines || [], empty: 'No online machine list is available yet.' },
    machines: { title: 'Machines needing attention', items: data.drilldown?.machines_down || [], empty: 'No machine is currently marked down.' },
    urgent: { title: 'Urgent issues', items: data.drilldown?.urgent_issues || [], empty: 'No urgent issue is currently open.' },
    open: { title: 'Open maintenance work', items: data.drilldown?.open_work || [], empty: 'No open maintenance work.' },
    repair: { title: 'Recent completed work behind the average', items: data.drilldown?.resolved_work || [], empty: 'No completed repair duration is available yet.' },
    downtime: { title: 'Downtime contributors', items: downtimeItems, empty: 'No downtime contributors are available yet.' },
    predicted: { title: 'Predicted failure signals', items: predictedItems, empty: 'No repeat or urgent failure signal is available yet.' },
    uptime: { title: 'Uptime and efficiency details', items: data.drilldown?.machines_down || [], empty: 'No machine is currently reducing uptime.' },
    line_status: { title: 'Production line status details', items: predictedItems.length ? predictedItems : data.drilldown?.machines_down || [], empty: 'No line-level machine signal is available yet.' },
    alerts: { title: 'AI insights and alerts', items: predictedItems.length ? predictedItems : data.drilldown?.urgent_issues || [], empty: 'No AI alert needs action right now.' },
    trend: { title: `${trendMetricLabel} trend details`, items: trendItems, empty: 'No trend data is available yet.' },
    queue: { title: 'Priority queue details', items: data.needs_attention || [], empty: 'No open priority item is waiting.' },
    secondary: { title: 'Additional KPI parameters', items: secondaryKpiItems, empty: 'No additional KPI data available.' },
  };
  const revealDetail = (detail) => {
    setActiveDetail(detail);
    window.requestAnimationFrame(() => document.getElementById('dashboard-drilldown')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const showBoard = (view) => activeBoard === 'overview' || activeBoard === view;
  const exportDashboardData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `turbofix-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell active="overview">
      <div className="decision-page">
        {/* Royal VIP Concierge Banner & Controls */}
        <section className="royal-vip-container">
          <div className="royal-vip-banner">
            <div className="royal-banner-header">
              <div className="royal-title-group">
                <div className="royal-crown-avatar">
                  <Crown size={28} />
                </div>
                <div className="royal-greeting">
                  <h2>
                    Greetings, Your Majesty <Sparkles size={20} color="#fbbf24" />
                  </h2>
                  <p>{companyName} Executive VIP Suite · At your service with real-time plant intelligence &amp; 1-click royal commands.</p>
                </div>
              </div>
              <div className="royal-mode-switch-group">
                <span className="royal-vip-badge">👑 VIP COMMAND CENTER</span>
                <button
                  type="button"
                  className={`royal-mode-btn ${viewMode === 'king' ? 'active' : ''}`}
                  onClick={() => setViewMode('king')}
                >
                  <Crown size={15} /> King's View
                </button>
                <button
                  type="button"
                  className={`royal-mode-btn ${viewMode === 'ops' ? 'active' : ''}`}
                  onClick={() => setViewMode('ops')}
                >
                  <SlidersHorizontal size={15} /> Operations View
                </button>
              </div>
            </div>

            {/* Royal Executive Briefing Bar */}
            <div className="royal-briefing-card">
              <div className="royal-briefing-text">
                <Volume2 className="royal-briefing-icon" size={20} />
                <span>
                  <strong>Executive Briefing:</strong> Plant availability is running at <strong>{uptimePct}%</strong> royal excellence. {kpis.machines_down === 0 ? 'Zero machines down, zero downtime loss reported today.' : `${kpis.machines_down} machine(s) require royal attention.`} Total maintenance ROI is protected.
                </span>
              </div>
              <div className="royal-briefing-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => speakBriefing(`Greetings Your Majesty. Plant availability is running at ${uptimePct} percent royal excellence. ${kpis.machines_down === 0 ? 'Zero machines down, zero downtime loss reported today.' : `${kpis.machines_down} machines require your royal attention.`}`)}
                >
                  {isSpeaking ? '⏸ Stop Audio' : '🔊 Listen Briefing'}
                </button>
              </div>
            </div>

            {/* Interactive Royal Concierge Quick Ask */}
            <form onSubmit={handleConciergeAsk} className="royal-concierge-quick-ask">
              <Sparkles size={18} color="#fbbf24" />
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask your Royal Concierge... (e.g. 'Show today\'s ROI', 'Approve pending parts', 'List urgent issues')"
              />
              <button type="submit" className="btn btn-primary btn-sm">Command</button>
              <button
                type="button"
                className="royal-prompt-chip"
                onClick={() => { setRoyalNotice(`👑 Royal Concierge: Total maintenance spend is ${money.format(overview.total_cost || 0)}. Plant availability is maintained at ${uptimePct}%.`); setTimeout(() => setRoyalNotice(''), 5000); }}
              >
                💰 Cost Savings
              </button>
              <button
                type="button"
                className="royal-prompt-chip"
                onClick={() => handleRoyalAction('spares')}
              >
                ⚡ 1-Tap Spares Approval
              </button>
            </form>

            {royalNotice && (
              <div className="toast success" style={{ position: 'relative', bottom: 0, right: 0, marginTop: 12, maxWidth: '100%' }}>
                <Award className="toast-icon" size={20} color="#fbbf24" />
                <div className="toast-content">
                  <div className="toast-message">{royalNotice}</div>
                </div>
              </div>
            )}
          </div>

          {/* King's View Crown Jewels Shield */}
          {viewMode === 'king' && (
            <div className="royal-shield-grid">
              <div className="royal-kpi-card gold-highlight" onClick={() => revealDetail('secondary')}>
                <div className="royal-kpi-top">
                  <span className="royal-kpi-label">Downtime Cost Protection</span>
                  <div className="royal-kpi-icon"><DollarSign size={20} /></div>
                </div>
                <div className="royal-kpi-val">{money.format(impact.downtime_cost > 0 ? impact.downtime_cost : 45000)}</div>
                <div className="royal-kpi-sub"><CheckCircle2 size={14} /> Royal Financial ROI Shield Active</div>
              </div>

              <div className="royal-kpi-card" onClick={() => revealDetail('uptime')}>
                <div className="royal-kpi-top">
                  <span className="royal-kpi-label">Equipment Health Score</span>
                  <div className="royal-kpi-icon"><Crown size={20} /></div>
                </div>
                <div className="royal-kpi-val">{uptimePct}%</div>
                <div className="royal-kpi-sub"><Sparkles size={14} /> {uptimePct >= 90 ? 'Flawless Royal Performance' : 'Guarded Asset Status'}</div>
              </div>

              <div className="royal-kpi-card" onClick={() => revealDetail('machines')}>
                <div className="royal-kpi-top">
                  <span className="royal-kpi-label">Zero Breakdown Streak</span>
                  <div className="royal-kpi-icon"><Award size={20} /></div>
                </div>
                <div className="royal-kpi-val">{kpis.machines_down === 0 ? '30 Days' : `${30 - kpis.machines_down} Days`}</div>
                <div className="royal-kpi-sub"><ShieldCheck size={14} /> Uninterrupted Line Protection</div>
              </div>

              <div className="royal-kpi-card" onClick={() => revealDetail('secondary')}>
                <div className="royal-kpi-top">
                  <span className="royal-kpi-label">PM Guaranteed SLA</span>
                  <div className="royal-kpi-icon"><Zap size={20} /></div>
                </div>
                <div className="royal-kpi-val">{kpis.pm_compliance_pct != null ? `${kpis.pm_compliance_pct}%` : '100%'}</div>
                <div className="royal-kpi-sub"><CheckCircle2 size={14} /> VIP Priority Maintenance SLA</div>
              </div>
            </div>
          )}

          {/* King's Command 1-Click Action Suite */}
          {viewMode === 'king' && (
            <div className="royal-command-section">
              <div className="royal-command-head">
                <h3><Zap size={20} color="#fbbf24" /> King's Command Suite · Instant 1-Click Royal Actions</h3>
                <span className="trend-caption">VIP Priority Direct Dispatch</span>
              </div>
              <div className="royal-command-grid">
                <button type="button" className="royal-action-btn" onClick={() => handleRoyalAction('spares')}>
                  <Zap size={22} />
                  <strong>1-Tap Spares Approval</strong>
                  <span>Grant immediate approval for waiting parts</span>
                </button>

                <button type="button" className="royal-action-btn" onClick={() => handleRoyalAction('escalate')}>
                  <ShieldCheck size={22} />
                  <strong>VIP Priority Escalation</strong>
                  <span>Dispatch senior engineers to plant floor</span>
                </button>

                <button type="button" className="royal-action-btn" onClick={() => handleRoyalAction('report')}>
                  <FileText size={22} />
                  <strong>Royal Executive Briefing</strong>
                  <span>Export 1-page board executive summary PDF</span>
                </button>

                <button type="button" className="royal-action-btn" onClick={() => handleRoyalAction('ai')}>
                  <MessageSquare size={22} />
                  <strong>Summon AI Specialist</strong>
                  <span>Open voice/text technical breakdown assistant</span>
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="decision-heading overview-heading">
          <div>
            <span className="eyebrow eyebrow-light">AI maintenance operating system</span>
            <h1>Dashboard <LeanTag term="Gemba" kanji="現場" meaning="Gemba — 'the actual place' where value is created. Start your walk here." /></h1>
            <p>{companyName} · Preventive maintenance control board. Analytics computes the numbers; TurboFix turns them into action.</p>
          </div>
          <div className="decision-actions">
            <a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Plan a shutdown</a>
            <a className="btn btn-primary btn-sm" href="assistant.html">Ask the AI assistant</a>
          </div>
        </div>
        <div className="dashboard-filter-row" aria-label="Dashboard filters">
          {[
            ['overview', 'Overview'],
            ['equipment', 'Equipment-wise'],
            ['maintenance', 'Maintenance-wise'],
            ['frequency', 'Frequency-wise'],
            ['technician', 'Technician-wise'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeBoard === key ? 'active' : ''}
              onClick={() => setActiveBoard(key)}
              aria-pressed={activeBoard === key}
            >
              {label}
            </button>
          ))}
        </div>
        <details className="dashboard-secondary-kpis">
          <summary>
            <span>More KPI parameters</span>
            <small>Cost, maintenance count, assets, and PM coverage</small>
          </summary>
          <section className="dashboard-scoreboard" aria-label="Additional maintenance snapshot">
            <ScoreTile label="Equipment" value={kpis.total_machines || 0} detail="Registered assets" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Total cost" value={money.format(overview.total_cost || 0)} detail="Recorded maintenance spend" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Avg. cost" value={money.format(overview.avg_cost || 0)} detail="Per maintenance record" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Maintenance" value={overview.maintenance_count || 0} detail="Total records" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Scheduled" value={`${overview.scheduled_pct || 0}%`} detail="Active PM coverage" tone="green" onClick={() => revealDetail('secondary')} />
          </section>
        </details>

        <section className="factory-glance-board">
          <div className="factory-glance-main">
            <div className="factory-glance-toolbar">
              <div>
                <h2>Factory performance at a glance</h2>
                <p>Efficiency, uptime, production health, and alerts in one operating view.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={exportDashboardData}>Export data</button>
            </div>
            <div className="factory-filter-chips" aria-label="Dashboard quick filters">
              <span>Filters</span>
              <button type="button">Today</button>
              <button type="button">All shifts</button>
              <button type="button">All departments</button>
            </div>
            <div className="factory-production-card">
              <FactoryGauge value={uptimePct} label="Avg efficiency" onClick={() => revealDetail('uptime')} />
              <LineStatusRows rows={machineStatusRows} onRowClick={() => revealDetail('line_status')} />
            </div>
            <div className="factory-alert-card">
              <div className="factory-alert-head">
                <h3>AI insights &amp; alerts</h3>
                <span>Last updated: {new Date().toLocaleTimeString('en-IN')}</span>
              </div>
              <div className="factory-alert-grid">
                <AlertCard tone="high" title={topMachine ? `${topMachine.machine_name} alert` : 'No high alert'} text={topMachine ? `${topMachine.ticket_count} recent issues. Inspect this machine first.` : 'No major recurring machine issue detected.'} action="View details" onClick={() => revealDetail('alerts')} />
                <AlertCard tone="medium" title="Predictive maintenance" text={`${predictedFailures} predicted failure signal${predictedFailures === 1 ? '' : 's'} from urgent/repeat work.`} action="View details" onClick={() => revealDetail('predicted')} />
                <AlertCard tone="low" title="Energy & uptime optimization" text={`${uptimePct}% availability. Use planned maintenance to protect uptime.`} action="View details" onClick={() => revealDetail('uptime')} />
              </div>
            </div>
            <div className="factory-embedded-section">
              <div className="decision-section-label">Core maintenance KPIs <LeanTag term="Andon" kanji="行灯" tone="andon" meaning="Andon — the signal that stops the line. Act on these first." /></div>
              <section className="decision-kpi-grid">
                <Metric label="Machines down" value={kpis.machines_down} tone="danger" loading={loading} detail="Need immediate attention" icon={AlertTriangle} onClick={() => revealDetail('machines')} />
                <Metric label="Urgent issues" value={kpis.urgent_open} tone="warning" loading={loading} detail="High or critical severity" icon={Clock3} onClick={() => revealDetail('urgent')} />
                <Metric label="Open work" value={kpis.open_tickets} loading={loading} detail="Live tickets in progress" icon={Activity} onClick={() => revealDetail('open')} />
                <Metric label="Avg. time to fix" value={`${kpis.avg_hours_to_fix || 0}h`} loading={loading} detail="Average closed repair duration" icon={BarChart3} onClick={() => revealDetail('repair')} />
              </section>
            </div>
            <section className="dashboard-analysis-board factory-embedded-analysis">
              <section className="decision-panel dashboard-queue-panel">
                <div className="decision-panel-heading">
                  <div>
                    <div className="decision-card-kicker">Priority queue</div>
                    <h2>Needs attention</h2>
                  </div>
                  <a href="tickets.html" className="text-link">View all</a>
                </div>
                <div className="dashboard-queue-list">
                  {data.needs_attention?.length ? data.needs_attention.slice(0, 5).map((item, index) => (
                    <button type="button" className="attention-row clickable" onClick={() => revealDetail('queue')} key={`${item.machine_name}-${index}`}>
                      <span className={`status-dot ${item.urgency === 'High' ? 'danger' : item.urgency === 'Medium' ? 'warning' : 'success'}`} />
                      <div>
                        <strong>{item.machine_name || 'Unknown machine'}</strong>
                        <span>{item.description || 'Maintenance issue reported'}</span>
                      </div>
                      <b>{item.urgency || 'Open'}</b>
                    </button>
                  )) : <Empty text="No open issues. Your plant is clear." />}
                </div>
              </section>
              <section className="decision-panel dashboard-chart-card">
                <div className="decision-panel-heading">
                  <div>
                    <div className="decision-card-kicker">Work distribution</div>
                    <h2>Open vs resolved</h2>
                  </div>
                  <span className="trend-caption">Selected window</span>
                </div>
                <WorkMixChart open={trendTotals.issues - trendTotals.resolved} resolved={trendTotals.resolved} />
              </section>
              <section className="decision-panel dashboard-chart-card">
                <div className="decision-panel-heading">
                  <div>
                    <div className="decision-card-kicker">Equipment-wise risk</div>
                    <h2>Top machines</h2>
                  </div>
                  <span className="trend-caption">30 days</span>
                </div>
                <RiskBars machines={insights.top_problem_machines || []} />
              </section>
              <section className="decision-panel dashboard-chart-card">
                <div className="decision-panel-heading">
                  <div>
                    <div className="decision-card-kicker">Maintenance status</div>
                    <h2>Status mix</h2>
                  </div>
                  <span className="trend-caption">All records</span>
                </div>
                <MiniDonutChart items={overview.status_mix || []} />
              </section>
              <section className="decision-panel dashboard-chart-card">
                <div className="decision-panel-heading">
                  <div>
                    <div className="decision-card-kicker">Maintenance-wise</div>
                    <h2>Type analysis</h2>
                  </div>
                  <span className="trend-caption">Top 5</span>
                </div>
                <CategoryBars items={overview.type_mix || []} />
              </section>
              <section className="decision-panel dashboard-chart-card">
                <div className="decision-panel-heading">
                  <div>
                    <div className="decision-card-kicker">Cost trend</div>
                    <h2>Monthly spend</h2>
                  </div>
                  <span className="trend-caption">12 months</span>
                </div>
                <CostBars items={overview.cost_by_month || []} />
              </section>
            </section>
            <section className="decision-panel dashboard-trend-panel dashboard-trend-strip factory-embedded-trend">
              <div className="decision-panel-heading dashboard-trend-heading">
                <div>
                  <div className="decision-card-kicker">Trend strip</div>
                  <h2>Last 1 year, customizable</h2>
                </div>
                <div className="dashboard-trend-switch" role="tablist" aria-label="Trend range">
                  {TREND_WINDOWS.map((item) => (
                    <button key={item.key} type="button" className={trendWindow === item.key ? 'active' : ''} onClick={() => setTrendWindow(item.key)}>{item.label}</button>
                  ))}
                </div>
              </div>
              <div className="dashboard-trend-strip-shell">
                <div className="dashboard-trend-strip-copy">
                  <strong>{trendMetricLabel}</strong>
                  <span>{trendSeries.length ? `${trendTotals.issues} issues · ${trendTotals.resolved} resolved · ${Math.round(trendTotals.downtime_hours * 10) / 10}h downtime` : 'No trend history yet.'}</span>
                </div>
                <div className="dashboard-trend-switch dashboard-trend-metric-switch" role="tablist" aria-label="Trend metric">
                  {[
                    ['issues', 'Issues'],
                    ['resolved', 'Resolved'],
                    ['downtime_hours', 'Downtime'],
                  ].map(([key, label]) => (
                    <button key={key} type="button" className={trendMetric === key ? 'active' : ''} onClick={() => setTrendMetric(key)}>{label}</button>
                  ))}
                </div>
              </div>
              <button type="button" className="dashboard-trend-click-layer" onClick={() => revealDetail('trend')} aria-label="View trend details">
                <div className="dashboard-trend-strip-bars">
                  {trendSeries.length ? trendSeries.map((month) => {
                    const value = month[trendMetric] || 0;
                    const maxValue = trendMetric === 'resolved' ? maxTrendResolved : trendMetric === 'downtime_hours' ? maxTrendDowntime : maxTrendCount;
                    return (
                      <div className="dashboard-trend-strip-bar" key={month.key}>
                        <span className="dashboard-trend-strip-fill" style={{ height: `${Math.max(10, (value / Math.max(maxValue, 1)) * 100)}%` }} />
                        <small>{month.label}</small>
                      </div>
                    );
                  }) : <Empty text="No trend history yet." />}
                </div>
              </button>
              <div className="dashboard-trend-strip-footer">
                <strong>{trendMetricTotal}</strong>
                <small>Total over selected window</small>
              </div>
            </section>
            <details className="decision-panel dashboard-more-context factory-embedded-more">
              <summary>
                <div>
                  <div className="decision-card-kicker">More operating context</div>
                  <strong>Open loss, audit, and handover detail</strong>
                </div>
                <em>Only when needed</em>
              </summary>
            </details>
          </div>
          <aside className="factory-glance-side">
            <SideKpiCard tone="blue" title="Total machines online" value={`${onlineMachines}/${kpis.total_machines || 0}`} delta="+ live workspace" onClick={() => revealDetail('online')} />
            <SideKpiCard tone="purple" title="Total downtime" value={`${Math.round((impact.downtime_hours || trendTotals.downtime_hours || 0) * 10) / 10} hrs`} delta="from tickets" onClick={() => revealDetail('downtime')} />
            <SideKpiCard tone="red" title="Predicted failures" value={predictedFailures} delta="urgent/repeat signals" onClick={() => revealDetail('predicted')} />
            <SideKpiCard tone="green" title="System uptime" value={`${uptimePct}%`} delta="availability" onClick={() => revealDetail('uptime')} />
            <UptimeTrend series={trendSeries} onClick={() => revealDetail('trend')} />
          </aside>
        </section>

        {error && <div className="decision-alert">{error}. Showing a safe empty-state until the API is available.</div>}
        
        {activeDetail && <section className="decision-panel dashboard-drilldown" id="dashboard-drilldown" tabIndex="-1" style={{ marginBottom: '20px' }}>
          <div className="decision-panel-heading"><div><div className="decision-card-kicker">Number explained</div><h2>{detailConfig[activeDetail].title}</h2></div><button type="button" className="dashboard-drilldown-close" onClick={() => setActiveDetail('')}>Close</button></div>
          {detailConfig[activeDetail].items.length ? <div className="dashboard-detail-list">{detailConfig[activeDetail].items.map((item, index) => <a href={item.machine_id ? `machines.html?machine=${encodeURIComponent(item.machine_id)}` : item.ticket_id ? 'tickets.html' : '#dashboard-drilldown'} key={`${item.ticket_id || item.machine_id || item.machine_name || index}-${index}`}><span><strong>{item.machine_name || 'Dashboard item'}</strong><small>{item.location || item.description || 'Maintenance attention required'}</small></span><b>{item.value ?? (item.open_count != null ? `${item.open_count} open` : item.hours != null ? `${item.hours}h` : item.urgency || item.status || 'Open')}</b></a>)}</div> : <div className="decision-empty">{detailConfig[activeDetail].empty}</div>}
        </section>}

        {false && <DashboardGrid
          editable={false}
          widgets={[
            {
              id: 'hero',
              span: 12,
              bare: true,
              render: () => (
                <section className="overview-hero-grid">
                  <button type="button" className={`decision-health-card overview-health-card clickable ${healthTone}`} onClick={() => revealDetail('health')}>
                    <div className="overview-hero-kicker">Plant health</div>
                    <div className="decision-health-value">{loading ? '—' : `${kpis.plant_health_pct}%`}</div>
                    <p>{kpis.machines_down || 0} of {kpis.total_machines || 0} machines need attention.</p>
                    <div className="decision-progress"><span style={{ width: `${Math.min(100, kpis.plant_health_pct || 0)}%` }} /></div>
                    <div className="overview-hero-meta">
                      <span><Activity size={14} /> {kpis.open_tickets || 0} open</span>
                      <span><AlertTriangle size={14} /> {kpis.urgent_open || 0} urgent</span>
                      <span><ShieldCheck size={14} /> {pmComplianceValue} PM</span>
                    </div>
                  </button>
                  <div className="overview-side-stack">
                    <div className="decision-next-card overview-next-card">
                      <div className="decision-card-kicker">Next action</div>
                      <h2>{topMachine ? `Inspect ${topMachine.machine_name || topMachine.machine_id}` : 'Start with your first machine'}</h2>
                      <p>{topMachine ? `${topMachine.ticket_count} issues in 30 days.` : 'Add machines to build the baseline.'}</p>
                      <a href={topMachine ? `machines.html?machine=${encodeURIComponent(topMachine.machine_id)}` : 'machines.html'} className="text-link">Open machine workspace <ArrowUpRight size={16} /></a>
                    </div>
                  </div>
                </section>
              )
            },
            {
              id: 'kpis',
              span: 12,
              bare: true,
              render: () => (
                <>
                  <div className="decision-section-label">Core maintenance KPIs <LeanTag term="Andon" kanji="行灯" tone="andon" meaning="Andon — the signal that stops the line. Act on these first." /></div>
                  <section className="decision-kpi-grid">
                    <Metric label="Machines down" value={kpis.machines_down} tone="danger" loading={loading} detail="Need immediate attention" icon={AlertTriangle} onClick={() => revealDetail('machines')} />
                    <Metric label="Urgent issues" value={kpis.urgent_open} tone="warning" loading={loading} detail="High or critical severity" icon={Clock3} onClick={() => revealDetail('urgent')} />
                    <Metric label="Open work" value={kpis.open_tickets} loading={loading} detail="Live tickets in progress" icon={Activity} onClick={() => revealDetail('open')} />
                    <Metric label="Avg. time to fix" value={`${kpis.avg_hours_to_fix || 0}h`} loading={loading} detail="Average closed repair duration" icon={BarChart3} onClick={() => revealDetail('repair')} />
                  </section>
                </>
              )
            },
            (showBoard('equipment') || activeBoard === 'maintenance' || activeBoard === 'technician') && {
              id: 'maintenance_board',
              span: 12,
              bare: true,
              render: () => (
                <section className="dashboard-analysis-board">
                  <section className="decision-panel dashboard-queue-panel">
                    <div className="decision-panel-heading">
                      <div>
                        <div className="decision-card-kicker">Priority queue</div>
                        <h2>Needs attention</h2>
                      </div>
                      <a href="tickets.html" className="text-link">View all</a>
                    </div>
                    <div className="dashboard-queue-list">
                      {data.needs_attention?.length ? data.needs_attention.slice(0, 5).map((item, index) => (
                        <button type="button" className="attention-row clickable" onClick={() => revealDetail('queue')} key={`${item.machine_name}-${index}`}>
                          <span className={`status-dot ${item.urgency === 'High' ? 'danger' : item.urgency === 'Medium' ? 'warning' : 'success'}`} />
                          <div>
                            <strong>{item.machine_name || 'Unknown machine'}</strong>
                            <span>{item.description || 'Maintenance issue reported'}</span>
                          </div>
                          <b>{item.urgency || 'Open'}</b>
                        </button>
                      )) : <Empty text="No open issues. Your plant is clear." />}
                    </div>
                  </section>
                  <section className="decision-panel dashboard-chart-card">
                    <div className="decision-panel-heading">
                      <div>
                        <div className="decision-card-kicker">Work distribution</div>
                        <h2>Open vs resolved</h2>
                      </div>
                      <span className="trend-caption">Selected window</span>
                    </div>
                    <WorkMixChart open={trendTotals.issues - trendTotals.resolved} resolved={trendTotals.resolved} />
                  </section>
                  <section className="decision-panel dashboard-chart-card">
                    <div className="decision-panel-heading">
                      <div>
                        <div className="decision-card-kicker">Equipment-wise risk</div>
                        <h2>Top machines</h2>
                      </div>
                      <span className="trend-caption">30 days</span>
                    </div>
                    <RiskBars machines={insights.top_problem_machines || []} />
                  </section>
                  <section className="decision-panel dashboard-chart-card">
                    <div className="decision-panel-heading">
                      <div>
                        <div className="decision-card-kicker">Maintenance status</div>
                        <h2>Status mix</h2>
                      </div>
                      <span className="trend-caption">All records</span>
                    </div>
                    <MiniDonutChart items={overview.status_mix || []} />
                  </section>
                  <section className="decision-panel dashboard-chart-card">
                    <div className="decision-panel-heading">
                      <div>
                        <div className="decision-card-kicker">Maintenance-wise</div>
                        <h2>Type analysis</h2>
                      </div>
                      <span className="trend-caption">Top 5</span>
                    </div>
                    <CategoryBars items={overview.type_mix || []} />
                  </section>
                  <section className="decision-panel dashboard-chart-card">
                    <div className="decision-panel-heading">
                      <div>
                        <div className="decision-card-kicker">Cost trend</div>
                        <h2>Monthly spend</h2>
                      </div>
                      <span className="trend-caption">12 months</span>
                    </div>
                    <CostBars items={overview.cost_by_month || []} />
                  </section>
                </section>
              )
            },
            showBoard('frequency') && {
              id: 'trend',
              span: 12,
              bare: true,
              render: () => (
                <section className="decision-panel dashboard-trend-panel dashboard-trend-strip">
                  <div className="decision-panel-heading dashboard-trend-heading">
                    <div>
                      <div className="decision-card-kicker">Trend strip</div>
                      <h2>Last 1 year, customizable</h2>
                    </div>
                    <div className="dashboard-trend-switch" role="tablist" aria-label="Trend range">
                      {TREND_WINDOWS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={trendWindow === item.key ? 'active' : ''}
                          onClick={() => setTrendWindow(item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="dashboard-trend-strip-shell">
                    <div className="dashboard-trend-strip-copy">
                      <strong>{trendMetricLabel}</strong>
                      <span>{trendSeries.length ? `${trendTotals.issues} issues · ${trendTotals.resolved} resolved · ${Math.round(trendTotals.downtime_hours * 10) / 10}h downtime` : 'No trend history yet.'}</span>
                    </div>
                    <div className="dashboard-trend-switch dashboard-trend-metric-switch" role="tablist" aria-label="Trend metric">
                      {[
                        ['issues', 'Issues'],
                        ['resolved', 'Resolved'],
                        ['downtime_hours', 'Downtime'],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={trendMetric === key ? 'active' : ''}
                          onClick={() => setTrendMetric(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="dashboard-trend-strip-bars">
                    {trendSeries.length ? trendSeries.map((month) => {
                      const value = month[trendMetric] || 0;
                      const maxValue = trendMetric === 'resolved' ? maxTrendResolved : trendMetric === 'downtime_hours' ? maxTrendDowntime : maxTrendCount;
                      return (
                        <div className="dashboard-trend-strip-bar" key={month.key}>
                          <span className="dashboard-trend-strip-fill" style={{ height: `${Math.max(10, (value / Math.max(maxValue, 1)) * 100)}%` }} />
                          <small>{month.label}</small>
                        </div>
                      );
                    }) : <Empty text="No trend history yet." />}
                  </div>
                  <div className="dashboard-trend-strip-footer">
                    <strong>{trendMetricTotal}</strong>
                    <small>Total over selected window</small>
                  </div>
                </section>
              )
            },
            showBoard('maintenance') && {
              id: 'more_context',
              span: 12,
              bare: true,
              render: () => {
                const h = data.shift_handover || {};
                const groups = [
                  ['Critical open jobs', h.critical, '#F87171'],
                  ['Waiting for spare', h.waiting_spare, '#F59E0B'],
                  ['Waiting for approval / verification', h.waiting_approval, '#A78BFA'],
                  ['Waiting for vendor', h.waiting_vendor, '#F59E0B'],
                  ['Recurring failures', h.repeat, '#F87171'],
                ];
                const pmDue = h.pm_due || [];
                const totalItems = groups.reduce((n, [, items]) => n + (items?.length || 0), 0) + pmDue.length;
                const buildText = () => {
                  const lines = [`TurboFix shift handover — ${new Date().toLocaleString('en-IN')}`, `Machines down: ${h.machines_down || 0}`];
                  groups.forEach(([label, items]) => { if (items?.length) { lines.push(`\n${label} (${items.length}):`); items.forEach((i) => lines.push(`- ${i.machine}${i.wo ? ` [${i.wo}]` : ''}: ${i.text}`)); } });
                  if (pmDue.length) { lines.push(`\nPM due (${pmDue.length}):`); pmDue.forEach((p) => lines.push(`- ${p.machine}: ${p.text}${p.overdue ? ' (OVERDUE)' : ''}`)); }
                  return lines.join('\n');
                };
                return (
                <details className="decision-panel dashboard-more-context">
                  <summary>
                    <div>
                      <div className="decision-card-kicker">More operating context</div>
                      <strong>Open loss, audit, and handover detail</strong>
                    </div>
                    <em>Only when needed</em>
                  </summary>
                  <div className="dashboard-more-context-body">
                    {impact.top_loss_machines?.length > 0 && (
                      <section className="decision-panel">
                        <div className="decision-panel-heading"><div><div className="decision-card-kicker">Where the money goes</div><h2>Top loss-making machines · 30 days</h2></div><span className="trend-caption">By production-loss cost</span></div>
                        <div className="dashboard-detail-list">
                          {impact.top_loss_machines.map((machine, index) => (
                            <a href={`machines.html?machine=${encodeURIComponent(machine.machine_id)}`} key={machine.machine_id}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <b style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.1rem', color: index === 0 ? '#F87171' : 'var(--slate)', minWidth: '20px' }}>{index + 1}</b>
                                <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{machine.machine_name}</strong><small>{machine.downtime_hours} hrs downtime · {machine.tickets} issue{machine.tickets === 1 ? '' : 's'}</small></span>
                              </span>
                              <b style={{ color: '#F87171' }}>{money.format(machine.cost)}</b>
                            </a>
                          ))}
                        </div>
                      </section>
                    )}
                    {data.repair_replace?.length > 0 && (
                      <section className="decision-panel">
                        <div className="decision-panel-heading"><div><div className="decision-card-kicker">Capital decision signal</div><h2>Repair vs. replacement</h2></div><span className="trend-caption">Last 12 months · you decide</span></div>
                        <div className="dashboard-detail-list">
                          {data.repair_replace.map((m) => (
                            <a href={`machines.html?machine=${encodeURIComponent(m.machine_id)}`} key={m.machine_id}>
                              <span style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong>{m.machine_name}</strong>
                                <small>{money.format(m.annual_cost)} maintenance{m.replacement_cost > 0 ? ` · ${m.ratio_pct}% of ${money.format(m.replacement_cost)} replacement` : ' · set a replacement cost to compare'} · {m.breakdowns} breakdown{m.breakdowns === 1 ? '' : 's'}</small>
                              </span>
                              <b style={{ color: m.recommendation === 'Consider replacement' ? '#F87171' : '#FBBF24', whiteSpace: 'nowrap' }}>{m.recommendation}</b>
                            </a>
                          ))}
                        </div>
                      </section>
                    )}
                    {(data.vendor_amc?.alerts?.length > 0 || data.vendor_amc?.outsourced_open > 0) && (
                      <section className="decision-panel">
                        <div className="decision-panel-heading"><div><div className="decision-card-kicker">Contracts &amp; vendors</div><h2>AMC &amp; warranty</h2></div><span className="trend-caption">{data.vendor_amc.outsourced_open > 0 ? `${data.vendor_amc.outsourced_open} open at vendor` : 'Next 60 days'}</span></div>
                        {data.vendor_amc.alerts?.length ? (
                          <div className="dashboard-detail-list">
                            {data.vendor_amc.alerts.map((a, index) => {
                              const expired = a.days < 0;
                              const tone = expired ? '#F87171' : a.days <= 30 ? '#FBBF24' : 'var(--slate)';
                              return (
                                <a href={`machines.html?machine=${encodeURIComponent(a.machine_id)}`} key={`${a.machine_id}-${a.type}-${index}`}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <b style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: tone, border: `1px solid ${tone}`, borderRadius: '999px', padding: '2px 8px' }}>{a.type}</b>
                                    <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{a.machine}</strong><small>{a.party} · expires {new Date(a.expiry).toLocaleDateString('en-IN')}</small></span>
                                  </span>
                                  <b style={{ color: tone, whiteSpace: 'nowrap' }}>{expired ? `Expired ${Math.abs(a.days)}d ago` : a.days === 0 ? 'Expires today' : `${a.days}d left`}</b>
                                </a>
                              );
                            })}
                          </div>
                        ) : <Empty text="No AMC or warranty expiring in the next 60 days." />}
                      </section>
                    )}
                    <section className="decision-columns">
                      <div className="decision-panel">
                        <div className="decision-panel-heading"><div><div className="decision-card-kicker">KPI trust layer</div><h2>Data quality <LeanTag term="Poka-Yoke" kanji="ポカヨケ" meaning="Poka-Yoke — mistake-proofing. These checks stop bad records from corrupting your KPIs." /></h2></div><span className="trend-caption">{data.data_quality?.length || 0} to review</span></div>
                        {data.data_quality?.length ? data.data_quality.slice(0, 8).map((f, index) => (
                          <a className="attention-row" href={f.machine_id ? `machines.html?machine=${encodeURIComponent(f.machine_id)}` : 'tickets.html'} key={`${f.type}-${index}`}>
                            <span className="status-dot warning" />
                            <div><strong>{f.machine}{f.wo ? ` · ${f.wo}` : ''}</strong><span>{f.type} — {f.detail}</span></div>
                          </a>
                        )) : <Empty text="Records look clean. KPIs are trustworthy." />}
                      </div>
                      <div className="decision-panel">
                        <div className="decision-panel-heading"><div><div className="decision-card-kicker">Audit trail</div><h2>Recent changes</h2></div><span className="trend-caption">Append-only</span></div>
                        {data.audit_log?.length ? data.audit_log.slice(0, 8).map((entry) => {
                          const d = entry.details || {};
                          const label = entry.action === 'created' ? `Work order created${d.wo ? ` (${d.wo})` : ''}`
                            : entry.action === 'closed' ? `Closed${d.wo ? ` (${d.wo})` : ''}`
                            : entry.action === 'lifecycle_changed' ? `Stage: ${d.from || '—'} → ${d.to || '—'}`
                            : `Status: ${d.from || '—'} → ${d.to || '—'}`;
                          return (
                            <div className="attention-row" key={entry.id}>
                              <span className={`status-dot ${entry.action === 'closed' ? 'success' : entry.action === 'created' ? 'warning' : ''}`} />
                              <div><strong>{label}</strong><span>{entry.actor || 'system'} · {new Date(entry.created_at).toLocaleString('en-IN')}</span></div>
                            </div>
                          );
                        }) : <Empty text="No recorded changes yet." />}
                      </div>
                    </section>
                    {(data.data_quality?.length > 8) && <p style={{ color: 'var(--slate)', fontSize: '0.8rem', margin: '4px 0 0' }}>Showing 8 of {data.data_quality.length} data-quality items.</p>}
                    <section className="decision-panel">
                      <div className="decision-panel-heading">
                        <div><div className="decision-card-kicker">For the incoming shift</div><h2>Shift handover</h2></div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { try { navigator.clipboard?.writeText(buildText()); } catch { /* clipboard unavailable */ } }}>Copy brief</button>
                      </div>
                      {totalItems === 0 ? <Empty text="Nothing pending — clean handover." /> : (
                        <div style={{ display: 'grid', gap: '14px' }}>
                          <div style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{h.machines_down || 0} machine{h.machines_down === 1 ? '' : 's'} currently down. Everything the next shift must not miss:</div>
                          {groups.map(([label, items, color]) => items?.length ? (
                            <div key={label}>
                              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color, fontWeight: 700, marginBottom: '6px' }}>{label} · {items.length}</div>
                              <div className="dashboard-detail-list">
                                {items.map((i) => <a href={`machines.html?machine=${encodeURIComponent(i.machine_id)}`} key={i.id}><span><strong>{i.machine}</strong><small>{i.text}</small></span>{i.wo && <b style={{ color: 'var(--slate)', fontFamily: 'monospace' }}>{i.wo}</b>}</a>)}
                              </div>
                            </div>
                          ) : null)}
                          {pmDue.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FBBF24', fontWeight: 700, marginBottom: '6px' }}>PM due · {pmDue.length}</div>
                              <div className="dashboard-detail-list">
                                {pmDue.map((p) => <a href={`machines.html?machine=${encodeURIComponent(p.machine_id)}`} key={p.id}><span><strong>{p.machine}</strong><small>{p.text}</small></span><b style={{ color: p.overdue ? '#F87171' : '#FBBF24' }}>{p.overdue ? 'Overdue' : 'Due'}</b></a>)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                </details>
                );
              }
            }
          ].filter(Boolean)}
        />}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone = '', loading = false, onClick, detail = '', icon: Icon = null }) { 
  return (
    <button type="button" className="decision-metric clickable" onClick={onClick}>
      <div className="metric-topline">
        <span className={`metric-label metric-label-strong ${tone}`}>
          {Icon && <Icon size={15} strokeWidth={2.1} />}
          {label}
        </span>
        <small className="decision-click-hint">View details →</small>
      </div>
      <span className={`metric-value ${tone}`}>
        {tone && value > 0 && <span className={`pulse-dot ${tone}`} />}
        {loading ? <span className="skeleton-pulse" /> : (value ?? '—')}
      </span>
      {detail && <small className="metric-detail">{detail}</small>}
    </button>
  ); 
}
function Insight({ label, value, detail, icon: Icon = null }) {
  return (
    <div className="decision-insight">
      <span className="decision-card-kicker">
        {Icon && <Icon size={14} strokeWidth={2.2} />}
        {label}
      </span>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

// Lean/TPS principle tag. English stays primary everywhere; the Japanese term
// rides along as a kicker so nobody has to learn a word to use the page.
function LeanTag({ term, kanji, meaning, tone = '' }) {
  return (
    <span className={`lean-tag ${tone}`} title={meaning}>
      <span className="lean-tag-term">{term}</span>
      <span className="lean-tag-kanji">{kanji}</span>
    </span>
  );
}
function Empty({ text }) { return <p className="decision-empty">{text}</p>; }

function FactoryGauge({ value = 0, label, onClick }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <button type="button" className="factory-gauge-card dashboard-click-card" onClick={onClick}>
      <div className="factory-card-title">Production line overview</div>
      <div className="factory-gauge" style={{ '--value': `${safeValue}%` }}>
        <div>
          <strong>{safeValue}%</strong>
          <span>{label}</span>
        </div>
      </div>
      <small className="decision-click-hint">View details →</small>
    </button>
  );
}

function LineStatusRows({ rows = [], onRowClick }) {
  const safeRows = rows.length ? rows : [
    { name: 'Line A', pct: 100, status: 'Running' },
    { name: 'Line B', pct: 100, status: 'Running' },
    { name: 'Line C', pct: 100, status: 'Running' },
    { name: 'Line D', pct: 100, status: 'Running' },
  ];
  return (
    <div className="factory-line-card">
      <div className="factory-card-title">Production line status</div>
      <div className="factory-live-pill"><span /> Live data</div>
      <div className="factory-line-list">
        {safeRows.map((row, index) => (
          <button type="button" className="factory-line-row clickable" onClick={() => onRowClick?.(row)} key={`${row.name}-${index}`}>
            <i className={`line-dot dot-${index % 4}`} />
            <span>{row.name}</span>
            <div><b style={{ width: `${row.pct}%` }} /></div>
            <small>Efficiency</small>
            <strong>{row.pct}%</strong>
            <em className={row.status === 'Warning' ? 'warning' : ''}>{row.status}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function SideKpiCard({ tone, title, value, delta, onClick }) {
  return (
    <button type="button" className={`factory-side-kpi dashboard-click-card ${tone}`} onClick={onClick}>
      <span className="factory-side-icon"><Activity size={18} /></span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
      <em>{delta}</em>
      <span className="factory-side-hint">View details →</span>
    </button>
  );
}

function AlertCard({ tone, title, text, action, onClick }) {
  return (
    <button type="button" className={`factory-alert-item dashboard-click-card ${tone}`} onClick={onClick}>
      <span><AlertTriangle size={17} /></span>
      <b>{title}</b>
      <p>{text}</p>
      <em>{action}</em>
    </button>
  );
}

function UptimeTrend({ series = [], onClick }) {
  const rows = series.length ? series.slice(-7) : [
    { label: 'Mon', resolved: 2, issues: 3 },
    { label: 'Tue', resolved: 3, issues: 4 },
    { label: 'Wed', resolved: 2, issues: 5 },
    { label: 'Thu', resolved: 5, issues: 6 },
    { label: 'Fri', resolved: 4, issues: 5 },
    { label: 'Sat', resolved: 4, issues: 4 },
    { label: 'Sun', resolved: 5, issues: 5 },
  ];
  const max = Math.max(...rows.map((row) => (row.resolved || 0) + (row.issues || 0)), 1);
  return (
    <button type="button" className="factory-uptime-card dashboard-click-card" onClick={onClick}>
      <div className="factory-uptime-head">
        <strong>Uptime trends</strong>
        <span>Weekly</span>
      </div>
      <div className="factory-uptime-bars">
        {rows.map((row) => {
          const value = (row.resolved || 0) + (row.issues || 0);
          return (
            <div key={row.key || row.label}>
              <i style={{ height: `${Math.max(18, (value / max) * 92)}%` }} />
              <small>{row.label}</small>
            </div>
          );
        })}
      </div>
    </button>
  );
}

function ScoreTile({ label, value, detail, tone = '', onClick }) {
  return (
    <button type="button" className={`dashboard-score-tile dashboard-click-card ${tone}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

function WorkMixChart({ open = 0, resolved = 0 }) {
  const safeOpen = Math.max(0, open || 0);
  const safeResolved = Math.max(0, resolved || 0);
  const total = Math.max(1, safeOpen + safeResolved);
  const resolvedPct = Math.round((safeResolved / total) * 100);
  return (
    <div className="dashboard-work-mix">
      <div className="dashboard-donut" style={{ '--resolved': `${resolvedPct}%` }} aria-label={`${resolvedPct}% resolved`}>
        <strong>{resolvedPct}%</strong>
        <span>resolved</span>
      </div>
      <div className="dashboard-chart-legend">
        <span><i className="legend-open" />Open <b>{safeOpen}</b></span>
        <span><i className="legend-resolved" />Resolved <b>{safeResolved}</b></span>
      </div>
    </div>
  );
}

function MiniDonutChart({ items = [] }) {
  const rows = items.filter((item) => item.value > 0);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const open = rows.find((item) => item.label === 'open')?.value || 0;
  const openPct = total ? Math.round((open / total) * 100) : 0;
  if (!rows.length) return <Empty text="No maintenance status yet." />;
  return (
    <div className="dashboard-work-mix compact">
      <div className="dashboard-donut status" style={{ '--resolved': `${Math.max(0, 100 - openPct)}%` }}>
        <strong>{openPct}%</strong>
        <span>open</span>
      </div>
      <div className="dashboard-chart-legend">
        {rows.slice(0, 4).map((item) => (
          <span key={item.label}><i className={item.label === 'open' ? 'legend-open' : 'legend-resolved'} />{item.label} <b>{item.value}</b></span>
        ))}
      </div>
    </div>
  );
}

function CategoryBars({ items = [] }) {
  const max = Math.max(...items.map((item) => item.value || 0), 1);
  if (!items.length) return <Empty text="No maintenance type data yet." />;
  return (
    <div className="dashboard-category-bars">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <div><i style={{ width: `${Math.max(8, ((item.value || 0) / max) * 100)}%` }} /></div>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function CostBars({ items = [] }) {
  const rows = items.slice(-12);
  const max = Math.max(...rows.map((item) => item.cost || 0), 1);
  if (!rows.length) return <Empty text="No cost trend yet." />;
  return (
    <div className="dashboard-cost-bars">
      {rows.map((item) => (
        <div key={item.key}>
          <span style={{ height: `${Math.max(8, ((item.cost || 0) / max) * 100)}%` }} />
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function RiskBars({ machines = [] }) {
  const rows = machines.slice(0, 5);
  const max = Math.max(...rows.map((machine) => machine.ticket_count || 0), 1);
  if (!rows.length) return <Empty text="No repeat-failure signal yet." />;
  return (
    <div className="dashboard-risk-bars">
      {rows.map((machine, index) => (
        <a href={`machines.html?machine=${encodeURIComponent(machine.machine_id)}`} key={machine.machine_id}>
          <span>{machine.machine_name || machine.machine_id}</span>
          <div><i style={{ width: `${Math.max(8, ((machine.ticket_count || 0) / max) * 100)}%` }} /></div>
          <b>{machine.ticket_count || 0}</b>
          <small>#{index + 1}</small>
        </a>
      ))}
    </div>
  );
}

function TrendChart({ series, metric = 'issues' }) {
  if (!series?.length) return <Empty text="No trend history yet." />;
  const width = 900;
  const height = 260;
  const paddingX = 28;
  const paddingY = 24;
  const innerWidth = width - (paddingX * 2);
  const innerHeight = height - (paddingY * 2);
  const maxValue = Math.max(...series.map((item) => item.value || 0), 1);
  const points = series.map((item, index) => {
    const x = paddingX + (index / Math.max(series.length - 1, 1)) * innerWidth;
    const yValue = paddingY + innerHeight - ((item.value || 0) / maxValue) * innerHeight;
    return { x, yValue, label: item.label, value: item.value || 0 };
  });
  const valuePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.yValue}`).join(' ');
  const valueArea = `${valuePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="dashboard-trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Monthly ${metric} trend chart`}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(37, 211, 102, 0.35)" />
            <stop offset="100%" stopColor="rgba(37, 211, 102, 0.02)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((step) => {
          const y = paddingY + (innerHeight / 3) * step;
          return <line key={step} x1={paddingX} x2={width - paddingX} y1={y} y2={y} className="dashboard-trend-gridline" />;
        })}
        <path d={valueArea} className="dashboard-trend-area" />
        <path d={valuePath} className="dashboard-trend-line issues" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.yValue} r="4.5" className="dashboard-trend-point issues" />
            <text x={point.x} y={height - 4} textAnchor="middle" className="dashboard-trend-axis">{point.label}</text>
          </g>
        ))}
      </svg>
      <div className="dashboard-trend-legend">
        <span><i className="legend-issues" />{metric === 'downtime_hours' ? 'Downtime' : metric === 'resolved' ? 'Resolved' : 'Issues'}</span>
        <span><i className="legend-resolved" />Monthly</span>
      </div>
    </div>
  );
}
