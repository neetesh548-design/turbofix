import React, { useState } from 'react';
import { QrCode, Mic, Camera, Send, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

export default function QrDemoPreview() {
  const [activeStep, setActiveStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const simulateVoiceRecording = () => {
    setIsRecording(true);
    setVoiceText('Recording voice breakdown note...');
    setTimeout(() => {
      setIsRecording(false);
      setVoiceText('मशीन #3 मुख्य मोटर से तेज़ आवाज़ और धुआँ निकल रहा है (Hydraulic Pressure Drop)');
    }, 1800);
  };

  const handleSimulateSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setActiveStep(3);
    }, 600);
  };

  const resetDemo = () => {
    setActiveStep(1);
    setVoiceText('');
    setSubmitted(false);
  };

  return (
    <div className="stitch-glass-tile p-6 sm:p-8 rounded-2xl border border-sky-500/30 my-10 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold border border-sky-500/20 mb-2">
            <QrCode size={14} />
            <span>Interactive Demo for Shopfloor Operators</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Try 10-Second QR Breakdown Reporting
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Workers scan the QR plate on any machine using WhatsApp or camera—no login, no app install, zero typing required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => setActiveStep(step)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeStep === step
                  ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Step {step}: {step === 1 ? 'Scan' : step === 2 ? 'Report' : 'Dispatched'}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Mobile Device Simulator */}
      <div className="max-w-md mx-auto bg-slate-950 rounded-3xl p-5 border-4 border-slate-800 shadow-2xl relative">
        <div className="w-24 h-4 bg-slate-800 mx-auto rounded-full mb-4" />

        {activeStep === 1 && (
          <div className="text-center space-y-4 py-4">
            <div className="w-28 h-28 mx-auto bg-white p-3 rounded-2xl shadow-lg border-2 border-sky-400 flex items-center justify-center relative group">
              <QrCode size={80} className="text-slate-900" />
              <div className="absolute inset-0 border-2 border-sky-500 rounded-2xl animate-ping opacity-25" />
            </div>
            <div>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Machine ID: IN-PNE-PRS-003</span>
              <h3 className="text-lg font-extrabold text-white mt-1">Hydraulic Press 250T (Pune Unit 1)</h3>
              <p className="text-xs text-slate-400 mt-1">Scan code on physical machine tag to initiate ticket.</p>
            </div>
            <button
              onClick={() => setActiveStep(2)}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all text-xs uppercase tracking-wider"
            >
              Simulate Scan &amp; Open Portal →
            </button>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Public QR Report Gateway</span>
                <h4 className="text-sm font-bold text-white">Hydraulic Press 250T</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Breakdown</span>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Worker Voice Note / Defect Description</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    placeholder="बोलकर रिपोर्ट करें या यहाँ लिखें (Speak or type issue)..."
                    className="w-full bg-slate-900 text-xs text-white p-3 rounded-xl border border-slate-800 focus:border-sky-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={simulateVoiceRecording}
                    className={`absolute right-2 bottom-2 p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      isRecording
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30'
                    }`}
                  >
                    <Mic size={14} />
                    <span>{isRecording ? 'Listening...' : 'बोलकर लिखें'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <Camera size={14} className="text-slate-400" />
                  <span>Attach Breakdown Photo</span>
                </span>
                <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">Optional</span>
              </div>

              <button
                type="submit"
                disabled={submitted}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {submitted ? (
                  <span>Generating Ticket...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Breakdown Ticket (10s)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {activeStep === 3 && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full mx-auto flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle size={32} />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Ticket #TF-9842 Dispatched</span>
              <h3 className="text-lg font-extrabold text-white mt-1">Maintenance Head &amp; Tech Notified</h3>
              <p className="text-xs text-slate-300 mt-1">
                WhatsApp alert sent to Shift Tech <strong className="text-white">Ramesh Kumar</strong> with 15-min SLA response timer.
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Status</span>
                <strong className="text-amber-400">Assigned (In Progress)</strong>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Assigned Technician</span>
                <strong className="text-white">Ramesh Kumar (P1 Shift A)</strong>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Automated SLA Timer</span>
                <strong className="text-emerald-400">14:52 mins remaining</strong>
              </div>
            </div>

            <button
              onClick={resetDemo}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs border border-slate-800"
            >
              Restart QR Demo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
