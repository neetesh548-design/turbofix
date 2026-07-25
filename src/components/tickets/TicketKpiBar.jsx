import React from 'react';
import { Inbox, AlertTriangle, Wrench, CheckCircle2, Timer } from 'lucide-react';
import { formatDurationHours } from '@/utils/ticketSla';

/**
 * TicketKpiBar — the five headline numbers a supervisor scans first.
 *
 * Each card is a button: clicking it applies the matching queue filter, so the
 * KPI strip doubles as navigation rather than being read-only decoration.
 *
 * Props:
 * - summary (object, required): result of `summarizeTickets(tickets)`
 * - activeFilter (string): currently applied queue key
 * - onSelect (fn(filterKey)): called when a card is clicked
 */
function TicketKpiBar({ summary, activeFilter, onSelect }) {
  const cards = [
    {
      key: 'open',
      label: 'Open tickets',
      value: summary.open,
      accent: '#60A5FA',
      icon: Inbox,
      // Breached is the more urgent fact, so it wins the one line available.
      hint:
        summary.breached > 0
          ? `${summary.breached} past SLA`
          : summary.atRisk > 0
            ? `${summary.atRisk} approaching SLA`
            : summary.open > 0
              ? 'All within SLA window'
              : 'Queue is clear',
    },
    {
      key: 'breached',
      label: 'SLA breached',
      value: summary.breached,
      accent: '#F87171',
      icon: AlertTriangle,
      hint: summary.breached ? 'Escalate now' : 'Nothing overdue',
      alarm: summary.breached > 0,
    },
    {
      key: 'in_progress',
      label: 'In progress',
      value: summary.inProgress,
      accent: '#60A5FA',
      icon: Wrench,
      hint: 'Technician actively working',
    },
    {
      key: 'resolved_today',
      label: 'Resolved today',
      value: summary.resolvedToday,
      accent: '#25D366',
      icon: CheckCircle2,
      hint: 'Closed since midnight',
    },
    {
      key: 'all',
      label: 'Avg resolution',
      value:
        summary.avgResolutionHours == null
          ? '—'
          : formatDurationHours(summary.avgResolutionHours),
      accent: '#A78BFA',
      icon: Timer,
      hint: summary.resolvedCount ? `Across ${summary.resolvedCount} closed` : 'No closed tickets yet',
      isText: true,
    },
  ];

  return (
    <section className="tickets-kpi-grid" aria-label="Ticket key performance indicators">
      {cards.map(({ key, label, value, accent, icon: Icon, hint, alarm, isText }) => (
        <button
          type="button"
          key={label}
          onClick={() => onSelect(key)}
          aria-pressed={activeFilter === key}
          className={[
            'tickets-kpi',
            activeFilter === key ? 'is-active' : '',
            alarm ? 'is-alarm' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ '--kpi-accent': accent }}
        >
          <span className="tickets-kpi-label">
            <Icon size={13} aria-hidden="true" />
            {label}
          </span>
          <span
            className="tickets-kpi-value"
            style={isText ? { fontSize: '1.35rem', letterSpacing: '0.01em' } : undefined}
          >
            {value}
          </span>
          <span className="tickets-kpi-hint">{hint}</span>
        </button>
      ))}
    </section>
  );
}

export default React.memo(TicketKpiBar);
