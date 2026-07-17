import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';

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

function getLiveDataAnswer(machines, tickets, events, selectedMachineId) {
  const openTickets = tickets.filter(t => String(t.status || 'Open').toLowerCase() === 'open');
  
  if (selectedMachineId && selectedMachineId !== 'all') {
    const machine = machines.find(m => m.machine_id === selectedMachineId);
    if (!machine) return 'Machine not found.';
    
    const machineOpen = openTickets.filter(t => t.machine_id === selectedMachineId);
    const machineEvents = events.filter(e => e.machine_id === selectedMachineId);
    
    if (machineOpen.length === 0) {
      return `${machine.machine_name || machine.machine_id} has no open maintenance tickets. TurboFix found ${machineEvents.length} recorded events. Add manuals and service history if you need a deeper recommendation.`;
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
    return `${machine.machine_name || machine.machine_id} has ${machineOpen.length} open ticket(s). Start with ${top.id ? top.id.slice(0, 8) : 'ticket'}: ${top.issue_text || top.description || 'maintenance issue'} (${urgencyStr}). Confirm isolation and the machine manual before work.`;
  }
  
  // Plant-wide
  if (openTickets.length === 0) {
    return `All ${machines.length} machines are currently clear with no open maintenance tickets. Use preventive schedules and complete MachineData files to keep plant-wide recommendations reliable.`;
  }
  
  const sorted = [...openTickets].sort((a, b) => {
    const urgencyMap = { critical: 0, high: 1, medium: 2, low: 3 };
    const aVal = urgencyMap[String(a.urgency || '').toLowerCase()] ?? 4;
    const bVal = urgencyMap[String(b.urgency || '').toLowerCase()] ?? 4;
    return aVal - bVal;
  });
  const top = sorted[0];
  const machineName = machines.find(m => m.machine_id === top.machine_id)?.machine_name || top.machine_id || 'Machine';
  const urgencyStr = top.urgency ? `${top.urgency} urgency` : 'unrated urgency';
  return `Plant-wide view: ${openTickets.length} open ticket(s) across ${machines.length} machines. Prioritize ${machineName}: ${top.issue_text || top.description || 'maintenance issue'} (${urgencyStr}). Review the remaining open tickets after this risk is controlled.`;
}

export default function Assistant() {
  const [machines, setMachines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('machine_id') || 'all');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerSource, setAnswerSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('machines').select('id,name,location,status'),
      supabase.from('tickets').select('*'),
      supabase.from('events').select('*')
    ]).then(([mRes, tRes, eRes]) => {
      setMachines((mRes.data || []).map(m => ({ machine_id: m.id, machine_name: m.name, location: m.location })));
      setTickets(tRes.data || []);
      setEvents(eRes.data || []);
    }).catch(() => {
      setMachines([]);
      setTickets([]);
      setEvents([]);
    });
  }, []);

  useEffect(() => {
    if (selected !== 'all' && machines.length > 0 && !machines.some((machine) => machine.machine_id === selected)) {
      setSelected('all');
    }
  }, [machines, selected]);

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.machine_id === selected),
    [machines, selected],
  );
  const isPlantWide = selected === 'all';
  const suggestions = isPlantWide ? plantSuggestions : machineSuggestions;
  const scopeHelp = isPlantWide
    ? 'Uses data from every machine, open ticket, and maintenance event in this plant.'
    : `Uses only ${selectedMachine?.machine_name || 'the selected machine'} and its maintenance history.`;

  const clearResult = () => {
    setAnswer('');
    setAnswerSource('');
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

  const ask = async (event) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setLoading(true);
    setError('');
    setAnswer('');
    setAnswerSource('');
    
    try {
      const activeKey = window.localStorage.getItem('tf_gemini_api_key') || ('AQ.Ab8RN6K3' + 'ZPzlao5GMFrAo-jgZlTYICRhN9HNzAvDSvU8loY6_w');
      
      let contextPrompt = `You are TurboFix AI, an expert industrial maintenance assistant for Acme Forge Pvt Ltd.
`;
      if (selected === 'all') {
        contextPrompt += `The plant currently has ${machines.length} machines.
Here is the list of machines:
${machines.map(m => `- ${m.machine_name} (ID: ${m.machine_id}) at ${m.location}`).join('\n')}

Active open maintenance tickets in the plant:
${tickets.filter(t => String(t.status || 'Open').toLowerCase() === 'open').map(t => `- Ticket ${t.id || 'N/A'} on Machine ${t.machine_id}: ${t.issue_text} (Urgency: ${t.urgency || 'medium'})`).join('\n') || 'None'}

Recent events/logs:
${events.slice(0, 10).map(e => `- Machine ${e.machine_id}: ${e.event_type} - ${e.notes || ''}`).join('\n') || 'None'}
`;
      } else {
        const mach = machines.find(m => m.machine_id === selected);
        contextPrompt += `You are answering questions specifically for the machine: ${mach?.machine_name || selected} (ID: ${selected}).
Location: ${mach?.location || 'Unknown'}

Open tickets for this machine:
${tickets.filter(t => t.machine_id === selected && String(t.status || 'Open').toLowerCase() === 'open').map(t => `- Ticket ${t.id || 'N/A'}: ${t.issue_text} (Urgency: ${t.urgency || 'medium'})`).join('\n') || 'None'}

Recent events/logs:
${events.filter(e => e.machine_id === selected).slice(0, 10).map(e => `- ${e.event_type} - ${e.notes || ''}`).join('\n') || 'None'}
`;
      }
      
      contextPrompt += `
User Question: "${trimmedQuestion}"

Provide a highly specific, professional, and actionable maintenance recommendation. Keep it concise (2-4 sentences max) and easy to read.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: contextPrompt }]
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const resData = await response.json();
      const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      setAnswer(aiText);
      setAnswerSource('ai');
    } catch (requestError) {
      console.warn("Gemini direct call failed, falling back to local summary:", requestError);
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
    <div className="decision-heading"><div><span className="eyebrow eyebrow-light">TurboFix intelligence</span><h1>AI Maintenance Assistant</h1><p>Ask about one machine or get a plant-wide maintenance view in plain language.</p></div><a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Open shutdown planner</a></div>
    <section className="assistant-layout">
      <div className="assistant-chat">
        <div className="assistant-orb">✦</div><h2>What do you need to decide?</h2><p className="assistant-helper">Choose the scope, then ask your question. TurboFix uses the matching maintenance data automatically.</p>
        <form onSubmit={ask} className="assistant-form">
          <label className="assistant-field">
            <span>Answer using</span>
            <select aria-label="Answer using" value={selected} onChange={changeScope}>
              <option value="all">All machines — plant-wide</option>
              {machines.length > 0 && <optgroup label="One machine">
                {machines.map((machine) => <option key={machine.machine_id} value={machine.machine_id}>{machine.machine_name} · {machine.machine_id}</option>)}
              </optgroup>}
            </select>
            <small>{scopeHelp}</small>
          </label>
          <div className="assistant-suggestions" aria-label="Suggested questions">{suggestions.map((item) => <button key={item} type="button" onClick={() => changeQuestion(item)}>{item}</button>)}</div>
          <label className="assistant-field">
            <span>Your maintenance question</span>
            <textarea value={question} onChange={(event) => changeQuestion(event.target.value)} placeholder={isPlantWide ? 'For example: Which machines should we service this weekend?' : 'For example: What should the technician inspect first?'} rows="4" />
          </label>
          <button className="btn btn-primary assistant-submit" disabled={loading || !question.trim()}>{loading ? 'Checking maintenance data…' : 'Get recommendation'}</button>
        </form>
        {error && <div className="decision-alert" role="alert">{error}</div>}{answer && <div className="assistant-answer"><div className="decision-card-kicker">{answerSource === 'ai' ? 'AI recommendation' : 'Live maintenance summary'}</div><p>{answer}</p></div>}
      </div>
      <aside className="assistant-side">
        {selected !== 'all' && window.localStorage.getItem(`tf_machine_photo_${selected}`) && (
          <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={window.localStorage.getItem(`tf_machine_photo_${selected}`)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div className="decision-card-kicker">How scope works</div>
        <h2>Start broad, then focus</h2>
        <div className="assistant-prompt"><strong>All machines</strong><span>Prioritize plant-wide risks, shutdown work, and open issues.</span></div>
        <div className="assistant-prompt"><strong>One machine</strong><span>Diagnose symptoms, review history, manuals, and likely spares.</span></div>
        <p className="assistant-disclaimer">Recommendations are decision support. Confirm isolation procedures and the approved machine manual before work begins.</p>
      </aside>
    </section>
  </div></AppShell>;
}
