import React, { useState } from 'react';
import {
  QrCode,
  Mic,
  Camera,
  Send,
  CheckCircle,
  UserCheck,
  BarChart3,
  AlertTriangle,
  Clock,
  Wrench,
  ChevronRight,
  TrendingDown,
  Sparkles,
  ShieldAlert,
  Flame,
  Volume2,
  FileCheck,
} from 'lucide-react';

const TABS = [
  { id: 'report', label: 'Breakdown Report', icon: AlertTriangle, badge: 'NEW', badgeColor: 'rose' },
  { id: 'assign', label: 'Assign Technician', icon: UserCheck, badge: null },
  { id: 'verify', label: 'Verify & Close', icon: CheckCircle, badge: null },
  { id: 'history', label: 'Machine History', icon: BarChart3, badge: null },
];

const REAL_SCENARIOS = [
  {
    id: 'hyd-leak',
    label: '💧 Hydraulic Oil Leak',
    text: 'Hydraulic pressure dropped to 80 bar — oil puddle visible near main RAM cylinder seal.',
    urgency: 'CRITICAL',
    loss: '₹25,000 / hr',
  },
  {
    id: 'motor-temp',
    label: '🔥 Motor High Temp',
    text: 'Main spindle motor temperature > 88°C — thermal overload trip warning active.',
    urgency: 'HIGH',
    loss: '₹18,000 / hr',
  },
  {
    id: 'gear-knocking',
    label: '🔊 Gearbox Knocking',
    text: 'Unusual metallic rattling/knocking sound from Line 2 reduction gearbox during stroke.',
    urgency: 'HIGH',
    loss: '₹20,000 / hr',
  },
  {
    id: 'safety-trip',
    label: '🛑 Light Curtain Trip',
    text: 'Pneumatic die lock safety circuit tripped — sensor failure on safety guard panel.',
    urgency: 'MEDIUM',
    loss: '₹12,000 / hr',
  },
];

function ReportScreen({ onSwitchTab }) {
  const [selectedScenario, setSelectedScenario] = useState('hyd-leak');
  const [voiceText, setVoiceText] = useState(REAL_SCENARIOS[0].text);
  const [isRecording, setIsRecording] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoAttached, setPhotoAttached] = useState(true);

  const activeScenario = REAL_SCENARIOS.find((s) => s.id === selectedScenario) || REAL_SCENARIOS[0];

  const handleSelectScenario = (sc) => {
    setSelectedScenario(sc.id);
    setVoiceText(sc.text);
  };

  const simulateVoice = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setVoiceText('हाइड्रोलिक प्रेशर ड्रॉप हो रहा है — main cylinder lock seal se oil leak ho raha hai.');
    }, 1500);
  };

  return (
    <div className="ide-preview-screen">
      <div className="ide-screen-header">
        <div>
          <div className="flex items-center gap-2">
            <span className="ide-screen-kicker">QR Gateway · Shopfloor Action</span>
            <span className="ide-loss-ticker">
              <TrendingDown size={11} /> {activeScenario.loss} loss risk
            </span>
          </div>
          <h4 className="ide-screen-title">Hydraulic Press 250T — Line 2 (Pune Unit 1)</h4>
        </div>
        <span className={`ide-badge ${activeScenario.urgency === 'CRITICAL' ? 'ide-badge-rose' : 'ide-badge-amber'}`}>
          {activeScenario.urgency}
        </span>
      </div>

      {!submitted ? (
        <div className="ide-screen-body">
          {/* Quick Real Plant Scenario Selector */}
          <div>
            <label className="ide-form-label flex items-center justify-between mb-1">
              <span>Quick Plant Scenario Presets</span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles size={10} /> Auto-classified
              </span>
            </label>
            <div className="ide-presets-row">
              {REAL_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc)}
                  className={`ide-preset-chip ${selectedScenario === sc.id ? 'active' : ''}`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ide-form-group">
            <label className="ide-form-label">Issue Description (Hindi / English / Voice)</label>
            <div className="ide-textarea-wrap">
              <textarea
                rows={3}
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="बोलकर रिपोर्ट करें या यहाँ लिखें…"
                className="ide-textarea"
              />
              <button
                type="button"
                onClick={simulateVoice}
                className={`ide-voice-btn ${isRecording ? 'recording' : ''}`}
              >
                <Mic size={12} />
                <span>{isRecording ? 'Listening…' : 'Voice'}</span>
              </button>
            </div>
          </div>

          <div className="ide-attach-row cursor-pointer" onClick={() => setPhotoAttached(!photoAttached)}>
            <Camera size={13} className={photoAttached ? 'text-emerald-400' : ''} />
            <span>{photoAttached ? 'press_oil_leak_proof.jpg (Attached)' : 'Attach breakdown photo'}</span>
            <span className={`ide-badge ${photoAttached ? 'ide-badge-green' : 'ide-badge-sky'}`}>
              {photoAttached ? 'Photo Ready ✓' : 'Optional'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="ide-submit-btn"
          >
            <Send size={13} />
            Submit Breakdown Ticket — 10s Dispatch
          </button>
        </div>
      ) : (
        <div className="ide-screen-success">
          <div className="ide-success-icon"><CheckCircle size={28} /></div>
          <strong>Ticket #TF-9842 Created &amp; Dispatched</strong>
          <p className="text-slate-300 text-xs">
            WhatsApp alert sent to <strong>Ramesh Kumar (Hydraulics Lead)</strong> · SLA timer 15 min active
          </p>
          <div className="ide-sla-timer my-1">
            <Clock size={12} /> 14:58 min remaining for technician response
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="ide-submit-btn ide-submit-btn-emerald py-1 px-3"
              onClick={() => onSwitchTab('assign')}
            >
              View SLA Dispatch →
            </button>
            <button
              type="button"
              className="ide-reset-btn"
              onClick={() => { setSubmitted(false); setVoiceText(REAL_SCENARIOS[0].text); }}
            >
              Reset Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignScreen({ onSwitchTab }) {
  const [assignedTech, setAssignedTech] = useState('Ramesh Kumar');
  const [dispatched, setDispatched] = useState(true);

  const techs = [
    { name: 'Ramesh Kumar', shift: 'Shift A · Line 1-3', status: 'Available', skill: 'Hydraulics Lead', match: '96% Match', bay: 'Bay 3 (2 min away)' },
    { name: 'Sunil Patil', shift: 'Shift A · Line 4-6', status: 'On Job', skill: 'Electrical & PLC', match: '65% Match', bay: 'Bay 1' },
    { name: 'Amit Deshmukh', shift: 'Shift B · Maintenance', status: 'Available', skill: 'Mechanical Fitter', match: '82% Match', bay: 'Workshop' },
  ];

  return (
    <div className="ide-preview-screen">
      <div className="ide-screen-header">
        <div>
          <span className="ide-screen-kicker">Automated Dispatch · SLA Engine</span>
          <h4 className="ide-screen-title">Ticket #TF-9842 — Hydraulic Press 250T</h4>
        </div>
        <span className="ide-badge ide-badge-amber">Assigned to Ramesh K.</span>
      </div>
      <div className="ide-screen-body">
        <div className="space-y-2">
          {techs.map((tech) => (
            <div
              key={tech.name}
              onClick={() => setAssignedTech(tech.name)}
              className={`ide-tech-card cursor-pointer ${assignedTech === tech.name ? 'selected' : ''}`}
            >
              <div className="ide-tech-avatar">{tech.name.charAt(0)}</div>
              <div className="ide-tech-info">
                <div className="flex items-center justify-between">
                  <strong>{tech.name}</strong>
                  <span className="text-[10px] text-emerald-400 font-extrabold">{tech.match}</span>
                </div>
                <span>{tech.shift} · {tech.skill}</span>
                <span className="text-[10px] text-slate-400 font-mono">{tech.bay}</span>
              </div>
              <span className={`ide-badge ${tech.status === 'Available' ? 'ide-badge-green' : 'ide-badge-slate'}`}>
                {tech.status}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="ide-submit-btn"
          onClick={() => setDispatched(true)}
        >
          <UserCheck size={13} />
          Confirm Dispatch to {assignedTech}
        </button>

        {dispatched && (
          <div className="ide-assign-confirmation flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-amber-400" /> SLA Target: 15 min · WhatsApp Sent ✓
            </span>
            <button
              type="button"
              className="text-[10px] text-emerald-400 underline font-bold"
              onClick={() => onSwitchTab('verify')}
            >
              Verify Fix →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyScreen() {
  const [verified, setVerified] = useState(false);

  return (
    <div className="ide-preview-screen">
      <div className="ide-screen-header">
        <div>
          <span className="ide-screen-kicker">Repair Verification · Evidence Check</span>
          <h4 className="ide-screen-title">Ticket #TF-9842 — Closure Queue</h4>
        </div>
        <span className={`ide-badge ${verified ? 'ide-badge-green' : 'ide-badge-amber'}`}>
          {verified ? 'Verified & Closed' : 'Awaiting Approval'}
        </span>
      </div>
      <div className="ide-screen-body">
        <div className="ide-verify-block">
          <div className="ide-verify-row">
            <span>Technician</span>
            <strong>Ramesh Kumar (Hydraulics Lead)</strong>
          </div>
          <div className="ide-verify-row">
            <span>Actual Downtime</span>
            <strong className="text-emerald-400 font-mono">38 mins (Saved ₹15,800 loss)</strong>
          </div>
          <div className="ide-verify-row">
            <span>Spares Consumed</span>
            <strong>Hydraulic Seal Kit #HSK-250T (×1), VG68 Oil (20L)</strong>
          </div>
          <div className="ide-verify-row">
            <span>RCA Category (Ishikawa)</span>
            <strong className="text-sky-400 font-semibold">Material Wear / Seal Fatigue</strong>
          </div>
          <div className="ide-verify-photo">
            <FileCheck size={14} className="text-emerald-400" />
            <span>repair_proof_seal_replaced_9842.jpg · Verified</span>
          </div>
        </div>

        {!verified ? (
          <button
            type="button"
            className="ide-submit-btn ide-submit-btn-emerald"
            onClick={() => setVerified(true)}
          >
            <CheckCircle size={13} />
            Approve &amp; Digital Sign-off (Supervisor)
          </button>
        ) : (
          <div className="ide-screen-success">
            <div className="ide-success-icon"><CheckCircle size={28} /></div>
            <strong>Ticket #TF-9842 Verified &amp; Archived</strong>
            <p className="text-slate-300 text-xs">
              Saved to Hydraulic Press 250T plant memory record. Inventory auto-deducted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryScreen() {
  const events = [
    { date: 'Today 14:20', label: 'Hydraulic main cylinder seal replaced', tech: 'Ramesh K.', duration: '38 min', cost: '₹2,450 parts' },
    { date: 'Jul 28', label: 'Proportional valve pressure calibrated', tech: 'Sunil P.', duration: '18 min', cost: '₹0 parts' },
    { date: 'Jun 14', label: 'Main motor belt tension adjusted', tech: 'Ramesh K.', duration: '25 min', cost: '₹850 parts' },
    { date: 'May 02', label: 'Quarterly PM Schedule #4 Executed', tech: 'Team A', duration: '2.5 hr', cost: '₹4,200 PM kit' },
  ];

  return (
    <div className="ide-preview-screen">
      <div className="ide-screen-header">
        <div>
          <span className="ide-screen-kicker">Plant Memory · Asset Passport</span>
          <h4 className="ide-screen-title">Hydraulic Press 250T — Machine Reliability History</h4>
        </div>
        <span className="ide-badge ide-badge-green">98.4% Uptime</span>
      </div>

      <div className="ide-screen-body">
        {/* KPI Strip */}
        <div className="ide-kpi-strip">
          <div className="ide-kpi-box">
            <strong>98.4%</strong>
            <span>30D Uptime</span>
          </div>
          <div className="ide-kpi-box">
            <strong>142h</strong>
            <span>MTBF</span>
          </div>
          <div className="ide-kpi-box">
            <strong>34m</strong>
            <span>MTTR</span>
          </div>
        </div>

        {/* History List */}
        <div className="ide-history-list">
          {events.map((ev) => (
            <div key={ev.date} className="ide-history-row">
              <span className="ide-history-date">{ev.date}</span>
              <div className="ide-history-info">
                <strong>{ev.label}</strong>
                <span>{ev.tech} · {ev.duration} · {ev.cost}</span>
              </div>
              <Wrench size={13} className="ide-history-icon" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SCREENS = { report: ReportScreen, assign: AssignScreen, verify: VerifyScreen, history: HistoryScreen };

export default function ProductPreviewPanel() {
  const [activeTab, setActiveTab] = useState('report');
  const Screen = SCREENS[activeTab];

  return (
    <div className="ide-frame" aria-label="TurboFix product preview">
      {/* Browser chrome top bar */}
      <div className="ide-chrome-bar">
        <div className="ide-traffic-lights">
          <span className="ide-dot ide-dot-red" />
          <span className="ide-dot ide-dot-amber" />
          <span className="ide-dot ide-dot-green" />
        </div>
        <div className="ide-url-bar">
          <QrCode size={11} />
          <span>turbofix.co.in / shopfloor-gateway</span>
        </div>
        <div className="ide-chrome-actions">
          <span className="ide-chrome-pill">Live Cockpit</span>
        </div>
      </div>

      {/* IDE body: sidebar + preview */}
      <div className="ide-body">
        {/* File-tree sidebar */}
        <div className="ide-sidebar" role="tablist" aria-label="Workflow steps">
          <div className="ide-sidebar-heading">Plant Workflow</div>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`ide-sidebar-tab ${isActive ? 'active' : ''}`}
              >
                <ChevronRight size={11} className="ide-tab-chevron" />
                <Icon size={13} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`ide-badge ide-badge-${tab.badgeColor} ide-badge-xs`}>{tab.badge}</span>
                )}
              </button>
            );
          })}

          <div className="ide-sidebar-spacer" />
          <div className="ide-sidebar-status">
            <span className="ide-status-dot" />
            <span>Pune Unit 1 · Line 2</span>
          </div>
        </div>

        {/* Main preview pane */}
        <div className="ide-preview-pane" role="tabpanel">
          <Screen onSwitchTab={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
