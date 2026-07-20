import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Cpu, ArrowRight, Sparkles, Mic, CheckCircle2, Volume2, VolumeX, Camera, Image, Trash2 } from 'lucide-react';

const OFFLINE_QUEUE_KEY = 'tf_offline_tickets';
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
  const [machine, setMachine] = useState({ id: '', name: '', loc: '', tag: '' });
  const [lang, setLang] = useState(() => localStorage.getItem('tf_lang') || 'hi-IN'); // hi-IN, en-US, mr-IN
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
  const [errorAlert, setErrorAlert] = useState(null); // { title, desc }
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [manualCondition, setManualCondition] = useState('running'); // running, stopped, unsafe, not_sure
  
  // Photo capture and upload state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittedTicketInfo, setSubmittedTicketInfo] = useState(null);

  // Reporter state (remembered)
  const [reporterPhone, setReporterPhone] = useState(() => localStorage.getItem('tf_reporter_phone') || '');
  const [phoneGate, setPhoneGate] = useState(() => !localStorage.getItem('tf_reporter_phone'));
  const [phoneInput, setPhoneInput] = useState('');

  // Offline queue state
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);

  // Auto-retry helper for transient edge function failures
  const invokeWithRetry = async (functionName, options, maxRetries = 2) => {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const result = await supabase.functions.invoke(functionName, options);
        if (result.error && (result.error.message.includes('non-2xx') || result.error.message.includes('FetchError'))) {
          throw result.error;
        }
        return result;
      } catch (err) {
        if (attempt === maxRetries) return { error: err };
        console.warn(`Transient error, retrying ${functionName} (attempt ${attempt + 1})...`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        attempt++;
      }
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      console.log('Back online! Syncing offline tickets...');
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      if (queue.length === 0) return;

      const newQueue = [];
      for (const item of queue) {
        try {
          // If we had the actual endpoint, we would hit it here.
          // For now, we will hit the edge function directly.
          const { error } = await supabase.functions.invoke('ai_assistant', {
            body: { action: 'log_ticket', payload: item }
          });
          if (error) {
            console.error('Failed to sync offline ticket:', error);
            newQueue.push(item);
          } else {
            console.log('Successfully synced offline ticket', item.machine_id);
          }
        } catch (err) {
          console.error('Network error during sync:', err);
          newQueue.push(item);
        }
      }
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

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
        let query = supabase
          .from('machines')
          .select('id, name, location, technician_user_id, factory_id');
        
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          query = query.eq('id', id);
        } else {
          query = query.or(`id.eq.${id},asset_code.eq.${id},name.eq.${id}`);
        }

        const { data: mDataArr, error: mErr } = await query.limit(1);
        if (mErr) console.error('Error fetching machine:', mErr);
        const mData = mDataArr?.[0];

        if (mData) {
          setMachine({
            id: mData.id,
            name: mData.name || name,
            loc: mData.location || loc,
            tag: id,
            factory_id: mData.factory_id
          });
          if (mData.technician_user_id) {
            const { data: uData } = await supabase
              .from('users')
              .select('name')
              .eq('id', mData.technician_user_id)
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

    const handleWindowFocus = () => {
      greetUser();
    };
    window.addEventListener('focus', handleWindowFocus);

    // Greet user on load or when language preference changes
    setTimeout(() => {
      greetUser();
    }, 800);

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [lang, phoneGate]);

  // Speak function for TTS — picks the best available voice per language
  const speak = (text) => {
    if (!speakFeedback || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Pick a natural-sounding voice; fall back gracefully
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let best = null;
      const langPrefix = lang.split('-')[0]; // 'en', 'hi', 'mr'

      // Prefer names containing these keywords (natural / high-quality voices)
      const preferredKeywords = lang === 'en-US'
        ? ['google us', 'samantha', 'karen', 'daniel', 'google uk', 'rishi', 'moira', 'aaron']
        : lang === 'hi-IN'
        ? ['google हिन्दी', 'google hindi', 'lekha']
        : ['google मराठी', 'google marathi'];

      // Pass 1 — exact preferred match
      for (const v of voices) {
        const vName = v.name.toLowerCase();
        if (preferredKeywords.some(k => vName.includes(k))) {
          best = v;
          break;
        }
      }

      // Pass 2 — any voice matching the language
      if (!best) {
        best = voices.find(v => v.lang === lang)
            || voices.find(v => v.lang.startsWith(langPrefix));
      }

      if (best) utterance.voice = best;
    }

    // Slow down English slightly for factory workers; Hindi/Marathi at normal pace
    utterance.rate = lang === 'en-US' ? 0.85 : 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  // Pre-load voices (Chrome loads them asynchronously)
  useEffect(() => {
    const loadVoices = () => window.speechSynthesis?.getVoices();
    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  const greetUser = () => {
    let greetingText = '';
    if (phoneGate) {
      if (lang === 'hi-IN') {
        greetingText = 'नमस्ते! शिकायत दर्ज करने के लिए अपना मोबाइल नंबर दर्ज करें और भाषा चुनें।';
      } else if (lang === 'mr-IN') {
        greetingText = 'नमस्कार! तक्रार नोंदवण्यासाठी कृपया आपला मोबाईल नंबर टाका आणि भाषा निवडा.';
      } else {
        greetingText = 'Welcome to TurboFix. Please type your 10 digit mobile number, then tap Proceed.';
      }
    } else {
      if (lang === 'hi-IN') {
        greetingText = 'नमस्ते! मैं आपका टर्बोफिक्स सहायक हूँ। माइक दबाकर समस्या बताएं।';
      } else if (lang === 'mr-IN') {
        greetingText = 'नमस्कार! मी आपला टर्बोफिक्स सहाय्यक आहे. समस्येचे वर्णन करण्यासाठी माइक दाबा.';
      } else {
        greetingText = 'I am your TurboFix assistant. Tap the big purple button to speak your problem. Or tap Write to type it instead.';
      }
    }
    
    setAssistantPrompt(greetingText);
    speak(greetingText);
  };

  const suggestUrgency = (text) => {
    const t = (text || '').toLowerCase();
    if (/\b(fire|smoke|burning|spark|shock|injur|accident|gas leak|not safe|danger)\b/.test(t)) return 'critical';
    if (/\b(stopped|not working|breakdown|down|leak|overheat|hot|noise|vibrat|smell|jam)\b/.test(t)) return 'high';
    if (/\b(slow|minor|small|sometimes|occasional)\b/.test(t)) return 'low';
    return 'medium';
  };

  const suggestCondition = (text) => {
    const t = (text || '').toLowerCase();
    if (/\b(unsafe|fire|smoke|burning|spark|shock|danger)\b/.test(t)) return 'unsafe';
    if (/\b(stopped|not working|breakdown|down|jam)\b/.test(t)) return 'stopped';
    return 'running';
  };

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    setAssistantPrompt(lang === 'hi-IN' ? 'समझ रहा हूँ...' : lang === 'mr-IN' ? 'ऐकलेले समजत आहे...' : 'Understanding your words, please wait...');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error } = await invokeWithRetry('ai_assistant', {
        body: { action: 'transcribe', audio: dataUrl }
      });
      if (error || !data || data.error) throw new Error(data?.error || error?.message || 'Transcription failed.');
      const text = String(data.transcript || '').trim();
      if (!text) {
        let noSpeechMsg = '';
        if (lang === 'hi-IN') {
          noSpeechMsg = 'कोई आवाज नहीं सुनी गई। कृपया फिर से प्रयास करें या लिखें।';
        } else if (lang === 'mr-IN') {
          noSpeechMsg = 'काहीही ऐकू आले नाही. कृपया पुन्हा प्रयत्न करा किंवा लिहून कळवा.';
        } else {
          noSpeechMsg = 'No speech was detected. Please try again or type the problem.';
        }
        setAssistantPrompt(noSpeechMsg);
        speak(noSpeechMsg);
        return;
      }
      
      setTranscript(text);
      
      const condition = suggestCondition(text);
      setManualCondition(condition);
      setShowTextFallback(true);
      
      let reviewMsg = '';
      if (lang === 'hi-IN') {
        reviewMsg = 'नीचे दिए गए समस्या विवरण की जांच करें और समीक्षा करें बटन दबाएं।';
      } else if (lang === 'mr-IN') {
        reviewMsg = 'खालील समस्येचे पुनरावलोकन करा आणि अहवाल पुनरावलोकन दाबा.';
      } else {
        reviewMsg = 'Please review the transcribed text below and tap Review Report.';
      }
      
      setAssistantPrompt(reviewMsg);
      speak(reviewMsg);
    } catch (err) {
      console.error(err);
      let errMsg = '';
      if (lang === 'hi-IN') {
        errMsg = 'ट्रांसक्रिप्शन नहीं हो सका। कृपया लिखकर दर्ज करें।';
      } else if (lang === 'mr-IN') {
        errMsg = 'आवाज ओळखता आली नाही. कृपया टाईप करून कळवा.';
      } else {
        errMsg = 'Could not transcribe speech. Please type your problem.';
      }
      setAssistantPrompt(errMsg);
      speak(errMsg);
      setShowTextFallback(true);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setSubmittedTicketInfo(null);
    removePhoto();
    setTranscript('');
    setExtractedInfo(null);
    setDuplicateTicket(null);
    setShowTextFallback(false);
    setManualCondition('running');
    setCheckingDuplicate(false);
    setUploadingPhoto(false);
    greetUser();
  };

  const renderPhotoAttachment = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 5, width: '100%', maxWidth: '340px', margin: '12px auto' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>
          {lang === 'hi-IN' ? 'फोटो अटैच करें (वैकल्पिक)' : 'Attach Photo (Optional)'}
        </label>
        {photoPreview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0b1118', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={photoPreview} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1', wordBreak: 'break-all' }}>{photoFile?.name}</span>
              <button 
                type="button" 
                onClick={removePhoto} 
                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              >
                <Trash2 size={14} /> {lang === 'hi-IN' ? 'हटाएं' : 'Remove'}
              </button>
            </div>
          </div>
        ) : (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0b1118', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', padding: '12px', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            <Camera size={18} color="#863bff" />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {lang === 'hi-IN' ? 'फोटो लें या अपलोड करें' : 'Take Photo or Upload'}
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </label>
        )}
      </div>
    );
  };

  const startVoiceInput = async () => {
    setErrorAlert(null);
    if (isListening) {
      recorderRef.current?.stop();
      return;
    }
    
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErrorAlert({
        title: lang === 'hi-IN' ? 'माइक एक्सेस समस्या' : 'Microphone Access Blocked',
        desc: lang === 'hi-IN'
          ? 'आपका ब्राउज़र आवाज रिकॉर्डिंग का समर्थन नहीं करता है। कृपया Chrome या Safari का उपयोग करें।'
          : 'Voice recording is not supported on this browser. Please try Chrome or Safari.'
      });
      setShowTextFallback(true);
      return;
    }

    setExtractedInfo(null);
    setSuccess(false);
    setTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await transcribeAudio(blob);
      };

      recorderRef.current = recorder;
      setIsListening(true);
      setAssistantPrompt(lang === 'hi-IN' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now');
      recorder.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setErrorAlert({
        title: lang === 'hi-IN' ? 'माइक एक्सेस समस्या' : 'Microphone Access Blocked',
        desc: lang === 'hi-IN'
          ? 'टर्बोफिक्स को बोलने के लिए माइक अनुमति की आवश्यकता है। कृपया ब्राउज़र सेटिंग में अनुमति दें।'
          : 'TurboFix needs microphone permissions to listen. Please enable it in your browser settings.'
      });
      setShowTextFallback(true);
    }
  };

  const submitTicket = async (bypassDuplicateCheck = false) => {
    if (!extractedInfo || isSubmittingTicket) return;
    setIsSubmittingTicket(true);
    setCheckingDuplicate(true);
    setUploadingPhoto(true);

    try {
      // --- OFFLINE QUEUEING ---
      if (!navigator.onLine) {
        console.log('Device is offline. Queuing ticket locally.');
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        
        const payload = {
          machine_id: machine.id,
          status: 'open',
          issue_text: extractedInfo.issue,
          urgency: extractedInfo.urgency,
          type: 'breakdown',
          reporter_phone: reporterPhone.match(/^\d+$/) ? reporterPhone : null,
          factory_id: machine.factory_id, // Might be null if offline
          lifecycle_stage: 'unverified', // Cannot verify offline
          ai_summary: {
            voice_reported: !showTextFallback,
            extracted_condition: extractedInfo.condition,
            reporter_id: reporterPhone,
            verified_reporter: false,
            flag: 'offline_submission',
            photo_url: null
          }
        };
        
        queue.push(payload);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        setOfflineQueued(true);

        const successText = lang === 'hi-IN' ? 'ऑफ़लाइन सहेजा गया। इंटरनेट आते ही सिंक हो जाएगा।'
          : lang === 'mr-IN' ? 'ऑफलाइन सेव्ह केले. इंटरनेट आल्यावर सिंक होईल.'
          : 'Saved offline. Ticket will sync when internet returns.';
          
        setAssistantPrompt(successText);
        speak(successText);
        setExtractedInfo(null);
        setDuplicateTicket(null);
        setSuccess(true);
        return;
      }
      // ------------------------

      // 1. Check for duplicate open tickets on this machine
      if (!bypassDuplicateCheck) {
        const { data: dupData, error: dupErr } = await invokeWithRetry('ai_assistant', {
          body: { action: 'check_duplicate', machine_id: machine.id }
        });
        if (dupErr || !dupData || dupData.error) {
          console.error('Error checking duplicates:', dupErr || dupData?.error);
        } else if (dupData.duplicate) {
          setDuplicateTicket(dupData.duplicate);
          const alertMsg = lang === 'hi-IN'
            ? 'इस मशीन के लिए पहले से ही एक खुला टिकट मौजूद है।'
            : 'An open ticket is already active for this machine.';
          setAssistantPrompt(alertMsg);
          speak(alertMsg);
          setCheckingDuplicate(false);
          setUploadingPhoto(false);
          return;
        }
      }

      // 2. Perform team verification checks to flag unverified reporters
      let verified = false;
      if (reporterPhone) {
        const { data: matchedUser } = await supabase
          .from('users')
          .select('role')
          .or(`phone.eq.${reporterPhone},phone.eq.+91${reporterPhone}`)
          .limit(1);
        
        if (matchedUser && matchedUser.length > 0) {
          verified = true;
        }
      }

      let factoryId = machine.factory_id;
      if (!factoryId) {
        // Fallback to fetching factory_id through public function
        const { data: factData } = await invokeWithRetry('ai_assistant', {
          body: { action: 'get_factory_id' }
        });
        factoryId = factData?.factory_id || null;
      }

      // Upload Photo if present
      let uploadedUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `issue-${machine.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${machine.id}/${fileName}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('repair-proofs')
          .upload(filePath, photoFile);
          
        if (uploadErr) throw uploadErr;
        
        const { data: { publicUrl } } = supabase.storage
          .from('repair-proofs')
          .getPublicUrl(filePath);
          
        uploadedUrl = publicUrl;
      }

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
          voice_reported: !showTextFallback,
          extracted_condition: extractedInfo.condition,
          reporter_id: reporterPhone,
          verified_reporter: verified,
          flag: verified ? null : 'unverified_reporter',
          photo_url: uploadedUrl
        }
      };

      const { data, error: fnError } = await invokeWithRetry('ai_assistant', {
        body: { action: 'log_ticket', payload }
      });
      if (fnError || !data || data.error) throw new Error(data?.error || fnError?.message || 'Could not log ticket.');
      const insertedTicket = data.data;

      setSubmittedTicketInfo(insertedTicket);

      let successText = '';
      if (lang === 'hi-IN') {
        successText = `**धन्यवाद**! टिकट दर्ज हो गया है और टेक्नीशियन **${technicianName || 'सहायक'}** को सूचित कर दिया गया है।`;
      } else if (lang === 'mr-IN') {
        successText = `**धन्यवाद**! तिकीट नोंदवले गेले आहे आणि तंत्रज्ञ **${technicianName || 'कर्मचारी'}** यांना सूचित केले गेले आहे.`;
      } else {
        successText = `**Thank you**! Ticket registered and assigned to technician **${technicianName || 'staff'}**.`;
      }
      
      setAssistantPrompt(successText);
      speak(successText.replace(/\*\*/g, ''));
      setExtractedInfo(null);
      setDuplicateTicket(null);
      setSuccess(true);
    } catch (err) {
      console.error('Error logging ticket:', err);
      const errMsg = lang === 'hi-IN' ? 'टिकट दर्ज करने में समस्या हुई। कृपया दोबारा प्रयास करें।'
        : lang === 'mr-IN' ? 'तिकीट नोंदवताना समस्या आली. कृपया पुन्हा प्रयत्न करा.'
        : 'There was a problem submitting your ticket. Please try again.';
      setAssistantPrompt(errMsg);
      speak(errMsg);
      setErrorAlert({ title: lang === 'hi-IN' ? 'सबमिट त्रुटि' : 'Submission Error', desc: err.message });
    } finally {
      setIsSubmittingTicket(false);
      setCheckingDuplicate(false);
      setUploadingPhoto(false);
    }
  };

  const appendTicket = async () => {
    if (!duplicateTicket || !extractedInfo) return;
    setCheckingDuplicate(true);
    setUploadingPhoto(true);
    try {
      let uploadedUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `issue-${machine.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${machine.id}/${fileName}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('repair-proofs')
          .upload(filePath, photoFile);
          
        if (uploadErr) throw uploadErr;
        
        const { data: { publicUrl } } = supabase.storage
          .from('repair-proofs')
          .getPublicUrl(filePath);
          
        uploadedUrl = publicUrl;
      }

      const { data: fetchResult, error: fetchErr } = await invokeWithRetry('ai_assistant', {
        body: { action: 'get_ticket', ticket_id: duplicateTicket.id }
      });
      if (fetchErr || !fetchResult || fetchResult.error) {
        throw new Error(fetchResult?.error || fetchErr?.message || 'Could not fetch existing ticket details.');
      }
      const currentTicket = fetchResult.data;
      
      const mergedSummary = {
        ...(currentTicket?.ai_summary || {}),
        photo_url: uploadedUrl || currentTicket?.ai_summary?.photo_url || null
      };

      const mergedText = `${duplicateTicket.issue_text}\n[Append from ${reporterPhone}]: ${extractedInfo.issue}`;
      
      const { data, error: fnError } = await invokeWithRetry('ai_assistant', {
        body: {
          action: 'update_ticket',
          ticket_id: duplicateTicket.id,
          patches: {
            issue_text: mergedText,
            ai_summary: mergedSummary
          }
        }
      });
      if (fnError || !data || data.error) throw new Error(data?.error || fnError?.message || 'Could not append details.');
      const updatedTicket = data.data;

      setSubmittedTicketInfo(updatedTicket);

      let successText = '';
      if (lang === 'hi-IN') {
        successText = `**धन्यवाद**! विवरण टेक्नीशियन **${technicianName || 'सहायक'}** के खुले टिकट में जोड़ दिया गया है।`;
      } else if (lang === 'mr-IN') {
        successText = `**धन्यवाद**! तपशील तंत्रज्ञ **${technicianName || 'कर्मचारी'}** यांच्या खुल्या तिकीट मध्ये जोडले गेले आहेत.`;
      } else {
        successText = `**Thank you**! Details appended to the open ticket for technician **${technicianName || 'staff'}**.`;
      }
      
      setAssistantPrompt(successText);
      speak(successText.replace(/\*\*/g, ''));
      setExtractedInfo(null);
      setDuplicateTicket(null);
      setSuccess(true);
    } catch (err) {
      alert('Error appending to ticket: ' + err.message);
    } finally {
      setCheckingDuplicate(false);
      setUploadingPhoto(false);
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
    
    // Announce instructions immediately on transition to step 2 (recording state)
    setTimeout(() => {
      let greetingText = '';
      if (lang === 'hi-IN') {
        greetingText = 'नमस्ते! मैं आपका टर्बोफिक्स सहायक हूँ। माइक दबाकर समस्या बताएं।';
      } else if (lang === 'mr-IN') {
        greetingText = 'नमस्कार! मी आपला टर्बोफिक्स सहाय्यक आहे. समस्येचे वर्णन करण्यासाठी माइक दाबा.';
      } else {
        greetingText = 'I am your TurboFix assistant. Tap the big purple button to speak your problem. Or tap Write to type it instead.';
      }
      setAssistantPrompt(greetingText);
      speak(greetingText);
    }, 400);
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
          <button
            type="button"
            onClick={greetUser}
            style={{
              background: '#863bff',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.72rem',
              padding: '5px 9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(134,59,255,0.2)'
            }}
          >
            <Volume2 size={12} />
            {lang === 'hi-IN' ? 'आवाज सुनें' : lang === 'mr-IN' ? 'सूचना ऐका' : 'Listen Guide'}
          </button>

          <select 
            value={lang} 
            onChange={(e) => { 
              const newLang = e.target.value;
              setLang(newLang); 
              localStorage.setItem('tf_lang', newLang);
            }} 
            style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', fontSize: '0.75rem', padding: '5px 8px' }}
          >
            <option value="hi-IN">Hindi (हिंदी)</option>
            <option value="en-US">English</option>
            <option value="mr-IN">Marathi (मराठी)</option>
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
          ID: {machine.tag || (machine.id ? machine.id.slice(0, 8) : '')}
        </div>
      </div>

      {errorAlert && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '14px 18px', width: '100%', maxWidth: '380px', margin: '0 auto 16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ef4444' }}>{errorAlert.title}</span>
          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>{errorAlert.desc}</span>
          <button type="button" onClick={() => setErrorAlert(null)} style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 12px', fontSize: '0.75rem', color: 'white', cursor: 'pointer', marginTop: '4px' }}>Dismiss</button>
        </div>
      )}

      {phoneGate ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '380px', width: '100%', margin: '0 auto', gap: '20px', zIndex: 10 }}>
          <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', textAlign: 'center' }}>
              {lang === 'hi-IN' ? 'मोबाइल नंबर सत्यापन' : lang === 'mr-IN' ? 'मोबाईल नंबर पडताळणी' : 'Mobile Identification'}
            </h3>
            
            {/* Preferred Language selector in Phone Gate card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>
                {lang === 'hi-IN' ? 'अपनी भाषा चुनें:' : lang === 'mr-IN' ? 'आपली भाषा निवडा:' : 'Select preferred language:'}
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['hi-IN', 'en-US', 'mr-IN'].map((langCode) => {
                  const label = langCode === 'hi-IN' ? 'हिंदी' : langCode === 'mr-IN' ? 'मराठी' : 'English';
                  const active = lang === langCode;
                  return (
                    <button
                      key={langCode}
                      type="button"
                      onClick={() => { 
                        setLang(langCode);
                        localStorage.setItem('tf_lang', langCode);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: active ? '#863bff' : '#0b1118',
                        border: active ? '1px solid #863bff' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.4' }}>
              {lang === 'hi-IN' 
                ? 'शिकायत/अनुरोध दर्ज करने के लिए कृपया अपना मोबाइल नंबर दर्ज करें' 
                : lang === 'mr-IN'
                ? 'तक्रार किंवा विनंती नोंदवण्यासाठी कृपया आपला मोबाईल नंबर टाका.'
                : 'Please enter your Mobile Number to register complaints or requests.'}
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
              {lang === 'hi-IN' ? 'आगे बढ़ें' : lang === 'mr-IN' ? 'पुढे जा' : 'Proceed'}
            </button>
          </div>
        </div>
      ) : success ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '400px', width: '100%', margin: '0 auto', gap: '20px', zIndex: 10 }}>
          <div style={{ 
            background: '#151e28', 
            border: '1px solid rgba(22, 163, 74, 0.3)', 
            borderRadius: '16px', 
            padding: '24px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#4ade80' }}>
              <CheckCircle2 size={48} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>
              {lang === 'hi-IN' ? 'टिकट सफलतापूर्वक दर्ज हुआ!' : lang === 'mr-IN' ? 'तिकीट यशस्वीरित्या नोंदवले गेले!' : 'Ticket Registered Successfully!'}
            </h3>
            {submittedTicketInfo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', background: '#0b1118', padding: '16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>{lang === 'hi-IN' ? 'वर्क ऑर्डर संख्या:' : lang === 'mr-IN' ? 'वर्क ऑर्डर क्रमांक:' : 'Work Order No:'}</span>
                  <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{submittedTicketInfo.wo_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>{lang === 'hi-IN' ? 'मशीन:' : lang === 'mr-IN' ? 'मशीन:' : 'Machine:'}</span>
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{machine.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>{lang === 'hi-IN' ? 'प्राथमिक टेक्नीशियन:' : lang === 'mr-IN' ? 'प्राथमिक तंत्रज्ञ:' : 'Primary Tech:'}</span>
                  <span style={{ color: '#863bff', fontWeight: 'bold' }}>{technicianName || (lang === 'hi-IN' ? 'आवंटित नहीं' : lang === 'mr-IN' ? 'नियुक्त नाही' : 'Not Assigned')}</span>
                </div>
                {photoPreview && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>{lang === 'hi-IN' ? 'अटैच किया गया फोटो:' : lang === 'mr-IN' ? 'जोडलेला फोटो:' : 'Attached Photo:'}</span>
                    <img src={photoPreview} alt="Attached issue" style={{ width: '100%', maxHeight: '150px', borderRadius: '6px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            )}
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
              {lang === 'hi-IN' 
                ? `वर्क ऑर्डर दर्ज कर दिया गया है। टेक्नीशियन ${technicianName || 'सहायक'} को व्हाट्सएप संदेश भेज दिया गया है।` 
                : lang === 'mr-IN'
                ? `वर्क ऑर्डर नोंदवला गेला आहे. तंत्रज्ञ ${technicianName || 'कर्मचारी'} यांना व्हॉट्सॲप संदेश पाठवला गेला आहे.`
                : `Work order registered. Dispatch notification has been routed to technician ${technicianName || 'staff'}.`}
            </p>
            <button 
              type="button" 
              onClick={resetForm}
              style={{ width: '100%', padding: '12px', background: 'var(--brand, #863bff)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {lang === 'hi-IN' ? 'दूसरी समस्या रिपोर्ट करें' : lang === 'mr-IN' ? 'दुसरी समस्या नोंदवा' : 'Report Another Issue'}
            </button>
          </div>
        </div>
      ) : showTextFallback ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0', zIndex: 10 }}>
          <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textAlign: 'center' }}>
              {lang === 'hi-IN' ? 'समस्या का विवरण लिखें' : 'Write Issue Description'}
            </h3>
            
            {assistantPrompt && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', textAlign: 'center', lineHeight: '1.4', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {assistantPrompt}
              </p>
            )}
            
            <div>
              <textarea 
                rows={3}
                value={transcript} 
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={lang === 'hi-IN' ? 'मशीन की समस्या लिखें (उदा. ऑइल लीक हो रहा है)' : 'e.g. Oil leak near gearbox'}
                style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px', color: 'white', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}>
                {lang === 'hi-IN' ? 'मशीन की स्थिति' : 'Machine Condition'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'running', label: lang === 'hi-IN' ? 'चालू है (समस्या के साथ)' : 'Running with issue', color: '#eab308' },
                  { id: 'stopped', label: lang === 'hi-IN' ? 'बंद है' : 'Stopped', color: '#ef4444' },
                  { id: 'unsafe', label: lang === 'hi-IN' ? 'असुरक्षित है' : 'Unsafe', color: '#dc2626' },
                  { id: 'not_sure', label: lang === 'hi-IN' ? 'पता नहीं' : 'Not Sure', color: '#64748b' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setManualCondition(item.id)}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      background: manualCondition === item.id ? `${item.color}22` : '#0b1118',
                      border: `2px solid ${manualCondition === item.id ? item.color : 'rgba(255,255,255,0.06)'}`,
                      color: manualCondition === item.id ? '#ffffff' : '#94a3b8',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {renderPhotoAttachment()}

             <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button 
                type="button" 
                onClick={() => setShowTextFallback(false)}
                style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                {lang === 'hi-IN' ? 'रद्द करें' : lang === 'mr-IN' ? 'रद्द करा' : 'Cancel'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  console.log("DEBUG: Review Report button clicked. Current transcript:", transcript);
                  if (!transcript.trim()) {
                    console.log("DEBUG: Transcript is empty, showing alert");
                    alert(lang === 'hi-IN' ? 'कृपया समस्या का विवरण लिखें।' : lang === 'mr-IN' ? 'कृपया समस्येचे वर्णन लिहा.' : 'Please describe the issue.');
                    return;
                  }
                  const info = {
                    issue: transcript.trim(),
                    condition: manualCondition,
                    urgency: manualCondition === 'unsafe' ? 'critical' : manualCondition === 'stopped' ? 'high' : 'medium'
                  };
                  console.log("DEBUG: Setting extractedInfo:", info);
                  setExtractedInfo(info);
                  const confirmMsg = lang === 'hi-IN' ? 'क्या मैं यह रिपोर्ट दर्ज करूँ?' : lang === 'mr-IN' ? 'मी हा अहवाल सादर करू का?' : 'Should I submit this ticket?';
                  setAssistantPrompt(confirmMsg);
                }}
                style={{ flex: 1.5, padding: '14px', background: '#16a34a', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span>{lang === 'hi-IN' ? 'समीक्षा और पुष्टि' : lang === 'mr-IN' ? 'पुनरावलोकन आणि पुष्टी' : 'Review & confirm'}</span>
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </button>
            </div>

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
              id="voice-mic-button"
              type="button"
              onClick={startVoiceInput}
              disabled={isTranscribing}
              style={{
                position: 'relative',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: isTranscribing
                  ? 'radial-gradient(circle, rgba(167,139,250,1) 0%, rgba(109,40,217,1) 100%)'
                  : isListening 
                  ? 'radial-gradient(circle, rgba(239,68,68,1) 0%, rgba(185,28,28,1) 100%)' 
                  : 'radial-gradient(circle, rgba(134,59,255,1) 0%, rgba(91,33,182,1) 100%)',
                border: '6px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isTranscribing ? 'default' : 'pointer',
                zIndex: 5,
                outline: 'none',
                animation: isTranscribing ? 'voice-listening-orb 1s infinite ease-in-out' : isListening ? 'voice-listening-orb 1.8s infinite ease-in-out' : 'voice-orb-pulse 2.5s infinite ease-in-out',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
              }}
            >
              {isTranscribing ? (
                <span className="spin" style={{ color: 'white', display: 'inline-block', fontSize: '2.5rem', animation: 'spin 1.2s linear infinite' }}>⏳</span>
              ) : (
                <Mic size={64} color="white" />
              )}
            </button>

            {/* Orb instruction hint */}
            <span style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '24px', zIndex: 5, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {isTranscribing ? (lang === 'hi-IN' ? 'अनुवाद हो रहा है...' : 'Transcribing...') : isListening ? (lang === 'hi-IN' ? 'रोकने के लिए दबाएं' : 'Tap to stop') : (lang === 'hi-IN' ? 'बोलने के लिए दबाएं' : 'Tap to speak')}
            </span>

            <button 
              type="button" 
              onClick={() => { setShowTextFallback(true); setTranscript(''); }}
              disabled={isTranscribing}
              style={{ background: 'rgba(134,59,255,0.1)', border: '2px solid #863bff', borderRadius: '8px', color: '#a78bfa', fontSize: '1.2rem', cursor: 'pointer', padding: '12px 20px', marginTop: '24px', zIndex: 5, opacity: isTranscribing ? 0.5 : 1, fontWeight: 'bold' }}
            >
              {lang === 'hi-IN' ? 'बोलने में समस्या? लिखकर दर्ज करें' : lang === 'mr-IN' ? 'बोलण्यात अडचण? लिहून कळवा' : 'Trouble speaking? Click here to write'}
            </button>

            {renderPhotoAttachment()}
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
        </>
      )}
  
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
                <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>
                  {lang === 'hi-IN' ? 'रिपोर्ट समीक्षा और पुष्टि' : lang === 'mr-IN' ? 'अहवाल पुनरावलोकन आणि पुष्टी' : 'Review & Confirm Report'}
                </h4>
              </div>
  
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>
                  {lang === 'hi-IN' ? 'समस्या का विवरण (बदलाव कर सकते हैं):' : lang === 'mr-IN' ? 'समस्येचे वर्णन (बदल करू शकता):' : 'Issue Description (Edit if needed):'}
                </label>
                <textarea 
                  rows={3}
                  value={extractedInfo.issue}
                  onChange={(e) => setExtractedInfo(prev => ({ ...prev, issue: e.target.value }))}
                  style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px', color: 'white', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.9rem' }}
                />
              </div>
  
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>
                  {lang === 'hi-IN' ? 'मशीन की स्थिति:' : lang === 'mr-IN' ? 'मशीनची स्थिती:' : 'Machine Condition:'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'running', label: lang === 'hi-IN' ? 'चालू है' : lang === 'mr-IN' ? 'सुरू आहे' : 'Running', color: '#eab308' },
                    { id: 'stopped', label: lang === 'hi-IN' ? 'बंद है' : lang === 'mr-IN' ? 'बंद आहे' : 'Stopped', color: '#ef4444' },
                    { id: 'unsafe', label: lang === 'hi-IN' ? 'असुरक्षित है' : lang === 'mr-IN' ? 'असुरक्षित आहे' : 'Unsafe', color: '#dc2626' },
                    { id: 'not_sure', label: lang === 'hi-IN' ? 'पता नहीं' : lang === 'mr-IN' ? 'माहीत नाही' : 'Not Sure', color: '#64748b' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setExtractedInfo(prev => ({ ...prev, condition: item.id, urgency: item.id === 'unsafe' ? 'critical' : item.id === 'stopped' ? 'high' : prev.urgency }))}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: extractedInfo.condition === item.id ? `${item.color}22` : '#0b1118',
                        border: `2px solid ${extractedInfo.condition === item.id ? item.color : 'rgba(255,255,255,0.06)'}`,
                        color: extractedInfo.condition === item.id ? '#ffffff' : '#94a3b8',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(134,59,255,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(134,59,255,0.15)', fontSize: '0.82rem' }}>
                    <span style={{ color: '#cbd5e1' }}>{lang === 'hi-IN' ? 'आवंटित टेक्नीशियन:' : lang === 'mr-IN' ? 'नियुक्त तंत्रज्ञ:' : 'Assigned Technician:'}</span>
                    <strong style={{ color: '#a78bfa', fontWeight: 'bold' }}>{technicianName || (lang === 'hi-IN' ? 'सहायक कर्मचारी' : lang === 'mr-IN' ? 'कर्मचारी' : 'Staff')}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button 
                      type="button" 
                      onClick={() => setExtractedInfo(null)}
                      style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {lang === 'hi-IN' ? 'रद्द करें' : lang === 'mr-IN' ? 'रद्द करा' : 'Cancel'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => submitTicket(false)}
                      disabled={checkingDuplicate || !extractedInfo.issue.trim()}
                      style={{ flex: 1, padding: '14px', background: '#16a34a', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {checkingDuplicate ? '...' : (lang === 'hi-IN' ? 'हाँ, दर्ज करें' : lang === 'mr-IN' ? 'होय, नोंदवा' : 'Yes, Submit')}
                    </button>
                  </div>
                </>
              )}
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
