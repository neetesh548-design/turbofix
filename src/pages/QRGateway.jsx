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
  const [technicianName, setTechnicianName] = useState('');
  
  // Status lookup state
  const [showStatus, setShowStatus] = useState(false);
  const [activeTickets, setActiveTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Duplicate Check and verification state
  const [duplicateTicket, setDuplicateTicket] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Reporter state (remembered)
  const [reporterPhone, setReporterPhone] = useState(() => localStorage.getItem('tf_reporter_phone') || '');
  const [phoneGate, setPhoneGate] = useState(() => !localStorage.getItem('tf_reporter_phone'));
  const [phoneInput, setPhoneInput] = useState('');

  const recognitionRef = useRef(null);

  useEffect(() => {
    document.title = 'TurboFix — Voice Assistant';
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const name = params.get('name') || 'Machine';
    const loc = params.get('loc') || 'Plant Floor';
    setMachine({ id, name, loc });

    const fetchMachineDetails = async () => {
      if (!id) return;
      try {
        const { data: mData } = await supabase
          .from('machines')
          .select('machine_name, location, technician_user_id')
          .eq('machine_id', id)
          .single();
        if (mData) {
          setMachine({
            id,
            name: mData.machine_name || name,
            loc: mData.location || loc
          });
          if (mData.technician_user_id) {
            const { data: uData } = await supabase
              .from('users')
              .select('name')
              .eq('user_id', mData.technician_user_id)
              .single();
            if (uData && uData.name) {
              setTechnicianName(uData.name);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching machine details:', err);
      }
    };
    fetchMachineDetails();

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

  const submitTicket = async (bypassDuplicateCheck = false) => {
    if (!extractedInfo) return;
    setCheckingDuplicate(true);

    try {
      // 1. Check for duplicate open tickets on this machine
      if (!bypassDuplicateCheck) {
        const { data: existingOpen } = await supabase
          .from('tickets')
          .select('id, issue_text, created_at')
          .eq('machine_id', machine.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingOpen && existingOpen.length > 0) {
          setDuplicateTicket(existingOpen[0]);
          const alertMsg = lang === 'hi-IN'
            ? 'इस मशीन के लिए पहले से ही एक खुला टिकट मौजूद है।'
            : 'An open ticket is already active for this machine.';
          setAssistantPrompt(alertMsg);
          speak(alertMsg);
          setCheckingDuplicate(false);
          return;
        }
      }

      // 2. Perform team verification checks to flag unverified reporters
      let verified = false;
      const { data: matchedUser } = await supabase
        .from('users')
        .select('role')
        .or(`phone.eq.${reporterPhone},user_id.eq.${reporterPhone}`)
        .limit(1);
      
      if (matchedUser && matchedUser.length > 0) {
        verified = true;
      }

      const { data: factories } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factories?.[0]?.id || null;

      const payload = {
        machine_id: machine.id,
        status: 'open',
        issue_text: extractedInfo.issue,
        urgency: extractedInfo.urgency,
        type: 'breakdown',
        reporter_phone: reporterPhone.match(/^\d+$/) ? reporterPhone : null,
        factory_id: factoryId,
        lifecycle_stage: verified ? 'open' : 'unverified',
        ai_summary: {
          voice_reported: true,
          extracted_condition: extractedInfo.condition,
          reporter_id: reporterPhone,
          verified_reporter: verified,
          flag: verified ? null : 'unverified_reporter'
        }
      };

      const { error } = await supabase.from('tickets').insert(payload);
      if (error) throw error;

      const successText = lang === 'hi-IN'
        ? `**धन्यवाद**! टिकट दर्ज हो गया है और टेक्नीशियन **${technicianName || 'सहायक'}** को सूचित कर दिया गया है।`
        : `**Thank you**! Ticket registered and assigned to technician **${technicianName || 'staff'}**.`;
      
      setAssistantPrompt(successText);
      speak(successText.replace(/\*\*/g, ''));
      setExtractedInfo(null);
      setDuplicateTicket(null);
      setSuccess(true);
    } catch (err) {
      alert('Error logging ticket: ' + err.message);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const appendTicket = async () => {
    if (!duplicateTicket || !extractedInfo) return;
    setCheckingDuplicate(true);
    try {
      const mergedText = `${duplicateTicket.issue_text}\n[Append from ${reporterPhone}]: ${extractedInfo.issue}`;
      const { error } = await supabase
        .from('tickets')
        .update({ issue_text: mergedText })
        .eq('id', duplicateTicket.id);

      if (error) throw error;

      const successText = lang === 'hi-IN'
        ? `**धन्यवाद**! विवरण टेक्नीशियन **${technicianName || 'सहायक'}** के खुले टिकट में जोड़ दिया गया है।`
        : `**Thank you**! Details appended to the open ticket for technician **${technicianName || 'staff'}**.`;
      
      setAssistantPrompt(successText);
      speak(successText.replace(/\*\*/g, ''));
      setExtractedInfo(null);
      setDuplicateTicket(null);
      setSuccess(true);
    } catch (err) {
      alert('Error appending to ticket: ' + err.message);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handlePhoneProceed = () => {
    if (!phoneInput.trim() || !phoneInput.match(/^\d{10}$/)) {
      alert(lang === 'hi-IN' ? 'कृपया एक वैध 10 अंकों का मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    localStorage.setItem('tf_reporter_phone', phoneInput.trim());
    setReporterPhone(phoneInput.trim());
    setPhoneGate(false);
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

  const renderPromptText = (text) => {
    if (typeof text !== 'string') return text;
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, idx) => {
      return idx % 2 === 1 ? <strong key={idx} style={{ color: '#ffffff', fontWeight: 'bold' }}>{part}</strong> : part;
    });
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
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Location: {machine.loc}
            {!phoneGate && reporterPhone && (
              <button 
                type="button" 
                onClick={() => { setPhoneGate(true); setPhoneInput(reporterPhone); }}
                style={{ background: 'transparent', border: 'none', color: '#863bff', cursor: 'pointer', marginLeft: '8px', textDecoration: 'underline', fontSize: '0.75rem', padding: 0 }}
              >
                (Change: {reporterPhone})
              </button>
            )}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#863bff', background: 'rgba(134,59,255,0.1)', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
          ID: {machine.id ? machine.id.slice(0, 8) : ''}
        </div>
      </div>

      {phoneGate ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '380px', width: '100%', margin: '0 auto', gap: '20px', zIndex: 10 }}>
          <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', textAlign: 'center' }}>
              {lang === 'hi-IN' ? 'मोबाइल नंबर सत्यापन' : 'Mobile Identification'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.4' }}>
              {lang === 'hi-IN' ? 'शिकायत/अनुरोध दर्ज करने के लिए कृपया अपना मोबाइल नंबर दर्ज करें' : 'Please enter your Mobile Number to register complaints or requests.'}
            </p>
            <input 
              type="tel" 
              maxLength={10} 
              value={phoneInput} 
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))} 
              placeholder="e.g. 9876543210" 
              style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px', fontSize: '1.05rem', color: 'white', letterSpacing: '2px', textAlign: 'center' }}
            />
            <button 
              type="button" 
              onClick={handlePhoneProceed} 
              style={{ width: '100%', padding: '14px', background: 'var(--brand, #863bff)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
            >
              {lang === 'hi-IN' ? 'आगे बढ़ें' : 'Proceed'}
            </button>
          </div>
        </div>
      ) : (
        <>
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
              {renderPromptText(assistantPrompt)}
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
            <div style={{ background: 'rgba(21, 30, 40, 0.95)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', borderRadius: '16px 16px 0 0', padding: '24px', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, boxShadow: '0 -10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {duplicateTicket ? (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 'bold', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      ⚠️ {lang === 'hi-IN' ? 'समान टिकट पहले से खुला है' : 'Similar Ticket Open'}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0' }}>
                      {lang === 'hi-IN' 
                        ? 'क्या आप इस टिकट में जानकारी जोड़ना चाहते हैं या नया टिकट बनाना चाहते हैं?' 
                        : 'Do you want to append comments to it or log a separate new breakdown?'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      type="button" 
                      onClick={appendTicket}
                      disabled={checkingDuplicate}
                      style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {lang === 'hi-IN' ? 'विवरण जोड़ें (अनुशंसित)' : 'Append Details (Recommended)'}
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="button" 
                        onClick={() => setDuplicateTicket(null)}
                        style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {lang === 'hi-IN' ? 'रद्द करें' : 'Cancel'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => submitTicket(true)}
                        disabled={checkingDuplicate}
                        style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {lang === 'hi-IN' ? 'नया टिकट बनाएं' : 'Create Separate'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                      onClick={() => submitTicket(false)}
                      disabled={checkingDuplicate}
                      style={{ flex: 1, padding: '14px', background: '#16a34a', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
                    >
                      {checkingDuplicate ? '...' : (lang === 'hi-IN' ? 'हाँ, दर्ज करें' : 'Yes, Submit')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
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
