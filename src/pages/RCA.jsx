import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, BadgeInfo, CheckCircle2, Lock, Send, ShieldAlert } from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '../supabaseClient';
import { DEMO_MACHINES } from '../utils/demoMachines';
import { DEMO_TICKETS } from '../utils/demoTickets';
import './Dashboard.css';

// Fishbone / Ishikawa categories used in industry-standard RCA
const FISHBONE_CATEGORIES = [
  { value: 'machine',      label: 'Machine / Equipment' },
  { value: 'method',       label: 'Method / Process' },
  { value: 'material',     label: 'Material / Parts' },
  { value: 'man',          label: 'Man / Operator' },
  { value: 'environment',  label: 'Environment / Conditions' },
  { value: 'measurement',  label: 'Measurement / Sensors' },
];

const INITIAL_WHYS = ['', '', '', '', ''];

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch { return null; }
}

function readParam(search, key) {
  return new URLSearchParams(search).get(key) || '';
}

function suggestKaizen(rootCause, machineName) {
  const text = String(rootCause || '').toLowerCase();
  if (text.includes('lubric'))  return `Add a simple lubrication checklist before each shift on ${machineName}.`;
  if (text.includes('sensor'))  return `Add a visual sensor check at start-up for ${machineName}.`;
  if (text.includes('bearing')) return `Review bearing inspection frequency and add a pre-failure check.`;
  if (text.includes('wiring') || text.includes('electr')) return `Standardise a wiring inspection step before the machine runs.`;
  if (text.includes('seal') || text.includes('leak'))  return `Add a daily leak-inspection round and track seal replacement intervals.`;
  if (text.includes('operator') || text.includes('training')) return `Schedule a 15-minute refresher for the operator on correct start-up procedure.`;
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

  // 5-Why structured inputs
  const [whys, setWhys] = useState(INITIAL_WHYS);
  const [fishboneCategory, setFishboneCategory] = useState('machine');
  const [failureMode, setFailureMode] = useState('');
  const [evidence, setEvidence] = useState('');
  const [lotoConfirmed, setLotoConfirmed] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [kaizenApproved, setKaizenApproved] = useState(false);

  const machineId  = useMemo(() => readParam(location.search, 'machine'), [location.search]);
  const ticketId   = useMemo(() => readParam(location.search, 'ticket'),  [location.search]);
  const repeatHint = useMemo(() => readParam(location.search, 'repeat'),  [location.search]);
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
      if (!machineId) { setLoading(false); return; }
      setLoading(true);
      setError('');

      const isValidUuid = ticketId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);

      const [machineRes, ticketRes] = await Promise.all([
        supabase.from('machines').select('id,name,location,status,company_id,supervisor_id').eq('id', machineId).maybeSingle(),
        isValidUuid ? supabase.from('tickets').select('*').eq('id', ticketId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (!mounted) return;

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

      // Demo fallback
      if (!machineRes.data && user?.inventory_mode === 'demo') {
        setError('');
        const demoMachine = DEMO_MACHINES.find(m => m.machine_id === machineId);
        if (demoMachine) {
          setMachine({ id: demoMachine.machine_id, name: demoMachine.machine_name, location: demoMachine.location, status: demoMachine.status, company_id: null, supervisor_id: null });
          const demoTicket = DEMO_TICKETS.find(t => t.id === ticketId || t.ticket_id === ticketId);
          if (demoTicket) {
            setTicket({ id: demoTicket.id, issue_text: demoTicket.description, created_at: demoTicket.reported_at, technician_name: demoMachine.assignments?.technician?.name || null, repeat_failure_count: 0, repeat_failure_flag: repeatIssue });
          }
        }
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [machineId, ticketId, user]);

  const repeatCount  = Number(ticket?.repeat_failure_count || (ticket?.repeat_failure_flag ? 1 : 0) || (repeatIssue ? 1 : 0));
  const businessValue = repeatCount >= 2 ? 'High' : repeatCount === 1 ? 'Medium' : 'Review';

  // Root cause = last filled Why in the chain
  const filledWhys = whys.filter(w => w.trim().length > 0);
  const rootCause  = filledWhys[filledWhys.length - 1] || '';
  const kaizenText = suggestKaizen(rootCause, machine?.name || 'this machine');

  const updateWhy = (index, value) => setWhys(prev => prev.map((w, i) => i === index ? value : w));

  const isReadyToSubmit =
    failureMode.trim().length >= 8 &&
    filledWhys.length >= 1 &&
    lotoConfirmed;

  const submitRca = async () => {
    setError('');
    if (!machineId) return setError('Missing machine context.');
    if (!lotoConfirmed) return setError('Please confirm machine is isolated (LOTO) before submitting RCA.');
    if (failureMode.trim().length < 8) return setError('Please describe the failure mode in a few words.');
    if (filledWhys.length === 0) return setError('Complete at least Why 1 before submitting.');

    setSaving(true);
    try {
      const payload = {
        machine_id:       machineId,
        company_id:       machine?.company_id || null,
        ticket_id:        ticket?.id || ticketId || null,
        failure_mode:     failureMode.trim().slice(0, 120),
        five_whys:        whys.filter(w => w.trim()),
        root_cause:       rootCause.slice(0, 400),
        fishbone_category: fishboneCategory,
        created_by:       user?.name || user?.user_id || 'Staff',
        loto_confirmed:   lotoConfirmed,
        evidence:         evidence.trim() || null,
      };
      const { error: insertErr } = await supabase.from('rca_reports').insert(payload);
      if (insertErr) throw new Error(insertErr.message);
      setSubmitted(true);
      setSuccess('RCA saved. TurboFix found a Kaizen opportunity based on your root cause.');
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
        machine_id:       machineId,
        company_id:       machine?.company_id || null,
        title:            `Improve ${machine?.name || 'machine'} reliability`,
        proposal:         kaizenText,
        category:         'breakdown_prevention',
        waste_category:   'defects',
        estimated_impact: businessValue === 'High' ? 'high' : 'medium',
        status:           'submitted',
        created_by_name:  user?.name || 'Staff',
        source_rca:       true,
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
              <BadgeInfo size={13} aria-hidden="true" /> Root Cause Analysis — 5-Why Method
            </span>
            <h1>RCA</h1>
            <p>{machine ? `${machine.name} · ${machine.location || 'No location'}` : 'Load machine context first'}</p>
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

        {error   && <div className="decision-alert">{error}</div>}
        {success && <div className="decision-alert success">{success}</div>}
        {loading && <p className="rd-loading" role="status">Loading RCA context…</p>}

        {!loading && machine && (
          <>
            {/* ── Machine context panel ── */}
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
            </section>

            {/* ── Ticket context ── */}
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
              {/* ── 5-Why RCA form ── */}
              <section className="rd-panel" id="rca">
                <span className="eyebrow eyebrow-light">RCA — 5-Why Method</span>
                <h2>Trace the root cause</h2>
                <p className="rd-hint" style={{ marginTop: 6, marginBottom: 16 }}>
                  Start with the symptom and ask "Why?" up to 5 times until you reach the true system cause.
                </p>

                {/* Failure Mode */}
                <label style={{ display:'block', fontWeight:600, fontSize:'0.85rem', color:'var(--muted-foreground)', marginBottom:4 }}>
                  Failure mode / symptom <span style={{ color:'var(--destructive)' }}>*</span>
                </label>
                <input
                  value={failureMode}
                  onChange={e => setFailureMode(e.target.value)}
                  placeholder="e.g. Spindle motor stopped mid-cycle with vibration alarm"
                  style={{ width:'100%', marginBottom:16 }}
                />

                {/* Fishbone Category */}
                <label style={{ display:'block', fontWeight:600, fontSize:'0.85rem', color:'var(--muted-foreground)', marginBottom:4 }}>
                  Fishbone category (Ishikawa)
                </label>
                <select
                  value={fishboneCategory}
                  onChange={e => setFishboneCategory(e.target.value)}
                  style={{ width:'100%', marginBottom:20 }}
                >
                  {FISHBONE_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                {/* 5-Why chain */}
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {INITIAL_WHYS.map((_, i) => (
                    <div key={i} style={{ display:'flex', flexDirection:'column', position:'relative' }}>
                      {/* Connector line */}
                      {i < 4 && (
                        <div style={{
                          position:'absolute', left:16, bottom:-12, width:2, height:24,
                          background: whys[i].trim() ? 'var(--brand)' : 'rgba(160,174,192,0.2)',
                          zIndex:1
                        }} />
                      )}
                      <label style={{ fontWeight:700, fontSize:'0.8rem', color: whys[i].trim() ? 'var(--brand)' : 'var(--muted-foreground)', marginBottom:4 }}>
                        Why {i + 1}{i === 0 ? ' — Why did this failure happen?' : i === 1 ? ' — What caused that?' : i === 2 ? ' — And why did that happen?' : i === 3 ? ' — Deeper cause?' : ' — Root cause (system/process level)'}
                      </label>
                      <textarea
                        value={whys[i]}
                        onChange={e => updateWhy(i, e.target.value)}
                        placeholder={i === 0 ? 'Describe the immediate cause of the failure' : i === 4 ? 'This is usually a policy, process, or training gap' : `Why did "${whys[i-1].trim() || '...'}" happen?`}
                        rows={2}
                        style={{ width:'100%', marginBottom: i < 4 ? 20 : 12 }}
                        disabled={i > 0 && !whys[i-1].trim()}
                      />
                    </div>
                  ))}
                </div>

                {/* Evidence */}
                <label style={{ display:'block', fontWeight:600, fontSize:'0.85rem', color:'var(--muted-foreground)', marginBottom:4, marginTop:4 }}>
                  Evidence / observations (optional)
                </label>
                <textarea
                  value={evidence}
                  onChange={e => setEvidence(e.target.value)}
                  placeholder="Photos taken, measurements recorded, sensor readings, witness statements…"
                  rows={2}
                  style={{ width:'100%', marginBottom:16 }}
                />

                {/* LOTO confirmation */}
                <div style={{
                  display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px',
                  background: lotoConfirmed ? 'rgba(37,211,102,0.08)' : 'rgba(248,113,113,0.06)',
                  border: `1px solid ${lotoConfirmed ? 'rgba(37,211,102,0.3)' : 'rgba(248,113,113,0.25)'}`,
                  borderRadius:8, marginBottom:16
                }}>
                  <input
                    type="checkbox"
                    id="loto-confirm"
                    checked={lotoConfirmed}
                    onChange={e => setLotoConfirmed(e.target.checked)}
                    style={{ marginTop:2, width:16, height:16, accentColor:'var(--brand)', cursor:'pointer', flexShrink:0 }}
                  />
                  <label htmlFor="loto-confirm" style={{ cursor:'pointer', fontSize:'0.875rem', lineHeight:1.5 }}>
                    <strong style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                      <Lock size={12} /> Machine is isolated — LOTO applied
                    </strong>
                    I confirm the machine has been locked out/tagged out and is safe to work on before submitting this RCA.
                  </label>
                </div>

                {!lotoConfirmed && (
                  <div style={{ display:'flex', gap:6, alignItems:'center', color:'rgba(248,113,113,0.9)', fontSize:'0.8rem', marginBottom:12 }}>
                    <ShieldAlert size={13} /> LOTO confirmation is required before submitting
                  </div>
                )}

                <div className="decision-actions" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={submitRca}
                    disabled={saving || !isReadyToSubmit}
                    title={!isReadyToSubmit ? 'Complete failure mode, at least Why 1, and confirm LOTO' : ''}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" /> Submit RCA
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setWhys(INITIAL_WHYS); setFailureMode(''); setEvidence(''); setLotoConfirmed(false); }}
                  >
                    Clear draft
                  </button>
                </div>

                {filledWhys.length > 0 && rootCause && (
                  <div style={{ marginTop:14, padding:'10px 12px', background:'rgba(37,211,102,0.06)', borderRadius:8, border:'1px solid rgba(37,211,102,0.15)' }}>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--brand)', letterSpacing:'0.04em' }}>ROOT CAUSE IDENTIFIED</span>
                    <p style={{ margin:'4px 0 0', fontSize:'0.9rem', color:'#f8fafc' }}>{rootCause}</p>
                    <span style={{ fontSize:'0.75rem', color:'var(--muted-foreground)' }}>
                      Category: {FISHBONE_CATEGORIES.find(c => c.value === fishboneCategory)?.label}
                    </span>
                  </div>
                )}
              </section>

              {/* ── Kaizen suggestion ── */}
              <section className="rd-panel" id="kaizen">
                <span className="eyebrow eyebrow-light">Kaizen suggestion</span>
                <h2>What should we improve next?</h2>
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  {submitted ? (
                    <div style={{ background:'rgba(0,0,0,0.18)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
                      <strong style={{ color:'white' }}>{kaizenText}</strong>
                      <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ padding:'4px 8px', borderRadius:999, border:'1px solid #34D399', color:'#34D399', fontSize:'0.72rem', fontWeight:700 }}>
                          Business value: {businessValue}
                        </span>
                        <span className="rd-hint" style={{ margin:0 }}>If useful, send to the maintenance head for review.</span>
                      </div>
                    </div>
                  ) : (
                    <p className="rd-hint" style={{ marginTop:0 }}>
                      TurboFix will suggest one improvement after the RCA is accepted. The suggestion is based on keywords in your root cause.
                    </p>
                  )}
                  <div className="decision-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={approveKaizen}
                      disabled={!submitted || saving}
                    >
                      <Send size={14} aria-hidden="true" /> Send to maintenance head
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
