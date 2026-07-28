import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Mic, Square, X } from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';
import { microphoneErrorMessage } from '@/utils/mediaErrors';
import { filterRowsToVisibleMachines, isTechnicianRole, visibleMachineIdSet, visibleMachinesForUser } from '@/utils/machineVisibility';

const plantSuggestions = [
  'Which machines require attention today?',
  'What should we prioritize before the next shutdown?',
  'Which open issue has the highest production risk?',
];

const machineSuggestions = [
  'What should the technician check first?',
  'What spare parts should we prepare?',
  'Summarize this machine’s recent maintenance history.',
];

function getLiveDataAnswer(machines = [], tickets = [], events = [], selectedMachineId) {
  const safeMachines = machines || [];
  const safeTickets = tickets || [];
  const safeEvents = events || [];

  // Only consider tickets for machines the current user can see (machines is
  // already scoped to the user's role/assignments), so the fallback answer
  // matches the same scope as the dropdown and the edge function.
  const visibleMachineIds = new Set(safeMachines.map(m => m.machine_id));
  const openTickets = safeTickets.filter(t => String(t.status || 'Open').toLowerCase() === 'open' && visibleMachineIds.has(t.machine_id));
  
  if (selectedMachineId && selectedMachineId !== 'all') {
    const machine = safeMachines.find(m => m.machine_id === selectedMachineId);
    if (!machine) return 'Machine not found.';
    
    const machineOpen = openTickets.filter(t => t.machine_id === selectedMachineId);
    const machineEvents = safeEvents.filter(e => e.machine_id === selectedMachineId);
    
    if (machineOpen.length === 0) {
      return `${machine.machine_name || machine.machine_id} has no open maintenance tickets. TurboFix found ${machineEvents.length} recorded events. Primary technician: ${machine.primary_technician_name || 'not assigned'}. Add manuals and service history if you need a deeper recommendation.`;
    }
    
    // Sort open tickets by urgency: High -> Medium -> Low
    const sorted = [...machineOpen].sort((a, b) => {
      const urgencyMap = { critical: 0, high: 1, medium: 2, low: 3 };
      const aVal = urgencyMap[String(a.urgency || '').toLowerCase()] ?? 4;
      const bVal = urgencyMap[String(b.urgency || '').toLowerCase()] ?? 4;
      return aVal - bVal;
    });
    const top = sorted[0];
    const urgencyStr = top.urgency ? `${top.urgency} urgency` : 'unrated urgency';
    return `${machine.machine_name || machine.machine_id} has ${machineOpen.length} open ticket(s). Primary technician: ${machine.primary_technician_name || 'not assigned'}. Start with ${top.id ? top.id.slice(0, 8) : 'ticket'}: ${top.issue_text || top.description || 'maintenance issue'} (${urgencyStr}). Confirm isolation and the machine manual before work.`;
  }
  
  // Plant-wide
  if (openTickets.length === 0) {
    return `All ${safeMachines.length} machines are currently clear with no open maintenance tickets. Use preventive schedules and complete MachineData files to keep plant-wide recommendations reliable.`;
  }
  
  const sorted = [...openTickets].sort((a, b) => {
    const urgencyMap = { critical: 0, high: 1, medium: 2, low: 3 };
    const aVal = urgencyMap[String(a.urgency || '').toLowerCase()] ?? 4;
    const bVal = urgencyMap[String(b.urgency || '').toLowerCase()] ?? 4;
    return aVal - bVal;
  });
  const top = sorted[0];
  const machineName = safeMachines.find(m => m.machine_id === top.machine_id)?.machine_name || top.machine_id || 'Machine';
  const urgencyStr = top.urgency ? `${top.urgency} urgency` : 'unrated urgency';
  return `Plant-wide view: ${openTickets.length} open ticket(s) across ${safeMachines.length} machines. Prioritize ${machineName}: ${top.issue_text || top.description || 'maintenance issue'} (${urgencyStr}). Review the remaining open tickets after this risk is controlled.`;
}

export default function Assistant() {
  const [machines, setMachines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('machine_id') || 'all');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerSource, setAnswerSource] = useState('');
  const [contextFiles, setContextFiles] = useState([]);
  const [retrieval, setRetrieval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const signedInUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch { return null; }
  }, []);
  const [imagePreview, setImagePreview] = useState('');
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    document.title = 'Maintenance Help | TurboFix';
    Promise.all([
      supabase.from('machines').select('id,name,location,status,image_url,technician_user_id'),
      supabase.from('tickets').select('*'),
      supabase.from('events').select('*'),
      supabase.functions.invoke('onboard_team_member', { body: { action: 'list' } }),
    ]).then(([mRes, tRes, eRes, directoryRes]) => {
      const members = directoryRes.data?.members || [];
      const memberNames = Object.fromEntries(members.map((member) => [member.user_id, member.name]));
      const assignments = directoryRes.data?.machine_assignments || {};
      const mapped = (mRes.data || []).map(m => ({
        machine_id: m.id,
        machine_name: m.name,
        location: m.location,
        image_url: m.image_url,
        technician_user_id: assignments[m.id]?.technician_user_id || m.technician_user_id || null,
        primary_technician_name: memberNames[assignments[m.id]?.technician_user_id] || '',
      }));
      const visibleMachines = visibleMachinesForUser(mapped, signedInUser);
      const visibleIds = visibleMachineIdSet(mapped, signedInUser);
      const shouldScope = isTechnicianRole(signedInUser?.role);
      setMachines(visibleMachines);
      setTickets(shouldScope ? filterRowsToVisibleMachines(tRes.data || [], visibleIds) : (tRes.data || []));
      setEvents(shouldScope ? filterRowsToVisibleMachines(eRes.data || [], visibleIds) : (eRes.data || []));
    }).catch(() => {
      setMachines([]);
      setTickets([]);
      setEvents([]);
    });
  }, [signedInUser?.role, signedInUser?.user_id]);

  useEffect(() => {
    if (selected !== 'all' && machines.length > 0 && !machines.some((machine) => machine.machine_id === selected)) {
      setSelected('all');
    }
  }, [machines, selected]);

  const selectedMachine = useMemo(
    () => (machines || []).find((machine) => machine.machine_id === selected),
    [machines, selected],
  );
  const isPlantWide = selected === 'all';
  const suggestions = isPlantWide ? plantSuggestions : machineSuggestions;
  const scopeHelp = isPlantWide
    ? 'Uses data from every machine, open ticket, and maintenance event in this plant.'
    : `Uses the latest canonical MachineData file for ${selectedMachine?.machine_name || 'the selected machine'}.`;

  const clearResult = () => {
    setAnswer('');
    setAnswerSource('');
    setContextFiles([]);
    setRetrieval(null);
    setError('');
  };

  const changeScope = (event) => {
    setSelected(event.target.value);
    clearResult();
  };

  const changeQuestion = (value) => {
    setQuestion(value);
    clearResult();
  };

  const pickImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const removeImage = () => setImagePreview('');

  const transcribeAudio = async (blob) => {
    setTranscribing(true);
    setError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error: fnError } = await supabase.functions.invoke('ai_translation', {
        body: { action: 'transcribe', audio: dataUrl },
      });
      if (fnError || !data || data.error) throw new Error(data?.error || fnError?.message || 'Transcription failed.');
      const transcript = String(data.transcript || '').trim();
      if (!transcript) { setError('No speech was detected. Please try again or type your question.'); return; }
      setQuestion((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      setAnswer('');
    } catch (err) {
      setError(err.message || 'Could not transcribe the recording. Please type your question.');
    } finally {
      setTranscribing(false);
    }
  };

  const toggleVoice = async () => {
    if (listening) { recorderRef.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(microphoneErrorMessage(null, 'type your question instead'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (recordEvent) => { if (recordEvent.data.size) audioChunksRef.current.push(recordEvent.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await transcribeAudio(blob);
      };
      recorderRef.current = recorder;
      setError('');
      setListening(true);
      recorder.start();
    } catch (err) {
      setListening(false);
      setError(microphoneErrorMessage(err, 'type your question instead'));
    }
  };

  const ask = async (event) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    if (listening) recorderRef.current?.stop();

    setLoading(true);
    setError('');
    setAnswer('');
    setAnswerSource('');
    setRetrieval(null);
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai_assistant', {
        body: { selected, question: trimmedQuestion, ...(imagePreview ? { image: imagePreview } : {}) }
      });
      
      if (functionError || !data || data.error) {
        throw new Error(functionError?.message || data?.error || 'Failed to get recommendation from AI');
      }
      
      setAnswer(data.recommendation);
      setAnswerSource('ai');
      setContextFiles(data.context_files || []);
      setRetrieval(data.retrieval || null);
    } catch (requestError) {
      console.warn("Maintenance help edge function failed, falling back to local summary:", requestError);
      try {
        const liveAnswer = getLiveDataAnswer(machines, tickets, events, selected);
        setAnswer(liveAnswer);
        setAnswerSource('live_data');
      } catch (fallbackError) {
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return <AppShell active="assistant"><div className="assistant-page">
    <div className="decision-heading"><div><span className="eyebrow eyebrow-light">TurboFix intelligence</span><h1>Maintenance Help</h1><p>Ask about one machine or get a plant-wide maintenance view in plain language. TurboFix shapes the workflow; analytics stays the engine behind the answers.</p></div><a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Open shutdown planner</a></div>
    <section className="assistant-layout">
      <div className="assistant-chat" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="assistant-orb">✦</div><h2>Ask TurboFix</h2><p className="assistant-helper">Your maintenance question</p>
        <form onSubmit={ask} className="assistant-form">
          <label className="assistant-field">
            <span>Answer using</span>
            <select aria-label="Answer using" value={selected} onChange={changeScope}>
              <option value="all">{signedInUser?.role && signedInUser.role !== 'owner' ? 'All my machines' : 'All machines — plant-wide'}</option>
              {machines.length > 0 && <optgroup label="One machine">
                {machines.map((machine) => <option key={machine.machine_id} value={machine.machine_id}>{machine.machine_name} · {machine.machine_id}</option>)}
              </optgroup>}
            </select>
            <small>{scopeHelp}</small>
          </label>
          <label className="assistant-field">
            <span>Your maintenance question</span>
            <textarea value={question} onChange={(event) => changeQuestion(event.target.value)} placeholder={isPlantWide ? 'For example: Which machines should we service this weekend?' : 'For example: What should the technician inspect first?'} rows="4" />
          </label>
          <button className="btn btn-primary assistant-submit" disabled={loading || !question.trim()}>{loading ? 'Checking maintenance data…' : 'Get recommendation'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowMoreOptions(!showMoreOptions)} style={{ width: '100%', marginTop: '12px' }}>More options</button>
        </form>

        {showMoreOptions && <>
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="assistant-suggestions" aria-label="Suggested questions" style={{ marginBottom: '20px' }}><strong style={{ display: 'block', marginBottom: '12px' }}>Suggested questions:</strong>{suggestions.map((item) => <button key={item} type="button" onClick={() => changeQuestion(item)}>{item}</button>)}</div>
            <div className="assistant-input-tools" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Camera className="size-4" /> Attach photo
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(event) => { pickImage(event.target.files?.[0]); event.target.value = ''; }} />
              </label>
              <button type="button" className={`btn btn-ghost btn-sm${listening ? ' recording' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={toggleVoice} disabled={transcribing}>
                {listening ? <><Square className="size-4" /> Stop</> : <><Mic className="size-4" /> Speak</>}
              </button>
              {listening && <span style={{ color: 'var(--brand)', fontSize: '0.8rem' }}>Recording… tap Stop when done</span>}
              {transcribing && <span style={{ color: 'var(--slate)', fontSize: '0.8rem' }}>Transcribing your question…</span>}
            </div>
            {imagePreview && (
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                <img src={imagePreview} alt="Attached machine photo" style={{ maxWidth: '180px', maxHeight: '130px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', display: 'block' }} />
                <button type="button" onClick={removeImage} aria-label="Remove photo" style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X className="size-4" /></button>
              </div>
            )}
          </div>
        </>}

        {error && <div className="decision-alert" role="alert">{error}</div>}{answer && <div className="assistant-answer"><div className="decision-card-kicker">{answerSource === 'ai' ? 'Suggested next step' : 'Live maintenance summary'}</div><p>{answer}</p>{contextFiles.length > 0 && <small className="assistant-context-file">Context refreshed from {contextFiles.map((file) => file.file_name).join(', ')}{retrieval ? ` · ${retrieval.nodes_used} relevant facts · ~${retrieval.estimated_tokens} context tokens` : ''}</small>}</div>}
      </div>
    </section>
  </div></AppShell>;
}
