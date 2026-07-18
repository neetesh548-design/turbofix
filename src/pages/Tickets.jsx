import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';
import { getCurrentEscalationLevel } from '@/lib/escalation';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [escalationPath, setEscalationPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchTicketsAndEscalation();
  }, []);

  const fetchTicketsAndEscalation = async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketsRes, machinesRes] = await Promise.all([
        supabase.from('tickets').select('id,machine_id,status,issue_text,ai_summary,created_at,reporter_phone'),
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
        reporter_phone: t.reporter_phone,
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
                  <th>Ticket ID</th>
                  <th>Machine Name</th>
                  <th>Reported At</th>
                  <th>Urgency</th>
                  <th>Description / AI Summary</th>
                  <th>Escalation Stage</th>
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

                  return (
                    <tr key={ticketId}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--slate-light)' }}>{ticketId !== '—' ? ticketId.split('-')[0] || ticketId : ticketId}</td>
                      <td style={{ fontWeight: '600', color: 'white' }}>{t.machine_name || t.machine_id}</td>
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
                        {status === 'open' && currentTier ? (
                          isOwnerAlerted ? (
                            <span className="vault-role-badge read-only" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              <span className="glow-dot down" /> Owner Alerted
                            </span>
                          ) : (
                            <div>
                              <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 'bold' }}>{currentTier.label}</span>
                              {currentTier.hoursLeft !== null && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>
                                  Escalates in {currentTier.hoursLeft.toFixed(1)}h
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <span style={{ color: 'var(--slate)' }}>—</span>
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
                          <button className="vault-btn vault-btn-danger" style={{ padding: '6px 14px', fontSize: '0.75rem' }} onClick={() => handleCloseTicket(ticketId)}>
                            Close Ticket
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--slate-light)' }}>
                            Closed by {t.closed_by || 'Staff'}
                          </span>
                        )}
                      </td>
                    </tr>
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
