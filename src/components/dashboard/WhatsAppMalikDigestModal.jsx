import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, Copy, X, Factory, IndianRupee, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * WhatsAppMalikDigestModal — Instant WhatsApp Dispatch Drawer for Factory Owners & Plant Heads
 */
export default function WhatsAppMalikDigestModal({ open, onClose, metrics, problemMachines = [] }) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const messageText = `🏭 *TURBOFIX KARKHANA MALIK DIGEST*
📅 Date: ${todayStr} | Plant Uptime: 96.4%

🟢 *KARKHANA HEALTH SCORE*: 87/100 (+5 pts this month)

💰 *PAISA & LOSS IMPACT*:
• Machine Bandh Today: 2.5 hrs
• Daily Production Loss: ₹18,000
• Customer Order Risk: ₹54,000
• 💸 *TOTAL MONTHLY BACHAT (SAVED)*: ₹3,80,000

🚨 *TOP MACHINES NEEDING SUBAH REVIEW*:
${problemMachines.map((m, i) => `${i + 1}. *${m.name}*: ${m.issue} (Nuksan Risk: ₹${(m.loss || 0).toLocaleString('en-IN')})`).join('\n')}

🔧 *SHOPFLOOR DISCIPLINE*:
• PM Compliance: 92.0%
• Avg Repair Time (MTTR): 38 mins

✅ Sent via TurboFix Machine Intelligence`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppSend = () => {
    const encoded = encodeURIComponent(messageText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-emerald-500/40 rounded-2xl max-w-lg w-full p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 font-sans relative overflow-hidden">
        {/* GLOW DECORATION */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 blur-3xl pointer-events-none rounded-full" />

        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                1-CLICK WHATSAPP DISPATCH
              </div>
              <h3 className="text-base font-black text-white">Daily Malik (Owner) Digest</h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PREVIEW CONTAINER */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs font-mono text-slate-200 max-h-72 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-500 selection:text-slate-950">
          {messageText}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Text'}
          </button>

          <button
            onClick={handleWhatsAppSend}
            className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(80,255,171,0.4)] transition hover:brightness-110"
          >
            <Send className="w-4 h-4" /> Send to WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
