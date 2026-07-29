import React from 'react';
import { Sparkles, Clock, Play, UserPlus, ChevronDown, CheckCheck, Repeat } from 'lucide-react';
import SlaMeter from './SlaMeter';
import {
  stageInfo,
  urgencyMeta,
  initialsOf,
  avatarColor,
  issueSummary,
  aiInsight,
} from '@/utils/ticketMeta';
import { computeSla, ticketAgeHours, formatDurationHours, isTicketClosed } from '@/utils/ticketSla';

/**
 * TicketRow — one work order in the control board.
 *
 * Renders as a dense table row on desktop and a stacked card on mobile; the
 * reflow is pure CSS (see Tickets.css) so there is a single DOM tree to keep
 * accessible and in sync.
 *
 * Props:
 * - ticket (object, required)
 * - ticketId (string, required): stable id used by all callbacks
 * - expanded / selected (bool)
 * - onToggleExpand(ticketId), onToggleSelect(ticketId)
 * - onStart(ticketId), onAssign(ticketId)
 * - now (Date): injected clock, keeps SLA maths deterministic in tests
 */
function TicketRow({
  ticket,
  ticketId,
  expanded,
  selected,
  onToggleExpand,
  onToggleSelect,
  onStart,
  onAssign,
  permissions = {},
  now,
  children,
}) {
  const stage = stageInfo(ticket);
  const urgency = urgencyMeta(ticket.urgency);
  const sla = computeSla(ticket, now);
  const closed = isTicketClosed(ticket);
  const ageHours = ticketAgeHours(ticket, now);
  const insight = aiInsight(ticket);

  const rowClass = [
    'tickets-row',
    expanded ? 'is-expanded' : '',
    selected ? 'is-selected' : '',
    sla.state === 'breached' ? 'is-breached' : '',
    sla.state === 'at_risk' ? 'is-at-risk' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Stop row-expansion from firing when an inner control is used.
  const swallow = (event) => event.stopPropagation();

  return (
    <article className={rowClass}>
      <div
        className="tickets-row-main"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`Work order ${ticket.wo_number || ticketId}, ${ticket.machine_name || 'machine'}, ${
          urgency.label
        } urgency, ${sla.meta.label}`}
        onClick={() => onToggleExpand(ticketId)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleExpand(ticketId);
          }
        }}
      >
        {/* Select */}
        <div className="tickets-col-select">
          {permissions.select && <input
            type="checkbox"
            className="tickets-checkbox"
            checked={selected}
            onClick={swallow}
            onChange={() => onToggleSelect(ticketId)}
            aria-label={`Select work order ${ticket.wo_number || ticketId}`}
          />}
        </div>

        {/* Identity */}
        <div className="tickets-col-identity" style={{ minWidth: 0 }}>
          <span className="tickets-wo">{ticket.wo_number || String(ticketId).split('-')[0]}</span>
          <span className="tickets-machine" title={ticket.machine_name}>
            {ticket.machine_name || ticket.machine_id || '—'}
          </span>
          {ticket.repeat_failure_flag && (
            <span
              className="tickets-badge"
              title="Recurring failure — root cause analysis recommended"
              style={{
                marginTop: 4,
                color: '#F87171',
                border: '1px solid rgba(248,113,113,0.5)',
                background: 'rgba(248,113,113,0.1)',
              }}
            >
              <Repeat size={9} aria-hidden="true" />
              Repeat ×{(ticket.repeat_failure_count || 0) + 1}
            </span>
          )}
        </div>

        {/* Issue + AI insight */}
        <div className="tickets-col-issue" style={{ minWidth: 0 }}>
          <span className="tickets-cell-label">Issue</span>
          <div className="tickets-issue" title={issueSummary(ticket)}>
            {issueSummary(ticket)}
          </div>
          {insight && (
            <div className="tickets-ai" title={insight}>
              <Sparkles size={11} aria-hidden="true" />
              {insight}
            </div>
          )}
        </div>

        {/* Status + urgency + SLA */}
        <div className="tickets-col-status" style={{ minWidth: 0 }}>
          <span className="tickets-cell-label">Status &amp; SLA</span>
          <div className="tickets-badge-row">
            <span
              className="tickets-badge"
              style={{
                color: stage.color,
                border: `1px solid ${stage.color}`,
                background: `${stage.color}1a`,
              }}
            >
              <span
                className={`tickets-dot${closed ? '' : ' is-live'}`}
                style={{ color: stage.color }}
              />
              {stage.label}
            </span>
            <span
              className="tickets-badge"
              style={{
                color: urgency.color,
                border: `1px solid rgba(${urgency.rgb}, 0.45)`,
                background: `rgba(${urgency.rgb}, 0.14)`,
              }}
            >
              {urgency.label}
            </span>
          </div>
          <SlaMeter sla={sla} />
        </div>

        {/* Assignee + age */}
        <div className="tickets-col-assignee">
          <span className="tickets-cell-label">Assignee</span>
          <div className="tickets-assignee">
            <span
              className="tickets-avatar"
              style={{ background: avatarColor(ticket.technician_name) }}
              aria-hidden="true"
            >
              {initialsOf(ticket.technician_name)}
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="tickets-assignee-name" title={ticket.technician_name}>
                {ticket.technician_name || 'Unassigned'}
              </span>
              <span className="tickets-age">
                <Clock size={10} aria-hidden="true" />
                {closed ? 'Took ' : 'Open '}
                {formatDurationHours(ageHours)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="tickets-col-actions">
          <div className="tickets-actions" onClick={swallow} role="presentation">
            {!closed && (
              <>
                {permissions.assign && <button
                  type="button"
                  className="tickets-action"
                  title="Assign technician"
                  aria-label={`Assign technician to ${ticket.wo_number || ticketId}`}
                  onClick={() => onAssign(ticketId)}
                >
                  <UserPlus size={14} />
                </button>}
                {permissions.start && <button
                  type="button"
                  className="tickets-action"
                  title="Start repair"
                  aria-label={`Start repair on ${ticket.wo_number || ticketId}`}
                  onClick={() => onStart(ticketId)}
                >
                  <Play size={14} />
                </button>}
              </>
            )}
            {closed && (
              <span
                className="tickets-action"
                title={
                  ticket.closure_approved_by
                    ? `Verified by ${ticket.closure_approved_by}`
                    : 'Closed'
                }
                style={{ color: '#25D366', cursor: 'default' }}
              >
                <CheckCheck size={14} />
              </span>
            )}
            <button
              type="button"
              className="tickets-action"
              title={expanded ? 'Hide details' : 'Show details'}
              aria-label={expanded ? 'Hide details' : 'Show details'}
              aria-expanded={expanded}
              onClick={() => onToggleExpand(ticketId)}
            >
              <ChevronDown
                size={14}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: expanded ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {expanded && children}
    </article>
  );
}

/**
 * Rows are numerous and mostly static between renders, so memoise on the
 * fields that actually change the output.
 */
export default React.memo(TicketRow, (prev, next) =>
  prev.ticket === next.ticket &&
  prev.expanded === next.expanded &&
  prev.selected === next.selected &&
  prev.now === next.now &&
  prev.children === next.children
);
