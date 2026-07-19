import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArchiveRestore, Check, CheckCircle2, ChevronRight, ClipboardCheck, CloudUpload,
  DatabaseBackup, Download, FileCheck2, FileSearch, FileText, History, Image,
  Info, Plus, Search, ShieldCheck, Sparkles, Trash2, TriangleAlert, X,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';

import { apiFetch } from '../lib/api';

const ACCEPTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xlsx', 'csv', 'docx', 'txt', 'md', 'dwg', 'dxf']);
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const FILE_ACCEPT = [...ACCEPTED_EXTENSIONS].map((extension) => `.${extension}`).join(',');

const RECORD_TYPES = [
  ['service_history', 'Service history'],
  ['inspection', 'Inspection / checklist'],
  ['manual', 'Machine manual'],
  ['wiring_diagram', 'Wiring diagram'],
  ['hydraulic_diagram', 'Hydraulic diagram'],
  ['spare_parts_bom', 'BOM / spare parts list'],
  ['consumables', 'Consumables record'],
  ['pm_checklist', 'Preventive maintenance'],
  ['warranty', 'Warranty / vendor record'],
  ['other', 'Other machine record'],
];

const SECTION_FIELDS = {
  specifications: ['name', 'value', 'unit', 'confidence', 'source'],
  maintenance_tasks: ['task', 'frequency', 'procedure', 'safety_note', 'confidence', 'source'],
  spare_parts: ['name', 'part_number', 'quantity', 'unit', 'supplier', 'confidence', 'source'],
  consumables: ['name', 'specification', 'quantity', 'unit', 'replacement_interval', 'confidence', 'source'],
  service_history: ['date', 'issue', 'work_performed', 'technician', 'hours', 'parts_used', 'confidence', 'source'],
  risks: ['risk', 'recommended_action', 'confidence', 'source'],
};

const SECTION_LABELS = {
  specifications: 'Specifications',
  maintenance_tasks: 'Maintenance tasks',
  spare_parts: 'Spare parts',
  consumables: 'Consumables',
  service_history: 'Service history',
  risks: 'Risks and actions',
};

const EMPTY_EXTRACTION = {
  summary: '',
  machine_identity: {
    manufacturer: { value: '', confidence: 0, source: '' },
    model: { value: '', confidence: 0, source: '' },
    serial_number: { value: '', confidence: 0, source: '' },
    year: { value: '', confidence: 0, source: '' },
  },
  specifications: [],
  maintenance_tasks: [],
  spare_parts: [],
  consumables: [],
  service_history: [],
  risks: [],
  source_notes: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function label(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

async function responseMessage(response, fallback) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || fallback;
  } catch {
    return fallback;
  }
}

function Confidence({ value }) {
  const score = Number(value || 0);
  const tone = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low';
  return <span className={`records-confidence ${tone}`}><span style={{ width: `${score}%` }} />{score}%</span>;
}

function StatusBadge({ status }) {
  const icons = {
    approved: <CheckCircle2 size={14} />,
    rejected: <X size={14} />,
    needs_review: <FileSearch size={14} />,
  };
  return <span className={`records-status ${status}`}>{icons[status]}{label(status)}</span>;
}

function MetricCard({ icon, value, label: text, tone = '', onClick }) {
  return <button type="button" className={`records-metric ${tone}`} onClick={onClick}><span className="records-metric-icon">{icon}</span><span><strong>{value}</strong><span>{text}</span></span></button>;
}

function UploadDialog({ machines, initialMachineId, open, onClose, onComplete }) {
  const [machineId, setMachineId] = useState(initialMachineId || machines[0]?.machine_id || '');
  const [recordType, setRecordType] = useState('service_history');
  const [sourceKind, setSourceKind] = useState('handwritten');
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  useEffect(() => {
    if (initialMachineId && machines.some((machine) => machine.machine_id === initialMachineId)) {
      setMachineId(initialMachineId);
    } else if ((!machineId || !machines.some((machine) => machine.machine_id === machineId)) && machines[0]) {
      setMachineId(machines[0].machine_id);
    }
  }, [initialMachineId, machineId, machines]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectFiles = (selectedFiles) => {
    const nextFiles = Array.from(selectedFiles || []);
    const invalid = nextFiles.find((file) => !ACCEPTED_EXTENSIONS.has(file.name.split('.').pop()?.toLowerCase()));
    const oversized = nextFiles.find((file) => file.size > MAX_FILE_BYTES);
    if (invalid) {
      setFiles([]);
      setError(`${invalid.name} is not a supported machine-record file.`);
      return;
    }
    if (oversized) {
      setFiles([]);
      setError(`${oversized.name} is over the 25 MB upload limit.`);
      return;
    }
    setError('');
    setFiles(nextFiles);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!machineId || files.length === 0) return;
    setBusy(true);
    setError('');
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`${Math.round((index / files.length) * 100)}% · Reading ${index + 1} of ${files.length}: ${file.name}`);
        const body = new FormData();
        body.append('machine_id', machineId);
        body.append('record_type', recordType);
        body.append('source_kind', sourceKind);
        body.append('title', files.length === 1 && title.trim() ? title.trim() : file.name.replace(/\.[^.]+$/, ''));
        body.append('file', file);
        const response = await apiFetch('/vault/records', { method: 'POST', body });
        if (!response.ok) throw new Error(await responseMessage(response, `Could not process ${file.name}.`));
      }
      setFiles([]);
      setTitle('');
      onComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return <div className="records-modal" role="dialog" aria-modal="true" aria-labelledby="upload-records-title">
    <button className="records-modal-backdrop" onClick={onClose} aria-label="Close" />
    <form className="records-upload-dialog" onSubmit={submit}>
      <div className="records-dialog-head"><div><span className="records-kicker">Add machine knowledge</span><h2 id="upload-records-title">Upload records for AI reading</h2><p>Photos, PDF, Excel, Word, CSV, text, DWG and DXF records are supported.</p></div><button type="button" className="records-icon-button" onClick={onClose} aria-label="Close upload dialog"><X /></button></div>
      <div className="records-upload-flow"><span className="active"><b>1</b>Choose machine</span><ChevronRight /><span><b>2</b>Add records</span><ChevronRight /><span><b>3</b>Review AI draft</span></div>
      {error && <div className="records-alert error"><TriangleAlert />{error}</div>}
      <div className="records-form-grid">
        <label><span>Machine</span><select value={machineId} onChange={(event) => setMachineId(event.target.value)} required>{machines.map((machine) => <option key={machine.machine_id} value={machine.machine_id}>{machine.machine_name} · {machine.location || machine.machine_id}</option>)}</select></label>
        <label><span>What type of record is this?</span><select value={recordType} onChange={(event) => setRecordType(event.target.value)}>{RECORD_TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      </div>
      <fieldset className="records-source-choice"><legend>Source format</legend><label className={sourceKind === 'handwritten' ? 'selected' : ''}><input type="radio" name="source" value="handwritten" checked={sourceKind === 'handwritten'} onChange={() => setSourceKind('handwritten')} /><Image /><span><strong>Handwritten / scanned</strong><small>Photos, registers, job cards, marked drawings</small></span><Check /></label><label className={sourceKind === 'soft_copy' ? 'selected' : ''}><input type="radio" name="source" value="soft_copy" checked={sourceKind === 'soft_copy'} onChange={() => setSourceKind('soft_copy')} /><FileText /><span><strong>Soft copy</strong><small>PDF, Excel, Word, CSV, text, manuals</small></span><Check /></label></fieldset>
      <label className="records-title-field"><span>Record title <small>(optional for one file)</small></span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: CNC Lathe service register — 2025" /></label>
      <label className={`records-dropzone${files.length ? ' has-files' : ''}`}><CloudUpload /><strong>{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} ready` : 'Drop files here or choose from device'}</strong><span>{files.length ? files.map((file) => file.name).join(', ') : 'PDF, photo, office files, DWG, DXF · up to 25 MB each'}</span><input type="file" multiple accept={FILE_ACCEPT} onChange={(event) => selectFiles(event.target.files)} /></label>
      <div className="records-safety-note"><ShieldCheck /><span><strong>AI creates a draft only.</strong> TurboFix will not use this data for recommendations until a Maintenance Head approves it.</span></div>
      <div className="records-dialog-actions"><button type="button" className="records-button secondary" onClick={onClose}>Cancel</button><button className="records-button primary" disabled={busy || !machineId || files.length === 0}>{busy ? <><Sparkles className="spin" />{progress || 'Reading records…'}</> : <><Sparkles />Create review draft</>}</button></div>
    </form>
  </div>;
}

function ReviewDialog({ record, machine, user, onClose, onUpdated }) {
  const [draft, setDraft] = useState(clone(record?.extracted_data || EMPTY_EXTRACTION));
  const [notes, setNotes] = useState(record?.review_notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceMime, setSourceMime] = useState('');
  const canApprove = user?.role === 'maintenance_head';
  const locked = record?.status === 'approved';

  useEffect(() => {
    setDraft(clone(record?.extracted_data || EMPTY_EXTRACTION));
    setNotes(record?.review_notes || '');
  }, [record]);

  useEffect(() => {
    if (!record) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [record, onClose]);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    const loadSource = async () => {
      setSourceUrl('');
      setSourceMime('');
      if (!record?.document_id) return;
      const extension = String(record.file_name || '').split('.').pop()?.toLowerCase();
      if (!['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) return;
      try {
        const response = await apiFetch(`/vault/documents/${record.document_id}/download`);
        if (!response.ok || !active) return;
        const blob = await response.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSourceUrl(objectUrl);
        setSourceMime(extension === 'pdf' ? 'application/pdf' : blob.type || `image/${extension}`);
      } catch {
        // The download action remains available if inline preview is unsupported.
      }
    };
    loadSource();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [record]);

  if (!record) return null;

  const updateIdentity = (field, key, value) => {
    setDraft((current) => ({
      ...current,
      machine_identity: {
        ...current.machine_identity,
        [field]: { ...current.machine_identity[field], [key]: key === 'confidence' ? Number(value) : value },
      },
    }));
  };

  const updateItem = (section, index, field, value) => {
    setDraft((current) => ({ ...current, [section]: current[section].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === 'confidence' ? Number(value) : value } : item) }));
  };

  const addItem = (section) => {
    setDraft((current) => ({ ...current, [section]: [...current[section], Object.fromEntries(SECTION_FIELDS[section].map((field) => [field, field === 'confidence' ? 50 : '']))] }));
  };

  const removeItem = (section, index) => {
    setDraft((current) => ({ ...current, [section]: current[section].filter((_, itemIndex) => itemIndex !== index) }));
  };

  const save = async (quiet = false) => {
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch(`/vault/records/${record.record_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extracted_data: draft, review_notes: notes }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, 'Draft could not be saved.'));
      const updated = await response.json();
      onUpdated(updated, quiet ? '' : 'Draft saved. It is ready for Maintenance Head review.');
      return updated;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const decide = async (approved) => {
    if (!approved && !notes.trim()) {
      setError('Add a reason before returning this record for correction.');
      return;
    }
    const saved = await save(true);
    if (!saved) return;
    setBusy(true);
    try {
      const response = await apiFetch(`/vault/records/${record.record_id}/${approved ? 'approve' : 'reject'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: notes }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, 'Decision could not be saved.'));
      const updated = await response.json();
      onUpdated(updated, approved ? 'Approved knowledge is now available to TurboFix AI.' : 'Record returned with review notes.');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadOriginal = async () => {
    if (!record.document_id) return;
    const response = await apiFetch(`/vault/documents/${record.document_id}/download`);
    if (!response.ok) return setError(await responseMessage(response, 'Original could not be downloaded.'));
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = record.file_name || 'machine-record';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="records-modal review" role="dialog" aria-modal="true" aria-labelledby="review-record-title">
    <button className="records-modal-backdrop" onClick={onClose} aria-label="Close" />
    <div className="records-review-dialog">
      <header className="records-review-head"><div><span className="records-kicker">Review extracted knowledge</span><h2 id="review-record-title">{record.title}</h2><p>{machine?.machine_name || record.machine_id} · {label(record.record_type)}</p></div><div className="records-review-head-actions"><StatusBadge status={record.status} /><button className="records-icon-button" onClick={onClose} aria-label="Close review dialog"><X /></button></div></header>
      <div className="records-review-layout">
        <aside className="records-source-panel">
          <div className={`records-source-preview${sourceUrl ? ' document' : ''}`}>{sourceUrl ? (sourceMime === 'application/pdf' ? <iframe src={sourceUrl} title={`Original ${record.file_name}`} /> : <img src={sourceUrl} alt={`Original ${record.file_name}`} />) : <><FileText /><strong>{record.file_name || 'Original source'}</strong><span>{label(record.source_kind)} record</span></>}</div>
          <button className="records-button secondary full" onClick={downloadOriginal} disabled={!record.document_id}><Download />Download original</button>
          <div className="records-source-facts"><span><b>AI confidence</b><Confidence value={record.overall_confidence} /></span><span><b>Uploaded</b>{formatDate(record.created_at)}</span><span><b>Version</b>{record.version}</span></div>
          <div className="records-confidence-help"><Info /><span>Confidence helps prioritize checking. It does not replace human verification.</span></div>
          <div className="records-history"><h3><History />Activity</h3>{(record.history || []).slice().reverse().map((item, index) => <div key={`${item.at}-${index}`}><span className="records-history-dot" /><p><strong>{label(item.action)}</strong><span>{item.name || item.by} · {formatDate(item.at)}</span>{item.note && <small>{item.note}</small>}</p></div>)}</div>
        </aside>
        <main className="records-editor">
          {error && <div className="records-alert error"><TriangleAlert />{error}</div>}
          {locked && <div className="records-alert success"><ShieldCheck />Approved knowledge is locked. Upload a revised source to create a new version.</div>}
          <section className="records-edit-section"><div className="records-edit-heading"><div><span>01</span><h3>Record summary</h3></div></div><textarea className="records-summary-input" value={draft.summary || ''} disabled={locked} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="Short explanation of what this record contains" /></section>
          <section className="records-edit-section"><div className="records-edit-heading"><div><span>02</span><h3>Machine identity</h3></div><small>Check uncertain labels against the machine nameplate.</small></div><div className="records-identity-grid">{Object.entries(draft.machine_identity || {}).map(([field, item]) => <div className={`records-identity-card${item.value && Number(item.confidence) < 55 ? ' low-confidence' : ''}`} key={field}><label><span>{label(field)}</span><input value={item.value || ''} disabled={locked} onChange={(event) => updateIdentity(field, 'value', event.target.value)} placeholder="Not found" /></label><div><label><span>Confidence</span><input type="number" min="0" max="100" value={item.confidence || 0} disabled={locked} onChange={(event) => updateIdentity(field, 'confidence', event.target.value)} /></label><label><span>Source</span><input value={item.source || ''} disabled={locked} onChange={(event) => updateIdentity(field, 'source', event.target.value)} placeholder="Page / label" /></label></div></div>)}</div></section>
          {Object.entries(SECTION_FIELDS).map(([section, fields], sectionIndex) => <section className="records-edit-section" key={section}><div className="records-edit-heading"><div><span>{String(sectionIndex + 3).padStart(2, '0')}</span><h3>{SECTION_LABELS[section]}</h3></div>{!locked && <button type="button" className="records-text-button" onClick={() => addItem(section)}><Plus />Add row</button>}</div>{(draft[section] || []).length === 0 ? <button type="button" className="records-empty-section" disabled={locked} onClick={() => addItem(section)}><Plus /><span><strong>No {SECTION_LABELS[section].toLowerCase()} extracted</strong>{locked ? 'No approved values in this section.' : 'Add a row if the source contains this information.'}</span></button> : <div className="records-item-list">{draft[section].map((item, index) => <div className={`records-item-editor${Number(item.confidence) < 55 ? ' low-confidence' : ''}`} key={`${section}-${index}`}><span className="records-row-number">{index + 1}</span><div className="records-item-fields">{fields.map((field) => <label key={field} className={field === 'procedure' || field === 'work_performed' || field === 'recommended_action' ? 'wide' : ''}><span>{label(field)}</span><input type={field === 'confidence' ? 'number' : 'text'} min={field === 'confidence' ? 0 : undefined} max={field === 'confidence' ? 100 : undefined} value={item[field] ?? ''} disabled={locked} onChange={(event) => updateItem(section, index, field, event.target.value)} /></label>)}</div>{!locked && <button type="button" className="records-delete-row" onClick={() => removeItem(section, index)} aria-label={`Remove ${SECTION_LABELS[section]} row`}><Trash2 /></button>}</div>)}</div>}</section>)}
          <section className="records-edit-section review-notes"><div className="records-edit-heading"><div><span><ClipboardCheck /></span><h3>Reviewer notes</h3></div></div><textarea value={notes} disabled={locked} onChange={(event) => setNotes(event.target.value)} placeholder="Record corrections, unreadable entries, or the reason for returning this draft" /></section>
        </main>
      </div>
      <footer className="records-review-footer"><div><ShieldCheck /><span>{canApprove ? 'You are the authorized Maintenance Head reviewer.' : 'Only the Maintenance Head can approve this knowledge for AI use.'}</span></div><div><button className="records-button secondary" onClick={onClose}>Close</button>{!locked && <button className="records-button secondary" onClick={() => save(false)} disabled={busy}>Save draft</button>}{canApprove && !locked && <><button className="records-button danger" onClick={() => decide(false)} disabled={busy}>Return for correction</button><button className="records-button primary" onClick={() => decide(true)} disabled={busy}><ShieldCheck />Approve for AI use</button></>}</div></footer>
    </div>
  </div>;
}

export default function Records() {
  const initialMachineId = useMemo(() => new URLSearchParams(window.location.search).get('machine_id') || '', []);
  const openUploadOnArrival = useMemo(() => new URLSearchParams(window.location.search).get('upload') === '1', []);
  const [machines, setMachines] = useState([]);
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState('inbox');
  const [machineFilter, setMachineFilter] = useState(initialMachineId || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lowConfidenceOnly, setLowConfidenceOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadOpen, setUploadOpen] = useState(openUploadOnArrival);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedBackupMachines, setSelectedBackupMachines] = useState([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const loadRequest = useRef(0);
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch { return null; }
  }, []);

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setLoading(true);
    setError('');
    try {
      const [{ data: machinesData, error: machinesError }, recordsResponse] = await Promise.all([
        supabase.from('machines').select('id,name,location,status').order('name'),
        apiFetch('/vault/records'),
      ]);
      if (machinesError) throw machinesError;
      if (!recordsResponse.ok) throw new Error(await responseMessage(recordsResponse, 'Machine records could not be loaded.'));
      const machineData = (machinesData || []).map(m => ({ machine_id: m.id, machine_name: m.name, location: m.location }));
      const recordData = await recordsResponse.json();
      if (requestId !== loadRequest.current) return;
      setMachines(machineData);
      if (initialMachineId && !machineData.some((machine) => machine.machine_id === initialMachineId)) setMachineFilter('all');
      setRecords([...recordData].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))));
      setSelectedBackupMachines((current) => current.length ? current : machineData.map((machine) => machine.machine_id));
      setError('');
    } catch (err) {
      if (requestId === loadRequest.current) setError(err.message);
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, [initialMachineId]);

  useEffect(() => {
    document.title = 'AI Records | TurboFix';
    load();
  }, [load]);

  const machineMap = useMemo(() => Object.fromEntries(machines.map((machine) => [machine.machine_id, machine])), [machines]);
  const metrics = useMemo(() => ({
    needsReview: records.filter((record) => record.status === 'needs_review').length,
    lowConfidence: records.filter((record) => record.status === 'needs_review' && Number(record.overall_confidence) < 55).length,
    approved: records.filter((record) => record.status === 'approved').length,
    readyMachines: new Set(records.filter((record) => record.status === 'approved').map((record) => record.machine_id)).size,
  }), [records]);

  const filtered = useMemo(() => records.filter((record) => {
    const machine = machineMap[record.machine_id];
    const haystack = `${record.title} ${record.file_name} ${machine?.machine_name || ''} ${record.record_type}`.toLowerCase();
    return (machineFilter === 'all' || record.machine_id === machineFilter)
      && (statusFilter === 'all' || record.status === statusFilter)
      && (!lowConfidenceOnly || (record.status === 'needs_review' && Number(record.overall_confidence) < 55))
      && haystack.includes(search.toLowerCase());
  }), [lowConfidenceOnly, machineFilter, machineMap, records, search, statusFilter]);

  const updateRecord = (updated, notice) => {
    setRecords((current) => current.map((record) => record.record_id === updated.record_id ? updated : record));
    setSelectedRecord(updated);
    if (notice) setMessage(notice);
  };

  const exportBackup = async () => {
    if (selectedBackupMachines.length === 0) return setError('Select at least one machine to export.');
    setBackupBusy(true);
    setError('');
    try {
      const params = new URLSearchParams();
      selectedBackupMachines.forEach((machineId) => params.append('machine_id', machineId));
      const response = await apiFetch(`/vault/records/export?${params.toString()}`);
      if (!response.ok) throw new Error(await responseMessage(response, 'Backup could not be created.'));
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'TurboFix_machine_records_backup.zip';
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Backup created with originals, structured data, approvals, CSV, and MachineData files.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBackupBusy(false);
    }
  };

  const importBackup = async (file) => {
    if (!file) return;
    setBackupBusy(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const response = await apiFetch('/vault/records/import', { method: 'POST', body });
      if (!response.ok) throw new Error(await responseMessage(response, 'Backup could not be restored.'));
      const result = await response.json();
      setMessage(`${result.restored} record${result.restored === 1 ? '' : 's'} restored to the review inbox. ${result.skipped} skipped.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBackupBusy(false);
    }
  };

  return <AppShell active="records">
    <div className="records-page">
      <header className="records-page-head"><div><span className="records-kicker"><Sparkles />AI records workspace</span><h1>Turn old records into trusted machine knowledge.</h1><p>Upload handwritten registers or soft copies. TurboFix structures the information, your team verifies it, and only Maintenance Head approval makes it available to AI.</p></div><button className="records-button primary large" onClick={() => setUploadOpen(true)} disabled={!machines.length}><CloudUpload />Add records</button></header>
      <div className="records-flow-strip"><span><b>1</b><em>Upload</em><small>Photo or soft copy</small></span><ChevronRight /><span><b>2</b><em>AI reads</em><small>Structured draft</small></span><ChevronRight /><span><b>3</b><em>Team verifies</em><small>Correct uncertain data</small></span><ChevronRight /><span><b>4</b><em>Head approves</em><small>Available to TurboFix AI</small></span></div>
      {error && <div className="records-alert error"><TriangleAlert />{error}<button onClick={() => setError('')}><X /></button></div>}
      {message && <div className="records-alert success"><CheckCircle2 />{message}<button onClick={() => setMessage('')}><X /></button></div>}
      <section className="records-metrics"><MetricCard icon={<FileSearch />} value={metrics.needsReview} label="Waiting for review" tone="attention" onClick={() => { setTab('inbox'); setStatusFilter('needs_review'); setLowConfidenceOnly(false); }} /><MetricCard icon={<TriangleAlert />} value={metrics.lowConfidence} label="Low confidence" tone="warning" onClick={() => { setTab('inbox'); setStatusFilter('needs_review'); setLowConfidenceOnly(true); }} /><MetricCard icon={<ShieldCheck />} value={metrics.approved} label="Approved sources" tone="success" onClick={() => { setTab('knowledge'); setStatusFilter('approved'); setLowConfidenceOnly(false); }} /><MetricCard icon={<FileCheck2 />} value={`${metrics.readyMachines}/${machines.length}`} label="Machines with approved data" onClick={() => { setTab('knowledge'); setLowConfidenceOnly(false); }} /></section>
      <nav className="records-tabs" aria-label="AI records sections"><button className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}><FileSearch />Review inbox{metrics.needsReview > 0 && <b>{metrics.needsReview}</b>}</button><button className={tab === 'knowledge' ? 'active' : ''} onClick={() => setTab('knowledge')}><FileCheck2 />Approved knowledge</button><button className={tab === 'backup' ? 'active' : ''} onClick={() => setTab('backup')}><DatabaseBackup />Backup &amp; restore</button></nav>

      {tab === 'inbox' && <section className="records-panel"><div className="records-panel-head"><div><h2>Review inbox</h2><p>Check low-confidence fields first. Drafts never influence AI decisions until approval.</p></div><span className="records-head-note"><ShieldCheck />Maintenance Head approval required</span></div><div className="records-filters"><label className="records-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records or machines" /></label><select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)}><option value="all">All machines</option>{machines.map((machine) => <option value={machine.machine_id} key={machine.machine_id}>{machine.machine_name}</option>)}</select><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setLowConfidenceOnly(false); }}><option value="all">All statuses</option><option value="needs_review">Needs review</option><option value="approved">Approved</option><option value="rejected">Returned</option></select></div>{lowConfidenceOnly && <button type="button" className="records-active-filter" onClick={() => setLowConfidenceOnly(false)}>Low confidence only <X /></button>}{loading ? <div className="records-empty"><Sparkles className="spin" /><strong>Loading machine records…</strong></div> : filtered.length === 0 ? <div className="records-empty"><FileSearch /><strong>{records.length ? 'No records match these filters' : 'No records uploaded yet'}</strong><span>{records.length ? 'Clear a filter or try another machine.' : 'Start with a service register, job card, manual, BOM, or inspection sheet.'}</span>{!records.length && <button className="records-button primary" onClick={() => setUploadOpen(true)}><Plus />Add first record</button>}</div> : <div className="records-table"><div className="records-table-head"><span>Record</span><span>Machine</span><span>AI confidence</span><span>Status</span><span>Last activity</span><span /></div>{filtered.map((record) => <button className="records-table-row" key={record.record_id} onClick={() => setSelectedRecord(record)}><span className="records-title-cell"><i>{record.source_kind === 'handwritten' ? <Image /> : <FileText />}</i><span><strong>{record.title}</strong><small>{label(record.record_type)} · {record.file_name || 'Structured record'}</small></span></span><span><strong>{machineMap[record.machine_id]?.machine_name || record.machine_id}</strong><small>{machineMap[record.machine_id]?.location || record.machine_id}</small></span><Confidence value={record.overall_confidence} /><StatusBadge status={record.status} /><span><strong>{formatDate(record.updated_at)}</strong><small>Version {record.version}</small></span><ChevronRight /></button>)}</div>}</section>}

      {tab === 'knowledge' && <section className="records-panel"><div className="records-panel-head"><div><h2>Approved machine knowledge</h2><p>Only records approved by a Maintenance Head appear here and in future AI recommendations.</p></div><select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)}><option value="all">All machines</option>{machines.map((machine) => <option value={machine.machine_id} key={machine.machine_id}>{machine.machine_name}</option>)}</select></div><div className="records-knowledge-grid">{records.filter((record) => record.status === 'approved' && (machineFilter === 'all' || machineFilter === record.machine_id)).map((record) => <article className="records-knowledge-card" key={record.record_id}><div className="records-knowledge-card-head"><span><ShieldCheck /><b>Approved</b></span><Confidence value={record.overall_confidence} /></div><h3>{record.title}</h3><p>{record.extracted_data?.summary || 'Approved structured machine record.'}</p><div className="records-knowledge-tags">{Object.entries(SECTION_LABELS).filter(([section]) => record.extracted_data?.[section]?.length).map(([section, text]) => <span key={section}>{text} <b>{record.extracted_data[section].length}</b></span>)}</div><footer><span>{machineMap[record.machine_id]?.machine_name || record.machine_id}</span><button onClick={() => setSelectedRecord(record)}>View knowledge <ChevronRight /></button></footer></article>)}</div>{records.filter((record) => record.status === 'approved').length === 0 && <div className="records-empty"><ShieldCheck /><strong>No knowledge approved yet</strong><span>Review a draft and approve it as Maintenance Head to activate trusted AI context.</span></div>}</section>}

      {tab === 'backup' && <section className="records-backup-grid"><article className="records-backup-card primary"><div className="records-backup-icon"><DatabaseBackup /></div><span className="records-kicker">Portable backup</span><h2>Keep control of your machine history.</h2><p>Export original files, structured JSON, Excel-ready CSV, approval history, and each machine’s canonical MachineData Markdown.</p><div className="records-backup-includes"><span><Check />Original uploads</span><span><Check />Structured JSON</span><span><Check />CSV / Excel-ready data</span><span><Check />Approval history</span><span><Check />MachineData.md</span><span><Check />Internet-enriched data, if approved</span></div></article><article className="records-backup-card"><div className="records-card-heading"><div><span className="records-step-icon"><Download /></span><div><h3>Create backup</h3><p>Select one machine, several machines, or the full plant.</p></div></div></div><div className="records-machine-checks"><label className="all"><input type="checkbox" checked={selectedBackupMachines.length === machines.length && machines.length > 0} onChange={(event) => setSelectedBackupMachines(event.target.checked ? machines.map((machine) => machine.machine_id) : [])} /><span><strong>All plant machines</strong><small>{machines.length} machines</small></span></label>{machines.map((machine) => <label key={machine.machine_id}><input type="checkbox" checked={selectedBackupMachines.includes(machine.machine_id)} onChange={(event) => setSelectedBackupMachines((current) => event.target.checked ? [...current, machine.machine_id] : current.filter((id) => id !== machine.machine_id))} /><span><strong>{machine.machine_name}</strong><small>{machine.location || machine.machine_id}</small></span></label>)}</div><button className="records-button primary full" onClick={exportBackup} disabled={backupBusy || selectedBackupMachines.length === 0}><ArchiveRestore />{backupBusy ? 'Preparing backup…' : `Export ${selectedBackupMachines.length} machine${selectedBackupMachines.length === 1 ? '' : 's'}`}</button></article><article className="records-backup-card"><div className="records-card-heading"><div><span className="records-step-icon"><ArchiveRestore /></span><div><h3>Restore backup</h3><p>Bring structured records back into the same plant.</p></div></div></div><div className="records-restore-note"><ShieldCheck /><span><strong>Safe restore policy</strong>Restored records return to the review inbox. Maintenance Head approval is required again before AI can use them.</span></div>{user?.role === 'maintenance_head' ? <label className="records-restore-zone"><ArchiveRestore /><strong>Choose TurboFix backup ZIP</strong><span>Duplicate files are automatically skipped.</span><input type="file" accept=".zip,application/zip" disabled={backupBusy} onChange={(event) => { importBackup(event.target.files?.[0]); event.target.value = ''; }} /></label> : <div className="records-role-lock"><ShieldCheck /><strong>Maintenance Head access required</strong><span>Ask your Maintenance Head to restore a plant backup.</span></div>}</article></section>}
    </div>
    <UploadDialog machines={machines} initialMachineId={initialMachineId} open={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={() => { setMessage('AI draft created. Verify uncertain values before approval.'); load(); }} />
    <ReviewDialog record={selectedRecord} machine={machineMap[selectedRecord?.machine_id]} user={user} onClose={() => setSelectedRecord(null)} onUpdated={updateRecord} />
  </AppShell>;
}
