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

export default function Assistant() {
  const [machines, setMachines] = useState([]);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('machine_id') || 'all');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerSource, setAnswerSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('machines').select('id,name,location,status')
      .then(({ data }) => setMachines((data || []).map(m => ({ machine_id: m.id, machine_name: m.name, location: m.location }))))
      .catch(() => setMachines([]));
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
      throw new Error('The AI assistant backend is being migrated. This feature will be available soon.');
    } catch (requestError) {
      setError(requestError.message);
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
      <aside className="assistant-side"><div className="decision-card-kicker">How scope works</div><h2>Start broad, then focus</h2><div className="assistant-prompt"><strong>All machines</strong><span>Prioritize plant-wide risks, shutdown work, and open issues.</span></div><div className="assistant-prompt"><strong>One machine</strong><span>Diagnose symptoms, review history, manuals, and likely spares.</span></div><p className="assistant-disclaimer">Recommendations are decision support. Confirm isolation procedures and the approved machine manual before work begins.</p></aside>
    </section>
  </div></AppShell>;
}
