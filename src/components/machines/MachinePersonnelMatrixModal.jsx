import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle2, ShieldAlert, AlertCircle, Plus, Trash2, Building2, Wrench } from 'lucide-react';

/**
 * MachinePersonnelMatrixModal — Manages multi-shift and cross-departmental
 * personnel assignments per machine.
 *
 * Rules:
 * - Technicians (Shift-based): Max 3 (Shift A, Shift B, Shift C)
 * - Supervisors (Shift-based): Max 3
 * - Maintenance Engineers: Max 3
 * - Production Supervisors: Max 3
 * - Production Engineers: Max 3
 * - Maintenance Head: STRICTLY EXACTLY 1
 * - Production Head: STRICTLY EXACTLY 1
 * - Plant Director / VP: STRICTLY EXACTLY 1
 * - Plant Owner: STRICTLY EXACTLY 1
 */
export default function MachinePersonnelMatrixModal({
  machine,
  usersList = [],
  isOpen,
  onClose,
  onSave,
}) {
  const [matrix, setMatrix] = useState({
    technicians: [],        // Max 3
    supervisors: [],        // Max 3
    engineers: [],          // Max 3
    prod_supervisors: [],   // Max 3
    prod_engineers: [],     // Max 3
    maint_head: '',         // Exactly 1
    prod_head: '',          // Exactly 1
    director: '',           // Exactly 1
    owner: '',              // Exactly 1
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (machine) {
      const existing = machine.personnel_matrix || {};
      setMatrix({
        technicians: Array.isArray(existing.technicians) ? existing.technicians.slice(0, 3) : (machine.technician_user_id ? [machine.technician_user_id] : []),
        supervisors: Array.isArray(existing.supervisors) ? existing.supervisors.slice(0, 3) : (machine.supervisor_id ? [machine.supervisor_id] : []),
        engineers: Array.isArray(existing.engineers) ? existing.engineers.slice(0, 3) : (machine.engineer_user_id ? [machine.engineer_user_id] : []),
        prod_supervisors: Array.isArray(existing.prod_supervisors) ? existing.prod_supervisors.slice(0, 3) : [],
        prod_engineers: Array.isArray(existing.prod_engineers) ? existing.prod_engineers.slice(0, 3) : [],
        maint_head: existing.maint_head || machine.maint_head_id || '',
        prod_head: existing.prod_head || '',
        director: existing.director || '',
        owner: existing.owner || '',
      });
    }
  }, [machine]);

  if (!isOpen || !machine) return null;

  const handleMultiAdd = (key, userId, maxCount = 3) => {
    if (!userId) return;
    setError('');
    const current = matrix[key] || [];
    if (current.includes(userId)) {
      setError('This person is already assigned in this role.');
      return;
    }
    if (current.length >= maxCount) {
      setError(`Maximum ${maxCount} personnel allowed for shift-based ${key.replace('_', ' ')}.`);
      return;
    }
    setMatrix({ ...matrix, [key]: [...current, userId] });
  };

  const handleMultiRemove = (key, userId) => {
    setMatrix({ ...matrix, [key]: (matrix[key] || []).filter(id => id !== userId) });
  };

  const handleSingleSet = (key, userId) => {
    setMatrix({ ...matrix, [key]: userId });
  };

  const handleFormSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave?.(machine.id || machine.machine_id, matrix);
      setSuccess('Personnel matrix saved successfully.');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 800);
    } catch (err) {
      setError(err?.message || 'Failed to update personnel matrix.');
    } finally {
      setSaving(false);
    }
  };

  const getUserName = (id) => {
    const found = usersList.find(u => (u.user_id || u.id) === id);
    return found ? `${found.name} (${found.email || found.role})` : id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1520] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#50ffab]">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Shift &amp; Department Personnel Matrix
              </h2>
              <p className="text-xs text-slate-400">
                {machine.machine_name || machine.name} ({machine.machine_id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSave} className="mt-5 space-y-6">
          {error && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
          {success && <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2"><CheckCircle2 size={14} />{success}</div>}

          {/* Section 1: Maintenance Team (Shift-based) */}
          <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Wrench size={14} /> 🛠️ Maintenance Department (Shift &amp; Reliability)
            </h3>

            {/* Technicians (Max 3) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Shift Technicians (Max 3 — Shift A, B, C)
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                  onChange={(e) => handleMultiAdd('technicians', e.target.value, 3)}
                  value=""
                >
                  <option value="">+ Add Shift Technician (Max 3)</option>
                  {usersList.map(u => (
                    <option key={u.user_id || u.id} value={u.user_id || u.id}>
                      {u.name} — {u.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {matrix.technicians.map((id, idx) => (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-emerald-400">Shift {String.fromCharCode(65 + idx)}:</span> {getUserName(id)}
                    <button type="button" onClick={() => handleMultiRemove('technicians', id)} className="text-slate-400 hover:text-rose-400 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Maintenance Supervisors (Max 3) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Maintenance Supervisors (Max 3 — Shift-based)
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                onChange={(e) => handleMultiAdd('supervisors', e.target.value, 3)}
                value=""
              >
                <option value="">+ Add Shift Supervisor (Max 3)</option>
                {usersList.map(u => (
                  <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 mt-2">
                {matrix.supervisors.map((id, idx) => (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-blue-400">Supervisor {idx + 1}:</span> {getUserName(id)}
                    <button type="button" onClick={() => handleMultiRemove('supervisors', id)} className="text-slate-400 hover:text-rose-400 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Maintenance Engineers (Max 3) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Maintenance &amp; Reliability Engineers (Max 3)
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                onChange={(e) => handleMultiAdd('engineers', e.target.value, 3)}
                value=""
              >
                <option value="">+ Add Maintenance Engineer (Max 3)</option>
                {usersList.map(u => (
                  <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 mt-2">
                {matrix.engineers.map((id, idx) => (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-indigo-400">Engineer {idx + 1}:</span> {getUserName(id)}
                    <button type="button" onClick={() => handleMultiRemove('engineers', id)} className="text-slate-400 hover:text-rose-400 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Production Team (Loop in for Bottleneck & Downtime) */}
          <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Building2 size={14} /> ⚙️ Production Department (Loop for Shutdown &amp; Capacity)
            </h3>

            {/* Production Supervisors (Max 3) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Production Supervisors (Max 3 — Shift-based)
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                onChange={(e) => handleMultiAdd('prod_supervisors', e.target.value, 3)}
                value=""
              >
                <option value="">+ Add Production Supervisor (Max 3)</option>
                {usersList.map(u => (
                  <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 mt-2">
                {matrix.prod_supervisors.map((id, idx) => (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-amber-400">Prod Sup {idx + 1}:</span> {getUserName(id)}
                    <button type="button" onClick={() => handleMultiRemove('prod_supervisors', id)} className="text-slate-400 hover:text-rose-400 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Production Engineers (Max 3) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Production Engineers (Max 3)
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                onChange={(e) => handleMultiAdd('prod_engineers', e.target.value, 3)}
                value=""
              >
                <option value="">+ Add Production Engineer (Max 3)</option>
                {usersList.map(u => (
                  <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 mt-2">
                {matrix.prod_engineers.map((id, idx) => (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-amber-300">Prod Eng {idx + 1}:</span> {getUserName(id)}
                    <button type="button" onClick={() => handleMultiRemove('prod_engineers', id)} className="text-slate-400 hover:text-rose-400 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Executive Single-Person Authorities (STRICTLY 1 PERSON ONLY) */}
          <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <ShieldAlert size={14} /> 👑 Single-Point Escalation Authorities (Strictly 1 Person Only)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Maintenance Head (Single) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Maintenance Head / Manager <span className="text-rose-400">* (Max 1)</span>
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                  value={matrix.maint_head}
                  onChange={(e) => handleSingleSet('maint_head', e.target.value)}
                >
                  <option value="">Select Maintenance Head (1 person)</option>
                  {usersList.map(u => <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>)}
                </select>
              </div>

              {/* Production Head (Single) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Production Head / Manager <span className="text-rose-400">* (Max 1)</span>
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                  value={matrix.prod_head}
                  onChange={(e) => handleSingleSet('prod_head', e.target.value)}
                >
                  <option value="">Select Production Head (1 person)</option>
                  {usersList.map(u => <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>)}
                </select>
              </div>

              {/* Plant Director / VP (Single) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plant Director / VP Operations <span className="text-rose-400">* (Max 1)</span>
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                  value={matrix.director}
                  onChange={(e) => handleSingleSet('director', e.target.value)}
                >
                  <option value="">Select Plant Director / VP (1 person)</option>
                  {usersList.map(u => <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>)}
                </select>
              </div>

              {/* Plant Owner (Single) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plant Owner <span className="text-rose-400">* (Max 1)</span>
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200"
                  value={matrix.owner}
                  onChange={(e) => handleSingleSet('owner', e.target.value)}
                >
                  <option value="">Select Plant Owner (1 person)</option>
                  {usersList.map(u => <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.name} — {u.role}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 rounded-xl transition-all shadow-md shadow-emerald-950/40"
            >
              {saving ? 'Saving Matrix…' : 'Save Personnel Matrix'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
