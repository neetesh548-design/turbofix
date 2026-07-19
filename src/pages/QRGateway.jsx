import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Cpu, ArrowRight, Sparkles, Mic, CheckCircle2, Volume2, VolumeX } from 'lucide-react';

const ORB_ANIMATIONS = `
@keyframes voice-ripple-1 {
  0% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.3); opacity: 0.2; }
  100% { transform: scale(1.6); opacity: 0; }
}
@keyframes voice-ripple-2 {
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.5); opacity: 0.15; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes voice-orb-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(134, 59, 255, 0.6)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 0 45px rgba(134, 59, 255, 0.85)); }
}
@keyframes voice-listening-orb {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.7)); }
  50% { transform: scale(1.08); filter: drop-shadow(0 0 55px rgba(239, 68, 68, 0.95)); }
}
`;

export default function QRGateway() {
  const [machine, setMachine] = useState({ id: '', name: '', loc: '' });
  const [lang, setLang] = useState('hi-IN'); // hi-IN, en-US
  const [isListening, setIsListening] = useState(false);
  const [speakFeedback, setSpeakFeedback] = useState(true);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [extractedInfo, setExtractedInfo] = useState(null); // { issue, condition, urgency }
  const [success, setSuccess] = useState(false);
  
  // Status lookup state
  const [showStatus, setShowStatus] = useState(false);
  const [activeTickets, setActiveTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Reporter state (remembered)
  const [reporterId] = useState(() => localStorage.getItem('tf_reporter_id') || 'EMP-OPERATOR');

  const recognitionRef = useRef(null);

  useEffect(() => {
    document.title = 'TurboFix — Voice Assistant';
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const name = params.get('name') || 'Machine';
    const loc = params.get('loc') || 'Plant Floor';
    setMachine({ id, name, loc });

    // Initialize Web Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang;

      rec.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setAssistantPrompt(lang === 'hi-IN' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now');
      };

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        handleUserSpeech(text);
      };

      rec.onerror = () => {
        setIsListening(false);
        const errMsg = lang === 'hi-IN' ? 'मैं सुन नहीं पाया। कृपया फिर से बोलें।' : "Sorry, I didn't catch that. Please speak again.";
        setAssistantPrompt(errMsg);
        speak(errMsg);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    // Greet user on load
    setTimeout(() => {
      greetUser();
    }, 800);

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [lang]);

  // Speak function for TTS
  const speak = (text) => {
    if (!speakFeedback || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop active speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const greetUser = () => {
    const greetingText = lang === 'hi-IN'
      ? `नमस्ते! मैं आपका टर्बोफिक्स सहायक हूँ। माइक दबाकर समस्या बताएं।`
      : `Hello! I am your TurboFix assistant. Tap the mic to describe the problem.`;
    
    setAssistantPrompt(greetingText);
    speak(greetingText);
  };

  // Convert Speech to issue parameters
  const handleUserSpeech = (text) => {
    setTranscript(text);
    
    let condition = 'running';
    let urgency = 'medium';
    const lowerText = text.toLowerCase();
    
    const isStopped = lowerText.includes('बंद') || lowerText.includes('stop') || lowerText.includes('not working') || lowerText.includes('काम नहीं कर रहा');
    const isUnsafe = lowerText.includes('खतरा') || lowerText.includes('unsafe') || lowerText.includes('धुआं') || lowerText.includes('smoke') || lowerText.includes('करंट') || lowerText.includes('shock');

    if (isUnsafe) {
      condition = 'unsafe';
      urgency = 'critical';
    } else if (isStopped) {
      condition = 'stopped';
      urgency = 'high';
    }

    const info = {
      issue: text,
      condition,
      urgency
    };

    setExtractedInfo(info);

    // Formulate response
    const confirmMessage = lang === 'hi-IN'
      ? `क्या मैं यह रिपोर्ट दर्ज करूँ?`
      : `Should I submit this ticket?`;
    
    setTimeout(() => {
      setAssistantPrompt(confirmMessage);
      speak(confirmMessage);
    }, 600);
  };

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        setExtractedInfo(null);
        setSuccess(false);
        recognitionRef.current.start();
      }
    } else {
      alert('Speech Recognition is not supported by your browser. Please try Chrome or Safari.');
    }
  };

  const submitTicket = async () => {
    if (!extractedInfo) return;
    
    const { data: factories } = await supabase.from('factories').select('id').limit(1);
    const factoryId = factories?.[0]?.id || null;

    const payload = {
      machine_id: machine.id,
      status: 'open',
      issue_text: extractedInfo.issue,
      urgency: extractedInfo.urgency,
      type: 'breakdown',
      reporter_phone: reporterId,
      factory_id: factoryId,
      ai_summary: {
        voice_reported: true,
        extracted_condition: extractedInfo.condition,
        reporter_id: reporterId
      }
    };

    try {
      const { error } = await supabase.from('tickets').insert(payload);
      if (error) throw error;

      const successText = lang === 'hi-IN'
        ? `टिकट दर्ज हो गया है! धन्यवाद।`
        : `Ticket logged successfully! Thank you.`;
      
      setAssistantPrompt(successText);
      speak(successText);
      setExtractedInfo(null);
      setSuccess(true);
    } catch (err) {
      alert('Error logging ticket: ' + err.message);
    }
  };

  const handleFetchStatus = async () => {
    if (!machine.id) return;
    setLoadingTickets(true);
    setShowStatus(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, status, issue_text, created_at')
        .eq('machine_id', machine.id)
        .eq('status', 'open');
      if (error) throw error;
      setActiveTickets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at center, #111029 0%, #05030a 100%)', color: '#e5edf6', fontFamily: 'Outfit, sans-serif', padding: '20px 16px', overflow: 'hidden', position: 'relative' }}>
      <style>{ORB_ANIMATIONS}</style>

      {/* Brand Header & Toggle */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" /></svg>
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', fontFamily: 'Rajdhani, sans-serif' }}>TURBOFIX</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* TTS Audio toggle */}
          <button 
            type="button" 
            onClick={() => setSpeakFeedback(!speakFeedback)} 
            style={{ background: 'transparent', border: 'none', color: speakFeedback ? '#863bff' : '#64748b', cursor: 'pointer' }}
            title="Toggle Voice Feedback"
          >
            {speakFeedback ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          
          {/* Language Toggle */}
          <select 
            value={lang} 
            onChange={(e) => { setLang(e.target.value); }} 
            style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', fontSize: '0.75rem', padding: '4px 8px' }}
          >
            <option value="hi-IN">Hindi (हिंदी)</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </header>

      {/* Machine Identity glass banner */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0', zIndex: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>{machine.name}</h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Location: {machine.loc}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#863bff', background: 'rgba(134,59,255,0.1)', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
          ID: {machine.id ? machine.id.slice(0, 8) : ''}
        </div>
      </div>

      {/* Voice Assistant Visualizer Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '40px 0' }}>
        
        {/* Glowing Orb ripple rings */}
        {isListening && (
          <>
            <div style={{ position: 'absolute', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', animation: 'voice-ripple-1 2s infinite ease-out', zIndex: 1 }} />
            <div style={{ position: 'absolute', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', animation: 'voice-ripple-2 2s infinite ease-out 1s', zIndex: 1 }} />
          </>
        )}

        {/* Central Assistant Orb */}
        <button
          type="button"
          onClick={startVoiceInput}
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: isListening 
              ? 'radial-gradient(circle, rgba(239,68,68,1) 0%, rgba(185,28,28,1) 100%)' 
              : 'radial-gradient(circle, rgba(134,59,255,1) 0%, rgba(91,33,182,1) 100%)',
            border: '4px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 5,
            outline: 'none',
            animation: isListening ? 'voice-listening-orb 1.8s infinite ease-in-out' : 'voice-orb-pulse 2.5s infinite ease-in-out',
            transition: 'all 0.3s ease'
          }}
        >
          <Mic size={40} color="white" />
        </button>

        {/* Orb instruction hint */}
        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '20px', zIndex: 5 }}>
          {isListening ? (lang === 'hi-IN' ? 'रोकने के लिए दबाएं' : 'Tap to stop') : (lang === 'hi-IN' ? 'बोलने के लिए दबाएं' : 'Tap to speak')}
        </span>
      </div>

      {/* Speech prompt & Live subtitles display */}
      <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px', marginBottom: '24px', zIndex: 5 }}>
        
        {/* Assistant voice query */}
        <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 12px', lineHeight: '1.4' }}>
          {assistantPrompt}
        </p>

        {/* Subtitles text (transcribed from user) */}
        {transcript && (
          <p style={{ fontSize: '0.9rem', color: '#863bff', fontStyle: 'italic', background: 'rgba(134,59,255,0.06)', border: '1px solid rgba(134,59,255,0.12)', padding: '10px 16px', borderRadius: '8px', maxWidth: '100%', wordBreak: 'break-word' }}>
            "{transcript}"
          </p>
        )}

        {/* Success screen visual confirmation */}
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '10px' }}>
            <CheckCircle2 size={18} />
            <span>Success ✓</span>
          </div>
        )}
      </div>

      {/* Confirmation Sliding Overlay Card */}
      {extractedInfo && (
        <div style={{ background: 'rgba(21, 30, 40, 0.85)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', borderRadius: '16px 16px 0 0', padding: '24px', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, boxShadow: '0 -10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>
              {lang === 'hi-IN' ? 'समस्या रिपोर्ट पुष्टि' : 'Confirm Issue Report'}
            </h4>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {lang === 'hi-IN' ? 'मशीन स्थिति:' : 'Machine Condition:'} <strong style={{ color: '#ef4444' }}>{extractedInfo.condition.replace('_', ' ').toUpperCase()}</strong>
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              onClick={() => setExtractedInfo(null)}
              style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {lang === 'hi-IN' ? 'फिर से बोलें' : 'Speak Again'}
            </button>
            <button 
              type="button" 
              onClick={submitTicket}
              style={{ flex: 1, padding: '14px', background: '#16a34a', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
            >
              {lang === 'hi-IN' ? 'हाँ, दर्ज करें' : 'Yes, Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Secondary control actions */}
      <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', zIndex: 10 }}>
        <button 
          type="button" 
          onClick={handleFetchStatus}
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', color: '#aab8c8', cursor: 'pointer' }}
        >
          {lang === 'hi-IN' ? 'खुले टिकट देखें' : 'View Open Tickets'}
        </button>
        <button 
          type="button" 
          onClick={() => {
            const base = import.meta.env.BASE_URL || '/';
            window.location.href = `${base}machines.html?machine=${machine.id}`;
          }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', color: '#aab8c8', cursor: 'pointer' }}
        >
          {lang === 'hi-IN' ? 'लॉगिन करें' : 'Login Dashboard'}
        </button>
      </div>

      {/* Ticket Status Timeline overlay */}
      {showStatus && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,24,0.96)', display: 'flex', flexDirection: 'column', padding: '24px', zIndex: 1000 }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'Rajdhani, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', color: 'white' }}>
            {lang === 'hi-IN' ? 'सक्रिय खुले टिकट' : 'Active Open Tickets'}
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loadingTickets ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading…</div>
            ) : activeTickets.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No active tickets.</div>
            ) : (
              activeTickets.map(t => (
                <div key={t.id} style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                    <span>{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>OPEN</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff', lineHeight: '1.4' }}>{t.issue_text}</p>
                </div>
              ))
            )}
          </div>
          
          <button 
            type="button" 
            onClick={() => setShowStatus(false)}
            style={{ width: '100%', padding: '14px', background: 'var(--brand, #863bff)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {lang === 'hi-IN' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      )}

    </main>
  );
}
