import React from 'react';
import { isTicketClosed } from '@/utils/ticketSla';
import DashboardKpiCard from './DashboardKpiCard.jsx';
import DashboardChart from './DashboardChart.jsx';

const includesAny = (value, words) => words.some((word) => String(value || '').toLowerCase().includes(word));

const CONFIG = {
  maintenance_head: {
    title: 'Exceptions requiring authority',
    empty: 'No safety, cost or repeat-failure exceptions need a decision.',
    match: (ticket) => !isTicketClosed(ticket) && (
      ticket.urgency === 'critical' ||
      ticket.repeat_failure_flag ||
      ticket.lifecycle_stage === 'verification_pending'
    ),
    stats: (tickets) => [
      ['Critical open', tickets.filter((t) => !isTicketClosed(t) && t.urgency === 'critical').length],
      ['Awaiting verification', tickets.filter((t) => t.lifecycle_stage === 'verification_pending').length],
      ['Repeat failures', tickets.filter((t) => !isTicketClosed(t) && t.repeat_failure_flag).length],
      ['Unassigned', tickets.filter((t) => !isTicketClosed(t) && !t.technician_id).length],
    ],
  },
  quality_inspector: {
    title: 'Quality verification queue',
    empty: 'No completed repairs are waiting for quality verification.',
    match: (ticket) => !isTicketClosed(ticket) && ['repair_completed', 'verification_pending'].includes(ticket.lifecycle_stage),
    stats: (tickets) => [
      ['Awaiting quality check', tickets.filter((t) => !isTicketClosed(t) && ['repair_completed', 'verification_pending'].includes(t.lifecycle_stage)).length],
      ['Missing repair action', tickets.filter((t) => !isTicketClosed(t) && !t.repair_action).length],
      ['Missing evidence', tickets.filter((t) => !isTicketClosed(t) && !t.ai_summary?.photo_url).length],
      ['Repeat defects', tickets.filter((t) => !isTicketClosed(t) && t.repeat_failure_flag).length],
    ],
  },
  safety_officer: {
    title: 'Safety and restart queue',
    empty: 'No unsafe machines or safety-critical repairs need review.',
    match: (ticket) => !isTicketClosed(ticket) && (
      ticket.urgency === 'critical' ||
      includesAny(ticket.issue_text, ['unsafe', 'danger', 'fire', 'smoke', 'shock', 'guard', 'loto'])
    ),
    stats: (tickets) => [
      ['Safety-critical open', tickets.filter((t) => !isTicketClosed(t) && t.urgency === 'critical').length],
      ['Unsafe reports', tickets.filter((t) => !isTicketClosed(t) && includesAny(t.issue_text, ['unsafe', 'danger', 'fire', 'smoke', 'shock'])).length],
      ['Restart checks', tickets.filter((t) => t.lifecycle_stage === 'verification_pending').length],
      ['Missing evidence', tickets.filter((t) => !isTicketClosed(t) && !t.ai_summary?.photo_url).length],
    ],
  },
};

export default function SpecialistDashboard({ role, tickets = [], loading = false }) {
  const config = CONFIG[role];
  if (!config) return null;
  const queue = tickets.filter(config.match).slice(0, 5);

  return (
    <div data-testid={`${role}-dashboard`}>
      <section className="rd-kpi-row" aria-label="Role priorities">
        {config.stats(tickets).map(([label, value]) => (
          <DashboardKpiCard key={label} label={label} value={loading ? '—' : value} />
        ))}
      </section>
      <DashboardChart title={config.title} subtitle="Action queue" caption={`${queue.length} requiring review`} action={<a className="rd-link" href="tickets.html">Open work orders</a>}>
        {queue.length === 0 ? (
          <p className="rd-empty">{loading ? 'Refreshing work…' : config.empty}</p>
        ) : (
          <div className="rd-queue-list">
            {queue.map((ticket) => (
              <a className="rd-queue-row" href={`tickets.html?activeFilter=all&machine=${encodeURIComponent(ticket.machine_id || '')}`} key={ticket.id || ticket.ticket_id}>
                <strong>{ticket.machine_name || 'Machine'}</strong>
                <span>{ticket.issue_text || 'Maintenance issue'}</span>
                <span>{ticket.urgency || ticket.lifecycle_stage || 'Open'}</span>
              </a>
            ))}
          </div>
        )}
      </DashboardChart>
    </div>
  );
}
