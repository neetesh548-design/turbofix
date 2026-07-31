import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { canViewWorkspace, roleContribution } from '@/lib/roles';
import {
  Sparkles, Mic, Square, X, Camera, Plus, Grid, LogOut, Search,
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { ThemeProvider } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { enableKeyboardNavigation } from '@/utils/accessibility';
import { Tooltip } from '@/components/Tooltip';
import MicrosoftAppLauncher from '@/components/MicrosoftAppLauncher';
import { microphoneErrorMessage } from '@/utils/mediaErrors';
import { readAuth, safeRedirectPath } from '@/utils/auth';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { visibleAppNavItems } from '@/lib/navigation';

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

export default function AppShell({ children, active }) {
  const [{ authed, user }, setAuth] = useState(readAuth);
  const [railOpen, setRailOpen] = useState(false);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (event.key === '/' && !isTyping && !searchOpen) {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) setSearchQuery('');
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    const items = visibleAppNavItems(user?.role) || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 6);
    return items.filter((item) => item.label.toLowerCase().includes(q) || (item.desc || '').toLowerCase().includes(q));
  }, [searchQuery, user?.role]);

  const goToSearchResult = (href) => {
    setSearchOpen(false);
    window.location.href = href;
  };

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
  const [quotaInfo, setQuotaInfo] = useState(null);

  useEffect(() => {
    if (!authed || !user?.company_code || user?.inventory_mode === 'demo') return;
    const checkQuota = async () => {
      try {
        const compRes = await supabase
          .from('companies')
          .select('id,machine_quota')
          .ilike('domain', user.company_code)
          .single();
        const mRes = compRes.data?.id
          ? await supabase.from('machines').select('id', { count: 'exact', head: true }).eq('company_id', compRes.data.id)
          : { count: 0 };
        const quota = compRes.data?.machine_quota ?? 5;
        const used = mRes.count ?? 0;
        if (used >= quota) {
          setQuotaInfo({ used, quota });
        } else {
          setQuotaInfo(null);
        }
      } catch (_err) {
        // Ignore fallback
      }
    };
    checkQuota();
  }, [authed, user?.company_code, user?.inventory_mode]);


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
      } catch {
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
      const currentTarget = window.location.pathname + window.location.search;
      if (currentTarget && !currentTarget.includes('login.html')) {
        const redirectTarget = safeRedirectPath(currentTarget, BASE);
        sessionStorage.setItem('tf_post_login_redirect', redirectTarget);
        window.location.href = `${BASE}login.html?redirect=${encodeURIComponent(redirectTarget)}`;
      } else {
        window.location.href = BASE + 'login.html';
      }
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
        <PwaInstallBanner />
        <div className={`app-shell${railOpen ? ' rail-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {railOpen && <div className="app-scrim" onClick={() => setRailOpen(false)} />}

      <div className="app-body">
        <header className="app-topbar sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0b0f17]/95 backdrop-blur-xl border-b border-slate-800/90 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="ms-waffle-btn p-2 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-slate-800/80 transition-all cursor-pointer border border-transparent hover:border-slate-700/60"
              onClick={() => setAppLauncherOpen(true)}
              aria-label="Open Microsoft-style App Launcher"
              title="TurboFix Workspace Apps (Waffle Menu)"
            >
              <Grid className="w-5 h-5" />
            </button>

            <a href={BASE} className="app-topbar-brand flex items-center gap-2 flex-shrink-0" aria-label="TurboFix home">
              <span className="app-logo w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(80,255,171,0.2)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#50ffab" /></svg>
              </span>
              <span className="app-brand-name font-black tracking-tight text-white text-base"><b>TURBO</b><span className="text-[#50ffab]">FIX</span></span>
            </a>

            {/* Current Active Workspace Indicator Pill */}
            {active && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-500/30 flex-shrink-0 shadow-sm">
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#50ffab] animate-pulse shadow-[0_0_8px_#50ffab]" />
                <span className="capitalize">{active.replace('-', ' ')}</span>
              </div>
            )}
          </div>

          {/* Search trigger — opens command-style search overlay */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 flex-1 max-w-sm mx-2 px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-400 text-xs hover:border-emerald-500/50 hover:text-slate-200 transition-all cursor-pointer shadow-inner"
            aria-label="Search workspace"
          >
            <Search size={15} className="flex-shrink-0 text-[#50ffab]" />
            <span className="truncate">Search machines, tickets, work orders…</span>
            <kbd className="ml-auto flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 text-slate-400">/</kbd>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            aria-label="Search workspace"
          >
            <Search size={18} />
          </button>

          {/* User Profile & Quick Action Buttons */}
          <div className="app-topbar-right flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <a
              href={REPORT_BREAKDOWN_URL}
              className="app-quick-report-btn inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-950/50 hover:scale-[1.02]"
              title="Report Breakdown / Ticket"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>Report Issue</span>
            </a>
            <ThemeToggle />
            {roleLabel && <span className="app-role-badge hidden sm:inline-block font-bold text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-300 border border-slate-700/80" title={roleContribution(user?.role)}>{roleLabel}</span>}
            <div className="app-user flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-900/60 border border-slate-800/80" title={user?.name || ''}>
              <span className="app-avatar bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 w-7 h-7 rounded-lg flex items-center justify-center text-xs">{initial}</span>
              <span className="app-user-name hidden xl:inline text-xs font-bold text-slate-200">{user?.name || 'Staff'}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-800/40 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* Ultra-Clean Stitch Obsidian Module Tab Bar */}
        <nav className="bg-[#0e121a]/95 border-b border-slate-800/90 px-4 py-1.5 overflow-x-auto flex items-center gap-1.5 scrollbar-none text-xs font-semibold backdrop-blur-xl sticky top-[53px] z-30 shadow-md">
          {visibleAppNavItems(user?.role).map((item) => {
            const Icon = item.Icon;
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-[#50ffab] font-bold border border-emerald-500/40 shadow-sm shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#50ffab]' : 'text-slate-400'} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>


        {quotaInfo && quotaInfo.used >= quotaInfo.quota && (
          <div className="bg-amber-500/15 text-amber-900 dark:text-amber-200 border-b border-amber-500/30 px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-3 shadow-inner z-30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-ping" />
              <span><strong>Machine Limit Reached:</strong> Your company has onboarded <strong>{quotaInfo.used}</strong> of <strong>{quotaInfo.quota}</strong> permitted machines. Please contact your administrator to upgrade your plan.</span>
            </div>
            <a href="mailto:turbofixsolution@gmail.com" className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-900 dark:text-amber-100 font-bold transition-colors flex-shrink-0">
              Upgrade Plan
            </a>
          </div>
        )}

        {searchOpen && (

          <div
            className="fixed inset-0 z-[999] bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-sm flex items-start justify-center pt-20 sm:pt-28 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl px-4 py-3.5 border border-slate-200 dark:border-slate-700">
                <Search size={18} className="text-slate-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchResults[0]) goToSearchResult(searchResults[0].href);
                  }}
                  placeholder="Search machines, tickets, or a workspace page…"
                  className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer flex-shrink-0">
                  <X size={18} />
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {searchResults.map(({ id, label, desc, href, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => goToSearchResult(href)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 cursor-pointer"
                    >
                      {Icon && <Icon size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />}
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                        {desc && <span className="block text-xs text-slate-400 truncate">{desc}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
                  No workspace pages match "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        <MicrosoftAppLauncher
          open={appLauncherOpen}
          onClose={() => setAppLauncherOpen(false)}
          active={active}
          role={user?.role}
          onOpenQuickReport={() => { window.location.href = REPORT_BREAKDOWN_URL; }}
        />

        {/* Demo Mode Sticky Banner */}
        {user?.inventory_mode === 'demo' && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'sticky', top: 0, zIndex: 80,
              background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
              color: '#1c1917', padding: '7px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.01em',
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}
          >
            <span>🧪</span>
            <span>Demo Mode — all data below is sample data, not your plant.</span>
            <a
              href={BASE + 'login.html'}
              style={{ color: '#1c1917', textDecoration: 'underline', fontWeight: 700, marginLeft: 8 }}
            >
              Sign in with real account →
            </a>
          </div>
        )}
        <main className="app-content" id="main-content" tabIndex="-1">{workspaceAllowed ? children : <div className="role-view-message"><strong>This workspace is not part of your role view.</strong><span>{roleContribution(user?.role)}</span><a href={BASE + 'support.html'}>Open your Support &amp; Decisions view</a></div>}</main>

        {/* Mobile Bottom Navigation Bar (Top 4 High-Frequency Pages) - Role-Filtered */}
        <nav className="app-bottom-nav" aria-label="Mobile navigation">
          {visibleAppNavItems(user?.role).slice(0, 4).map((item) => {
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
                {answerSource === 'ai'
                ? '🤖 TurboFix AI Answer'
                : '⚡ Quick Answer (not AI — based on live ticket data)'}
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
