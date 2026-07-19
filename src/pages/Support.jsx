import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, HeartHandshake, Search, ShieldCheck, Wrench } from 'lucide-react';
import AppShell from '../components/AppShell';
import { roleContribution } from '@/lib/roles';
import { supabase } from '@/supabaseClient';

const roleTypes = {
  maintenance_technician: ['technical_help', 'parts'],
  maintenance_engineer: ['technical_help', 'root_cause', 'safety'],
  supervisor: ['closure_approval', 'technical_help'],
  maintenance_head: ['closure_approval', 'root_cause', 'safety', 'parts'],
  owner: ['business_decision'],
};

function issueText(ticket) {
  if (!ticket) return 'Maintenance issue';
  if (ticket.issue_text) return ticket.issue_text;
  if (typeof ticket.ai_summary === 'object') return ticket.ai_summary?.summary || ticket.ai_summary?.predicted_issue || 'Maintenance issue';
  return ticket.ai_summary || 'Maintenance issue';
}

function typeLabel(type) {
  return ({ technical_help: 'Technical support', closure_approval: 'Closure decision', root_cause: 'Root-cause work', safety: 'Safety exception', parts: 'Parts support', business_decision: 'Business decision' })[type] || type;
}

export default function Support() {
  const [interventions, setInterventions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeSummary, setActiveSummary] = useState('needs');
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch { return null; } }, []);

  const load = async () => {
    setLoading(true);
    const [interventionRes, ticketRes, machineRes] = await Promise.all([
      supabase.from('maintenance_interventions').select('*').order('created_at', { ascending: false }),
      supabase.from('tickets').select('*'),
      supabase.from('machines').select('id,name,location'),
    ]);
    if (interventionRes.error && !String(interventionRes.error.message).includes('maintenance_interventions')) setError(interventionRes.error.message);
    setInterventions(interventionRes.data || []);
    setTickets(ticketRes.data || []);
    setMachines(machineRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = 'Support | TurboFix';
    load();
  }, []);

  const machineMap = Object.fromEntries(machines.map((machine) => [machine.id, machine]));
  const ticketMap = Object.fromEntries(tickets.map((ticket) => [ticket.id, ticket]));
  const relevantTypes = roleTypes[user?.role] || Object.values(roleTypes).flat();
  const visible = interventions.filter((item) => item.status !== 'resolved' && relevantTypes.includes(item.intervention_type));

  const repeated = useMemo(() => {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const counts = {};
    tickets.forEach((ticket) => {
      const created = new Date(ticket.created_at || 0).getTime();
      if (created >= cutoff) counts[ticket.machine_id] = (counts[ticket.machine_id] || 0) + 1;
    });
    return Object.entries(counts).filter(([, count]) => count >= 3).map(([machineId, count]) => ({ machineId, count }));
  }, [tickets]);
  const resolved = interventions.filter((item) => item.status === 'resolved');

  const showSummary = (summary) => {
    setActiveSummary(summary);
    window.requestAnimationFrame(() => document.getElementById('support-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const decide = async (item, decision) => {
    setBusyId(item.id);
    setError('');
    setMessage('');
    try {
      if (decision === 'approved' && item.intervention_type === 'closure_approval') {
        const { error: ticketError } = await supabase.from('tickets').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', item.ticket_id);
        if (ticketError) throw ticketError;
      }
      const updates = decision === 'needs_more_work'
        ? { decision, assigned_role: 'maintenance_technician', status: 'open' }
        : { decision, status: decision === 'acknowledged' ? 'acknowledged' : 'resolved', resolved_at: decision === 'acknowledged' ? null : new Date().toISOString() };
      const { error: interventionError } = await supabase.from('maintenance_interventions').update(updates).eq('id', item.id);
      if (interventionError) throw interventionError;
      setMessage(decision === 'approved' ? 'Repair verified and closed.' : decision === 'needs_more_work' ? 'Returned for another look without adding a form.' : 'Support request acknowledged.');
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusyId(''); }
  };

  return <AppShell active="support"><div className="support-page">
    <div className="decision-heading"><div><span className="eyebrow eyebrow-light">Resolve together</span><h1>Support &amp; Decisions</h1><p>{roleContribution(user?.role)}</p></div><a className="btn btn-ghost btn-sm" href="assistant.html">Ask TurboFix</a></div>
    <div className="support-principle"><HeartHandshake /><div><strong>Focus on the machine, not the person</strong><span>This workspace shows blockers, evidence and root-cause opportunities. It does not rank people or measure individual productivity.</span></div></div>
    {error && <div className="decision-alert">{error}</div>}{message && <div className="technician-alert success"><CheckCircle2 />{message}</div>}
    <section className="support-summary" aria-label="Support summary filters"><button type="button" className={activeSummary === 'needs' ? 'active' : ''} onClick={() => showSummary('needs')}><CircleHelp /><strong>{visible.length}</strong><span>needs contribution</span><em>View details →</em></button><button type="button" className={activeSummary === 'repeat' ? 'active' : ''} onClick={() => showSummary('repeat')}><Search /><strong>{repeated.length}</strong><span>repeat-failure signals</span><em>View machines →</em></button><button type="button" className={activeSummary === 'resolved' ? 'active' : ''} onClick={() => showSummary('resolved')}><ShieldCheck /><strong>{resolved.length}</strong><span>exceptions resolved</span><em>View history →</em></button></section>
    <div id="support-details" className="support-details" tabIndex="-1">
    {activeSummary === 'needs' && <><div className="decision-section-label">Needs your contribution</div>
    <section className="support-list">
      {loading && <div className="support-empty">Loading support requests…</div>}
      {!loading && !visible.length && <div className="support-empty"><CheckCircle2 /><strong>No exception needs your attention</strong><span>Routine maintenance continues automatically.</span></div>}
      {visible.map((item) => { const ticket = ticketMap[item.ticket_id]; const machine = machineMap[item.machine_id]; return <article className="support-card" key={item.id}>
        <div className="support-card-icon">{item.intervention_type === 'closure_approval' ? <ShieldCheck /> : item.intervention_type === 'safety' ? <AlertTriangle /> : <Wrench />}</div>
        <div className="support-card-main"><span>{typeLabel(item.intervention_type)}</span><h2>{machine?.name || item.machine_id}</h2><p>{item.reason || issueText(ticket)}</p><small>{item.recommended_action || 'Review the machine context and help choose the next safe action.'}</small></div>
        <div className="support-card-actions">
          <a href={`assistant.html?machine_id=${encodeURIComponent(item.machine_id)}`}>Review context</a>
          {item.intervention_type === 'closure_approval' && ['supervisor', 'maintenance_head'].includes(user?.role) && <><button disabled={busyId === item.id} onClick={() => decide(item, 'needs_more_work')}>Another look</button><button className="primary" disabled={busyId === item.id} onClick={() => decide(item, 'approved')}>Verify &amp; close</button></>}
          {item.intervention_type === 'technical_help' && ['maintenance_engineer', 'supervisor', 'maintenance_head'].includes(user?.role) && <button className="primary" disabled={busyId === item.id} onClick={() => decide(item, 'acknowledged')}>I can help</button>}
        </div>
      </article>; })}
    </section></>}
    {activeSummary === 'repeat' && <><div className="decision-section-label">Repeat-failure signals</div><section className="support-list">{repeated.length ? repeated.map(({ machineId, count }) => <article className="support-card compact" key={machineId}><div className="support-card-icon"><Search /></div><div className="support-card-main"><span>Pattern detected</span><h2>{machineMap[machineId]?.name || machineId}</h2><p>{count} issues in the last 30 days. Investigate the system cause instead of repeating the repair.</p><small>This is a machine-level signal. It is not attributed to an employee.</small></div><div className="support-card-actions"><a className="primary" href={`assistant.html?machine_id=${encodeURIComponent(machineId)}`}>{['maintenance_engineer', 'maintenance_head'].includes(user?.role) ? 'Start root-cause review' : 'View machine context'}</a></div></article>) : <div className="support-empty"><CheckCircle2 /><strong>No repeat-failure pattern detected</strong><span>Machines with three or more issues in 30 days will appear here.</span></div>}</section></>}
    {activeSummary === 'resolved' && <><div className="decision-section-label">Resolved exceptions</div><section className="support-list">{resolved.length ? resolved.map((item) => { const machine = machineMap[item.machine_id]; return <article className="support-card compact" key={item.id}><div className="support-card-icon resolved"><CheckCircle2 /></div><div className="support-card-main"><span>{typeLabel(item.intervention_type)}</span><h2>{machine?.name || item.machine_id}</h2><p>{item.decision === 'approved' ? 'Repair verified and issue closed.' : item.decision || item.reason || 'Exception resolved.'}</p><small>{item.resolved_at ? `Resolved ${new Date(item.resolved_at).toLocaleString()}` : 'Resolution recorded'}</small></div><div className="support-card-actions"><a href={`assistant.html?machine_id=${encodeURIComponent(item.machine_id)}`}>View machine context</a></div></article>; }) : <div className="support-empty"><ShieldCheck /><strong>No resolved exceptions yet</strong><span>Completed support and approval decisions will appear here.</span></div>}</section></>}
    </div>
  </div></AppShell>;
}
