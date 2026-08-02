/**
 * CmmsKpiStrip — the "glance at this and know the plant's health" row.
 *
 * Standard CMMS dashboards (UpKeep, Fiix, MaintainX, Limble) lead with the
 * same five numbers regardless of vendor: Availability/Uptime, MTTR, MTBF,
 * open work orders + SLA risk, and maintenance spend. This replaces the
 * previous four-tile strip (fleet count / open tickets / breakdowns / SLA%)
 * with that same real data reorganised into the industry-standard shape —
 * MTTR/MTBF come from the existing, tested `mttrMetrics.js` utilities,
 * nothing here is invented.
 */

import React, { useMemo } from 'react';
import { computeMTBF, computeMTTR, computeDowntimeCost } from '../../utils/mttrMetrics.js';
import { formatDurationHours, summarizeTickets } from '../../utils/ticketSla.js';
import { formatInrCompact, fleetHealthMap } from '../../utils/dashboardMetrics.js';

function averageMtbf(mtbfByMachine) {
  const values = Object.values(mtbfByMachine).filter((v) => v != null);
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function availabilityTone(pct) {
  if (pct == null) return '';
  if (pct >= 90) return 'ok';
  if (pct >= 75) return 'warning';
  return 'danger';
}

export default function CmmsKpiStrip({ metrics, tickets = [], machines = [], canViewCost = false, loading = false }) {
  // Computed straight from machines/tickets rather than metrics.fleetHealth:
  // buildRoleMetrics only fills fleetHealth in for the operator/owner shapes,
  // not supervisor/engineer, and this strip is shown to every role.
  const fleet = useMemo(() => fleetHealthMap(machines, tickets), [machines, tickets]);
  const uptimePct = fleet.total
    ? Math.round((((fleet.byStatus?.running || 0) + (fleet.byStatus?.maintenance || 0)) / fleet.total) * 100)
    : null;

  const mttrHours = useMemo(() => computeMTTR(tickets), [tickets]);
  const mtbfHours = useMemo(() => averageMtbf(computeMTBF(tickets)), [tickets]);
  const downtimeCost = useMemo(() => computeDowntimeCost(tickets), [tickets]);
  const ticketSummary = useMemo(() => summarizeTickets(tickets), [tickets]);

  const openCount = ticketSummary.open;
  const breachedCount = ticketSummary.breached;
  const slaPct = metrics?.sla?.pct;

  const cost = metrics?.maintenanceCost?.total;

  const tiles = [
    {
      key: 'availability',
      href: 'machines.html',
      label: 'Availability',
      value: uptimePct != null ? `${uptimePct}%` : '—',
      detail: 'Running or under planned maintenance',
      tone: availabilityTone(uptimePct),
    },
    {
      key: 'mttr',
      href: 'tickets.html',
      label: 'MTTR',
      value: mttrHours != null ? formatDurationHours(mttrHours) : '—',
      detail: 'Mean time to repair · closed tickets',
      tone: '',
    },
    {
      key: 'mtbf',
      href: 'machines.html',
      label: 'MTBF',
      value: mtbfHours != null ? formatDurationHours(mtbfHours) : '—',
      detail: 'Mean time between failures',
      tone: '',
    },
    {
      key: 'workorders',
      href: 'tickets.html',
      label: 'Open work orders',
      value: openCount,
      detail: breachedCount ? `${breachedCount} SLA breached` : (slaPct != null ? `${slaPct}% on-time` : 'No SLA data yet'),
      tone: breachedCount > 0 ? 'danger' : (slaPct != null && slaPct < 85 ? 'warning' : 'ok'),
    },
  ];

  if (canViewCost) {
    tiles.push({
      key: 'cost',
      href: 'records.html',
      label: 'Maintenance cost',
      value: cost != null ? formatInrCompact(cost) : formatInrCompact(downtimeCost),
      detail: cost != null ? 'This month · parts + labour + downtime' : 'Estimated downtime cost',
      tone: '',
    });
  }

  if (loading) {
    return (
      <div className="cmms-kpi-strip" aria-hidden="true">
        {tiles.map((t) => (
          <div key={t.key} className="cmms-kpi-tile cmms-kpi-tile-loading">
            <div className="dashboard-skeleton dashboard-skeleton-label" />
            <div className="dashboard-skeleton dashboard-skeleton-value" />
            <div className="dashboard-skeleton dashboard-skeleton-detail" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="cmms-kpi-strip" data-testid="cmms-kpi-strip" aria-label="Plant health at a glance">
      {tiles.map((tile) => (
        <a key={tile.key} href={tile.href} className={`cmms-kpi-tile tone-${tile.tone}`}>
          <span className="cmms-kpi-label">{tile.label}</span>
          <strong className="cmms-kpi-value">{tile.value}</strong>
          <small className="cmms-kpi-detail">{tile.detail}</small>
        </a>
      ))}
    </section>
  );
}
