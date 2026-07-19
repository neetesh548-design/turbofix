import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Cpu, ArrowRight, Sparkles, Camera, Mic, CheckCircle2, Square, Trash2 } from 'lucide-react';

export default function QRGateway() {
  const [machine, setMachine] = useState({ id: '', name: '', loc: '', wa: '' });
  const [view, setView] = useState('menu'); // menu, report, status, success
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Form State
  const [reporterId, setReporterId] = useState(() => localStorage.getItem('tf_reporter_id') || '');
  const [editingReporter, setEditingReporter] = useState(!localStorage.getItem('tf_reporter_id'));
  const [condition, setCondition] = useState('running'); // running, stopped, unsafe, not_sure
  const [issueText, setIssueText] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Audio Recorder State
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    document.title = 'TurboFix — QR Gateway';
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const name = params.get('name') || 'Machine';
    const loc = params.get('loc') || 'Plant Floor';
    const wa = params.get('wa') || '';
    
    setMachine({ id, name, loc, wa });
  }, []);

  // Fetch active tickets for current machine
  const fetchActiveTickets = async () => {
    if (!machine.id) return;
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, status, issue_text, urgency, created_at')
        .eq('machine_id', machine.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleViewStatus = () => {
    setView('status');
    fetchActiveTickets();
  };

  // Audio Recording actions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
      };
      rec.start();
      setRecorder(rec);
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (recorder && recording) {
      recorder.stop();
      // stop stream tracks
      recorder.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioUrl('');
  };

  // Photo Input Handling
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDashboard = () => {
    const base = import.meta.env.BASE_URL || '/';
    window.location.href = `${base}machines.html?machine=${machine.id}`;
  };

  const submitIssue = async () => {
    if (!reporterId.trim()) {
      alert('Please enter your Employee ID / Mobile Number.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    try {
      // Save reporter ID to localStorage for future use
      localStorage.setItem('tf_reporter_id', reporterId.trim());

      // Fetch a default factory ID if not provided
      const { data: factories } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factories?.[0]?.id || null;

      // Pack files in ai_summary to avoid RLS/Bucket upload complexities for anonymous users
      const aiSummaryPayload = {
        machine_condition: condition,
        reporter_id: reporterId.trim(),
        reported_at: new Date().toISOString(),
        photo_data: imagePreview || null,
        voice_attached: !!audioUrl,
        device_reporting: true
      };

      const payload = {
        machine_id: machine.id,
        status: 'open',
        issue_text: issueText.trim() || `Breakdown reported anonymously. Condition: ${condition.replace('_', ' ')}.`,
        urgency: condition === 'unsafe' ? 'critical' : condition === 'stopped' ? 'high' : 'medium',
        type: 'breakdown',
        reporter_phone: reporterId.trim().match(/^\d{10}$/) ? reporterId.trim() : null,
        ai_summary: aiSummaryPayload,
        factory_id: factoryId
      };

      const { error } = await supabase.from('tickets').insert(payload);
      if (error) throw error;

      setView('success');
    } catch (err) {
      setSubmitError(err.message || 'Could not log ticket. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1118', color: '#e5edf6', fontFamily: 'Outfit, sans-serif', padding: '24px 16px' }}>
      
      {/* Brand Header */}
      <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '20px 0 30px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))' }}>
          <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" />
        </svg>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '1.5px', fontFamily: 'Rajdhani, sans-serif' }}>
          <span style={{ color: '#863bff' }}>TURBO</span>FIX
        </span>
      </header>

      {/* Main Content Area */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '440px', width: '100%', margin: '0 auto' }}>
        
        {/* Machine Badge Card */}
        <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'inline-flex', padding: '10px', background: 'rgba(134,59,255,0.1)', borderRadius: '12px', color: '#863bff', marginBottom: '12px' }}>
            <Cpu size={24} />
          </div>
          
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 4px', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {machine.name}
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 12px' }}>
            Location: {machine.loc}
          </p>
          
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
            ID: {machine.id ? machine.id.slice(0, 8) : ''}
          </div>
        </div>

        {/* View Routing */}

        {/* MENU VIEW */}
        {view === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ textAlign: 'center', fontSize: '0.95rem', color: '#94a3b8', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              What would you like to do?
            </h3>
            
            <button 
              type="button" 
              onClick={() => setView('report')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '20px',
                background: 'var(--brand, #863bff)',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(134,59,255,0.3)'
              }}
            >
              <span>[ REPORT AN ISSUE ]</span>
              <ArrowRight size={18} />
            </button>

            <button 
              type="button" 
              onClick={handleDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '20px',
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#e5edf6',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>[ LOGIN TO TURBOFIX ]</span>
              <ArrowRight size={18} />
            </button>

            <button 
              type="button" 
              onClick={handleViewStatus}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#aab8c8',
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginTop: '12px',
                textAlign: 'center',
                textDecoration: 'underline'
              }}
            >
              Existing issue already open? [ VIEW STATUS ]
            </button>
          </div>
        )}

        {/* REPORT ISSUE VIEW */}
        {view === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Reporter ID Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>Reporter Identification</label>
              {editingReporter ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={reporterId} 
                    onChange={(e) => setReporterId(e.target.value)} 
                    placeholder="Enter Employee ID or Mobile" 
                    style={{ flex: 1, background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px', color: 'white' }}
                  />
                  {localStorage.getItem('tf_reporter_id') && (
                    <button type="button" onClick={() => setEditingReporter(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px', color: 'white', cursor: 'pointer' }}>Cancel</button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 'bold' }}>Reporting as: {reporterId}</span>
                  <button type="button" onClick={() => setEditingReporter(true)} style={{ background: 'transparent', border: 'none', color: '#863bff', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
                </div>
              )}
            </div>

            {/* Media Capture Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}>Capture Issue (Photo / Voice)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {/* Photo Trigger */}
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#111827', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px', cursor: 'pointer', textAlign: 'center' }}>
                  <Camera size={24} color="#863bff" />
                  <span style={{ fontSize: '0.75rem', marginTop: '6px', color: '#aab8c8' }}>{imagePreview ? 'Photo Captured ✓' : 'Take Photo'}</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>

                {/* Voice Recorder */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#111827', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px', textAlign: 'center' }}>
                  {recording ? (
                    <button type="button" onClick={stopRecording} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Square size={24} color="#ef4444" />
                      <span style={{ fontSize: '0.75rem', marginTop: '6px', color: '#ef4444', animation: 'pulse 1s infinite' }}>Recording…</span>
                    </button>
                  ) : audioUrl ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <audio src={audioUrl} controls style={{ width: '100px', height: '24px' }} />
                      <button type="button" onClick={deleteRecording} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} color="#ef4444" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={startRecording} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Mic size={24} color="#863bff" />
                      <span style={{ fontSize: '0.75rem', marginTop: '6px', color: '#aab8c8' }}>Record Voice</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Photo Preview */}
              {imagePreview && (
                <div style={{ marginTop: '12px', position: 'relative' }}>
                  <img src={imagePreview} alt="Breakdown preview" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button type="button" onClick={() => setImagePreview('')} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                </div>
              )}
            </div>

            {/* Optional Text note */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>Optional short note</label>
              <textarea 
                value={issueText} 
                onChange={(e) => setIssueText(e.target.value)} 
                placeholder="Describe symptoms briefly (e.g. oil leakage, belt loose)" 
                rows={2}
                style={{ width: '100%', background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px', color: 'white', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {/* Machine Condition Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}>Machine Condition</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { id: 'running', label: 'Running with issue', color: '#eab308' },
                  { id: 'stopped', label: 'Stopped', color: '#ef4444' },
                  { id: 'unsafe', label: 'Unsafe', color: '#dc2626' },
                  { id: 'not_sure', label: 'Not Sure', color: '#64748b' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCondition(item.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: condition === item.id ? `${item.color}22` : '#111827',
                      border: `2px solid ${condition === item.id ? item.color : 'rgba(255,255,255,0.06)'}`,
                      color: condition === item.id ? '#ffffff' : '#94a3b8',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submission Actions */}
            {submitError && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: '8px', padding: '10px', fontSize: '0.85rem' }}>{submitError}</div>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => setView('menu')}
                style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Back
              </button>
              <button 
                type="button" 
                onClick={submitIssue}
                disabled={submitting || (editingReporter && !reporterId.trim())}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'var(--brand, #863bff)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  cursor: submitting || (editingReporter && !reporterId.trim()) ? 'not-allowed' : 'pointer',
                  opacity: submitting || (editingReporter && !reporterId.trim()) ? 0.6 : 1
                }}
              >
                {submitting ? 'Sending…' : 'Send Issue'}
              </button>
            </div>

          </div>
        )}

        {/* STATUS VIEW */}
        {view === 'status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', color: 'white' }}>Open Issues</h3>
            
            {loadingTickets ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Querying open tickets…</div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                No active open tickets found for this machine.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map((t) => (
                  <div key={t.id} style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: t.urgency === 'critical' ? 'rgba(239,68,68,0.15)' : t.urgency === 'high' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
                        color: t.urgency === 'critical' ? '#ef4444' : t.urgency === 'high' ? '#f97316' : '#e5edf6',
                        textTransform: 'uppercase'
                      }}>{t.urgency}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'white', lineHeight: '1.4' }}>{t.issue_text}</p>
                  </div>
                ))}
              </div>
            )}

            <button 
              type="button" 
              onClick={() => setView('menu')}
              style={{ padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}
            >
              Back to Menu
            </button>
          </div>
        )}

        {/* SUCCESS VIEW */}
        {view === 'success' && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(74,222,128,0.1)', borderRadius: '50%', color: '#4ade80', marginBottom: '20px' }}>
              <CheckCircle2 size={48} />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0 0 10px', fontFamily: 'Rajdhani, sans-serif' }}>
              ISSUE REGISTERED!
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '30px' }}>
              TurboFix has successfully started the maintenance workflow. The assigned technician has been notified.
            </p>

            <button 
              type="button" 
              onClick={() => { setView('menu'); setIssueText(''); setImagePreview(''); setAudioUrl(''); }}
              style={{ width: '100%', padding: '14px', background: 'var(--brand, #863bff)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        )}

      </section>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', padding: '40px 0 10px', fontSize: '0.8rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
          <Sparkles size={12} color="#f59e0b" />
          <span>Secured by TurboFix Maintenance Network</span>
        </div>
      </footer>

    </main>
  );
}
