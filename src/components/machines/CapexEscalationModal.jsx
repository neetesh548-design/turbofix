import React, { useState } from 'react';
import { X, AlertTriangle, TrendingDown, DollarSign, Send, CheckCircle2, Building2, ShieldAlert } from 'lucide-react';

/**
 * CapexEscalationModal — Management Bottleneck & Machine Replacement Escalation.
 *
 * Allows Maintenance Head, Production Head, and Reliability Engineers to
 * trigger a CapEx Replacement Proposal to the VP / Plant Director & Owner
 * when a machine becomes a persistent bottleneck or reaches unsustainable maintenance costs.
 *
 * Modeled after Indian Manufacturing Enterprises (e.g., Sigma Electric Manufacturing Corporation).
 */
export default function CapexEscalationModal({
  machine,
  isOpen,
  onClose,
  onEscalate,
}) {
  const [reason, setReason] = useState('repeat_bottleneck');
  const [estDowntimeCost, setEstDowntimeCost] = useState('245000');
  const [estNewMachineCost, setEstNewMachineCost] = useState('1850000');
  const [justification, setJustification] = useState(
    'Machine has exceeded 48 hours of unplanned breakdown this month. Spare parts lead time and repeat casting/spindle failures are creating severe production bottlenecks across Assembly Line 2.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !machine) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onEscalate?.({
        machine_id: machine.id || machine.machine_id,
        machine_name: machine.machine_name || machine.name,
        reason,
        est_downtime_cost: Number(estDowntimeCost),
        est_new_machine_cost: Number(estNewMachineCost),
        justification,
        timestamp: new Date().toISOString(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      alert(err?.message || 'Failed to submit CapEx proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1520] border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                CapEx Machine Replacement &amp; Management Escalation
              </h2>
              <p className="text-xs text-slate-400">
                {machine.machine_name || machine.name} ({machine.location || 'Shopfloor Line'})
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 animate-bounce" />
            <h3 className="text-base font-bold text-white">CapEx Proposal Submitted to Executive Management!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Automated notifications sent to Plant VP, Plant Owner, Production Head &amp; Maintenance Head for investment review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            
            {/* Info Banner */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <ShieldAlert size={14} /> Cross-Departmental Bottleneck Alert
              </div>
              <p>
                Submitting this CapEx proposal loops in <strong>Production Head, Maintenance Head, VP Operations, and Plant Owner</strong> to evaluate machine replacement vs. ongoing downtime losses.
              </p>
            </div>

            {/* Reason for Escalation */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Escalation Primary Driver
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-2.5 text-slate-200"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="repeat_bottleneck">Repeat Production Bottleneck (&gt;3 Failures/Month)</option>
                <option value="high_maintenance_cost">Maintenance Repair Cost &gt; 40% Asset Value</option>
                <option value="spare_obsolete">Spare Parts Obsolete / Excessive Lead Time</option>
                <option value="quality_defect_spike">Quality Defects Spike (Sigma Level Drop)</option>
              </select>
            </div>

            {/* Financial Estimates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Est. Monthly Lost Output (₹)
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-2 text-slate-200"
                  value={estDowntimeCost}
                  onChange={(e) => setEstDowntimeCost(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Est. New Machine CapEx (₹)
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-2 text-slate-200"
                  value={estNewMachineCost}
                  onChange={(e) => setEstNewMachineCost(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Justification Text */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Executive Justification &amp; Business Impact
              </label>
              <textarea
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs p-3 text-slate-200 leading-relaxed"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Send size={14} />
                {submitting ? 'Submitting CapEx Proposal…' : 'Escalate CapEx Proposal to VP & Owner'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
