import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { canViewWorkspace, roleContribution } from '@/lib/roles';
import {
  Sparkles, Mic, Square, X, Camera, Plus, Grid, LogOut,
  LayoutDashboard, Ticket, Cog, Package, Wrench, Lightbulb,
  MessageCircleQuestion, FileText, Power, LifeBuoy, Users, Settings,
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { ThemeProvider } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { enableKeyboardNavigation } from '@/utils/accessibility';
import { Tooltip } from '@/components/Tooltip';
import MicrosoftAppLauncher from '@/components/MicrosoftAppLauncher';
import { microphoneErrorMessage } from '@/utils/mediaErrors';
import { readAuth } from '@/utils/auth';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';

const BASE = import.meta.env.BASE_URL;

/**
 * The global "report a breakdown" entry point. It is a full page rather
 * than a modal: the logger needs the camera, the microphone and a
 * machine picker, and a sheet over whatever page you happened to be on
 * gave all three about a third of the screen on a phone. A page also
 * means the QR gateway can deep-link straight into it with ?machine=.
 */
const REPORT_BREAKDOWN_URL = BASE + 'report-breakdown.html';

function getLiveDataAnswer(machines = [], tickets = [], events = [], selectedMachineId) {
  const safeMachines = machines || [];
  const safeTickets = tickets || [];
  const safeEvents = events || [];

  const visibleMachineIds = new Set(safeMachines.map(m => m.machine_id));
  const openTickets = safeTickets.filter(t => String(t.status || 'Open').toLowerCase() === 'open' && visibleMachineIds.has(t.machine_id));
  
  if (selectedMachineId && selectedMachineId !== 'all') {
    const machine = safeMachines.find(m => m.machine_id === selectedMachineId);
    if (!machine) return 'Machine not found.';
    const machineOpen = openTickets.filter(t => t.machine_id === selectedMachineId);
    const machineEvents = safeEvents.filter(e => e.machine_id === selectedMachineId);
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
    return `All ${safeMachines.length} machines are currently clear with no open maintenance tickets.`;
  }
  const sorted = [...openTickets].sort((a, b) => {
    const urgencyMap = { critical: 0, high: 1, medium: 2, low: 3 };
    const aVal = urgencyMap[String(a.urgency || '').toLowerCase()] ?? 4;
    const bVal = urgencyMap[String(b.urgency || '').toLowerCase()] ?? 4;
    return aVal - bVal;
  });
  const top = sorted[0];
  const machineObj = safeMachines.find(m => m.machine_id === top.machine_id);
  const machineName = machineObj ? `${machineObj.machine_name} [${machineObj.machine_id.slice(0, 8)}]` : (top.machine_id ? top.machine_id.slice(0, 8) : 'Machine');
  const urgencyStr = top.urgency ? `${top.urgency} urgency` : 'unrated urgency';
  return `Hey friend, plant-wide view shows ${openTickets.length} open ticket(s) across ${safeMachines.length} machines. Prioritize ${machineName}: ${top.issue_text || top.description || 'maintenance issue'} (${urgencyStr}).`;
}

/* Frequency-Driven Navigation Matrix (Pillars 1-9 & Minimal Effort Plan) */
const NAV_LIVE = [
  { id: 'overview', label: 'Dashboard', href: BASE + 'dashboard.html', Icon: LayoutDashboard },
  { id: 'tickets', label: 'Tickets', href: BASE + 'tickets.html', Icon: Ticket },
  { id: 'machines', label: 'Machines', href: BASE + 'machines.html', Icon: Cog },
  { id: 'inventory', label: 'Inventory', href: BASE + 'inventory.html', Icon: Package },
  { id: 'technician', label: 'Technician', href: BASE + 'technician.html', Icon: Wrench },
  { id: 'kaizen', label: 'Kaizen', href: BASE + 'kaizen.html', Icon: Lightbulb },
  { id: 'assistant', label: 'Maintenance Help', href: BASE + 'assistant.html', Icon: MessageCircleQuestion },
  { id: 'records', label: 'Work Records', href: BASE + 'records.html', Icon: FileText },
  { id: 'shutdown', label: 'Shutdown Planner', href: BASE + 'shutdown-planner.html', Icon: Power },
  { id: 'support', label: 'Support & Decisions', href: BASE + 'support.html', Icon: LifeBuoy },
  { id: 'team', label: 'Team', href: BASE + 'team.html', Icon: Users },
  { id: 'settings', label: 'Settings', href: BASE + 'settings.html', Icon: Settings },
];

export default function AppShell({ children, active }) {
  const [{ authed, user }, setAuth] = useState(readAuth);
  const [railOpen, setRailOpen] = useState(false);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);

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
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    () => (machines || []).find((machine) => machine.machine_id === selected),
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
      const { data, error: fnError } = await supabase.functions.invoke('ai_translation', {
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
      setSidebarError(microphoneErrorMessage());
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
    } catch (err) {
      setListening(false);
      setSidebarError(microphoneErrorMessage(err));
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
    window.location.href = BASE + 'login.html';
  };

  // Pre-auth: protected pages redirect to login; vault/bare pages render children.
  if (!authed) {
    if (active && active !== 'vault') {
      window.location.href = BASE + 'login.html';
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
        <div className={`app-shell${railOpen ? ' rail-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {railOpen && <div className="app-scrim" onClick={() => setRailOpen(false)} />}

      <div className="app-body">
        <header className="app-topbar flex items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="ms-waffle-btn p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50"
              onClick={() => setAppLauncherOpen(true)}
              aria-label="Open Microsoft-style App Launcher"
              title="TurboFix Workspace Apps (Microsoft Waffle Menu)"
            >
              <Grid className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">Apps</span>
            </button>

            <a href={BASE} className="app-topbar-brand flex items-center gap-2" aria-label="TurboFix home">
              <span className="app-logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" /></svg>
              </span>
              <span className="app-brand-name font-bold tracking-tight"><b>TURBO</b>FIX</span>
            </a>

            {/* Current Active Workspace Indicator Pill */}
            {active && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium border border-teal-500/20">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="capitalize">{active.replace('-', ' ')}</span>
              </div>
            )}
          </div>

          <div className="app-company hidden lg:flex items-center gap-2">
            <span className="app-company-name text-xs text-slate-500 dark:text-slate-400 font-medium">{company}</span>
            <span className="app-live text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {user?.inventory_mode === 'demo' ? 'Demo' : 'Live'}
            </span>
          </div>

          <div className="app-topbar-right flex items-center gap-2 sm:gap-3">
            <a
              href={REPORT_BREAKDOWN_URL}
              className="app-quick-report-btn"
              title="Report Breakdown / Ticket"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={16} />
              <span>Report Issue</span>
            </a>
            <ThemeToggle />
            {roleLabel && <span className="app-role-badge" title={roleContribution(user?.role)}>{roleLabel}</span>}
            <div className="app-user flex items-center gap-2" title={user?.name || ''}>
              <span className="app-avatar">{initial}</span>
              <span className="app-user-name hidden xl:inline text-xs font-semibold">{user?.name || 'Staff'}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <MicrosoftAppLauncher
          open={appLauncherOpen}
          onClose={() => setAppLauncherOpen(false)}
          active={active}
          onOpenQuickReport={() => { window.location.href = REPORT_BREAKDOWN_URL; }}
        />

        <main className="app-content" id="main-content" tabIndex="-1">{workspaceAllowed ? children : <div className="role-view-message"><strong>This workspace is not part of your role view.</strong><span>{roleContribution(user?.role)}</span><a href={BASE + 'support.html'}>Open your Support &amp; Decisions view</a></div>}</main>

        {/* Mobile Bottom Navigation Bar (Top 4 High-Frequency Pages) - Role-Filtered */}
        <nav className="app-bottom-nav" aria-label="Mobile navigation">
          {NAV_LIVE.filter((item) => canViewWorkspace(user?.role, item.id)).slice(0, 4).map((item) => {
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`app-bottom-nav-item${isActive ? ' active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="app-bottom-nav-icon"><item.Icon size={19} strokeWidth={isActive ? 2.4 : 2} /></span>
                <span className="app-bottom-nav-label">{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Persistent Floating AI Assistant Trigger */}
      <button
        type="button"
        className={`app-sidebar-trigger${sidebarOpen ? ' active' : ''}`}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label="Open maintenance help"
      >
        <Sparkles size={20} />
        <span>Ask AI</span>
      </button>

      {/* Slide-out Sidebar Panel */}
      <aside className={`app-sidebar-panel${sidebarOpen ? ' open' : ''}${seniorMode ? ' senior-text' : ''}`}>
        <header className="app-sidebar-header">
          <div className="app-sidebar-title">
            <Sparkles className="glow-icon" size={18} />
            <span>Maintenance Help</span>
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
      
      {/* Help Widget */}
      <Tooltip content="Need help? Click for keyboard shortcuts & tour." position="top" delay={0}>
        <button
          className="app-help-trigger"
          style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 100, width: '36px', height: '36px', borderRadius: '50%', background: '#334155', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontFamily: 'monospace', fontWeight: 'bold' }}
          onClick={() => setShowShortcuts(true)}
          aria-label="Keyboard shortcuts and help"
        >
          ?
        </button>
      </Tooltip>

      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
