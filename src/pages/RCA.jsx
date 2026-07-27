import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, BadgeInfo, CheckCircle2, Send } from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '../supabaseClient';
import { DEMO_MACHINES } from '../utils/demoMachines';
import { DEMO_TICKETS } from '../utils/demoTickets';
import './Dashboard.css';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('tf_user') || 'null');
  } catch {
    return null;
  }
}

function readParam(search, key) {
  return new URLSearchParams(search).get(key) || '';
}

function suggestKaizen(rootCause, machineName) {
  const text = String(rootCause || '').toLowerCase();
  if (text.includes('lubric')) return `Add a simple lubrication checklist before each shift on ${machineName}.`;
  if (text.includes('sensor')) return `Add a visual sensor check at start-up for ${machineName}.`;
  if (text.includes('bearing')) return `Review bearing inspection frequency and add a pre-failure check.`;
  if (text.includes('wiring') || text.includes('electr')) return `Standardise a wiring inspection step before the machine runs.`;
  return `Reduce repeat failures on ${machineName} with one small standard check before the next shift.`;
}

export default function RCA() {
  const location = useLocation();
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [machine, setMachine] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [rootCause, setRootCause] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [kaizenApproved, setKaizenApproved] = useState(false);

  const machineId = useMemo(() => readParam(location.search, 'machine'), [location.search]);
  const ticketId = useMemo(() => readParam(location.search, 'ticket'), [location.search]);
  const repeatHint = useMemo(() => readParam(location.search, 'repeat'), [location.search]);
  const repeatIssue = repeatHint === '1' || repeatHint === 'true';

  useEffect(() => { document.title = 'RCA | TurboFix'; }, []);

  useEffect(() => {
    const refresh = () => setUser(readStoredUser());
    window.addEventListener('authChanged', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('authChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!machineId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');

      // Only query ticket if ticketId looks like a valid UUID
      const isValidUuid = ticketId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);

      const [machineRes, ticketRes] = await Promise.all([
        supabase.from('machines').select('id,name,location,status,company_id,supervisor_id').eq('id', machineId).maybeSingle(),
        isValidUuid ? supabase.from('tickets').select('*').eq('id', ticketId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (!mounted) return;

      // Fallback for demo users: if queries return empty due to RLS, still proceed
      // (RLS blocks when auth.uid() is not set in demo mode)
      if (machineRes.error) {
        setError(machineRes.error.message || 'Could not load machine context.');
      } else {
        setMachine(machineRes.data || null);
      }

      if (ticketRes?.error) {
        setError(ticketRes.error.message || 'Could not load ticket context.');
      } else {
        setTicket(ticketRes?.data || null);
      }

      // Demo logins don't create a real Supabase auth session, so RLS blocks
      // these queries and returns nothing (DEMO-M001 also isn't a real row —
      // it only exists in the client-side demo fixtures). Build the same
      // context from those fixtures instead of leaving the page empty.
      if (!machineRes.data && user?.inventory_mode === 'demo') {
        setError('');
        const demoMachine = DEMO_MACHINES.find((m) => m.machine_id === machineId);
        if (demoMachine) {
          setMachine({
            id: demoMachine.machine_id,
            name: demoMachine.machine_name,
            location: demoMachine.location,
            status: demoMachine.status,
            company_id: null,
            supervisor_id: null,
          });
          const demoTicket = DEMO_TICKETS.find((t) => t.id === ticketId || t.ticket_id === ticketId);
          if (demoTicket) {
            setTicket({
              id: demoTicket.id,
              issue_text: demoTicket.description,
              created_at: demoTicket.reported_at,
              technician_name: demoMachine.assignments?.technician?.name || null,
              repeat_failure_count: 0,
              repeat_failure_flag: repeatIssue,
            });
          }
        }
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [machineId, ticketId, user]);

  const repeatCount = Number(ticket?.repeat_failure_count || (ticket?.repeat_failure_flag ? 1 : 0) || (repeatIssue ? 1 : 0));
  const businessValue = repeatCount >= 2 ? 'High' : repeatCount === 1 ? 'Medium' : 'Review';
  const kaizenText = suggestKaizen(rootCause, machine?.name || 'this machine');

  const submitRca = async () => {
    setError('');
    if (!machineId) return setError('Missing machine context.');
    if (rootCause.trim().length < 12) return setError('Please write a little more detail so the RCA is usable.');
    setSaving(true);
    try {
      const payload = {
        machine_id: machineId,
        company_id: machine?.company_id || null,
        ticket_id: ticket?.id || ticketId || null,
        failure_mode: rootCause.trim().slice(0, 80),
        five_whys: [rootCause.trim(), evidence.trim()].filter(Boolean),
        root_cause: rootCause.trim(),
        fishbone_category: 'Machine',
        created_by: user?.name || user?.user_id || 'Staff',
      };
      const { error: insertErr } = await supabase.from('rca_reports').insert(payload);
      if (insertErr) throw new Error(insertErr.message);
      setSubmitted(true);
      setSuccess('RCA saved. TurboFix found a Kaizen opportunity.');
    } catch (err) {
      setError(err?.message || 'Could not save RCA.');
    } finally {
      setSaving(false);
    }
  };

  const approveKaizen = async () => {
    setError('');
    setSaving(true);
    try {
      const { error: insertErr } = await supabase.from('kaizen_opportunities').insert({
        machine_id: machineId,
        company_id: machine?.company_id || null,
        title: `Improve ${machine?.name || 'machine'} reliability`,
        proposal: kaizenText,
        category: 'breakdown_prevention',
        waste_category: 'defects',
        estimated_impact: businessValue === 'High' ? 'high' : 'medium',
        status: 'submitted',
        created_by_name: user?.name || 'Staff',
      });
      if (insertErr) throw new Error(insertErr.message);
      setKaizenApproved(true);
      setSuccess('Kaizen suggestion sent for review.');
    } catch (err) {
      setError(err?.message || 'Could not send Kaizen suggestion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell active="tickets">
      <div className="decision-page md-dashboard rd-page" data-testid="rca-page">
        <header className="md-header rd-header">
          <div>
            <span className="eyebrow eyebrow-light">
              <BadgeInfo size={13} aria-hidden="true" /> Root Cause Analysis
            </span>
            <h1>RCA</h1>
            <p>
              {machine ? `${machine.name} · ${machine.location || 'No location'}` : 'Load machine context first'}
            </p>
          </div>
          <div className="decision-actions">
            <a className="btn btn-ghost btn-sm" href="tickets.html">
              <ArrowLeft size={14} aria-hidden="true" /> Back to Tickets
            </a>
            {machineId && (
              <a className="btn btn-primary btn-sm" href={`machines.html?machine=${encodeURIComponent(machineId)}`}>
                Open machine
              </a>
            )}
          </div>
        </header>

        {error && <div className="decision-alert">{error}</div>}
        {success && <div className="decision-alert success">{success}</div>}
        {loading && <p className="rd-loading" role="status">Loading RCA context…</p>}

        {!loading && machine && (
          <>
            <section className="rd-panel" style={{ marginBottom: 14 }}>
              <div className="rd-panel-header">
                <div>
                  <span className="eyebrow eyebrow-light">Machine context</span>
                  <h2 style={{ margin: '6px 0 0' }}>{machine.name}</h2>
                </div>
                <span className="rd-badge">{repeatCount >= 2 ? 'Repeat issue detected' : 'RCA ready'}</span>
              </div>
              <div className="rd-kpi-row" style={{ marginTop: 12 }}>
                <div className="rd-kpi-card"><span className="rd-kpi-label">Machine ID</span><strong>{machine.id}</strong></div>
                <div className="rd-kpi-card"><span className="rd-kpi-label">Location</span><strong>{machine.location || '—'}</strong></div>
                <div className="rd-kpi-card"><span className="rd-kpi-label">Technician</span><strong>{ticket?.technician_name || 'Not assigned'}</strong></div>
              </div>
              <p className="rd-hint" style={{ marginTop: 10 }}>
                {repeatIssue ? 'This issue has repeated, so RCA is required before the loop can close.' : 'Keep this short: one clear cause, one useful improvement.'}
              </p>
            </section>

            {ticket && (
              <section className="rd-panel" style={{ marginBottom: 14 }}>
                <span className="eyebrow eyebrow-light">Ticket details</span>
                <h2 style={{ margin: '6px 0 0' }}>Original issue</h2>
                <p style={{ marginTop: 12, lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
                  {ticket.issue_text || 'No description provided'}
                </p>
                {ticket.created_at && (
                  <p className="rd-hint" style={{ marginTop: 10 }}>
                    Reported on {new Date(ticket.created_at).toLocaleDateString()} at {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </section>
            )}

            <div className="rd-split">
              <section className="rd-panel" id="rca">
                <span className="eyebrow eyebrow-light">RCA input</span>
                <h2>What caused this issue?</h2>
                <textarea
                  value={rootCause}
                  onChange={(event) => setRootCause(event.target.value)}
                  placeholder="Write the root cause in one or two lines."
                  rows={5}
                  style={{ width: '100%', marginTop: 10 }}
                />
                <textarea
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  placeholder="Optional evidence or photo note"
                  rows={3}
                  style={{ width: '100%', marginTop: 10 }}
                />
                <div className="decision-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={submitRca} disabled={saving}>
                    <CheckCircle2 size={14} aria-hidden="true" /> Submit RCA
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRootCause(''); setEvidence(''); }}>
                    Save draft
                  </button>
                </div>
              </section>

              <section className="rd-panel" id="kaizen">
                <span className="eyebrow eyebrow-light">Kaizen suggestion</span>
                <h2>What should we improve next?</h2>
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  {submitted ? (
                    <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <strong style={{ color: 'white' }}>{kaizenText}</strong>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #34D399', color: '#34D399', fontSize: '0.72rem', fontWeight: 700 }}>
                          Business value: {businessValue}
                        </span>
                        <span className="rd-hint" style={{ margin: 0 }}>If this looks useful, send it to the maintenance head for review.</span>
                      </div>
                    </div>
                  ) : (
                    <p className="rd-hint" style={{ marginTop: 0 }}>
                      TurboFix will suggest one simple improvement after the RCA is accepted.
                    </p>
                  )}
                  <div className="decision-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={approveKaizen} disabled={!submitted || saving}>
                      <Send size={14} aria-hidden="true" /> Send to maintenance head
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!submitted}>
                      Not useful
                    </button>
                  </div>
                  <div className="rd-hint">
                    {kaizenApproved
                      ? 'Kaizen saved for approval. The maintenance head can now review and assign a technician.'
                      : 'After approval, the maintenance head assigns the technician who will carry the improvement through.'}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {!loading && !machine && (
          <section className="rd-panel">
            <span className="eyebrow eyebrow-light">No context</span>
            <h2>No machine was linked to this RCA.</h2>
            <p className="rd-hint">Open the RCA from a ticket so TurboFix can prefill machine and failure context.</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
