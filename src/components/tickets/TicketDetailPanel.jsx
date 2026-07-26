import React from 'react';
import { formatDateTime, getDirectCause, getRootCauseFix } from '@/utils/ticketMeta';
import { computeSla, isTicketClosed, formatDurationHours } from '@/utils/ticketSla';

const STAGE_ACTIONS = [
  { stage: 'work_started', label: '▶ Start repair', color: '#60A5FA', rgb: '96,165,250' },
  { stage: 'waiting_spare', label: '⏳ Waiting spare', color: '#F59E0B', rgb: '245,158,11' },
  { stage: 'repair_completed', label: '✓ Repair completed', color: '#34D399', rgb: '52,211,153' },
];

/**
 * TicketDetailPanel — the drill-down shown when a row is expanded.
 *
 * Keeps the advanced surface (repair record, AI diagnosis, Kaizen 5-Why,
 * lifecycle actions, inline edit) out of the default scan path, per the
 * MVP-first drill-down pattern.
 *
 * Props:
 * - ticket (object, required), ticketId (string, required)
 * - technicians (array): directory rows for the assignee picker
 * - onStageChange(ticketId, stage, status?), onClose(ticketId)
 * - onFieldChange(ticketId, patch): inline edit of urgency / assignee
 * - now (Date)
 */
export default function TicketDetailPanel({
  ticket,
  ticketId,
  technicians = [],
  onStageChange,
  onClose,
  onFieldChange,
  now,
}) {
  const closed = isTicketClosed(ticket);
  const sla = computeSla(ticket, now);
  const hasRecord =
    ticket.root_cause ||
    ticket.repair_action ||
    ticket.parts_used ||
    ticket.labour_minutes ||
    ticket.downtime_minutes;

  const facts = [
    ['SLA target', `${sla.targetHours}h (${sla.meta.label})`],
    ['Due by', sla.dueAt ? formatDateTime(sla.dueAt) : '—'],
    ['Reported', formatDateTime(ticket.reported_at || ticket.created_at)],
    ['Reporter', ticket.reporter_phone],
    ['Root cause', ticket.root_cause],
    ['Repair action', ticket.repair_action],
    ['Parts used', ticket.parts_used],
    ['Labour time', ticket.labour_minutes ? `${ticket.labour_minutes} min` : null],
    ['Machine downtime', ticket.downtime_minutes != null ? `${ticket.downtime_minutes} min` : null],
    ['Work started', ticket.started_at ? formatDateTime(ticket.started_at) : null],
    ['Closed', ticket.resolved_at ? formatDateTime(ticket.resolved_at) : null],
    ['Verified by', ticket.closure_approved_by],
  ];

  return (
    <div className="tickets-detail">
      {/* Inline edit — change priority or owner without leaving the queue. */}
      {!closed && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <small
              style={{
                color: 'var(--slate-light)',
                fontSize: '0.66rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Urgency
            </small>
            <select
              className="tickets-select"
              value={String(ticket.urgency || '').toLowerCase()}
              onChange={(event) => onFieldChange(ticketId, { urgency: event.target.value })}
            >
              <option value="">Unrated</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
            <small
              style={{
                color: 'var(--slate-light)',
                fontSize: '0.66rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Assigned technician
            </small>
            <select
              className="tickets-select"
              value={ticket.technician_id || ''}
              onChange={(event) =>
                onFieldChange(ticketId, { assigned_to: event.target.value || null })
              }
            >
              <option value="">Unassigned</option>
              {technicians.map((tech) => (
                <option key={tech.user_id} value={tech.user_id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
            <small
              style={{
                color: 'var(--slate-light)',
                fontSize: '0.66rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Time in queue
            </small>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: sla.meta.color }}>
              {formatDurationHours(sla.elapsedHours)} / {sla.targetHours}h
            </span>
          </div>
        </div>
      )}

      <div className="tickets-detail-grid">
        {facts.map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <span style={{ color: value ? 'var(--ink)' : 'var(--slate-light)' }}>{value || '—'}</span>
          </div>
        ))}
      </div>

      {ticket.ai_summary?.photo_url && (
        <div style={{ marginBottom: 12 }}>
          <small
            style={{
              display: 'block',
              color: 'var(--slate-light)',
              fontSize: '0.66rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Reported photo
          </small>
          <a href={ticket.ai_summary.photo_url} target="_blank" rel="noopener noreferrer">
            <img
              src={ticket.ai_summary.photo_url}
              alt="Reported issue"
              loading="lazy"
              style={{
                maxWidth: 240,
                maxHeight: 160,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                objectFit: 'cover',
              }}
            />
          </a>
        </div>
      )}

      {/* AI predictive diagnosis */}
      <div className="tickets-panel is-ai">
        <div className="tickets-panel-title" style={{ color: '#60A5FA' }}>
          <span>🤖 AI machine diagnosis — {ticket.machine_name || 'Unit'}</span>
          <span
            style={{
              fontSize: '0.66rem',
              background: 'rgba(59,130,246,0.15)',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            Predictive
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
            fontSize: '0.8rem',
            color: '#e2e8f0',
          }}
        >
          {[
            [
              'Predicted root cause',
              ticket.ai_summary?.predicted_issue ||
                `${ticket.machine_name}: inspection required for reported issue.`,
            ],
            [
              'Recommended repair step',
              ticket.ai_summary?.recommended_action ||
                'Perform standard troubleshooting protocol and verify component interlocks.',
            ],
            [
              'Suggested spare parts',
              ticket.ai_summary?.recommended_parts || 'Standard maintenance spares & seal kits.',
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: 10,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <small
                style={{
                  display: 'block',
                  color: 'var(--slate-light)',
                  fontSize: '0.66rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                {label}
              </small>
              <span>{value}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: '0.78rem',
            color: '#fbbf24',
            background: 'rgba(245,158,11,0.08)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid rgba(245,158,11,0.2)',
            fontStyle: 'italic',
          }}
        >
          {ticket.ai_summary?.historical_insights ||
            `⚠️ ${ticket.machine_name} breakdown pattern tracked by TurboFix Machine Intelligence.`}
        </div>
      </div>

      {/* Kaizen 5-Why */}
      <div className="tickets-panel is-kaizen">
        <div className="tickets-panel-title" style={{ color: '#a78bfa' }}>
          <span>🇯🇵 Kaizen 5-why root cause (改善)</span>
          <span
            style={{
              fontSize: '0.66rem',
              color: '#863bff',
              background: 'rgba(134,59,255,0.12)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            Standard work
          </span>
        </div>
        <div style={{ display: 'grid', gap: 6, fontSize: '0.8rem', color: 'var(--slate)' }}>
          <div>
            <strong style={{ color: 'var(--slate-light)' }}>Why 1 (reported symptom):</strong>{' '}
            {ticket.issue_text || ticket.description || '—'}
          </div>
          <div>
            <strong style={{ color: 'var(--slate-light)' }}>Why 2 (direct cause):</strong>{' '}
            {getDirectCause(ticket)}
          </div>
          <div>
            <strong style={{ color: 'var(--slate-light)' }}>Why 3 (root cause &amp; fix):</strong>{' '}
            {getRootCauseFix(ticket)}
          </div>
        </div>
      </div>

      <div className="tickets-panel is-kaizen" style={{ marginTop: 12 }}>
        <div className="tickets-panel-title" style={{ color: '#34D399' }}>
          <span>RCA launch pad</span>
          <span
            style={{
              fontSize: '0.66rem',
              color: '#34D399',
              background: 'rgba(52,211,153,0.12)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            Machine context
          </span>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(52,211,153,0.22)', borderRadius: 8, padding: 10 }}>
              <small style={{ display: 'block', color: 'var(--slate-light)', textTransform: 'uppercase', fontSize: '0.66rem', letterSpacing: '0.05em' }}>RCA card</small>
              <strong style={{ color: 'var(--ink)' }}>{ticket.root_cause ? 'Root cause captured' : 'Start root cause analysis'}</strong>
              <div style={{ color: 'var(--slate)', fontSize: '0.78rem' }}>{ticket.root_cause || 'Open the machine RCA form and document why the failure happened.'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(168,85,247,0.22)', borderRadius: 8, padding: 10 }}>
              <small style={{ display: 'block', color: 'var(--slate-light)', textTransform: 'uppercase', fontSize: '0.66rem', letterSpacing: '0.05em' }}>Kaizen card</small>
              <strong style={{ color: 'var(--ink)' }}>1–3 improvement ideas</strong>
              <div style={{ color: 'var(--slate)', fontSize: '0.78rem' }}>Capture the smallest fix that removes repeat failure or reduces repair effort.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', padding: '4px 8px', borderRadius: 999, color: '#34D399', border: '1px solid rgba(52,211,153,0.4)' }}>
              Business value: {ticket.repeat_failure_flag ? 'High' : ticket.root_cause ? 'Medium' : 'Review'}
            </span>
            <a
              className="tickets-stage-btn"
              href={`rca.html?machine=${encodeURIComponent(ticket.machine_id || '')}&ticket=${encodeURIComponent(ticketId || '')}&repeat=${ticket.repeat_failure_flag || ticket.repeat_failure_count ? 1 : 0}`}
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Open RCA page
            </a>
            <a
              className="tickets-stage-btn"
              href={`rca.html?machine=${encodeURIComponent(ticket.machine_id || '')}&ticket=${encodeURIComponent(ticketId || '')}&repeat=${ticket.repeat_failure_flag || ticket.repeat_failure_count ? 1 : 0}#kaizen`}
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Add to backlog
            </a>
          </div>
        </div>
      </div>

      {!closed && (
        <div className="tickets-stage-actions">
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--slate-light)',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            1-tap stage action:
          </span>
          {STAGE_ACTIONS.map(({ stage, label, color, rgb }) => (
            <button
              type="button"
              key={stage}
              className="tickets-stage-btn"
              style={{
                background: `rgba(${rgb}, 0.15)`,
                color,
                border: `1px solid rgba(${rgb}, 0.35)`,
              }}
              onClick={() => onStageChange(ticketId, stage)}
            >
              {label}
            </button>
          ))}
          <a
            className="tickets-stage-btn"
            href={`rca.html?machine=${encodeURIComponent(ticket.machine_id || '')}&ticket=${encodeURIComponent(ticketId || '')}&repeat=${ticket.repeat_failure_flag || ticket.repeat_failure_count ? 1 : 0}`}
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            RCA
          </a>
          <button
            type="button"
            className="tickets-stage-btn"
            style={{ background: 'var(--brand)', color: '#052e16', border: '1px solid var(--brand)' }}
            onClick={() => onClose(ticketId)}
          >
            Verify &amp; close
          </button>
        </div>
      )}

      {!hasRecord && !closed && (
        <p style={{ color: 'var(--slate-light)', fontSize: '0.8rem', marginTop: 10 }}>
          The technician has not recorded manual repair logs yet. AI predictive diagnosis is active
          above.
        </p>
      )}
    </div>
  );
}
