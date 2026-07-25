import React from 'react';
import { formatDurationHours } from '@/utils/ticketSla';

/**
 * SlaMeter — progress bar showing how much of a ticket's SLA window is used.
 *
 * Props:
 * - sla (object, required): result of `computeSla(ticket)`
 * - compact (bool): hide the caption row (used in dense contexts)
 */
export default function SlaMeter({ sla, compact = false }) {
  if (!sla?.known) {
    return <span style={{ fontSize: '0.7rem', color: 'var(--slate-light)' }}>No SLA data</span>;
  }

  const { meta, percentUsed, remainingHours, breached, closed, targetHours } = sla;

  const caption = closed
    ? `${meta.label} · ${formatDurationHours(sla.elapsedHours)} of ${targetHours}h`
    : breached
      ? `Overdue by ${formatDurationHours(Math.abs(remainingHours))}`
      : `${formatDurationHours(remainingHours)} left`;

  return (
    <div
      className="tickets-sla"
      title={`SLA target ${targetHours}h · ${Math.round((sla.ratio ?? 0) * 100)}% used · due ${
        sla.dueAt ? sla.dueAt.toLocaleString() : '—'
      }`}
    >
      <div
        className="tickets-sla-track"
        role="progressbar"
        aria-valuenow={percentUsed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`SLA ${meta.label}, ${percentUsed}% of target used`}
      >
        <div
          className="tickets-sla-fill"
          style={{ width: `${Math.max(3, percentUsed)}%`, background: meta.color }}
        />
      </div>
      {!compact && (
        <div className="tickets-sla-caption">
          <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
          <span>{caption}</span>
        </div>
      )}
    </div>
  );
}
