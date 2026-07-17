import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Download, FileText, ImagePlus, Mic, Package, Play, ShieldCheck, Wrench } from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';

const checklist = [
  'Make the machine safe and apply lockout/tagout',
  'Inspect the reported area and confirm the symptom',
  'Check the machine manual or MachineData guidance',
  'Test the repair and confirm the machine is ready',
];

const defaultWork = {
  status: 'assigned',
  checklist: [],
  notes: '',
  parts_used: '',
  evidence: [],
  started_at: '',
  submitted_at: '',
  reviewed_at: '',
  reviewed_by: '',
};


export default function Technician() {
  const [tickets, setTickets] = useState([]);
  const [work, setWork] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch { return null; }
  }, []);
  const canApprove = ['owner', 'supervisor', 'maintenance_head'].includes(user?.role);

  useEffect(() => {
    (async () => {
      try {
        const [ticketsRes, machinesRes] = await Promise.all([
          supabase.from('tickets').select('id,machine_id,status,issue_text,ai_summary,created_at').eq('status', 'open'),
          supabase.from('machines').select('id,name'),
        ]);
        const machineMap = {};
        (machinesRes.data || []).forEach(m => { machineMap[m.id] = m.name; });
        const items = (ticketsRes.data || []).map(t => ({
          ticket_id: t.id, machine_id: t.machine_id, machine_name: machineMap[t.machine_id] || 'Unknown',
          status: t.status, issue_text: t.issue_text, ai_summary: t.ai_summary, created_at: t.created_at, work: {},
        }));
        setTickets(items);
        
        const storedWork = {};
        items.forEach(t => {
          const localData = window.localStorage.getItem(`tf_work_${t.ticket_id}`);
          storedWork[t.ticket_id] = localData ? JSON.parse(localData) : { ...defaultWork };
        });
        setWork(storedWork);
        if (items.length) setSelectedId(items[0].ticket_id);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const selectedTicket = tickets.find((ticket) => ticket.ticket_id === selectedId) || null;
  const selectedWork = selectedTicket ? { ...defaultWork, ...(work[selectedId] || {}) } : defaultWork;
  const completedCount = selectedWork.checklist.length;
  const readyToSubmit = completedCount === checklist.length && selectedWork.notes.trim().length > 0;
  const isLocked = ['submitted', 'closed'].includes(selectedWork.status);

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
      await persistWork({ status: 'in_progress', started_at: new Date().toISOString() });
      setMessage('Work started. Progress is now saved to the maintenance record.');
    } catch {}
  };

  const toggleChecklist = async (index) => {
    const next = selectedWork.checklist.includes(index)
      ? selectedWork.checklist.filter((item) => item !== index)
      : [...selectedWork.checklist, index];
    try { await persistWork({ status: 'in_progress', checklist: next.sort((a, b) => a - b) }); } catch {}
  };

  const uploadEvidence = async (file, kind) => {
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
        uploaded_at: new Date().toISOString()
      };
      
      const updatedEvidence = [...selectedWork.evidence, newEvidenceItem];
      await persistWork({ evidence: updatedEvidence });
      setMessage('Evidence uploaded successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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
    setSaving(true);
    setError('');
    try {
      const updatedWork = await persistWork({ status: 'submitted', submitted_at: new Date().toISOString() });
      const photoEvidence = updatedWork.evidence.find(e => e.kind === 'photo');
      const proofUrl = photoEvidence ? photoEvidence.url : null;
      
      const { error: updateErr } = await supabase.from('tickets').update({ 
        status: 'resolved',
        proof_image_url: proofUrl,
        resolved_at: new Date().toISOString()
      }).eq('id', selectedId);
      
      if (updateErr) throw new Error(updateErr.message);
      setMessage('Repair submitted.');
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
      const { error: updateErr } = await supabase.from('tickets').update({ status: 'resolved' }).eq('id', selectedId);
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
          <div><span className="eyebrow eyebrow-light">Technician workspace</span><h1>Do the work. Close the loop.</h1><p>Everything assigned to you, from the first check to supervisor-approved closure.</p></div>
          <div className="technician-identity"><Wrench className="size-5" /><span>{user?.name || 'Technician'}</span></div>
        </div>
        {error && <div className="technician-alert error">{error}</div>}
        {message && <div className="technician-alert success"><CheckCircle2 className="size-4" />{message}</div>}
        {loading ? <div className="technician-empty">Loading your work queue…</div> : (
          <div className="technician-grid">
            <section className="technician-queue">
              <div className="technician-section-heading"><div><span className="eyebrow eyebrow-light">Today</span><h2>My work queue</h2></div><span className="technician-count">{tickets.length} open</span></div>
              {tickets.length === 0 ? <div className="technician-empty"><ClipboardCheck className="size-9" /><strong>No open work right now</strong><span>New breakdowns and assigned tasks will appear here.</span></div> : tickets.map((ticket) => {
                const item = { ...defaultWork, ...(work[ticket.ticket_id] || {}) };
                return <button key={ticket.ticket_id} className={`technician-ticket${selectedId === ticket.ticket_id ? ' active' : ''}`} onClick={() => setSelectedId(ticket.ticket_id)}><span className={`technician-priority ${String(ticket.urgency || 'Low').toLowerCase()}`}>{ticket.urgency || 'Normal'}</span><span className="technician-ticket-main"><strong>{ticket.machine_name || ticket.machine_id || 'Machine'}</strong><span>{ticket.description || 'Inspection required'}</span></span><span className="technician-ticket-status">{item.status.replace('_', ' ')}</span></button>;
              })}
            </section>
            <section className="technician-workspace">
              {!selectedTicket ? <div className="technician-empty large"><Wrench className="size-10" /><strong>Select a work item</strong><span>Choose a ticket from your queue to begin.</span></div> : <>
                <div className="technician-work-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {window.localStorage.getItem(`tf_machine_photo_${selectedTicket.machine_id}`) && (
                    <div style={{ width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                      <img src={window.localStorage.getItem(`tf_machine_photo_${selectedTicket.machine_id}`)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flexGrow: 1 }}>
                    <span className="eyebrow eyebrow-light">{selectedTicket.ticket_id}</span>
                    <h2>{selectedTicket.machine_name || selectedTicket.machine_id}</h2>
                    <p>{selectedTicket.machine_location || 'Plant floor'} · {selectedTicket.description || 'Breakdown inspection'}</p>
                  </div>
                  <span className={`technician-state ${selectedWork.status}`}>{selectedWork.status.replace('_', ' ')}</span>
                </div>
                <div className="technician-progress"><div><span>Repair progress</span><strong>{completedCount}/{checklist.length} checks complete</strong></div><div className="technician-progress-bar"><span style={{ width: `${(completedCount / checklist.length) * 100}%` }} /></div></div>
                <div className="technician-actions">
                  <button className="btn btn-primary" onClick={startWork} disabled={saving || isLocked}><Play className="size-4" />{selectedWork.status === 'in_progress' ? 'Work in progress' : 'Start work'}</button>
                  <label className={`btn btn-ghost technician-upload${isLocked ? ' disabled' : ''}`}><ImagePlus className="size-4" />Add evidence<input type="file" accept="image/*,.pdf" disabled={saving || isLocked} onChange={(event) => { uploadEvidence(event.target.files?.[0], event.target.files?.[0]?.type === 'application/pdf' ? 'document' : 'photo'); event.target.value = ''; }} /></label>
                  <label className={`btn btn-ghost technician-upload${isLocked ? ' disabled' : ''}`}><Mic className="size-4" />Voice note<input type="file" accept="audio/*" disabled={saving || isLocked} onChange={(event) => { uploadEvidence(event.target.files?.[0], 'voice'); event.target.value = ''; }} /></label>
                </div>
                {selectedWork.evidence.length > 0 && <div className="technician-evidence"><strong>Repair evidence</strong><div>{selectedWork.evidence.map((item) => <button key={item.evidence_id} type="button" onClick={() => downloadEvidence(item)}><Download className="size-4" /><span>{item.file_name}</span><small>{item.kind}</small></button>)}</div></div>}
                <div className="technician-checklist"><div className="technician-card-heading"><ClipboardCheck className="size-5" /><h3>Repair checklist</h3></div>{checklist.map((item, index) => <label key={item} className={`technician-check${selectedWork.checklist.includes(index) ? ' done' : ''}`}><input type="checkbox" checked={selectedWork.checklist.includes(index)} disabled={saving || isLocked} onChange={() => toggleChecklist(index)} /><span>{item}</span></label>)}</div>
                <div className="technician-two-col"><label className="technician-field"><span><FileText className="size-4" />Technician notes</span><textarea value={selectedWork.notes} disabled={isLocked} onChange={(event) => updateDraft({ notes: event.target.value })} onBlur={() => persistWork({ status: selectedWork.status === 'assigned' ? 'in_progress' : selectedWork.status }).catch(() => {})} placeholder="What did you find and what did you fix?" /></label><label className="technician-field"><span><Package className="size-4" />Spares and consumables</span><textarea value={selectedWork.parts_used} disabled={isLocked} onChange={(event) => updateDraft({ parts_used: event.target.value })} onBlur={() => persistWork({ status: selectedWork.status === 'assigned' ? 'in_progress' : selectedWork.status }).catch(() => {})} placeholder="Part name, quantity, batch or reason" /></label></div>
                <div className="technician-close"><div><ShieldCheck className="size-5" /><span><strong>Close-loop check</strong><small>{selectedWork.status === 'submitted' ? 'Repair is waiting for an authorized reviewer.' : 'Complete all checks and add notes before submission.'}</small></span></div>{selectedWork.status === 'submitted' && canApprove ? <button className="btn btn-primary" onClick={approveClosure} disabled={saving}>Approve &amp; close ticket</button> : <button className="btn btn-primary" onClick={submitForApproval} disabled={saving || !readyToSubmit || isLocked}>{selectedWork.status === 'submitted' ? 'Awaiting approval' : 'Submit for closure'}</button>}</div>
              </>}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
