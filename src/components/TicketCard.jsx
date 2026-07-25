import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const LIFECYCLE = {
  reported: { label: 'Reported', color: '#F87171' },
  acknowledged: { label: 'Acknowledged', color: '#FBBF24' },
  assigned: { label: 'Assigned', color: '#FBBF24' },
  work_started: { label: 'Work started', color: '#60A5FA' },
  waiting_spare: { label: 'Waiting for spare', color: '#F59E0B' },
  waiting_approval: { label: 'Waiting for approval', color: '#F59E0B' },
  waiting_vendor: { label: 'Waiting for vendor', color: '#F59E0B' },
  repair_completed: { label: 'Repair completed', color: '#34D399' },
  verification_pending: { label: 'Verification pending', color: '#A78BFA' },
  closed: { label: 'Closed', color: '#25D366' },
};

const stageInfo = (ticket) => {
  const raw = String(ticket.lifecycle_stage || '').toLowerCase();
  if (LIFECYCLE[raw]) return LIFECYCLE[raw];
  return ['closed', 'resolved'].includes(String(ticket.status || '').toLowerCase()) ? LIFECYCLE.closed : LIFECYCLE.reported;
};

const getUrgencyBadgeStyle = (urgency) => {
  const u = (urgency || '').toLowerCase();
  if (u === 'critical') return { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)' };
  if (u === 'high') return { background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.4)' };
  if (u === 'medium') return { background: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.35)' };
  return { background: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)' };
};

export default function TicketCard({ ticket, onStartWork, onViewDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const stage = stageInfo(ticket);
  const ticketId = ticket.wo_number || ticket.id || '—';
  const urgencyStyle = getUrgencyBadgeStyle(ticket.urgency);

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '8px',
      padding: '14px 18px',
      transition: 'all 0.2s ease',
    }}>
      {/* COMPACT HEADER */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          {/* Ticket ID */}
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'white', fontSize: '0.9rem', minWidth: '80px' }}>
            {ticketId}
          </span>

          {/* Machine Name */}
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ticket.machine_name || ticket.machine_id || '—'}
          </h3>

          {/* Urgency Badge */}
          <span style={{
            ...urgencyStyle,
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            borderRadius: '999px',
            padding: '2px 9px',
            whiteSpace: 'nowrap',
            minWidth: 'max-content'
          }}>
            {ticket.urgency || '—'}
          </span>

          {/* Stage Badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            color: stage.color,
            border: `1px solid ${stage.color}`,
            background: `${stage.color}1a`,
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: stage.color }} />
            {stage.label}
          </span>
        </div>

        {/* Expand/Collapse Icon */}
        <ChevronDown
          size={20}
          style={{
            color: '#94a3b8',
            marginLeft: '12px',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            minWidth: '20px',
          }}
        />
      </div>

      {/* DESCRIPTION (one line preview) */}
      {!isExpanded && (
        <p style={{
          margin: '8px 0 0',
          color: '#cbd5e1',
          fontSize: '0.85rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingLeft: '80px',
        }}>
          {ticket.description || ticket.ai_summary || '—'}
        </p>
      )}

      {/* EXPANDED DETAILS */}
      {isExpanded && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
          {/* Description */}
          <div style={{ marginBottom: '14px' }}>
            <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Issue Description</small>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {ticket.description || '—'}
            </p>
          </div>

          {/* AI Summary */}
          {ticket.ai_summary && (
            <div style={{ marginBottom: '14px' }}>
              <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>AI Summary</small>
              <p style={{ margin: 0, color: '#a8d5ff', fontSize: '0.85rem', lineHeight: 1.5 }}>
                {typeof ticket.ai_summary === 'string' ? ticket.ai_summary : ticket.ai_summary.predicted_issue || '—'}
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            {[
              ['Machine ID', ticket.machine_id],
              ['Reporter', ticket.reporter_phone],
              ['Reported At', ticket.reported_at ? new Date(ticket.reported_at).toLocaleString() : null],
              ['Root Cause', ticket.root_cause],
              ['Repair Action', ticket.repair_action],
              ['Parts Used', ticket.parts_used],
            ].map(([label, value]) => (
              <div key={label}>
                <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</small>
                <span style={{ color: value ? 'white' : '#475569', fontSize: '0.8rem' }}>{value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="vault-btn vault-btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }}
              onClick={() => onStartWork(ticket.id || ticket.wo_number)}
            >
              Start work
            </button>
            <button
              className="vault-btn vault-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }}
              onClick={() => onViewDetails(ticket.id || ticket.wo_number)}
            >
              Full details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
