import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { canViewWorkspace, roleContribution } from '@/lib/roles';
import { Sparkles, Mic, Square, X, Camera } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { ThemeProvider } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PerformanceMetrics } from '@/hooks/usePerformanceMonitor';
import { enableKeyboardNavigation } from '@/utils/accessibility';

/**
 * AppShell — the unified authenticated layout (Redesign P1).
 * Persistent left rail + top bar wrapping Dashboard & Vault.
 * Auth-aware: pre-auth it renders children bare (login/register);
 * once a valid token exists it renders the full shell chrome.
 */

const BASE = import.meta.env.BASE_URL;

function getLiveDataAnswer(machines, tickets, events, selectedMachineId) {
  const visibleMachineIds = new Set(machines.map(m => m.machine_id));
  const openTickets = tickets.filter(t => String(t.status || 'Open').toLowerCase() === 'open' && visibleMachineIds.has(t.machine_id));
  
  if (selectedMachineId && selectedMachineId !== 'all') {
    const machine = machines.find(m => m.machine_id === selectedMachineId);
    if (!machine) return 'Machine not found.';
    const machineOpen = openTickets.filter(t => t.machine_id === selectedMachineId);
    const machineEvents = events.filter(e => e.machine_id === selectedMachineId);
    const machineLabel = `${machine.machine_name} [${machine.machine_id.slice(0, 8)}]`;
    if (machineOpen.length === 0) {
      return `${machineLabel} has no open maintenance tickets. TurboFix found ${machineEvents.length} recorded events. Primary technician: ${machine.primary_technician_name || 'not assigned'}.`;
    }
    const sorted = [...machineOpen].sort((a, b) => {
      const urgencyMap = { critical: 0, high: 1, medium: 2, low: 3 };
      const aVal = urgencyMap[String(a.urgency || '').toLowerCase()] ?? 4;
      const bVal = urgencyMap[String(b.urgency || '').toLowerCase()] ?? 4;
      return aVal - bVal;
    });
    const top = sorted[0];
    const urgencyStr = top.urgency ? `${top.urgency} urgency` : 'unrated urgency';
    return `Hey friend, ${machineLabel} has ${machineOpen.length} open ticket(s). Primary technician: ${machine.primary_technician_name || 'not assigned'}. Start with ${top.id ? top.id.slice(0, 8) : 'ticket'}: ${top.issue_text || top.description || 'maintenance issue'} (${urgencyStr}).`;
  }
  
  if (openTickets.length === 0) {
    return `All ${machines.length} machines are currently clear with no open maintenance tickets.`;
  }
  const sorted = [...openTickets].sort((a, b) => {
    const urgencyMap = { critical: 0, high: 1, medium: 2, low: 3 };
    const aVal = urgencyMap[String(a.urgency || '').toLowerCase()] ?? 4;
    const bVal = urgencyMap[String(b.urgency || '').toLowerCase()] ?? 4;
    return aVal - bVal;
  });
  const top = sorted[0];
  const machineObj = machines.find(m => m.machine_id === top.machine_id);
  const machineName = machineObj ? `${machineObj.machine_name} [${machineObj.machine_id.slice(0, 8)}]` : (top.machine_id ? top.machine_id.slice(0, 8) : 'Machine');
  const urgencyStr = top.urgency ? `${top.urgency} urgency` : 'unrated urgency';
  return `Hey friend, plant-wide view shows ${openTickets.length} open ticket(s) across ${machines.length} machines. Prioritize ${machineName}: ${top.issue_text || top.description || 'maintenance issue'} (${urgencyStr}).`;
}

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return false;
  }
}

function readAuth() {
  const token = localStorage.getItem('tf_token');
  if (!token || isTokenExpired(token)) return { authed: false, user: null };
  let user = null;
  try { user = JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch {}
  return { authed: true, user };
}
const NAV_LIVE = [
  { id: 'overview', label: 'Overview', href: BASE + 'dashboard.html', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { id: 'machines', label: 'Machines', href: BASE + 'machines.html', icon: 'M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z' },
  { id: 'records', label: 'AI Records', href: BASE + 'records.html', icon: 'M4 3h12l4 4v14H4V3zm11 1v4h4M8 12h8M8 16h6M8 8h3' },
  { id: 'tickets', label: 'Tickets', href: BASE + 'tickets.html', icon: 'M4 5h16v5a2 2 0 000 4v5H4v-5a2 2 0 000-4V5z' },
  { id: 'assistant', label: 'AI Assistant', href: BASE + 'assistant.html', icon: 'M12 2a7 7 0 017 7v2a7 7 0 01-5 6.7V21H10v-3.3A7 7 0 015 11V9a7 7 0 017-7zm-3 20h6' },
  { id: 'shutdown', label: 'Shutdown Planner', href: BASE + 'shutdown-planner.html', icon: 'M12 3v9l6 3M12 21a9 9 0 100-18 9 9 0 000 18z' },
  { id: 'technician', label: 'Technician', href: BASE + 'technician.html', icon: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 002.4-8.4z' },
  { id: 'support', label: 'Support & Decisions', href: BASE + 'support.html', icon: 'M12 22a10 10 0 110-20 10 10 0 010 20zm-1-6h2v2h-2v-2zm1-10a4 4 0 00-4 4h2a2 2 0 114 0c0 2-3 2-3 5h2c0-2 3-2 3-5a4 4 0 00-4-4z' },
  { id: 'team', label: 'Team', href: BASE + 'team.html', icon: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zm-8 2a6 6 0 00-6 6v1h20v-1a6 6 0 00-6-6H8z' },
  { id: 'settings', label: 'Settings', href: BASE + 'settings.html', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2 3 .5 3-3 .5L14 24l-2-2-2 2-2.5-2-3-.5.5-3-2-3 2-3-.5-3 3-.5L10 0l2 2 2-2 2.5 2 3 .5-.5 3 2 3z' },
];

const NAV_SOON = [];

export default function AppShell({ children, active }) {
  const [{ authed, user }, setAuth] = useState(readAuth);
  const [railOpen, setRailOpen] = useState(false);

  const refresh = useCallback(() => setAuth(readAuth()), []);

  useEffect(() => {
    window.addEventListener('authChanged', refresh);
    window.addEventListener('storage', refresh);
    enableKeyboardNavigation();

    return () => {
      window.removeEventListener('authChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  // Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [machines, setMachines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState('all');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerSource, setAnswerSource] = useState('');
  const [contextFiles, setContextFiles] = useState([]);
  const [_retrieval, setRetrieval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [listening, setListening] = useState(false);
  const [_transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [seniorMode, setSeniorMode] = useState(() => localStorage.getItem('tf_senior_mode') === 'true');

  const toggleSeniorMode = () => {
    setSeniorMode((prev) => {
      const next = !prev;
      localStorage.setItem('tf_senior_mode', String(next));
      return next;
    });
  };

  // Fetch only when sidebar is opened
  useEffect(() => {
    if (!sidebarOpen || !authed) return;
    Promise.all([
      supabase.from('machines').select('id,name,location,status,image_url'),
      supabase.from('tickets').select('*'),
      supabase.from('events').select('*'),
      supabase.functions.invoke('onboard_team_member', { body: { action: 'list' } }),
    ]).then(([mRes, tRes, eRes, directoryRes]) => {
      const members = directoryRes.data?.members || [];
      const memberNames = Object.fromEntries(members.map((member) => [member.user_id, member.name]));
      const assignments = directoryRes.data?.machine_assignments || {};
      const roleAssignmentKey = {
        maintenance_technician: 'technician_user_id',
        technician: 'technician_user_id',
        supervisor: 'supervisor_id',
        maintenance_engineer: 'engineer_user_id',
        maintenance_head: 'maintenance_head_user_id',
      }[user?.role];
      const mapped = (mRes.data || []).map(m => ({
        machine_id: m.id, machine_name: m.name, location: m.location, image_url: m.image_url,
        primary_technician_name: memberNames[assignments[m.id]?.technician_user_id] || '',
      }));
      const visibleMachines = roleAssignmentKey
        ? mapped.filter(m => String(assignments[m.machine_id]?.[roleAssignmentKey] || '') === String(user?.user_id || ''))
        : mapped;
      setMachines(visibleMachines);
      setTickets(tRes.data || []);
      setEvents(eRes.data || []);
    }).catch(() => {
      setMachines([]);
      setTickets([]);
      setEvents([]);
    });
  }, [sidebarOpen, authed, user]);

  useEffect(() => {
    if (selected !== 'all' && machines.length > 0 && !machines.some((machine) => machine.machine_id === selected)) {
      setSelected('all');
    }
  }, [machines, selected]);

  // Sync selected scope with URL machine parameters
  useEffect(() => {
    if (!authed) return;
    const queryParams = new URLSearchParams(window.location.search);
    const queryMachineId = queryParams.get('machine') || queryParams.get('machine_id');
    if (queryMachineId) {
      setSelected(queryMachineId);
    } else {
      setSelected('all');
    }
  }, [authed, sidebarOpen]);

  const _selectedMachine = useMemo(
    () => machines.find((machine) => machine.machine_id === selected),
    [machines, selected]
  );
  const isPlantWide = selected === 'all';
  const suggestions = isPlantWide ? [
    'Which machines require attention today?',
    'What should we prioritize before the next shutdown?',
    'Which open issue has the highest production risk?',
  ] : [
    'What should the technician check first?',
    'What spare parts should we prepare?',
    'Summarize this machine’s recent history.',
  ];

  const clearResult = () => {
    setAnswer('');
    setAnswerSource('');
    setContextFiles([]);
    setRetrieval(null);
    setSidebarError('');
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
    if (!file.type.startsWith('image/')) { setSidebarError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setSidebarError('Photo must be under 5 MB.'); return; }
    setSidebarError('');
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const removeImage = () => setImagePreview('');

  const transcribeAudio = async (blob) => {
    setTranscribing(true);
    setSidebarError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error: fnError } = await supabase.functions.invoke('ai_assistant', {
        body: { action: 'transcribe', audio: dataUrl },
      });
      if (fnError || !data || data.error) throw new Error(data?.error || fnError?.message || 'Transcription failed.');
      const transcript = String(data.transcript || '').trim();
      if (!transcript) { setSidebarError('No speech was detected. Please try again.'); return; }
      setQuestion((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      setAnswer('');
    } catch (err) {
      setSidebarError(err.message || 'Could not transcribe the recording.');
    } finally {
      setTranscribing(false);
    }
  };

  const toggleVoice = async () => {
    if (listening) { recorderRef.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setSidebarError('Voice recording is not supported.');
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
      setSidebarError('');
      setListening(true);
      recorder.start();
    } catch (_err) {
      setListening(false);
      setSidebarError('Microphone not available.');
    }
  };

  const ask = async (event) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    if (listening) recorderRef.current?.stop();

    setLoading(true);
    setSidebarError('');
    setAnswer('');
    setAnswerSource('');
    setRetrieval(null);
    
    try {
      const friendlyInstruction = "[SYSTEM INSTRUCTION: Answer in a very warm, friendly, simple, conversational style like a close work friend or peer helper. Address the user directly, keep text extremely readable and structured, and explain any complex terms simply. Include machine IDs next to machine names whenever you refer to them.]\n\n";
      const { data, error: functionError } = await supabase.functions.invoke('ai_assistant', {
        body: { selected, question: friendlyInstruction + trimmedQuestion, ...(imagePreview ? { image: imagePreview } : {}) }
      });
      
      if (functionError || !data || data.error) {
        throw new Error(functionError?.message || data?.error || 'Failed to get recommendation from AI');
      }
      
      setAnswer(data.recommendation);
      setAnswerSource('ai');
      setContextFiles(data.context_files || []);
      setRetrieval(data.retrieval || null);
    } catch (requestError) {
      console.warn("AI Assistant edge function failed, falling back to local summary:", requestError);
      try {
        const liveAnswer = getLiveDataAnswer(machines, tickets, events, selected);
        setAnswer(liveAnswer);
        setAnswerSource('live_data');
      } catch (_fallbackError) {
        setSidebarError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.dispatchEvent(new Event('authChanged'));
    window.location.href = BASE + 'vault.html';
  };

  // Pre-auth: protected pages redirect to login; vault/bare pages render children.
  if (!authed) {
    if (active && active !== 'vault') {
      window.location.href = BASE + 'vault.html';
      return null;
    }
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <div className="app-bare">{children}</div>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  const roleLabel = user?.role
    ? user.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';
  const company = user?.company_name || user?.company_code || 'TurboFix';
  const initial = (user?.name || 'S').charAt(0).toUpperCase();
  const workspaceAllowed = !active || active === 'vault' || canViewWorkspace(user?.role, active);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <OfflineIndicator />
        <PerformanceMetrics show={false} />
        <div className={`app-shell${railOpen ? ' rail-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {railOpen && <div className="app-scrim" onClick={() => setRailOpen(false)} />}

      <div className="app-body">
        <header className="app-topbar">
          <a href={BASE} className="app-topbar-brand" aria-label="TurboFix home">
            <span className="app-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" /></svg>
            </span>
            <span className="app-brand-name"><b>TURBO</b>FIX</span>
          </a>

          <div className="app-company">
            <span className="app-company-name">{company}</span>
            <span className="app-live"><span className="app-live-dot" />Live</span>
          </div>
          <div className="app-topbar-right">
            <ThemeToggle />
            {roleLabel && <span className="app-role-badge" title={roleContribution(user?.role)}>{roleLabel}</span>}
            <div className="app-user" title={user?.name || ''}>
              <span className="app-avatar">{initial}</span>
              <span className="app-user-name">{user?.name || 'Staff'}</span>
            </div>
          </div>
        </header>

        <nav className="app-h-nav" aria-label="Main navigation">
          {NAV_LIVE.filter((item) => canViewWorkspace(user?.role, item.id)).map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`app-h-nav-item${active === item.id ? ' active' : ''}`}
            >
              <svg className="nav-ic" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={item.icon} /></svg>
              <span>{item.label}</span>
            </a>
          ))}
          <button type="button" className="app-h-nav-logout" onClick={logout} title="Log out">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /></svg>
            <span>Log out</span>
          </button>
        </nav>

        <div className="app-content" id="main-content" tabIndex="-1">{workspaceAllowed ? children : <div className="role-view-message"><strong>This workspace is not part of your role view.</strong><span>{roleContribution(user?.role)}</span><a href={BASE + 'support.html'}>Open your Support &amp; Decisions view</a></div>}</div>
      </div>

      {/* Persistent Floating AI Assistant Trigger */}
      <button
        type="button"
        className={`app-sidebar-trigger${sidebarOpen ? ' active' : ''}`}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label="Open AI Assistant"
      >
        <Sparkles size={20} />
        <span>Ask AI</span>
      </button>

      {/* Slide-out Sidebar Panel */}
      <aside className={`app-sidebar-panel${sidebarOpen ? ' open' : ''}${seniorMode ? ' senior-text' : ''}`}>
        <header className="app-sidebar-header">
          <div className="app-sidebar-title">
            <Sparkles className="glow-icon" size={18} />
            <span>AI Assistant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={toggleSeniorMode}
              style={{
                background: seniorMode ? 'var(--brand)' : 'transparent',
                color: seniorMode ? '#000' : 'var(--slate)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Toggle Large Text Mode"
            >
              Aa (Large Text)
            </button>
            <button type="button" className="app-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close assistant">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="app-sidebar-body">
          <div className="app-sidebar-scope-selector">
            <label>
              <span>Scope</span>
              <select value={selected} onChange={changeScope}>
                <option value="all">All machines — plant-wide</option>
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>{m.machine_name} [{m.machine_id.slice(0, 8)}]</option>
                ))}
              </select>
            </label>
          </div>

          <div className="app-sidebar-suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => changeQuestion(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>

          <form onSubmit={ask} className="app-sidebar-chat-form">
            <textarea
              value={question}
              onChange={(e) => changeQuestion(e.target.value)}
              placeholder={isPlantWide ? 'For example: Which machines should we service this weekend?' : 'For example: What should the technician check first?'}
              rows={3}
            />
            <div className="app-sidebar-input-row">
              <div style={{ display: 'flex', gap: '8px' }}>
                <label className="sidebar-tool-btn" title="Attach photo" style={{ cursor: 'pointer', margin: 0 }}>
                  <Camera size={16} />
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) pickImage(e.target.files[0]); e.target.value = ''; }} />
                </label>
                <button type="button" className={`sidebar-tool-btn${listening ? ' recording' : ''}`} onClick={toggleVoice} title="Speak question">
                  {listening ? <Square size={16} /> : <Mic size={16} />}
                </button>
              </div>
              <button type="submit" className="app-sidebar-submit" disabled={loading || !question.trim()}>
                {loading ? 'Thinking…' : 'Ask'}
              </button>
            </div>
          </form>

          {imagePreview && (
            <div className="app-sidebar-preview">
              <img src={imagePreview} alt="Attached input preview" />
              <button type="button" onClick={removeImage} aria-label="Remove image"><X size={14} /></button>
            </div>
          )}

          {sidebarError && (
            <div className="app-sidebar-alert error" role="alert">
              {sidebarError}
            </div>
          )}

          {answer && (
            <div className="app-sidebar-response">
              <div className="response-header">
                {answerSource === 'ai' ? 'TurboFix Recommendation' : 'Live Maintenance Summary'}
              </div>
              <div className="response-text">{answer}</div>
              {contextFiles.length > 0 && (
                <div className="response-meta">
                  Context: {contextFiles.map((f) => f.file_name).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
