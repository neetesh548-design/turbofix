/**
 * Dashboard Page — Factory KPI & Maintenance Overview
 *
 * @api
 *   GET /api/v1/dashboard?company_code=C001 - Fetch all KPIs and overview charts
 *     @response {
 *       company_name: string,
 *       kpis: { machines_down, urgent_open, open_tickets, plant_health_pct, ... },
 *       dashboard_overview: { status_mix, type_mix, cost_by_month, ... },
 *       tickets_by_assignee: [...],
 *       custom_kpis: [{ kpi_id, label, value, trend, ... }],
 *       machine_highlights: [{ machine_id, status, issues, ... }]
 *     }
 *   POST /api/v1/dashboard/ask - AI-powered question about maintenance data
 *   GET  /api/v1/dashboard/root-cause?ticket_id=T001 - Analyze ticket root cause
 *   POST /api/v1/dashboard/custom-kpi - Create/update custom KPI config
 *
 * @edgeFunctions
 *   POST supabase.functions.invoke('ai_assistant') - Ask questions about machines
 *
 * @caching
 *   KPIs cached for 5 minutes in Redis
 *   Charts calculated daily at 00:30 UTC
 *
 * @workflow
 *   1. Page loads → fetch /api/v1/dashboard
 *   2. Render KPI cards (machines down, urgent tickets, plant health %)
 *   3. Render charts (cost trends, ticket status mix, type breakdown)
 *   4. Render machine highlights (top issues, assigned technicians)
 *   5. User can click → drilldown to Machines/Tickets pages
 *   6. User can ask AI → /api/v1/dashboard/ask edge function
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, DollarSign, Layers, Wrench, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';
import './Dashboard.css';

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

async function fetchDashboardData() {
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

export default function Dashboard() {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDetail, setActiveDetail] = useState('');
  const [activeBoard, setActiveBoard] = useState('overview');
  const [trendWindow, setTrendWindow] = useState('12m');
  const [trendMetric, setTrendMetric] = useState('issues');

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
  const efficiency = data.efficiency || fallback.efficiency;
  const costRatios = data.cost_ratios || fallback.cost_ratios;
  const backlog = data.backlog || fallback.backlog;
  const backlogVelocity = data.backlog_velocity || fallback.backlog_velocity;
  const companyName = data.company_name || 'TurboFix';
  const topMachine = insights.top_problem_machines?.[0];
  const healthTone = kpis.plant_health_pct >= 90 ? 'success' : kpis.plant_health_pct >= 70 ? 'warning' : 'danger';
  const uptimePct = Math.max(0, Math.min(100, Math.round(impact.availability_pct ?? kpis.plant_health_pct ?? 0)));
  const urgencyRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const mostCritical = [...(data.needs_attention || [])].sort(
    (a, b) => (urgencyRank[a.urgency] ?? 9) - (urgencyRank[b.urgency] ?? 9),
  )[0];
  const fleetDown = data.drilldown?.machines_down || [];
  const fleetOnlineCount = data.drilldown?.online_machines?.length || 0;
  const fleetTotal = fleetDown.length + fleetOnlineCount;
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
    alerts: { title: 'AI insights and alerts', items: predictedItems.length ? predictedItems : data.drilldown?.urgent_issues || [], empty: 'No AI alert needs action right now.' },
    trend: { title: `${trendMetricLabel} trend details`, items: trendItems, empty: 'No trend data is available yet.' },
    queue: { title: 'Priority queue details', items: data.needs_attention || [], empty: 'No open priority item is waiting.' },
    secondary: { title: 'Additional KPI parameters', items: secondaryKpiItems, empty: 'No additional KPI data available.' },
  };
  const revealDetail = (detail) => {
    setActiveDetail(detail);
    window.requestAnimationFrame(() => document.getElementById('dashboard-drilldown')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const toggleBoard = (key) => setActiveBoard((prev) => (prev === key ? 'overview' : key));
  const handover = data.shift_handover || {};
  const handoverGroups = [
    ['Critical open jobs', handover.critical, '#F87171'],
    ['Waiting for spare', handover.waiting_spare, '#F59E0B'],
    ['Waiting for approval / verification', handover.waiting_approval, '#A78BFA'],
    ['Waiting for vendor', handover.waiting_vendor, '#F59E0B'],
    ['Recurring failures', handover.repeat, '#F87171'],
  ];
  const handoverPmDue = handover.pm_due || [];
  const handoverTotal = handoverGroups.reduce((n, [, items]) => n + (items?.length || 0), 0) + handoverPmDue.length;
  const buildHandoverText = () => {
    const lines = [`TurboFix shift handover — ${new Date().toLocaleString('en-IN')}`, `Machines down: ${handover.machines_down || 0}`];
    handoverGroups.forEach(([label, items]) => { if (items?.length) { lines.push(`\n${label} (${items.length}):`); items.forEach((i) => lines.push(`- ${i.machine}${i.wo ? ` [${i.wo}]` : ''}: ${i.text}`)); } });
    if (handoverPmDue.length) { lines.push(`\nPM due (${handoverPmDue.length}):`); handoverPmDue.forEach((p) => lines.push(`- ${p.machine}: ${p.text}${p.overdue ? ' (OVERDUE)' : ''}`)); }
    return lines.join('\n');
  };
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
      <div className="decision-page md-dashboard">
        <div className="md-aurora" aria-hidden="true" />

        <header className="md-header">
          <div>
            <span className="eyebrow eyebrow-light">Maintenance control board</span>
            <h1>{companyName} <LeanTag term="Gemba" kanji="現場" meaning="Gemba — 'the actual place' where value is created. Start your walk here." /></h1>
            <p>Maintenance command center · reliability, efficiency, cost &amp; planning, live.</p>
          </div>
          <div className="decision-actions">
            <a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Plan a shutdown</a>
            <a className="btn btn-primary btn-sm" href="assistant.html">Ask the AI assistant</a>
          </div>
        </header>

        {error && <div className="decision-alert">{error}. Showing a safe empty-state until the API is available.</div>}

        {/* PULSE STRIP — the one-glance plant status row */}
        <section className="md-pulse" aria-label="Plant status at a glance">
          <button type="button" className={`md-pulse-ring md-tone-${healthTone}`} onClick={() => revealDetail('uptime')}>
            <HealthRing value={loading ? 0 : uptimePct} tone={healthTone} loading={loading} size={72} stroke={7} label="available" />
          </button>
          <span className="md-pulse-divider" />
          <PulseStat icon={AlertTriangle} tone="danger" label="Machines down" value={kpis.machines_down} onClick={() => revealDetail('machines')} />
          <PulseStat icon={Clock3} tone="warning" label="Urgent issues" value={kpis.urgent_open} onClick={() => revealDetail('urgent')} />
          <PulseStat
            icon={Layers}
            label="Open backlog"
            value={backlog.open_count}
            trend={<TrendBadge delta={backlogVelocity.net_7d} unit="" />}
            onClick={() => revealDetail('open')}
          />
          <PulseStat icon={Wrench} label="MTTR" value={`${insights.mttr_hours || 0}h`} onClick={() => revealDetail('repair')} />
          <span className="md-pulse-divider" />
          <PulseStat icon={DollarSign} tone="danger" label="Downtime cost · 30d" value={money.format(impact.downtime_cost || 0)} onClick={() => revealDetail('downtime')} />
        </section>

        {/* FLEET STATUS — every machine as a colored chip, spatial read at a glance */}
        <FleetStrip downMachines={fleetDown} onlineCount={fleetOnlineCount} totalCount={fleetTotal} onClick={revealDetail} />

        {/* PRIORITY ROW — what needs action right now */}
        <section className="md-priority-row">
          <div className="md-card md-queue-card">
            <div className="md-card-head">
              <div>
                <span className="md-kicker">Priority queue</span>
                <h2>Needs attention</h2>
              </div>
              <a href="tickets.html" className="text-link">View all</a>
            </div>
            {mostCritical && (
              <button type="button" className="md-most-critical" onClick={() => revealDetail('urgent')}>
                <AlertTriangle size={15} />
                <span className="md-most-critical-text">
                  <strong>Most urgent · {mostCritical.machine_name}</strong>
                  <small>{mostCritical.description}</small>
                </span>
                <b className="md-queue-tag">{mostCritical.urgency}</b>
              </button>
            )}
            <div className="md-queue-list">
              {data.needs_attention?.length ? data.needs_attention
                .filter((item) => !mostCritical || item.ticket_id == null || item.ticket_id !== mostCritical.ticket_id)
                .slice(0, 3).map((item, index) => (
                <button type="button" className="md-queue-row" onClick={() => revealDetail('queue')} key={`${item.machine_name}-${index}`}>
                  <span className={`md-dot md-dot-${item.urgency === 'High' ? 'danger' : item.urgency === 'Medium' ? 'warning' : 'ok'}`} />
                  <span className="md-queue-text">
                    <strong>{item.machine_name || 'Unknown machine'}</strong>
                    <small>{item.description || 'Maintenance issue reported'}</small>
                  </span>
                  <b className="md-queue-tag">{item.urgency || 'Open'}</b>
                </button>
              )) : <Empty text="No open issues. Your plant is clear." />}
            </div>
          </div>

          <div className="md-card md-reliability-card">
            <div className="md-card-head">
              <div>
                <span className="md-kicker">Category 1 · Reliability</span>
                <h2>Equipment health</h2>
              </div>
            </div>
            <SeverityBar
              label="MTBF"
              value={insights.mtbf_hours || 0}
              unit="h"
              pct={Math.min(100, ((insights.mtbf_hours || 0) / 48) * 100)}
              tone={(insights.mtbf_hours || 0) >= 24 ? 'ok' : (insights.mtbf_hours || 0) >= 12 ? 'warning' : 'danger'}
              hint="Time between failures — higher is better"
              onClick={() => revealDetail('predicted')}
            />
            <SeverityBar
              label="MTTR"
              value={insights.mttr_hours || 0}
              unit="h"
              pct={Math.min(100, ((insights.mttr_hours || 0) / 12) * 100)}
              tone={(insights.mttr_hours || 0) <= 4 ? 'ok' : (insights.mttr_hours || 0) <= 8 ? 'warning' : 'danger'}
              hint="Average repair time — lower is better"
              onClick={() => revealDetail('repair')}
            />
            <SeverityBar
              label="Repeat breakdowns"
              value={insights.repeat_breakdown_pct || 0}
              unit="%"
              pct={insights.repeat_breakdown_pct || 0}
              tone={insights.repeat_breakdown_pct >= 50 ? 'danger' : insights.repeat_breakdown_pct >= 20 ? 'warning' : 'ok'}
              hint="Assets failing 3+ times in 30 days"
              onClick={() => revealDetail('alerts')}
            />
            <button type="button" className="md-alert-mini" onClick={() => revealDetail('alerts')}>
              <AlertTriangle size={14} />
              <span>
                <strong>{topMachine ? topMachine.machine_name : 'No repeat-failure signal'}</strong>
                <small>{topMachine ? `${topMachine.ticket_count} issues in 30 days — inspect first` : 'No major recurring issue detected'}</small>
              </span>
            </button>
          </div>

          <div className="md-card md-impact-card">
            <div className="md-card-head">
              <div>
                <span className="md-kicker">Category 3 · Cost</span>
                <h2>Financial impact</h2>
              </div>
            </div>
            <CostComposition
              segments={[
                { label: 'Downtime cost', value: impact.downtime_cost || 0, tone: 'danger', detail: 'downtime' },
                { label: 'Maintenance cost', value: impact.maintenance_cost || 0, tone: 'blue', detail: 'secondary' },
                { label: 'Repeat-failure exposure', value: impact.repeat_loss_exposure || 0, tone: 'amber', detail: 'alerts' },
              ]}
              onSegmentClick={(s) => revealDetail(s.detail)}
            />
          </div>
        </section>

        <div className="dashboard-filter-row" aria-label="Dashboard filters">
          {[
            ['equipment', 'Equipment-wise'],
            ['maintenance', 'Maintenance-wise'],
            ['frequency', 'Frequency-wise'],
            ['technician', 'Technician-wise'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeBoard === key ? 'active' : ''}
              onClick={() => toggleBoard(key)}
              aria-pressed={activeBoard === key}
            >
              {label}
            </button>
          ))}
        </div>
        {activeBoard === 'overview' && (
          <p className="md-filter-hint">Pick a category above to drill into its detailed KPIs, charts, and breakdowns.</p>
        )}
        {activeBoard === 'technician' && (
          <div className="md-category-empty">No technician-level breakdown is available yet — this view will populate once work orders are attributed to individual technicians.</div>
        )}

        {/* CATEGORY 2 — Operational Efficiency */}
        {activeBoard === 'equipment' && (
        <section className="md-category">
          <button type="button" className="md-category-head md-category-head-btn" onClick={() => toggleBoard('equipment')}>
            <TrendingUp size={18} />
            <div>
              <span className="md-kicker">Category 2</span>
              <h2>Operational efficiency</h2>
            </div>
            <span className="md-category-collapse">Collapse ▲</span>
          </button>
          <div className="md-kpi-grid">
            <KpiCard
              label="PM compliance rate"
              value={kpis.pm_compliance_pct == null ? 'No PM yet' : `${kpis.pm_compliance_pct}%`}
              hint="World-class 95%+ · PMs completed on time"
              tone={kpis.pm_compliance_pct != null && kpis.pm_compliance_pct < 80 ? 'warning' : 'ok'}
              onClick={() => revealDetail('secondary')}
            />
            <KpiCard
              label="Planned vs reactive"
              value={efficiency.planned_pct == null ? 'No data yet' : `${efficiency.planned_pct}% planned`}
              hint="World-class 85%+ planned · 30 days"
              tone={efficiency.planned_pct != null && efficiency.planned_pct < 50 ? 'danger' : ''}
              onClick={() => revealDetail('secondary')}
            />
            <KpiCard
              label="Scheduled PM coverage"
              value={`${overview.scheduled_pct || 0}%`}
              hint="Active preventive schedules on the fleet"
              onClick={() => revealDetail('secondary')}
            />
            <KpiCard
              label="Backlog age"
              value={`${backlog.avg_age_days || 0}d avg`}
              hint={`${backlog.over_7d_count || 0} open tickets waiting over a week`}
              tone={backlog.over_7d_count > 0 ? 'warning' : ''}
              onClick={() => revealDetail('open')}
            />
          </div>
          <section className="dashboard-analysis-board md-charts-row">
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
          </section>
        </section>
        )}

        {/* CATEGORY 3 — Cost Management */}
        {activeBoard === 'maintenance' && (
        <section className="md-category">
          <button type="button" className="md-category-head md-category-head-btn" onClick={() => toggleBoard('maintenance')}>
            <DollarSign size={18} />
            <div>
              <span className="md-kicker">Category 3</span>
              <h2>Cost management</h2>
            </div>
            <span className="md-category-collapse">Collapse ▲</span>
          </button>
          <div className="md-category-export">
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportDashboardData}>Export data</button>
          </div>
          <div className="md-kpi-grid">
            <KpiCard
              label="Maintenance cost vs asset value"
              value={costRatios.cost_pct_of_rav == null ? 'Set replacement costs' : `${costRatios.cost_pct_of_rav}%`}
              hint="World-class 2–3% of replacement value · 12 months"
              tone={costRatios.cost_pct_of_rav != null && costRatios.cost_pct_of_rav > 8 ? 'danger' : ''}
              onClick={() => revealDetail('secondary')}
            />
            <KpiCard
              label="Emergency cost ratio"
              value={costRatios.emergency_cost_ratio == null ? 'No data yet' : `${costRatios.emergency_cost_ratio}%`}
              hint="World-class under 15% · share spent on unplanned work"
              tone={costRatios.emergency_cost_ratio != null && costRatios.emergency_cost_ratio > 45 ? 'danger' : ''}
              onClick={() => revealDetail('secondary')}
            />
            <KpiCard label="Total maintenance spend" value={money.format(overview.total_cost || 0)} hint="All recorded maintenance records" onClick={() => revealDetail('secondary')} />
            <KpiCard label="Average cost per record" value={money.format(overview.avg_cost || 0)} hint={`${overview.maintenance_count || 0} maintenance records`} onClick={() => revealDetail('secondary')} />
          </div>
          <section className="dashboard-analysis-board md-charts-row md-charts-row-cost">
            <section className="decision-panel dashboard-chart-card md-cost-trend-card">
              <div className="decision-panel-heading">
                <div>
                  <div className="decision-card-kicker">Cost trend</div>
                  <h2>Monthly spend</h2>
                </div>
                <span className="trend-caption">12 months</span>
              </div>
              <CostBars items={overview.cost_by_month || []} />
            </section>
            {impact.top_loss_machines?.length > 0 && (
              <section className="decision-panel dashboard-chart-card md-loss-card">
                <div className="decision-panel-heading">
                  <div>
                    <div className="decision-card-kicker">Where the money goes</div>
                    <h2>Top loss-making machines</h2>
                  </div>
                  <span className="trend-caption">30 days</span>
                </div>
                <div className="dashboard-detail-list">
                  {impact.top_loss_machines.slice(0, 4).map((machine, index) => (
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
          </section>
        </section>
        )}

        {/* CATEGORY 4 — Strategic Planning */}
        {activeBoard === 'frequency' && (
        <section className="md-category">
          <button type="button" className="md-category-head md-category-head-btn" onClick={() => toggleBoard('frequency')}>
            <Layers size={18} />
            <div>
              <span className="md-kicker">Category 4</span>
              <h2>Strategic planning</h2>
            </div>
            <span className="md-category-collapse">Collapse ▲</span>
          </button>
          <section className="decision-panel dashboard-trend-panel dashboard-trend-strip">
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

          <section className="decision-panel">
            <div className="decision-panel-heading">
              <div><div className="decision-card-kicker">For the incoming shift</div><h2>Shift handover</h2></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { try { navigator.clipboard?.writeText(buildHandoverText()); } catch { /* clipboard unavailable */ } }}>Copy brief</button>
            </div>
            {handoverTotal === 0 ? <Empty text="Nothing pending — clean handover." /> : (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{handover.machines_down || 0} machine{handover.machines_down === 1 ? '' : 's'} currently down. Everything the next shift must not miss:</div>
                {handoverGroups.map(([label, items, color]) => items?.length ? (
                  <div key={label}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color, fontWeight: 700, marginBottom: '6px' }}>{label} · {items.length}</div>
                    <div className="dashboard-detail-list">
                      {items.map((i) => <a href={`machines.html?machine=${encodeURIComponent(i.machine_id)}`} key={i.id}><span><strong>{i.machine}</strong><small>{i.text}</small></span>{i.wo && <b style={{ color: 'var(--slate)', fontFamily: 'monospace' }}>{i.wo}</b>}</a>)}
                    </div>
                  </div>
                ) : null)}
                {handoverPmDue.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FBBF24', fontWeight: 700, marginBottom: '6px' }}>PM due · {handoverPmDue.length}</div>
                    <div className="dashboard-detail-list">
                      {handoverPmDue.map((p) => <a href={`machines.html?machine=${encodeURIComponent(p.machine_id)}`} key={p.id}><span><strong>{p.machine}</strong><small>{p.text}</small></span><b style={{ color: p.overdue ? '#F87171' : '#FBBF24' }}>{p.overdue ? 'Overdue' : 'Due'}</b></a>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
        )}

        <details className="dashboard-secondary-kpis">
          <summary>
            <span>More context</span>
            <small>Equipment count, PM coverage, and per-record averages</small>
          </summary>
          <section className="dashboard-scoreboard" aria-label="Additional maintenance snapshot">
            <ScoreTile label="Equipment" value={kpis.total_machines || 0} detail="Registered assets" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Total cost" value={money.format(overview.total_cost || 0)} detail="Recorded maintenance spend" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Avg. cost" value={money.format(overview.avg_cost || 0)} detail="Per maintenance record" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Maintenance" value={overview.maintenance_count || 0} detail="Total records" onClick={() => revealDetail('secondary')} />
            <ScoreTile label="Scheduled" value={`${overview.scheduled_pct || 0}%`} detail="Active PM coverage" tone="green" onClick={() => revealDetail('secondary')} />
          </section>
        </details>

        {activeDetail && <section className="decision-panel dashboard-drilldown" id="dashboard-drilldown" tabIndex="-1" style={{ marginBottom: '20px' }}>
          <div className="decision-panel-heading"><div><div className="decision-card-kicker">Number explained</div><h2>{detailConfig[activeDetail].title}</h2></div><button type="button" className="dashboard-drilldown-close" onClick={() => setActiveDetail('')}>Close</button></div>
          {detailConfig[activeDetail].items.length ? <div className="dashboard-detail-list">{detailConfig[activeDetail].items.map((item, index) => <a href={item.machine_id ? `machines.html?machine=${encodeURIComponent(item.machine_id)}` : item.ticket_id ? 'tickets.html' : '#dashboard-drilldown'} key={`${item.ticket_id || item.machine_id || item.machine_name || index}-${index}`}><span><strong>{item.machine_name || 'Dashboard item'}</strong><small>{item.location || item.description || 'Maintenance attention required'}</small></span><b>{item.value ?? (item.open_count != null ? `${item.open_count} open` : item.hours != null ? `${item.hours}h` : item.urgency || item.status || 'Open')}</b></a>)}</div> : <div className="decision-empty">{detailConfig[activeDetail].empty}</div>}
        </section>}
      </div>
    </AppShell>
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

// SVG ring gauge — rounded stroke cap, animated draw, tone-tinted glow.
function HealthRing({ value = 0, tone = 'success', size = 172, stroke = 13, label = 'available', loading = false }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (safe / 100) * c;
  return (
    <div className={`health-ring ${tone}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${safe}% ${label}`}>
        <circle className="health-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="health-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="health-ring-center">
        <strong>{loading ? '—' : `${safe}%`}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

// Single headline number in the pulse strip — icon + label + value, tone-colored.
function PulseStat({ icon: Icon, label, value, tone = '', trend, onClick }) {
  return (
    <button type="button" className={`md-pulse-stat ${tone}`} onClick={onClick}>
      <span className="md-pulse-label">{Icon && <Icon size={13} />}{label}</span>
      <span className="md-pulse-value-row">
        <strong className="md-pulse-value">{value ?? '—'}</strong>
        {trend}
      </span>
    </button>
  );
}

// Small directional badge — is this metric trending better or worse this week?
function TrendBadge({ delta, goodWhenNegative = true, unit = '' }) {
  if (!delta) return <span className="md-trend-badge flat">flat</span>;
  const rising = delta > 0;
  const good = goodWhenNegative ? !rising : rising;
  return (
    <span className={`md-trend-badge ${good ? 'good' : 'bad'}`}>
      {rising ? '▲' : '▼'} {Math.abs(delta)}{unit} / wk
    </span>
  );
}

// Horizontal severity bar — turns a bare number into an instant good/warn/bad read.
function SeverityBar({ label, value, unit = '', pct, tone = '', hint, onClick }) {
  const safePct = Math.max(4, Math.min(100, pct));
  return (
    <button type="button" className={`md-severity-row ${tone}`} onClick={onClick} title={hint}>
      <span className="md-severity-label">{label}</span>
      <span className="md-severity-track"><span className="md-severity-fill" style={{ width: `${safePct}%` }} /></span>
      <span className="md-severity-value">{value}{unit}</span>
    </button>
  );
}

// Stacked composition bar — shows cost proportions at a glance instead of 3 flat numbers.
function CostComposition({ segments, onSegmentClick }) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + Math.max(0, s.value), 0));
  return (
    <div className="md-cost-composition">
      <div className="md-cost-comp-bar">
        {segments.map((s) => (
          <span
            key={s.label}
            className={`md-cost-comp-seg ${s.tone}`}
            style={{ width: `${Math.max(0, (s.value / total) * 100)}%` }}
            title={`${s.label}: ${money.format(s.value)}`}
          />
        ))}
      </div>
      <div className="md-cost-comp-legend">
        {segments.map((s) => (
          <button type="button" key={s.label} className="md-cost-comp-item" onClick={() => onSegmentClick?.(s)}>
            <span className={`md-cost-comp-dot ${s.tone}`} />
            <span className="md-cost-comp-label">{s.label}</span>
            <b className={`md-cost-comp-value ${s.tone}`}>{money.format(s.value)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

// Fleet status strip — every machine as a colored chip, so "which ones are down"
// is answered visually instead of by reading a count.
// Fleet status strip — scales from a handful of machines to hundreds: named
// machines are shown only for what needs attention (down/warning), capped with
// an overflow chip; the healthy majority collapses into one summary chip
// instead of a wall of identical "running fine" pills.
const FLEET_MAX_VISIBLE = 10;
function FleetStrip({ downMachines, onlineCount, totalCount, onClick }) {
  if (!totalCount) return null;
  const sorted = [...downMachines].sort((a, b) => (b.open_count || 0) - (a.open_count || 0));
  const visible = sorted.slice(0, FLEET_MAX_VISIBLE);
  const overflow = sorted.length - visible.length;
  return (
    <section className="md-fleet-strip" aria-label="Fleet status at a glance">
      <span className="md-fleet-label">Fleet status · {totalCount} machines</span>
      <div className="md-fleet-chips">
        {visible.map((m, index) => (
          <button
            type="button"
            key={m.machine_id || `${m.machine_name}-${index}`}
            className={`md-fleet-chip ${(m.open_count || 0) >= 3 ? 'danger' : 'warning'}`}
            onClick={() => onClick('machines')}
            title={m.location || ''}
          >
            <span className="md-fleet-dot" />
            {m.machine_name}
          </button>
        ))}
        {overflow > 0 && (
          <button type="button" className="md-fleet-chip md-fleet-more" onClick={() => onClick('machines')}>
            +{overflow} more down
          </button>
        )}
        {!downMachines.length && (
          <span className="md-fleet-chip ok">
            <span className="md-fleet-dot" /> All clear
          </span>
        )}
        {onlineCount > 0 && (
          <button type="button" className="md-fleet-chip ok" onClick={() => onClick('online')}>
            <span className="md-fleet-dot" /> {onlineCount} running fine
          </button>
        )}
      </div>
    </section>
  );
}

// A category-section KPI tile — label, value, and the benchmark/context hint.
function KpiCard({ label, value, hint, tone = '', onClick }) {
  return (
    <button type="button" className={`md-kpi-card ${tone}`} onClick={onClick}>
      <span className="md-kpi-label">{label}</span>
      <strong className="md-kpi-value">{value}</strong>
      {hint && <small className="md-kpi-hint">{hint}</small>}
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
