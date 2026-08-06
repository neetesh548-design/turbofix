import React, { useState, useEffect } from 'react';
import { Monitor, AlertTriangle, CheckCircle2, Clock, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

/**
 * DigitalAndonBoard — Recommendation #10: Digital Andon Wall Display
 * Shopfloor real-time wallboard displaying machine statuses in high contrast:
 * 🟢 Running | 🟡 Attention Needed | 🔴 Machine Down
 */
export default function DigitalAndonBoard({ 
  machines = [
    { id: 'CNC-01', name: 'CNC Milling 01', type: 'CNC', status: 'running', operator: 'Ramesh Kumar', uptimeHours: 142 },
    { id: 'CNC-02', name: 'CNC Milling 02', type: 'CNC', status: 'running', operator: 'Suresh Patil', uptimeHours: 88 },
    { id: 'CNC-03', name: 'CNC Milling 03', type: 'CNC', status: 'down', operator: 'Amit Singh', issue: 'Spindle Overheating', downDurationMin: 45 },
    { id: 'CNC-04', name: 'CNC Milling 04', type: 'CNC', status: 'attention', operator: 'Vikas Sharma', issue: 'PM Overdue (Tool Wear)', downDurationMin: 0 },
    { id: 'INJ-01', name: 'Injection Mould 01', type: 'Moulding', status: 'running', operator: 'Rajesh Verma', uptimeHours: 310 },
    { id: 'INJ-02', name: 'Injection Mould 02', type: 'Moulding', status: 'down', operator: 'Deepak Mali', issue: 'Hydraulic Seal Leakage', downDurationMin: 120 },
    { id: 'PKG-01', name: 'Packaging Line 01', type: 'Packaging', status: 'running', operator: 'Karan Dave', uptimeHours: 54 },
    { id: 'PKG-02', name: 'Packaging Line 02', type: 'Packaging', status: 'running', operator: 'Sunil Mehta', uptimeHours: 210 },
  ],
  factoryName = "TurboFix Precision Works - Unit 1"
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const counts = {
    running: machines.filter(m => m.status === 'running').length,
    attention: machines.filter(m => m.status === 'attention').length,
    down: machines.filter(m => m.status === 'down').length,
  };

  return (
    <div className={`bg-slate-950 text-white min-h-screen p-6 font-sans flex flex-col justify-between select-none ${isFullscreen ? 'p-10' : ''}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-indigo-400">Digital Andon Live Shopfloor Display</div>
            <h1 className="text-3xl font-black text-white tracking-tight">{factoryName}</h1>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-6 bg-slate-900/90 px-6 py-3 rounded-2xl border border-slate-800 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xl font-black text-emerald-400">{counts.running}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">Running</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500"></span>
            <span className="text-xl font-black text-amber-400">{counts.attention}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">Attention</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-bounce"></span>
            <span className="text-xl font-black text-red-400">{counts.down}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">Down</span>
          </div>
        </div>

        {/* Time & Fullscreen */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-indigo-300">{currentTime}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Real-Time Sync</div>
          </div>
          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition text-slate-300 hover:text-white"
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Andon Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 my-6 flex-grow">
        {machines.map((machine) => {
          let cardStyle = "";
          let badgeStyle = "";
          let statusText = "";
          let icon = null;

          if (machine.status === 'down') {
            cardStyle = "bg-red-950/40 border-red-500/60 shadow-red-900/30 shadow-2xl";
            badgeStyle = "bg-red-500 text-white animate-pulse";
            statusText = "MACHINE DOWN";
            icon = <AlertTriangle className="w-6 h-6 text-red-400" />;
          } else if (machine.status === 'attention') {
            cardStyle = "bg-amber-950/30 border-amber-500/50 shadow-amber-900/20 shadow-xl";
            badgeStyle = "bg-amber-500 text-slate-950";
            statusText = "ATTENTION NEEDED";
            icon = <Clock className="w-6 h-6 text-amber-400" />;
          } else {
            cardStyle = "bg-slate-900/80 border-slate-800/80 hover:border-emerald-500/40";
            badgeStyle = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
            statusText = "RUNNING";
            icon = <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
          }

          return (
            <div 
              key={machine.id} 
              className={`border-2 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${cardStyle}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">{machine.id}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${badgeStyle}`}>
                    {statusText}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white mb-1 leading-snug">{machine.name}</h3>
                <p className="text-xs text-slate-400">Operator: <span className="text-slate-200 font-semibold">{machine.operator}</span></p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                {machine.status === 'down' && (
                  <div className="bg-red-900/30 border border-red-500/30 p-2.5 rounded-xl">
                    <div className="text-xs font-bold text-red-300">{machine.issue}</div>
                    <div className="text-[11px] text-red-400 mt-0.5">Down for <span className="font-bold">{machine.downDurationMin} mins</span></div>
                  </div>
                )}
                {machine.status === 'attention' && (
                  <div className="bg-amber-900/30 border border-amber-500/30 p-2.5 rounded-xl">
                    <div className="text-xs font-bold text-amber-300">{machine.issue}</div>
                  </div>
                )}
                {machine.status === 'running' && (
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Continuous Uptime</span>
                    <span className="font-bold text-emerald-400 font-mono">{machine.uptimeHours} hrs</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Banner */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" /> Live Shopfloor Auto-Sync Active
        </div>
        <div>TurboFix Digital Andon Board v2.0</div>
      </div>
    </div>
  );
}
