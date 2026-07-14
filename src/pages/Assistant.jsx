import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { apiFetch } from '@/lib/api';

const suggestions = ['Which machines require attention today?', 'Which machine is most likely to fail?', 'Why is this machine overheating?', 'Show me the manual for this machine.'];

export default function Assistant() {
  const [machines, setMachines] = useState([]);
  const [selected, setSelected] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { apiFetch('/vault/machines').then((r) => r.ok ? r.json() : []).then(setMachines).catch(() => setMachines([])); }, []);

  const ask = async (event) => {
    event?.preventDefault();
    if (!question.trim()) return;
    setLoading(true); setError(''); setAnswer('');
    try {
      if (!selected) {
        setAnswer('Select a machine when your question is machine-specific. For a plant-wide answer, use the Decision Center and Priority Queue.');
      } else {
        const response = await apiFetch(`/vault/machines/${encodeURIComponent(selected)}/root-cause`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'The AI service is unavailable');
        setAnswer(result.analysis || 'No recommendation was returned for this machine.');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return <AppShell active="assistant"><div className="assistant-page">
    <div className="decision-heading"><div><span className="eyebrow eyebrow-light">TurboFix intelligence</span><h1>AI Maintenance Assistant</h1><p>Ask questions in plain language and turn machine history into a next action.</p></div><a className="btn btn-ghost btn-sm" href="shutdown-planner.html">Open shutdown planner</a></div>
    <section className="assistant-layout">
      <div className="assistant-chat">
        <div className="assistant-orb">✦</div><h2>What do you need to decide?</h2><p className="assistant-helper">Choose a machine for diagnostic questions, then ask anything about its recent history.</p>
        <div className="assistant-suggestions">{suggestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>)}</div>
        <form onSubmit={ask} className="assistant-form"><select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Select a machine</option>{machines.map((machine) => <option key={machine.machine_id} value={machine.machine_id}>{machine.machine_name} · {machine.machine_id}</option>)}</select><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a maintenance question…" rows="4" /><button className="btn btn-primary" disabled={loading}>{loading ? 'Analyzing…' : 'Get recommendation'}</button></form>
        {error && <div className="decision-alert">{error}</div>}{answer && <div className="assistant-answer"><div className="decision-card-kicker">AI recommendation</div><p>{answer}</p></div>}
      </div>
      <aside className="assistant-side"><div className="decision-card-kicker">Useful prompts</div><h2>Make the next call faster</h2><div className="assistant-prompt"><strong>Diagnose</strong><span>“What should the technician check first?”</span></div><div className="assistant-prompt"><strong>Plan</strong><span>“What spare parts should we prepare?”</span></div><div className="assistant-prompt"><strong>Prioritize</strong><span>“Which issue has the highest production risk?”</span></div><p className="assistant-disclaimer">AI recommendations are decision support. Confirm safety procedures and machine manuals before work begins.</p></aside>
    </section>
  </div></AppShell>;
}
