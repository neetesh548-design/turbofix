import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Laptop,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sun,
  Moon,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Zap,
  Phone,
  Bot
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { useLanguage } from '../LanguageContext';

const DEVICES = [
  {
    id: 'mobile',
    label: 'Field Mobile',
    sublabel: 'iPhone 15 Pro (390 x 780)',
    icon: Smartphone,
    width: 390,
    height: 780,
    borderRadius: '40px',
    role: 'Shopfloor Operator & Field Technician',
    roleTag: 'QR Scan & Instant Dispatch',
    defaultPage: '/report-breakdown.html'
  },
  {
    id: 'tablet',
    label: 'Supervisor Tablet',
    sublabel: 'iPad Air (820 x 680)',
    icon: Tablet,
    width: 820,
    height: 680,
    borderRadius: '26px',
    role: 'Maintenance Head & Shift Lead',
    roleTag: 'Work Approval & RCA 5-Why',
    defaultPage: '/technician.html'
  },
  {
    id: 'laptop',
    label: 'Control Room Laptop',
    sublabel: 'MacBook Pro 14" (1100 x 650)',
    icon: Laptop,
    width: 1100,
    height: 650,
    borderRadius: '16px',
    role: 'Plant Reliability Engineer',
    roleTag: 'MTBF / MTTR & AI Records Vault',
    defaultPage: '/dashboard.html'
  },
  {
    id: 'desktop',
    label: '4K Control Monitor',
    sublabel: 'Studio Display (1380 x 720)',
    icon: Monitor,
    width: 1380,
    height: 720,
    borderRadius: '12px',
    role: 'Plant Owner & General Manager',
    roleTag: 'Executive Control & Cost Analytics',
    defaultPage: '/dashboard.html'
  }
];

const PREVIEW_PAGES = [
  { id: 'dashboard', label: 'Executive Control Board', path: '/dashboard.html', category: 'Executive' },
  { id: 'breakdown', label: '10s QR Breakdown Gateway', path: '/report-breakdown.html', category: 'Shopfloor' },
  { id: 'technician', label: 'Technician Field Repair', path: '/technician.html', category: 'Field Work' },
  { id: 'records', label: 'AI Records & History Vault', path: '/records.html', category: 'Intelligence' },
  { id: 'machines', label: 'Machines & Fleet Register', path: '/machines.html', category: 'Fleet' },
  { id: 'inventory', label: 'Spare Parts & Inventory', path: '/inventory.html', category: 'Spares' },
  { id: 'shutdown', label: 'Shutdown & Overhaul Planner', path: '/shutdown-planner.html', category: 'Planning' }
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: '10-Sec QR Scan',
    role: 'Operator (Mobile)',
    desc: 'Operator scans QR code on failing machine. No app download required.',
    color: '#10b981',
    pageId: 'breakdown',
    deviceId: 'mobile'
  },
  {
    step: '02',
    title: 'Instant WhatsApp Routing',
    role: 'Technician (Mobile/Tablet)',
    desc: 'Duty technician gets automated WhatsApp alert with machine location & voice clip.',
    color: '#0284c7',
    pageId: 'technician',
    deviceId: 'mobile'
  },
  {
    step: '03',
    title: 'AI 5-Why & Manual Lookup',
    role: 'Maintenance Head (Tablet)',
    desc: 'Technician views AI diagnostic hints and OCR digitized legacy manual history.',
    color: '#8b5cf6',
    pageId: 'records',
    deviceId: 'tablet'
  },
  {
    step: '04',
    title: 'Executive Downtime Sync',
    role: 'Plant Owner (Desktop)',
    desc: 'Plant owner monitors live MTBF/MTTR metrics and maintenance cost impact in real time.',
    color: '#f59e0b',
    pageId: 'dashboard',
    deviceId: 'desktop'
  }
];

export default function PlatformExperience() {
  const [viewMode, setViewMode] = useState('split'); // 'split' or 'focused'
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[2]);
  const [selectedPage, setSelectedPage] = useState(PREVIEW_PAGES[0]);
  const [themeMode, setThemeMode] = useState('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const [key, setKey] = useState(0);

  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

  useEffect(() => {
    document.title = 'TurboFix Platform — Interactive Multi-Device Experience';
  }, []);

  const getFrameUrl = (path) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  const handleSelectWorkflowStep = (index) => {
    setActiveWorkflowStep(index);
    const step = WORKFLOW_STEPS[index];
    const matchedPage = PREVIEW_PAGES.find((p) => p.id === step.pageId) || PREVIEW_PAGES[0];
    const matchedDevice = DEVICES.find((d) => d.id === step.deviceId) || DEVICES[0];
    setSelectedPage(matchedPage);
    setSelectedDevice(matchedDevice);
    setKey((k) => k + 1);
  };

  return (
    <MainLayout>
      <div className="platform-experience-page bg-slate-950 text-slate-100 min-h-screen pb-24">
        {/* Hidden Page Header Banner */}
        <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 py-10 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Standalone Hidden Showcase Suite
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Interactive Multi-Device Platform Experience
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mt-2">
                Simulate how operators, technicians, maintenance heads, and plant owners interact with TurboFix in real-time across phone, tablet, and desktop viewports.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/platform.html"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Public Platform Page
              </Link>
              <button
                type="button"
                onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all"
              >
                {themeMode === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {themeMode === 'light' ? 'Previewing Light Theme' : 'Previewing Dark Theme'}
              </button>
            </div>
          </div>
        </div>

        {/* Workflow Journey Stepper */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
          <div className="stitch-glass-tile p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
            <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-4">
              Real-World Plant User Journey
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {WORKFLOW_STEPS.map((s, idx) => {
                const isActive = activeWorkflowStep === idx;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleSelectWorkflowStep(idx)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                        Step {s.step}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">{s.role}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{s.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Multi-Device Interactive Studio Controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/90">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Layout:</span>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  viewMode === 'split'
                    ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                3-Device Multi-Screen Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('focused')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  viewMode === 'focused'
                    ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Single Focused Frame
              </button>
            </div>

            {/* Device Selector (Focused Mode) */}
            {viewMode === 'focused' && (
              <div className="flex flex-wrap items-center gap-2">
                {DEVICES.map((d) => {
                  const Icon = d.icon;
                  const active = selectedDevice.id === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDevice(d)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Route Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">App Module:</span>
              <select
                value={selectedPage.id}
                onChange={(e) => {
                  const page = PREVIEW_PAGES.find((p) => p.id === e.target.value);
                  if (page) {
                    setSelectedPage(page);
                    setKey((k) => k + 1);
                  }
                }}
                className="bg-slate-950 border border-slate-700 text-emerald-400 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
              >
                {PREVIEW_PAGES.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setKey((k) => k + 1)}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                title="Reload Device Frames"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Device Viewport Display Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
          {viewMode === 'split' ? (
            /* 3-Device Simultaneous Multi-Screen Split */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Mobile Device Frame */}
              <div className="lg:col-span-4 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Field Mobile</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    390 × 780
                  </span>
                </div>

                <div className="relative w-full max-w-[390px] h-[720px] rounded-[36px] border-[10px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden ring-1 ring-slate-700">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-b-xl z-30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-700" />
                  </div>
                  <iframe
                    key={`mobile-${key}-${themeMode}`}
                    src={`${getFrameUrl(PREVIEW_PAGES[1].path)}?theme=${themeMode}`}
                    title="Mobile View"
                    className="w-full h-full border-0 pt-4"
                  />
                </div>
                <div className="text-center mt-3">
                  <div className="text-xs font-bold text-slate-300">Shopfloor Operator & Field Tech</div>
                  <div className="text-[11px] text-slate-500">10-sec QR Report & WhatsApp Routing</div>
                </div>
              </div>

              {/* Tablet Device Frame */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <Tablet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Maintenance Supervisor Tablet</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    820 × 680
                  </span>
                </div>

                <div className="relative w-full h-[720px] rounded-[24px] border-[12px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden ring-1 ring-slate-700">
                  <iframe
                    key={`tablet-${key}-${themeMode}`}
                    src={`${getFrameUrl(selectedPage.path)}?theme=${themeMode}`}
                    title="Tablet View"
                    className="w-full h-full border-0"
                  />
                </div>
                <div className="text-center mt-3">
                  <div className="text-xs font-bold text-slate-300">Maintenance Head & Shift Lead</div>
                  <div className="text-[11px] text-slate-500">RCA 5-Why Approval & Spare Part Dispatch</div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Focused Frame Mode */
            <div className="flex flex-col items-center">
              <div className="w-full max-w-5xl flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <selectedDevice.icon className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-sm font-bold text-white">{selectedDevice.label}</span>
                    <span className="text-xs text-slate-400 block">{selectedDevice.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                    {selectedDevice.width}px × {selectedDevice.height}px
                  </span>
                  <a
                    href={getFrameUrl(selectedPage.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-bold"
                  >
                    Open Full Window <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div
                className="relative bg-slate-950 border-[12px] border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 ring-1 ring-slate-700 max-w-full"
                style={{
                  width: selectedDevice.width,
                  height: selectedDevice.height,
                  borderRadius: selectedDevice.borderRadius
                }}
              >
                <iframe
                  key={`focused-${key}-${themeMode}`}
                  src={`${getFrameUrl(selectedPage.path)}?theme=${themeMode}`}
                  title="Focused View"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi-Device Technical Feature Matrix */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-16">
          <div className="text-center mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Cross-Device Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
              Optimized Viewports for Every Factory Role
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stitch-glass-tile p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Mobile Phone Viewport</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Designed for 1-handed shopfloor operation. Touch targets ≥ 44px, instant camera QR scanning, voice-to-text audio recording, and automated WhatsApp alert triggers.
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>10-sec zero-app breakdown report</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Field technician repair checklist</span>
                </li>
              </ul>
            </div>

            <div className="stitch-glass-tile p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4">
                <Tablet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Tablet Viewport</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Designed for mobile plant supervisors during floor rounds. Interactive RCA 5-Why Ishikawa canvas, spare part checkouts, and shift handover sign-offs.
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>Root Cause Analysis 5-Why Canvas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>Technician work order verification</span>
                </li>
              </ul>
            </div>

            <div className="stitch-glass-tile p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Desktop & 4K Monitor</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Engineered for executive control rooms and plant managers. High-density MTBF, MTTR, RAV ratios, shutdown overhaul planning, and financial downtime analytics.
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Executive reliability control board</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Preventive overhaul Gantt planner</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
