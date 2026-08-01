import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Camera,
  FileCheck,
  Key,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Flame,
  Wind,
  Droplet
} from 'lucide-react';

const ENERGY_SOURCES = [
  { id: 'elec', name: 'Electrical Power 415V 3-Phase', icon: Zap, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', isolated: true, lockTag: 'LOTO-E-401' },
  { id: 'hyd', name: 'Hydraulic Pressure (220 Bar)', icon: Droplet, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10', isolated: true, lockTag: 'LOTO-H-209' },
  { id: 'pneu', name: 'Pneumatic Air Line (6.5 Bar)', icon: Wind, color: 'text-teal-400 border-teal-500/40 bg-teal-500/10', isolated: false, lockTag: 'LOTO-P-112' },
  { id: 'thermal', name: 'Hot Surface / Steam Line (120°C)', icon: Flame, color: 'text-orange-400 border-orange-500/40 bg-orange-500/10', isolated: false, lockTag: 'LOTO-T-088' },
];

export default function LockoutTagoutModule({ machineName = 'PRESS-04', ticketId = 'WO-8041', onComplete }) {
  const [energyState, setEnergyState] = useState(ENERGY_SOURCES);
  const [currentStep, setCurrentStep] = useState(1);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [supervisorSigned, setSupervisorSigned] = useState(false);

  const toggleIsolation = (id) => {
    setEnergyState(energyState.map(item => item.id === id ? { ...item, isolated: !item.isolated } : item));
  };

  const allIsolated = energyState.every(e => e.isolated);

  return (
    <div className="loto-module stitch-glass-tile p-6 rounded-3xl border border-orange-500/30 bg-slate-950 shadow-2xl text-slate-100 my-6">
      {/* LOTO Safety Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 animate-pulse">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">
              <ShieldAlert className="w-3 h-3" /> Safety Permit-to-Work (PTW / LOTO)
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              Lockout / Tagout Energy Isolation — {machineName}
            </h3>
            <p className="text-xs text-slate-400">
              Work Order <strong className="text-orange-400 font-mono">{ticketId}</strong> requires zero-energy state verification before repair unlock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Permit Status:</span>
          <span className={`font-extrabold font-mono px-2 py-0.5 rounded ${
            allIsolated && photoUploaded && supervisorSigned
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
          }`}>
            {allIsolated && photoUploaded && supervisorSigned ? 'LOTO VERIFIED & ACTIVE' : 'ZERO-ENERGY PENDING'}
          </span>
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-3 gap-3 my-6 text-center text-xs">
        <div className={`p-3 rounded-xl border transition-all ${
          currentStep === 1 ? 'border-orange-500 bg-orange-500/10 font-bold text-white' : 'border-slate-800 bg-slate-900/60 text-slate-400'
        }`}>
          <span className="block text-[10px] font-mono text-orange-400 uppercase">Step 1</span>
          1. Energy Source Isolation
        </div>
        <div className={`p-3 rounded-xl border transition-all ${
          currentStep === 2 ? 'border-orange-500 bg-orange-500/10 font-bold text-white' : 'border-slate-800 bg-slate-900/60 text-slate-400'
        }`}>
          <span className="block text-[10px] font-mono text-orange-400 uppercase">Step 2</span>
          2. Physical Padlock & Tag Photo
        </div>
        <div className={`p-3 rounded-xl border transition-all ${
          currentStep === 3 ? 'border-orange-500 bg-orange-500/10 font-bold text-white' : 'border-slate-800 bg-slate-900/60 text-slate-400'
        }`}>
          <span className="block text-[10px] font-mono text-orange-400 uppercase">Step 3</span>
          3. Safety Sign-Off & Lock
        </div>
      </div>

      {/* STEP 1: ENERGY SOURCE ISOLATION */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-orange-400" /> Verify & Toggle Breakers / Valves to Locked Off
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {energyState.map((source) => {
              const Icon = source.icon;
              return (
                <div
                  key={source.id}
                  onClick={() => toggleIsolation(source.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    source.isolated
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                      : 'border-orange-500/40 bg-orange-500/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${source.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{source.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">Lock Tag ID: {source.lockTag}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded ${
                      source.isolated ? 'bg-emerald-500 text-slate-950' : 'bg-orange-500 text-white'
                    }`}>
                      {source.isolated ? 'ISOLATED (0)' : 'LIVE DANGER'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!allIsolated}
              onClick={() => setCurrentStep(2)}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                allIsolated
                  ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Proceed to Lock Photo Capture <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PADLOCK PHOTO CAPTURE */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" /> Physical Padlock & Isolation Tag Photo Proof
          </h4>

          <div className="p-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
              <Camera className="w-6 h-6" />
            </div>

            {photoUploaded ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" /> Padlock Photo Verified: LOTO-E-401 & LOTO-H-209 Captured
                </div>
                <p className="text-[11px] text-slate-400">Timestamped: {new Date().toLocaleTimeString()} • Geo-stamped Plant 01</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-300">Snap a photo of the applied safety padlock & danger tag on machine panel.</p>
                <button
                  type="button"
                  onClick={() => setPhotoUploaded(true)}
                  className="mt-3 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-all inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Capture LOTO Lock Photo
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
            >
              Back to Energy Sources
            </button>
            <button
              type="button"
              disabled={!photoUploaded}
              onClick={() => setCurrentStep(3)}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                photoUploaded
                  ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Proceed to Safety Approval <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SUPERVISOR SAFETY SIGN-OFF */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Plant Safety Officer / Supervisor Final Authorization
          </h4>

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400">Assigned Safety Officer:</span>
              <strong className="text-white font-semibold">Rajesh Kumar (Plant Safety Lead)</strong>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400">Energy Zero-State:</span>
              <span className="text-emerald-400 font-mono font-bold">100% Confirmed (4 Sources Isolated)</span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-300">Digital Safety Authorization:</span>
              <button
                type="button"
                onClick={() => {
                  setSupervisorSigned(true);
                  if (onComplete) onComplete();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                  supervisorSigned
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                {supervisorSigned ? 'Safety Permit Issued & Signed' : 'Sign & Issue LOTO Permit'}
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
            >
              Back to Photo Proof
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
