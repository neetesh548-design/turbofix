import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ClipboardCheck, Download, FileText, ImagePlus, Mic, Package, Play, Square, ShieldCheck, Wrench } from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';
import { generateChecklist } from '@/lib/dynamicChecklist';

const defaultWork = {
  status: 'assigned',
  checklist: [],
  checklist_status: {},
  generated_checklist: [],
  notes: '',
  parts_used: '',
  root_cause: '',
  labour_minutes: '',
  evidence: [],
  started_at: '',
  submitted_at: '',
  reviewed_at: '',
  reviewed_by: '',
};


export default function Technician() {
  const [tickets, setTickets] = useState([]);
  const [work, setWork] = useState({});
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recordingContext, setRecordingContext] = useState('');
  const recorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch { return null; }
  }, []);
  const canApprove = ['owner', 'supervisor', 'maintenance_head'].includes(user?.role);

  useEffect(() => {
    document.title = 'Technician Hub | TurboFix';
    (async () => {
      try {
        const [ticketsRes, machinesRes, documentsRes, partsRes, interventionsRes] = await Promise.all([
          supabase.from('tickets').select('*'),
          supabase.from('machines').select('*'),
          supabase.from('documents').select('id,machine_id,title,category'),
          supabase.from('parts').select('*'),
          supabase.from('maintenance_interventions').select('ticket_id,intervention_type,status,decision'),
        ]);
        const allTickets = ticketsRes.data || [];
        const machineMap = {};
        (machinesRes.data || []).forEach(m => { machineMap[m.id] = m; });
        // Proven-fixes knowledge base (roadmap P2): closed repairs that recorded
        // a repair action or root cause, reusable at the point of repair.
        setHistory(allTickets.filter(t => ['closed', 'resolved'].includes(String(t.status || '').toLowerCase()) && (t.repair_action || t.root_cause)));
        // Technicians only see open tickets for machines assigned to them
        // (machines.technician_user_id === their users.id). Supervisors, engineers,
        // maintenance heads and owners see the full open queue.
        const isTechnician = ['maintenance_technician', 'technician'].includes(user?.role);
        const items = allTickets
          .filter(t => String(t.status || '').toLowerCase() === 'open')
          .filter(t => {
            if (!isTechnician) return true;
            const machine = machineMap[t.machine_id];
            return machine && String(machine.technician_user_id || '') === String(user?.user_id || '');
          })
          .map(t => ({
          ...t,
          ticket_id: t.id,
          machine_name: machineMap[t.machine_id]?.name || 'Unknown',
          machine_location: machineMap[t.machine_id]?.location || '',
          machine_image_url: machineMap[t.machine_id]?.image_url || '',
          machine_criticality: machineMap[t.machine_id]?.criticality || 'medium',
          description: t.issue_text || (typeof t.ai_summary === 'object' ? t.ai_summary?.summary : t.ai_summary) || '',
        }));
        setTickets(items);
        
        const storedWork = {};
        items.forEach(t => {
          const localData = window.localStorage.getItem(`tf_work_${t.ticket_id}`);
          const existing = localData ? JSON.parse(localData) : { ...defaultWork };
          const returned = (interventionsRes.data || []).some((item) => item.ticket_id === t.ticket_id && item.intervention_type === 'closure_approval' && item.decision === 'needs_more_work' && item.status === 'open');
          const generated = existing.generated_checklist?.length ? existing.generated_checklist : generateChecklist({
            ticket: t,
            machine: machineMap[t.machine_id] || {},
            history: allTickets,
            documents: documentsRes.data || [],
            parts: partsRes.data || [],
          });
          storedWork[t.ticket_id] = { ...defaultWork, ...existing, ...(returned ? { status: 'in_progress' } : {}), generated_checklist: generated };
          window.localStorage.setItem(`tf_work_${t.ticket_id}`, JSON.stringify(storedWork[t.ticket_id]));
        });
        setWork(storedWork);
        if (items.length) setSelectedId(items[0].ticket_id);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, [user?.role, user?.user_id]);

  const selectedTicket = tickets.find((ticket) => ticket.ticket_id === selectedId) || null;
  const selectedWork = selectedTicket ? { ...defaultWork, ...(work[selectedId] || {}) } : defaultWork;
  const checklist = selectedWork.generated_checklist || [];
  const checklistStatus = selectedWork.checklist_status || {};
  const completedCount = checklist.filter((item) => ['done', 'not_needed'].includes(checklistStatus[item.id])).length;
  const mandatoryComplete = checklist.filter((item) => item.mandatory).every((item) => checklistStatus[item.id] === 'done');
  const allResponded = checklist.every((item) => ['done', 'not_needed'].includes(checklistStatus[item.id]));
  const readyToSubmit = checklist.length > 0 && mandatoryComplete && allResponded;
  const isLocked = ['submitted', 'closed'].includes(selectedWork.status);
  // Verification hardening (roadmap §4.5): a critical job (high/critical urgency
  // OR high/critical machine criticality) must carry photo evidence before it can
  // be submitted for closure, and it can only close after supervisor verification.
  const ticketUrgency = String(selectedTicket?.urgency || (typeof selectedTicket?.ai_summary === 'object' ? selectedTicket?.ai_summary?.urgency : '') || '').toLowerCase();
  const isCriticalJob = ['high', 'critical'].includes(ticketUrgency) || ['high', 'critical'].includes(String(selectedTicket?.machine_criticality || '').toLowerCase());
  const hasPhotoEvidence = (selectedWork.evidence || []).some((e) => e.kind === 'photo');
  const criticalBlocksSubmit = isCriticalJob && !hasPhotoEvidence;

  const updateDraft = (updates) => {
    if (!selectedId) return;
    setWork((current) => ({
      ...current,
      [selectedId]: { ...defaultWork, ...(current[selectedId] || {}), ...updates },
    }));
  };

  const persistWork = async (updates = {}) => {
    if (!selectedId || isLocked) return selectedWork;
    const next = { ...selectedWork, ...updates };
    updateDraft(updates);
    setSaving(true);
    setError('');
    try {
      setWork((current) => ({ ...current, [selectedId]: next }));
      window.localStorage.setItem(`tf_work_${selectedId}`, JSON.stringify(next));
      return next;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const startWork = async () => {
    try {
      const startedAt = new Date().toISOString();
      await persistWork({ status: 'in_progress', started_at: startedAt });
      // Durable work-order record (roadmap §3.4) — advance the lifecycle in the DB.
      await supabase.from('tickets').update({
        lifecycle_stage: 'work_started',
        started_at: startedAt,
        acknowledged_at: selectedTicket?.acknowledged_at || startedAt,
        first_action_at: selectedTicket?.first_action_at || startedAt,
      }).eq('id', selectedId);
      setMessage('Work started. Progress is now saved to the maintenance record.');
    } catch {}
  };

  const setChecklistItemStatus = async (item, status) => {
    if (item.mandatory && status === 'not_needed') return;
    const nextStatus = { ...checklistStatus, [item.id]: status };
    const completedIndexes = checklist.map((entry, index) => nextStatus[entry.id] === 'done' ? index : null).filter((index) => index !== null);
    try {
      await persistWork({ status: 'in_progress', checklist_status: nextStatus, checklist: completedIndexes });
      if (status === 'help') {
        await requestIntervention('technical_help', `Help needed: ${item.label}`, 'Review the machine data, issue history and completed checklist steps.', 'maintenance_engineer');
        setMessage('Help requested. Your progress and machine context are available to the support role.');
      }
    } catch {}
  };

  const requestIntervention = async (type, reason, recommendedAction, assignedRole) => {
    if (!selectedTicket) return;
    const { data: existing } = await supabase.from('maintenance_interventions').select('id').eq('ticket_id', selectedTicket.id).eq('intervention_type', type).neq('status', 'resolved').maybeSingle();
    const payload = {
      factory_id: selectedTicket.factory_id,
      ticket_id: selectedTicket.id,
      machine_id: selectedTicket.machine_id,
      intervention_type: type,
      title: type === 'closure_approval' ? 'Repair ready for verification' : 'Technical support requested',
      reason,
      recommended_action: recommendedAction,
      assigned_role: assignedRole,
      evidence: selectedWork.evidence || [],
      status: 'open',
      decision: '',
    };
    const result = existing?.id
      ? await supabase.from('maintenance_interventions').update(payload).eq('id', existing.id)
      : await supabase.from('maintenance_interventions').insert(payload);
    if (result.error) throw result.error;
  };

  const uploadEvidence = async (file, kind, context = 'General repair update') => {
    if (!file || !selectedId || isLocked) return;
    setSaving(true);
    setError('');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${selectedId}/${fileName}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('repair-proofs')
        .upload(filePath, file);
        
      if (uploadErr) throw uploadErr;
      
      const { data: { publicUrl } } = supabase.storage
        .from('repair-proofs')
        .getPublicUrl(filePath);
        
      const newEvidenceItem = {
        evidence_id: fileName,
        kind: kind,
        file_name: file.name,
        url: publicUrl,
        uploaded_at: new Date().toISOString(),
        context,
      };
      
      const updatedEvidence = [...selectedWork.evidence, newEvidenceItem];
      await persistWork({ evidence: updatedEvidence });
      setMessage(`${kind === 'voice' ? 'Voice' : kind === 'photo' ? 'Photo' : 'File'} update saved automatically.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startVoiceCapture = async (context) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Live recording is not supported here. Use Upload audio instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) voiceChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
        await uploadEvidence(new File([blob], `${selectedId}-${Date.now()}.${extension}`, { type: blob.type }), 'voice', context);
        setRecordingContext('');
      };
      recorderRef.current = recorder;
      setRecordingContext(context);
      recorder.start();
    } catch (err) {
      setError(err.message || 'Microphone access was not available.');
    }
  };

  const stopVoiceCapture = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const captureActions = (context, compact = false) => <div className={`technician-capture-actions${compact ? ' compact' : ''}`}>
    {recordingContext === context ? <button type="button" className="recording" onClick={stopVoiceCapture}><Square className="size-4" />Stop &amp; save</button> : <button type="button" disabled={!!recordingContext || saving || isLocked} onClick={() => startVoiceCapture(context)}><Mic className="size-4" />Speak</button>}
    <label><Camera className="size-4" />Photo<input type="file" accept="image/*" capture="environment" disabled={saving || isLocked} onChange={(event) => { uploadEvidence(event.target.files?.[0], 'photo', context); event.target.value = ''; }} /></label>
    <label><ImagePlus className="size-4" />Choose file<input type="file" accept="image/*,audio/*,.pdf" disabled={saving || isLocked} onChange={(event) => { const file = event.target.files?.[0]; const kind = file?.type.startsWith('audio/') ? 'voice' : file?.type === 'application/pdf' ? 'document' : 'photo'; uploadEvidence(file, kind, context); event.target.value = ''; }} /></label>
  </div>;

  const downloadEvidence = async (item) => {
    setError('');
    try {
      if (item.url) {
        window.open(item.url, '_blank');
      } else {
        throw new Error('No URL available for this evidence.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const submitForApproval = async () => {
    if (!selectedTicket || !readyToSubmit || isLocked) return;
    if (criticalBlocksSubmit) {
      setError('This is a critical job — add a photo of the completed repair before submitting. Critical repairs cannot close without photo evidence and supervisor verification.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updatedWork = await persistWork({ status: 'submitted', submitted_at: new Date().toISOString() });
      const photoEvidence = updatedWork.evidence.find(e => e.kind === 'photo');
      const proofUrl = photoEvidence ? photoEvidence.url : null;

      // Persist the full work-order record to the DB (roadmap §3.4) so repair
      // detail, parts and labour no longer live only in the browser.
      const labour = parseInt(updatedWork.labour_minutes, 10);
      const { error: updateErr } = await supabase.from('tickets').update({
        proof_image_url: proofUrl,
        lifecycle_stage: 'verification_pending',
        repair_action: (updatedWork.notes || '').trim() || null,
        parts_used: (updatedWork.parts_used || '').trim() || null,
        root_cause: (updatedWork.root_cause || '').trim() || null,
        labour_minutes: Number.isFinite(labour) && labour > 0 ? labour : null,
        started_at: selectedTicket?.started_at || updatedWork.started_at || null,
      }).eq('id', selectedId);

      if (updateErr) throw new Error(updateErr.message);
      await requestIntervention('closure_approval', 'Checklist completed and repair submitted for verification.', 'Review the evidence and verify that the original symptom is resolved.', 'supervisor');
      setMessage('Repair submitted. A supervisor will only be notified because verification is required.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const approveClosure = async () => {
    if (!selectedTicket || !canApprove || selectedWork.status !== 'submitted') return;
    setSaving(true);
    setError('');
    try {
      const closedAt = new Date().toISOString();
      const startRef = selectedTicket?.started_at || selectedWork.started_at;
      const downtimeMinutes = startRef
        ? Math.max(0, Math.round((new Date(closedAt).getTime() - new Date(startRef).getTime()) / 60000))
        : null;
      const { error: updateErr } = await supabase.from('tickets').update({
        status: 'resolved',
        lifecycle_stage: 'closed',
        resolved_at: closedAt,
        verified_at: closedAt,
        closure_approved_by: user?.name || user?.user_id || 'Supervisor',
        downtime_minutes: downtimeMinutes,
      }).eq('id', selectedId);
      if (updateErr) throw new Error(updateErr.message);

      const updatedWork = { ...selectedWork, status: 'closed', reviewed_at: new Date().toISOString(), reviewed_by: user?.name || user?.user_id || 'System' };
      window.localStorage.setItem(`tf_work_${selectedId}`, JSON.stringify(updatedWork));
      setWork((current) => ({ ...current, [selectedId]: updatedWork }));

      const remaining = tickets.filter((ticket) => ticket.ticket_id !== selectedId);
      setTickets(remaining);
      setSelectedId(remaining[0]?.ticket_id || null);
      setMessage('Repair approved and the ticket is now closed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell active="technician">
      <div className="technician-page">
        <div className="technician-heading">
          <div><span className="eyebrow eyebrow-light">Technician workspace</span><h1>Do the work. Close the loop.</h1><p>TurboFix keeps the execution flow simple here; analytics supplies the task context, while your checks, evidence, and closure decisions stay front and center.</p></div>
          <div className="technician-identity"><Wrench className="size-5" /><span>{user?.name || 'Technician'}</span></div>
        </div>
        {error && <div className="technician-alert error">{error}</div>}
        {message && <div className="technician-alert success"><CheckCircle2 className="size-4" />{message}</div>}
        {loading ? (
          <div className="technician-skeleton-grid">
            <div className="technician-skeleton-queue">
              <div className="skeleton-block title skeleton-shimmer" />
              <div className="skeleton-block card skeleton-shimmer" />
              <div className="skeleton-block card skeleton-shimmer" />
              <div className="skeleton-block card skeleton-shimmer" />
            </div>
            <div className="technician-skeleton-workspace">
              <div className="skeleton-block header skeleton-shimmer" />
              <div className="skeleton-block line skeleton-shimmer" />
              <div className="skeleton-block line skeleton-shimmer" />
              <div className="skeleton-block line half skeleton-shimmer" />
            </div>
          </div>
        ) : (
          <div className="technician-grid">
            <section className="technician-queue">
              <div className="technician-section-heading"><div><span className="eyebrow eyebrow-light">Today</span><h2>My work queue</h2></div><button type="button" className="technician-count postlogin-inline-count" onClick={() => document.querySelector('.technician-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{tickets.length} open <small>View work</small></button></div>
              {tickets.length === 0 ? <div className="technician-empty"><ClipboardCheck className="size-9" /><strong>No open work right now</strong><span>New breakdowns and assigned tasks will appear here.</span></div> : tickets.map((ticket) => {
                const item = { ...defaultWork, ...(work[ticket.ticket_id] || {}) };
                return <button key={ticket.ticket_id} className={`technician-ticket${selectedId === ticket.ticket_id ? ' active' : ''}`} onClick={() => setSelectedId(ticket.ticket_id)}><span className={`technician-priority ${String(ticket.urgency || 'Low').toLowerCase()}`}>{ticket.urgency || 'Normal'}</span><span className="technician-ticket-main"><strong>{ticket.machine_name || ticket.machine_id || 'Machine'}</strong><span>{ticket.description || 'Inspection required'}</span></span><span className="technician-ticket-status">{item.status.replace('_', ' ')}</span></button>;
              })}
            </section>
            <section className="technician-workspace">
              {!selectedTicket ? <div className="technician-empty large"><Wrench className="size-10" /><strong>Select a work item</strong><span>Choose a ticket from your queue to begin.</span></div> : <>
                <div className="technician-work-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {(selectedTicket.machine_image_url || window.localStorage.getItem(`tf_machine_photo_${selectedTicket.machine_id}`)) && (
                    <div style={{ width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                       <img src={selectedTicket.machine_image_url || window.localStorage.getItem(`tf_machine_photo_${selectedTicket.machine_id}`)} alt={`${selectedTicket.machine_name || 'Machine'} photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flexGrow: 1 }}>
                    <span className="eyebrow eyebrow-light">{selectedTicket.ticket_id}</span>
                    <h2>{selectedTicket.machine_name || selectedTicket.machine_id}</h2>
                    <p>{selectedTicket.machine_location || 'Plant floor'} · {selectedTicket.description || 'Breakdown inspection'}</p>
                  </div>
                  <span className={`technician-state ${selectedWork.status}`}>{selectedWork.status.replace('_', ' ')}</span>
                </div>
                {selectedTicket.ai_summary?.photo_url && (
                  <div style={{ margin: '16px 0', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                    <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Reported Issue Photo</small>
                    <a href={selectedTicket.ai_summary.photo_url} target="_blank" rel="noopener noreferrer">
                      <img src={selectedTicket.ai_summary.photo_url} alt="Reported issue" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover' }} />
                    </a>
                  </div>
                )}
                <button type="button" className="technician-progress postlogin-progress-button" onClick={() => document.querySelector('.technician-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><div><span>Repair progress</span><strong>{completedCount}/{checklist.length} checks complete</strong></div><div className="technician-progress-bar"><span style={{ width: `${(completedCount / checklist.length) * 100}%` }} /></div><small>View checklist →</small></button>
                <div className="technician-actions">
                  <button className="btn btn-primary" onClick={startWork} disabled={saving || isLocked}><Play className="size-4" />{selectedWork.status === 'in_progress' ? 'Work in progress' : 'Start work'}</button>
                  {recordingContext === 'General repair update' ? <button className="btn btn-ghost recording" type="button" onClick={stopVoiceCapture}><Square className="size-4" />Stop &amp; save</button> : <button className="btn btn-ghost" type="button" disabled={!!recordingContext || saving || isLocked} onClick={() => startVoiceCapture('General repair update')}><Mic className="size-4" />Speak update</button>}
                  <label className={`btn btn-ghost technician-upload${isLocked ? ' disabled' : ''}`}><Camera className="size-4" />Take photo<input type="file" accept="image/*" capture="environment" disabled={saving || isLocked} onChange={(event) => { uploadEvidence(event.target.files?.[0], 'photo', 'General repair update'); event.target.value = ''; }} /></label>
                </div>
                {selectedWork.evidence.length > 0 && <div className="technician-evidence"><strong>Repair evidence</strong><div>{selectedWork.evidence.map((item) => <button key={item.evidence_id} type="button" onClick={() => downloadEvidence(item)}><Download className="size-4" /><span>{item.context || item.file_name}</span><small>{item.kind}</small></button>)}</div></div>}
                {(() => {
                  const priorFixes = history
                    .filter((h) => h.machine_id === selectedTicket.machine_id && h.id !== selectedTicket.id)
                    .slice(0, 3);
                  if (priorFixes.length === 0) return null;
                  return (
                    <details className="technician-optional-details technician-prior-fixes">
                      <summary>Proven fixes on this machine <span>What worked before — reuse it instead of re-diagnosing</span></summary>
                      <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                        {priorFixes.map((h) => (
                          <div key={h.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginBottom: '3px' }}>{h.resolved_at ? new Date(h.resolved_at).toLocaleDateString('en-IN') : ''}{h.wo_number ? ` · ${h.wo_number}` : ''}</div>
                            {h.root_cause && <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}><b style={{ color: 'var(--slate)', fontWeight: 600 }}>Cause:</b> {h.root_cause}</div>}
                            {h.repair_action && <div style={{ fontSize: '0.85rem', color: 'white' }}><b style={{ color: 'var(--slate)', fontWeight: 600 }}>Fix:</b> {h.repair_action}</div>}
                            {h.parts_used && <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Parts: {h.parts_used}</div>}
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })()}
                <div className="technician-checklist"><div className="technician-card-heading"><ClipboardCheck className="size-5" /><div><h3>Next safe actions</h3><small>Generated automatically from this machine, issue and repair history.</small></div></div>{checklist.map((item) => <div key={item.id} className={`technician-check dynamic ${checklistStatus[item.id] || ''}`}><div className="technician-check-copy"><span>{item.label}</span><small>{item.source}{item.mandatory ? ' · Required' : ''}</small>{checklistStatus[item.id] === 'help' && captureActions(`Help: ${item.label}`, true)}</div><div className="technician-check-actions"><button type="button" className={checklistStatus[item.id] === 'done' ? 'active' : ''} disabled={saving || isLocked} onClick={() => setChecklistItemStatus(item, 'done')}>Done</button>{!item.mandatory && <button type="button" className={checklistStatus[item.id] === 'not_needed' ? 'active muted' : ''} disabled={saving || isLocked} onClick={() => setChecklistItemStatus(item, 'not_needed')}>Not needed</button>}<button type="button" className={checklistStatus[item.id] === 'help' ? 'active help' : ''} disabled={saving || isLocked} onClick={() => setChecklistItemStatus(item, 'help')}>Need help</button></div></div>)}</div>
                <details className="technician-optional-details"><summary>Add details <span>Type, speak or take a photo</span></summary><div className="technician-two-col"><div className="technician-field"><span><FileText className="size-4" />Repair result</span><textarea value={selectedWork.notes} disabled={isLocked} onChange={(event) => updateDraft({ notes: event.target.value })} onBlur={() => persistWork({ status: selectedWork.status === 'assigned' ? 'in_progress' : selectedWork.status }).catch(() => {})} placeholder="Optional—type only if faster" />{captureActions('Repair result')}</div><div className="technician-field"><span><Package className="size-4" />Parts used</span><textarea value={selectedWork.parts_used} disabled={isLocked} onChange={(event) => updateDraft({ parts_used: event.target.value })} onBlur={() => persistWork({ status: selectedWork.status === 'assigned' ? 'in_progress' : selectedWork.status }).catch(() => {})} placeholder="Optional—type only if faster" />{captureActions('Parts used')}</div><div className="technician-field"><span><Wrench className="size-4" />Root cause</span><textarea value={selectedWork.root_cause} disabled={isLocked} onChange={(event) => updateDraft({ root_cause: event.target.value })} onBlur={() => persistWork({ status: selectedWork.status === 'assigned' ? 'in_progress' : selectedWork.status }).catch(() => {})} placeholder="Why did it fail? Optional" />{captureActions('Root cause')}</div><div className="technician-field"><span><CheckCircle2 className="size-4" />Labour time (minutes)</span><input type="number" min="0" step="5" value={selectedWork.labour_minutes} disabled={isLocked} onChange={(event) => updateDraft({ labour_minutes: event.target.value })} onBlur={() => persistWork({ status: selectedWork.status === 'assigned' ? 'in_progress' : selectedWork.status }).catch(() => {})} placeholder="e.g. 45" /></div></div></details>
                {isCriticalJob && selectedWork.status !== 'closed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: criticalBlocksSubmit ? 'rgba(239,68,68,0.12)' : 'rgba(37,211,102,0.1)', border: `1px solid ${criticalBlocksSubmit ? 'rgba(239,68,68,0.4)' : 'rgba(37,211,102,0.4)'}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '0.82rem', color: criticalBlocksSubmit ? '#fca5a5' : '#25D366' }}>
                    <ShieldCheck className="size-4" />
                    <span>{criticalBlocksSubmit ? 'Critical job — a photo of the completed repair is required before it can be submitted and verified.' : 'Photo evidence attached. This critical repair will close only after supervisor verification.'}</span>
                  </div>
                )}
                <div className="technician-close"><div><ShieldCheck className="size-5" /><span><strong>Close-loop check</strong><small>{selectedWork.status === 'submitted' ? 'Repair is waiting for an authorized reviewer.' : isCriticalJob ? 'Critical job: complete the checklist and attach a photo. Closure requires supervisor verification.' : 'Complete the checklist. Text, voice and photos are optional evidence.'}</small></span></div>{selectedWork.status === 'submitted' && canApprove ? <button className="btn btn-primary" onClick={approveClosure} disabled={saving}>Approve &amp; close ticket</button> : <button className="btn btn-primary" onClick={submitForApproval} disabled={saving || !readyToSubmit || isLocked || criticalBlocksSubmit}>{selectedWork.status === 'submitted' ? 'Awaiting approval' : criticalBlocksSubmit ? 'Add photo to submit' : 'Submit for closure'}</button>}</div>
              </>}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
