import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Cpu, ArrowRight, Sparkles, Mic, CheckCircle2, RefreshCw, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

export default function QRGateway() {
  const [machine, setMachine] = useState({ id: '', name: '', loc: '' });
  const [lang, setLang] = useState('hi-IN'); // hi-IN, en-US
  const [chatLog, setChatLog] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [speakFeedback, setSpeakFeedback] = useState(true);
  const [extractedInfo, setExtractedInfo] = useState(null); // { issue, condition, urgency }
  
  // Status lookup state
  const [showStatus, setShowStatus] = useState(false);
  const [activeTickets, setActiveTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Reporter state (remembered)
  const [reporterId, setReporterId] = useState(() => localStorage.getItem('tf_reporter_id') || 'EMP-OPERATOR');

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
        addMessage('assistant-hint', lang === 'hi-IN' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now');
      };

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        handleUserSpeech(text);
      };

      rec.onerror = () => {
        setIsListening(false);
        addMessage('assistant', lang === 'hi-IN' ? 'क्षमा करें, मैं सुन नहीं पाया। कृपया माइक दबाकर फिर से बोलें।' : "Sorry, I didn't catch that. Please tap the mic and try again.");
        speak(lang === 'hi-IN' ? 'क्षमा करें, मैं सुन नहीं पाया। फिर से बोलें।' : "Sorry, I didn't catch that. Please speak again.");
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
      ? `नमस्ते! मैं आपका टर्बोफिक्स सहायक हूँ। कृपया माइक दबाकर मशीन की समस्या अपने शब्दों में बताएं।`
      : `Hello! I am your TurboFix assistant. Please tap the mic and tell me what is wrong with the machine.`;
    
    setChatLog([
      { sender: 'assistant', text: greetingText }
    ]);
    speak(greetingText);
  };

  const addMessage = (sender, text) => {
    setChatLog(prev => [...prev, { sender, text }]);
  };

  // Convert Speech to issue parameters
  const handleUserSpeech = (text) => {
    addMessage('user', text);
    
    // Simple heuristic parser for condition extraction
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
      ? `ठीक है, मुझे मशीन में समस्या मिली: "${text}"। मशीन की स्थिति: ${condition === 'stopped' ? 'बंद' : condition === 'unsafe' ? 'असुरक्षित' : 'चालू'} है। क्या मैं इसे दर्ज करूँ?`
      : `Got it. Problem: "${text}". Machine status: ${condition.replace('_', ' ')}. Should I submit this ticket?`;
    
    setTimeout(() => {
      addMessage('assistant', confirmMessage);
      speak(confirmMessage);
    }, 600);
  };

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        setExtractedInfo(null);
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
        ? `टिकट दर्ज हो गया है! टेक्नीशियन को सूचित कर दिया गया है।`
        : `Ticket logged successfully! The technician has been notified.`;
      
      addMessage('assistant', successText);
      speak(successText);
      setExtractedInfo(null);
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
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1118', color: '#e5edf6', fontFamily: 'Outfit, sans-serif', padding: '20px 16px' }}>
      
      {/* Brand Header & Toggle */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
            onChange={(e) => { setLang(e.target.value); setChatLog([]); }} 
            style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', fontSize: '0.75rem', padding: '4px 8px' }}
          >
            <option value="hi-IN">Hindi (हिंदी)</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </header>

      {/* Machine Identity Banner */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 24px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>{machine.name}</h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Location: {machine.loc}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#863bff', background: 'rgba(134,59,255,0.1)', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
          ID: {machine.id ? machine.id.slice(0, 8) : ''}
        </div>
      </div>

      {/* Conversational Chat View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
        {chatLog.map((msg, index) => (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              margin: '2px 0'
            }}
          >
            <div 
              style={{ 
                maxWidth: '85%', 
                background: msg.sender === 'user' ? '#863bff' : msg.sender === 'assistant-hint' ? 'rgba(255,255,255,0.04)' : '#1e293b', 
                color: msg.sender === 'assistant-hint' ? '#aab8c8' : '#ffffff',
                borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px', 
                padding: '12px 16px', 
                fontSize: '0.92rem',
                lineHeight: '1.4',
                fontStyle: msg.sender === 'assistant-hint' ? 'italic' : 'normal',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {/* Dynamic Confirmation Area */}
        {extractedInfo && (
          <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Extracted Condition:</span>
              <span style={{ 
                fontWeight: 'bold', 
                color: extractedInfo.condition === 'stopped' ? '#ef4444' : extractedInfo.condition === 'unsafe' ? '#dc2626' : '#eab308' 
              }}>
                {extractedInfo.condition.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setExtractedInfo(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {lang === 'hi-IN' ? 'फिर से बोलें' : 'Speak Again'}
              </button>
              <button 
                type="button" 
                onClick={submitTicket}
                style={{ flex: 1, padding: '10px', background: '#16a34a', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {lang === 'hi-IN' ? 'हाँ, दर्ज करें' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voice Assistant Center Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        
        <button 
          type="button" 
          onClick={startVoiceInput}
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: isListening ? '#ef4444' : 'var(--brand, #863bff)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isListening ? '0 0 20px #ef4444' : '0 8px 24px rgba(134,59,255,0.4)',
            transition: 'all 0.3s ease',
            animation: isListening ? 'pulse 1.5s infinite' : 'none'
          }}
        >
          <Mic size={32} />
        </button>

        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isListening ? (lang === 'hi-IN' ? 'बोलना बंद करें' : 'Tap to stop') : (lang === 'hi-IN' ? 'बोलने के लिए दबाएं' : 'Tap to speak')}
        </span>
      </div>

      {/* Additional Secondary Controls */}
      <div style={{ display: 'flex', justifyItems: 'center', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
        <button 
          type="button" 
          onClick={handleFetchStatus}
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', color: '#aab8c8', cursor: 'pointer' }}
        >
          {lang === 'hi-IN' ? 'टिकट स्थिति देखें' : 'View Open Tickets'}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,24,0.95)', display: 'flex', flexDirection: 'column', padding: '24px', zIndex: 1000 }}>
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
