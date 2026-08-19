/* ===========================================================
   TurboFix — Vendor performance rollup
   ===========================================================

   TurboFix already collects everything this needs: tickets carry
   `outsource_vendor` once escalation_service.mark_outsourced() runs
   (see supabase/migrations/20260718100000_escalation_config.sql), and
   machines carry `vendor_name`/`amc_provider` for warranty/AMC coverage.
   Nobody had ever rolled that up per vendor — this file is that rollup,
   not a new data-collection burden.

   Resolution time reuses ticketSla.js's ticketAgeHours(), which already
   freezes at a closed ticket's resolution timestamp — the same measure
   the rest of the app uses for SLA, so a vendor's number means the same
   thing as the SLA number on the ticket board.

   Pure functions only — no Supabase calls here, same contract as
   machineHealth.js / ticketSla.js / operationalHealth.js.
   =========================================================== */

import { asArray, asNumber } from './dashboardMetrics.js';
import { isTicketClosed, ticketAgeHours } from './ticketSla.js';

function vendorKey(name) {
  return String(name || '').trim();
}

function ticketCost(ticket) {
  return asNumber(ticket?.parts_cost) + asNumber(ticket?.labor_cost) + asNumber(ticket?.repair_cost);
}

/**
 * One row per vendor that appears anywhere in the data — either assigned
 * an outsourced ticket, or covering a machine under AMC/warranty. A vendor
 * with AMC coverage but zero tickets still gets a row (0 assigned, 0
 * resolved) so "we pay this vendor but they've never been called" is a
 * visible fact, not a silent omission.
 */
export function computeVendorPerformance({ tickets = [], machines = [], now = new Date() } = {}) {
  const reference = now instanceof Date ? now : new Date(now);
  const byVendor = new Map();

  function entryFor(name) {
    const key = vendorKey(name);
    if (!key) return null;
    if (!byVendor.has(key)) {
      byVendor.set(key, {
        vendor: key,
        ticketsAssigned: 0,
        resolved: 0,
        pending: 0,
        totalResolutionHours: 0,
        resolvedWithDuration: 0,
        totalCost: 0,
        machineIds: new Set(),
      });
    }
    return byVendor.get(key);
  }

  asArray(tickets).forEach((ticket) => {
    const entry = entryFor(ticket?.outsource_vendor);
    if (!entry) return;

    entry.ticketsAssigned += 1;
    entry.totalCost += ticketCost(ticket);

    if (isTicketClosed(ticket)) {
      entry.resolved += 1;
      const hours = ticketAgeHours(ticket, reference);
      if (hours != null) {
        entry.totalResolutionHours += hours;
        entry.resolvedWithDuration += 1;
      }
    } else {
      entry.pending += 1;
    }
  });

  asArray(machines).forEach((machine) => {
    const machineId = machine?.id || machine?.machine_id;
    [machine?.amc_provider, machine?.vendor_name].forEach((name) => {
      const entry = entryFor(name);
      if (entry && machineId) entry.machineIds.add(machineId);
    });
  });

  return Array.from(byVendor.values())
    .map((entry) => ({
      vendor: entry.vendor,
      ticketsAssigned: entry.ticketsAssigned,
      resolved: entry.resolved,
      pending: entry.pending,
      avgResolutionHours: entry.resolvedWithDuration
        ? Math.round((entry.totalResolutionHours / entry.resolvedWithDuration) * 10) / 10
        : null,
      totalCost: Math.round(entry.totalCost),
      machinesCovered: entry.machineIds.size,
    }))
    .sort((a, b) => (b.ticketsAssigned - a.ticketsAssigned) || (b.machinesCovered - a.machinesCovered) || a.vendor.localeCompare(b.vendor));
}

/**
 * One line worth surfacing on a KPI card: the vendor with the most open
 * (unresolved) outsourced tickets right now, or null when nothing is
 * currently sitting with a vendor.
 */
export function slowestPendingVendor(vendorRows) {
  const withPending = asArray(vendorRows).filter((row) => row.pending > 0);
  if (!withPending.length) return null;
  return [...withPending].sort((a, b) => b.pending - a.pending)[0];
}
