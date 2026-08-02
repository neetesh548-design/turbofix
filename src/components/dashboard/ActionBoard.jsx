/**
 * ActionBoard — one real, live view of "what needs action right now."
 *
 * Replaces the old Dashboard "Command Center" tab, which rendered a fixed
 * mock kanban (fake WO numbers, fake names, fake stock levels) unrelated to
 * the plant's actual data. This board sorts the same `tickets` the rest of
 * the dashboard already fetched into four lanes so a Maintenance Head or
 * Owner sees, in one place, which machine needs a decision and what that
 * decision is — without navigating to Tickets/Machines/Inventory first.
 *
 * Lane assignment (a ticket appears in exactly one, in this priority order):
 *   1. Verification pending — repair done, waiting on your sign-off
 *   2. Needs action now — SLA breached, critical urgency, or not yet started
 *   3. In progress — a technician is actively working it
 *   4. Closed today — resolved/verified since local midnight
 * Anything closed on an earlier day is left off the board; that's history,
 * not action, and belongs on Records.
 */

import React from 'react';
import { ArrowUpRight, CheckCircle2, Clock, ShieldAlert, Wrench } from 'lucide-react';
import {
  computeSla,
  isTicketClosed,
  isTicketInProgress,
  normalizeUrgency,
  ticketClosedAt,
} from '../../utils/ticketSla.js';

function issueSummary(ticket) {
  return ticket?.issue_text
    || (typeof ticket?.ai_summary === 'object' ? ticket.ai_summary?.summary : ticket?.ai_summary)
    || 'Maintenance issue';
}

function isVerificationPending(ticket) {
  return String(ticket?.lifecycle_stage || '').toLowerCase() === 'verification_pending';
}

function isClosedToday(ticket, now) {
  if (!isTicketClosed(ticket)) return false;
  const closedAt = ticketClosedAt(ticket);
  if (closedAt == null) return false;
  const closed = new Date(closedAt);
  return closed.getFullYear() === now.getFullYear()
    && closed.getMonth() === now.getMonth()
    && closed.getDate() === now.getDate();
}

function isUnassigned(ticket) {
  return !ticket?.technician_id && !ticket?.assigned_to && !ticket?.assignee_id;
}

function assigneeLabel(ticket) {
  if (isUnassigned(ticket)) return 'Unassigned';
  return ticket?.technician_name || ticket?.assignee_name || 'Assigned';
}

const LANES = [
  { key: 'verification', title: 'Awaiting verification', icon: CheckCircle2, tone: 'info', helper: 'Repair done — needs your sign-off before it closes.' },
  { key: 'action', title: 'Needs action now', icon: ShieldAlert, tone: 'danger', helper: 'SLA breached, critical, or nobody has started yet.' },
  { key: 'progress', title: 'In progress', icon: Wrench, tone: 'warning', helper: 'A technician is actively on this.' },
  { key: 'closed', title: 'Closed today', icon: Clock, tone: 'ok', helper: 'Resolved and verified since midnight.' },
];

function laneFor(ticket, now) {
  if (isClosedToday(ticket, now)) return 'closed';
  if (isTicketClosed(ticket)) return null; // closed on an earlier day — off the board
  if (isVerificationPending(ticket)) return 'verification';
  const sla = computeSla(ticket, now);
  const urgent = normalizeUrgency(ticket) === 'critical';
  if (sla.breached || urgent) return 'action';
  if (isTicketInProgress(ticket)) return 'progress';
  return 'action'; // reported, not yet started — still needs action
}

export default function ActionBoard({ tickets = [], loading = false }) {
  const now = new Date();
  const list = Array.isArray(tickets) ? tickets : [];

  const buckets = { verification: [], action: [], progress: [], closed: [] };
  list.forEach((ticket) => {
    const lane = laneFor(ticket, now);
    if (lane) buckets[lane].push(ticket);
  });

  Object.values(buckets).forEach((rows) => rows.sort((a, b) => {
    const slaA = computeSla(a, now);
    const slaB = computeSla(b, now);
    return Number(slaB.breached) - Number(slaA.breached)
      || (slaB.ratio ?? 0) - (slaA.ratio ?? 0);
  }));

  if (loading) {
    return (
      <div className="rd-action-board" data-testid="action-board" aria-busy="true">
        {LANES.map((lane) => (
          <div key={lane.key} className="rd-action-lane rd-action-lane-loading">
            <div className="dashboard-skeleton dashboard-skeleton-label" />
            <div className="dashboard-skeleton dashboard-skeleton-body" />
            <div className="dashboard-skeleton dashboard-skeleton-body short" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rd-action-board" data-testid="action-board">
      {LANES.map((lane) => {
        const rows = buckets[lane.key];
        const Icon = lane.icon;
        return (
          <section key={lane.key} className={`rd-action-lane tone-${lane.tone}`} aria-label={lane.title}>
            <header className="rd-action-lane-head">
              <span className="rd-action-lane-title"><Icon size={14} aria-hidden="true" /> {lane.title}</span>
              <span className="rd-action-lane-count">{rows.length}</span>
            </header>
            <p className="rd-action-lane-helper">{lane.helper}</p>
            <div className="rd-action-lane-cards">
              {rows.length === 0 && <p className="rd-empty">Nothing here.</p>}
              {rows.slice(0, 6).map((ticket) => {
                const sla = computeSla(ticket, now);
                return (
                  <a
                    key={ticket.id || ticket.ticket_id}
                    className="rd-action-card"
                    href={`tickets.html?activeFilter=all&machine=${encodeURIComponent(ticket.machine_id || '')}`}
                  >
                    <strong>{ticket.machine_name || ticket.machine_id || 'Machine'}</strong>
                    <span className="rd-action-card-issue">{issueSummary(ticket)}</span>
                    <span className="rd-action-card-meta">
                      {sla.breached ? 'SLA breached · ' : ''}{assigneeLabel(ticket)}
                    </span>
                  </a>
                );
              })}
              {rows.length > 6 && (
                <a className="rd-link" href="tickets.html">
                  +{rows.length - 6} more <ArrowUpRight size={12} />
                </a>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
