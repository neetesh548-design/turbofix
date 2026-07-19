import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';
import { getCurrentEscalationLevel } from '@/lib/escalation';

// Canonical 10-state work-order lifecycle (roadmap §3.4).
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
  // Fallback for legacy rows with no lifecycle_stage yet.
  return ['closed', 'resolved'].includes(String(ticket.status || '').toLowerCase()) ? LIFECYCLE.closed : LIFECYCLE.reported;
};

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [escalationPath, setEscalationPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    document.title = 'Tickets | TurboFix';
    fetchTicketsAndEscalation();
  }, []);

  const fetchTicketsAndEscalation = async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketsRes, machinesRes] = await Promise.all([
        supabase.from('tickets').select('id,machine_id,status,issue_text,ai_summary,created_at,reporter_phone,wo_number,lifecycle_stage,root_cause,repair_action,parts_used,labour_minutes,downtime_minutes,started_at,resolved_at,verified_at,closure_approved_by,repeat_failure_flag,repeat_failure_count'),
        supabase.from('machines').select('id,name'),
      ]);

      const machineMap = {};
      (machinesRes.data || []).forEach(m => { machineMap[m.id] = m.name; });

      const data = (ticketsRes.data || []).map(t => ({
        ticket_id: t.id,
        machine_id: t.machine_id,
        machine_name: machineMap[t.machine_id] || 'Unknown',
        status: t.status,
        issue_text: t.issue_text,
        ai_summary: t.ai_summary,
        urgency: typeof t.ai_summary === 'object' ? t.ai_summary?.urgency : '',
        description: t.issue_text,
        created_at: t.created_at,
        reported_at: t.created_at,
        reporter_phone: t.reporter_phone,
        wo_number: t.wo_number,
        lifecycle_stage: t.lifecycle_stage,
        root_cause: t.root_cause,
        repair_action: t.repair_action,
        parts_used: t.parts_used,
        labour_minutes: t.labour_minutes,
        downtime_minutes: t.downtime_minutes,
        started_at: t.started_at,
        resolved_at: t.resolved_at,
        verified_at: t.verified_at,
        closure_approved_by: t.closure_approved_by,
        repeat_failure_flag: t.repeat_failure_flag,
        repeat_failure_count: t.repeat_failure_count,
      }));
      setTickets(data);
      setEscalationPath([]);
    } catch (err) {
      setError(err.message || 'An error occurred while loading tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    setError('');
    setSuccess('');
    try {
      const { error: updateErr } = await supabase.from('tickets').update({ status: 'resolved' }).eq('id', ticketId);
      if (updateErr) throw new Error(updateErr.message);
      setSuccess(`Ticket ${ticketId.substring(0, 8)} has been successfully closed.`);
      fetchTicketsAndEscalation();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr.replace(' ', 'T'));
      return d.toLocaleString();
    } catch {
      return dtStr;
    }
  };

  const openCount = tickets.filter((ticket) => String(ticket.status).toLowerCase() === 'open').length;
  const urgentCount = tickets.filter((ticket) => String(ticket.status).toLowerCase() === 'open' && String(ticket.urgency).toLowerCase() === 'high').length;
  const closedCount = tickets.filter((ticket) => ['closed', 'resolved'].includes(String(ticket.status).toLowerCase())).length;
  const visibleTickets = tickets.filter((ticket) => activeFilter === 'all'
    || (activeFilter === 'open' && String(ticket.status).toLowerCase() === 'open')
    || (activeFilter === 'urgent' && String(ticket.status).toLowerCase() === 'open' && String(ticket.urgency).toLowerCase() === 'high')
    || (activeFilter === 'closed' && ['closed', 'resolved'].includes(String(ticket.status).toLowerCase())));

  return (
    <AppShell active="tickets">
      {/* Pulse Animations style tag */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glow-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          box-shadow: 0 0 8px currentColor;
        }
        .glow-dot.healthy {
          background-color: #25D366;
          color: #25D366;
          animation: pulse-green 2s infinite;
        }
        .glow-dot.down {
          background-color: #EF4444;
          color: #EF4444;
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        .vault-card {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
      ` }} />

      <div className="vault-wrap" style={{ maxWidth: '1100px', padding: '20px 24px 80px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>Tickets Directory</h1>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: '4px 0 0' }}>Monitor plant floor maintenance issues, view AI root-cause diagnostics, and close resolved tickets.</p>
        </div>

        {error && <div className="vault-error show" style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="vault-success" style={{ background: '#065f46', color: '#d1fae5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        {!loading && tickets.length > 0 && <section className="postlogin-summary" aria-label="Ticket summary filters">
          {[['all', tickets.length, 'All tickets'], ['open', openCount, 'Open work'], ['urgent', urgentCount, 'Urgent issues'], ['closed', closedCount, 'Closed tickets']].map(([key, value, label]) => <button type="button" className={activeFilter === key ? 'active' : ''} onClick={() => setActiveFilter(key)} key={key}><strong>{value}</strong><span>{label}</span><small>View details →</small></button>)}
        </section>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="vault-card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--slate)', margin: 0 }}>No tickets logged yet. Issues reported over WhatsApp will appear here automatically.</p>
          </div>
        ) : (
          <div className="vault-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="vault-table">
              <thead>
                <tr>
                  <th>Work Order</th>
                  <th>Machine Name</th>
                  <th>Reported At</th>
                  <th>Urgency</th>
                  <th>Description / AI Summary</th>
                  <th>Lifecycle Stage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--slate)', padding: '32px' }}>No tickets match this view.</td></tr>}
                {visibleTickets.map((t) => {
                  const ticketId = t.ticket_id || t.id || '—';
                  const status = String(t.status || 'Open').toLowerCase();
                  const currentTier = getCurrentEscalationLevel({ ...t, status: status === 'open' ? 'Open' : 'Closed' }, escalationPath);
                  const isOwnerAlerted = currentTier && currentTier.level === escalationPath.length - 1;

                  const stage = stageInfo(t);
                  const isClosed = ['closed', 'resolved'].includes(status);
                  const isExpanded = expandedId === ticketId;
                  const hasRecord = t.root_cause || t.repair_action || t.parts_used || t.labour_minutes || t.downtime_minutes;

                  return (
                    <React.Fragment key={ticketId}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : ticketId)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'white' }}>{t.wo_number || (ticketId !== '—' ? ticketId.split('-')[0] || ticketId : ticketId)}</td>
                      <td style={{ fontWeight: '600', color: 'white' }}>{t.machine_name || t.machine_id}{t.repeat_failure_flag && <span title="Recurring failure — RCA recommended" style={{ marginLeft: '8px', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: '#F87171', border: '1px solid #F87171', borderRadius: '999px', padding: '1px 7px', whiteSpace: 'nowrap' }}>Repeat ×{(t.repeat_failure_count || 0) + 1}</span>}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#cbd5e1' }}>{formatDateTime(t.reported_at)}</td>
                      <td>
                        {t.urgency ? (
                          <span className={`vault-role-badge ${t.urgency === 'High' ? 'read-only' : t.urgency === 'Medium' ? 'medium-badge' : 'low-badge'}`} 
                                style={t.urgency === 'High' ? {} : t.urgency === 'Medium' ? { background: '#FED7AA', color: '#9A3412' } : { background: '#D1FAE5', color: '#065F46' }}>
                            {t.urgency}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ maxWidth: '260px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                        {t.description || (t.ai_summary && t.ai_summary.predicted_issue) || '—'}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, padding: '3px 9px', borderRadius: '999px', color: stage.color, border: `1px solid ${stage.color}`, background: `${stage.color}1a`, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color }} /> {stage.label}
                        </span>
                        {status === 'open' && currentTier && !isOwnerAlerted && currentTier.hoursLeft !== null && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginTop: '3px' }}>Escalates in {currentTier.hoursLeft.toFixed(1)}h</div>
                        )}
                        {status === 'open' && isOwnerAlerted && (
                          <div style={{ fontSize: '0.68rem', color: '#F87171', marginTop: '3px' }}>Owner alerted</div>
                        )}
                      </td>
                      <td>
                        {status === 'open' ? (
                          <span className="vault-role-badge read-only" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(239, 68, 68, 0.12)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <span className="glow-dot down" /> Open
                          </span>
                        ) : (
                          <span className="vault-role-badge" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(37, 211, 102, 0.12)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                            <span className="glow-dot healthy" /> Closed
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {status === 'open' ? (
                          <button className="vault-btn vault-btn-danger" style={{ padding: '6px 14px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleCloseTicket(ticketId); }}>
                            Close Ticket
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--slate-light)' }}>
                            {t.closure_approved_by ? `Verified by ${t.closure_approved_by}` : 'Closed'}
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="8" style={{ background: 'rgba(0,0,0,0.25)', padding: '16px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px 20px' }}>
                            {[
                              ['Root cause', t.root_cause],
                              ['Repair action', t.repair_action],
                              ['Parts used', t.parts_used],
                              ['Labour time', t.labour_minutes ? `${t.labour_minutes} min` : null],
                              ['Machine downtime', t.downtime_minutes != null ? `${t.downtime_minutes} min` : null],
                              ['Work started', t.started_at ? formatDateTime(t.started_at) : null],
                              ['Closed', t.resolved_at ? formatDateTime(t.resolved_at) : null],
                              ['Verified by', t.closure_approved_by],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</small>
                                <span style={{ color: value ? 'white' : 'var(--slate)', fontSize: '0.85rem' }}>{value || '—'}</span>
                              </div>
                            ))}
                          </div>
                          {!hasRecord && !isClosed && <div style={{ color: 'var(--slate)', fontSize: '0.82rem', marginTop: '10px' }}>The technician has not recorded repair details yet. They appear here once work is submitted.</div>}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
