import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Mic, CheckCircle2, Volume2, VolumeX, Camera, Trash2 } from 'lucide-react';

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
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(134, 59, 255, 0.6)); }
  50% { transform: scale(1.04); filter: drop-shadow(0 0 35px rgba(134, 59, 255, 0.85)); }
}
@keyframes voice-listening-orb {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(239, 68, 68, 0.7)); }
  50% { transform: scale(1.06); filter: drop-shadow(0 0 45px rgba(239, 68, 68, 0.95)); }
}
`;

const GATEWAY_I18N = {
  'hi-IN': {
    brand: 'TURBOFIX',
    listenGuide: 'आवाज सुनें',
    phoneGateTitle: 'मोबाइल नंबर सत्यापन',
    phoneGateDesc: 'शिकायत दर्ज करने के लिए अपना 10 अंकों का मोबाइल नंबर दर्ज करें:',
    phoneGatePlaceholder: 'उदा. 9876543210',
    proceed: 'आगे बढ़ें',
    invalidPhone: 'कृपया एक वैध 10 अंकों का मोबाइल नंबर दर्ज करें।',
    selectLang: 'अपनी भाषा चुनें:',
    tapToSpeak: 'बोलने के लिए माइक दबाएं',
    tapToStop: 'रोकने के लिए दबाएं',
    transcribing: 'समझ रहा हूँ...',
    listening: 'सुन रहा हूँ... बोलिए',
    troubleSpeaking: 'बोलने में समस्या? लिखकर दर्ज करें',
    writeIssueTitle: 'समस्या का विवरण लिखें',
    issuePlaceholder: 'मशीन की समस्या लिखें (उदा. ऑइल लीक हो रहा है)',
    machineCondition: 'मशीन की स्थिति:',
    condRunning: 'चालू है (समस्या के साथ)',
    condStopped: 'बंद है (खराब है)',
    condUnsafe: 'असुरक्षित है (खतरा)',
    condNotSure: 'पता नहीं',
    attachPhoto: 'फोटो अटैच करें (वैकल्पिक)',
    takePhoto: 'फोटो लें या अपलोड करें',
    removePhoto: 'हटाएं',
    cancel: 'रद्द करें',
    reviewConfirm: 'समीक्षा और पुष्टि',
    reviewTitle: 'रिपोर्ट समीक्षा और पुष्टि',
    issueDescEdit: 'समस्या का विवरण (बदलाव कर सकते हैं):',
    assignedTech: 'आवंटित टेक्नीशियन:',
    notAssigned: 'सहायक कर्मचारी',
    yesSubmit: 'हाँ, दर्ज करें',
    submitting: 'दर्ज हो रहा है...',
    similarTicketOpen: '⚠️ समान टिकट पहले से खुला है',
    similarTicketDesc: 'क्या आप इस टिकट में जानकारी जोड़ना चाहते हैं या नया टिकट बनाना चाहते हैं?',
    appendRecommended: 'विवरण जोड़ें (अनुशंसित)',
    createSeparate: 'नया टिकट बनाएं',
    successTitle: 'टिकट सफलतापूर्वक दर्ज हुआ!',
    workOrderNo: 'वर्क ऑर्डर संख्या:',
    machine: 'मशीन:',
    primaryTech: 'प्राथमिक टेक्नीशियन:',
    attachedPhoto: 'अटैच किया गया फोटो:',
    reportAnother: 'दूसरी समस्या रिपोर्ट करें',
    viewOpenTickets: 'खुले टिकट देखें',
    loginDashboard: 'लॉगिन डैशबोर्ड',
    activeOpenTickets: 'सक्रिय खुले टिकट',
    noActiveTickets: 'कोई सक्रिय टिकट नहीं है।',
    close: 'बंद करें',
    micBlockedTitle: 'माइक एक्सेस समस्या',
    micBlockedDesc: 'टर्बोफिक्स को बोलने के लिए माइक अनुमति की आवश्यकता है। कृपया ब्राउज़र सेटिंग में अनुमति दें।',
    noSpeechDetected: 'कोई आवाज नहीं सुनी गई। कृपया फिर से प्रयास करें या लिखें।',
    transcribeError: 'ट्रांसक्रिप्शन नहीं हो सका। कृपया लिखकर दर्ज करें।',
    offlineSavedText: 'ऑफ़लाइन सहेजा गया। इंटरनेट आते ही सिंक हो जाएगा।',
    submittingErrorTitle: 'सबमिट त्रुटि',
    submissionProblemText: 'टिकट दर्ज करने में समस्या हुई। कृपया दोबारा प्रयास करें।'
  },
  'mr-IN': {
    brand: 'TURBOFIX',
    listenGuide: 'सूचना ऐका',
    phoneGateTitle: 'मोबाईल नंबर पडताळणी',
    phoneGateDesc: 'तक्रार नोंदवण्यासाठी कृपया आपला १० अंकी मोबाईल नंबर टाका:',
    phoneGatePlaceholder: 'उदा. ९८७६५४३२१०',
    proceed: 'पुढे जा',
    invalidPhone: 'कृपया एक वैध १० अंकी मोबाईल नंबर प्रविष्ट करा.',
    selectLang: 'आपली भाषा निवडा:',
    tapToSpeak: 'बोलण्यासाठी माइक दाबा',
    tapToStop: 'थांबवण्यासाठी दाबा',
    transcribing: 'ऐकलेले समजत आहे...',
    listening: 'ऐकत आहे... बोला',
    troubleSpeaking: 'बोलण्यात अडचण? लिहून कळवा',
    writeIssueTitle: 'समस्येचे वर्णन लिहा',
    issuePlaceholder: 'मशीनची समस्या लिहा (उदा. तेल गळती होत आहे)',
    machineCondition: 'मशीनची स्थिती:',
    condRunning: 'सुरू आहे (समस्येसह)',
    condStopped: 'बंद आहे (खराब)',
    condUnsafe: 'असुरक्षित आहे (धोका)',
    condNotSure: 'माहीत नाही',
    attachPhoto: 'फोटो जोडा (ऐच्छिक)',
    takePhoto: 'फोटो घ्या किंवा अपलोड करा',
    removePhoto: 'काढून टाका',
    cancel: 'रद्द करा',
    reviewConfirm: 'पुनरावलोकन आणि पुष्टी',
    reviewTitle: 'अहवाल पुनरावलोकन आणि पुष्टी',
    issueDescEdit: 'समस्येचे वर्णन (बदल करू शकता):',
    assignedTech: 'नियुक्त तंत्रज्ञ:',
    notAssigned: 'कर्मचारी',
    yesSubmit: 'होय, नोंदवा',
    submitting: 'नोंदवत आहे...',
    similarTicketOpen: '⚠️ असाच तिकीट आधीच उघडा आहे',
    similarTicketDesc: 'आपण या तिकीटमध्ये माहिती जोडू इच्छिता की नवीन तिकीट तयार करू इच्छिता?',
    appendRecommended: 'तपशील जोडा (शिफारस केलेले)',
    createSeparate: 'नवीन तिकीट बनवा',
    successTitle: 'तिकीट यशस्वीरित्या नोंदवले गेले!',
    workOrderNo: 'वर्क ऑर्डर क्रमांक:',
    machine: 'मशीन:',
    primaryTech: 'प्राथमिक तंत्रज्ञ:',
    attachedPhoto: 'जोडलेला फोटो:',
    reportAnother: 'दुसरी समस्या नोंदवा',
    viewOpenTickets: 'उघडलेले तिकीट पहा',
    loginDashboard: 'लॉगिन डॅशबोर्ड',
    activeOpenTickets: 'सक्रिय उघडलेले तिकीट',
    noActiveTickets: 'कोणतेही सक्रिय तिकीट नाही.',
    close: 'बंद करा',
    micBlockedTitle: 'माइक प्रवेश अडचण',
    micBlockedDesc: 'टर्बोफिक्सला बोलण्यासाठी माइक परवानगी आवश्यक आहे. कृपया ब्राउझर सेटिंगमध्ये परवानगी द्या.',
    noSpeechDetected: 'काहीही ऐकू आले नाही. कृपया पुन्हा प्रयत्न करा किंवा लिहून कळवा.',
    transcribeError: 'आवाज ओळखता आली नाही. कृपया टाईप करून कळवा.',
    offlineSavedText: 'ऑफलाइन सेव्ह केले. इंटरनेट आल्यावर सिंक होईल.',
    submittingErrorTitle: 'सबमिट त्रुटी',
    submissionProblemText: 'तिकीट नोंदवताना समस्या आली. कृपया पुन्हा प्रयत्न करा.'
  },
  'en-US': {
    brand: 'TURBOFIX',
    listenGuide: 'Listen Guide',
    phoneGateTitle: 'Mobile Identification',
    phoneGateDesc: 'Please enter your 10-digit Mobile Number to register breakdown reports:',
    phoneGatePlaceholder: 'e.g. 9876543210',
    proceed: 'Proceed',
    invalidPhone: 'Please enter a valid 10-digit mobile number.',
    selectLang: 'Select preferred language:',
    tapToSpeak: 'Tap to speak',
    tapToStop: 'Tap to stop',
    transcribing: 'Transcribing...',
    listening: 'Listening... Speak now',
    troubleSpeaking: 'Trouble speaking? Write here',
    writeIssueTitle: 'Write Issue Description',
    issuePlaceholder: 'e.g. Oil leak near gearbox or motor overheating',
    machineCondition: 'Machine Condition:',
    condRunning: 'Running with issue',
    condStopped: 'Stopped (Down)',
    condUnsafe: 'Unsafe (Danger)',
    condNotSure: 'Not Sure',
    attachPhoto: 'Attach Photo (Optional)',
    takePhoto: 'Take Photo or Upload',
    removePhoto: 'Remove',
    cancel: 'Cancel',
    reviewConfirm: 'Review & confirm →',
    reviewTitle: 'Review & Confirm Report',
    issueDescEdit: 'Issue Description (Edit if needed):',
    assignedTech: 'Assigned Technician:',
    notAssigned: 'Staff',
    yesSubmit: 'Yes, Submit',
    submitting: 'Submitting...',
    similarTicketOpen: '⚠️ Similar Ticket Already Open',
    similarTicketDesc: 'Do you want to append comments to it or log a separate breakdown?',
    appendRecommended: 'Append Details (Recommended)',
    createSeparate: 'Create Separate',
    successTitle: 'Ticket Registered Successfully!',
    workOrderNo: 'Work Order No:',
    machine: 'Machine:',
    primaryTech: 'Primary Tech:',
    attachedPhoto: 'Attached Photo:',
    reportAnother: 'Report Another Issue',
    viewOpenTickets: 'View Open Tickets',
    loginDashboard: 'Login Dashboard',
    activeOpenTickets: 'Active Open Tickets',
    noActiveTickets: 'No active tickets logged.',
    close: 'Close',
    micBlockedTitle: 'Microphone Access Blocked',
    micBlockedDesc: 'TurboFix needs microphone permission to listen. Please enable it in browser settings.',
    noSpeechDetected: 'No speech was detected. Please try again or type the problem.',
    transcribeError: 'Could not transcribe speech. Please try again or type the problem.',
    offlineSavedText: 'Saved offline. Ticket will sync when internet returns.',
    submittingErrorTitle: 'Submission Error',
    submissionProblemText: 'There was a problem submitting your ticket. Please try again.'
  }
};

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

  const t = (key) => (GATEWAY_I18N[lang] || GATEWAY_I18N['hi-IN'])[key] || key;

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

  // Strict Zero-Scroll viewport lock on mobile browsers
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origHtmlHeight = document.documentElement.style.height;
    const origBodyOverflow = document.body.style.overflow;
    const origBodyHeight = document.body.style.height;
    const origBodyPosition = document.body.style.position;
    const origBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100dvh';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    document.body.style.position = 'fixed';
    document.body.style.width = '100vw';

    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.documentElement.style.height = origHtmlHeight;
      document.body.style.overflow = origBodyOverflow;
      document.body.style.height = origBodyHeight;
      document.body.style.position = origBodyPosition;
      document.body.style.width = origBodyWidth;
    };
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('Back online! Syncing offline tickets...');
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      if (queue.length === 0) return;

      const newQueue = [];
      for (const item of queue) {
        try {
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
  const speechRecognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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
        const { data, error } = await invokeWithRetry('ai_assistant', {
          body: { action: 'get_machine_details', machine_id: id }
        });

        if (error || !data?.machine) {
          console.warn('Machine details notice:', error?.message || 'Not found via edge function, using fallback');
          return;
        }

        const mData = data.machine;
        setMachine({
          id: mData.id,
          name: mData.name || name,
          loc: mData.location || loc,
          tag: id,
          factory_id: mData.factory_id
        });
        if (mData.technician_name) {
          setTechnicianName(mData.technician_name);
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

    setTimeout(() => {
      greetUser();
    }, 800);

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [lang, phoneGate]);

  const speak = (text) => {
    if (!speakFeedback || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let best = null;
      const langPrefix = lang.split('-')[0];

      const preferredKeywords = lang === 'en-US'
        ? ['google us', 'samantha', 'karen', 'daniel', 'google uk', 'rishi', 'moira', 'aaron']
        : lang === 'hi-IN'
        ? ['google हिन्दी', 'google hindi', 'lekha']
        : ['google मराठी', 'google marathi'];

      for (const v of voices) {
        const vName = v.name.toLowerCase();
        if (preferredKeywords.some(k => vName.includes(k))) {
          best = v;
          break;
        }
      }

      if (!best) {
        best = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(langPrefix));
      }

      if (best) utterance.voice = best;
    }

    utterance.rate = lang === 'en-US' ? 0.85 : 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

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
        greetingText = 'नमस्ते! शिकायत दर्ज करने के लिए अपना मोबाइल नंबर दर्ज करें।';
      } else if (lang === 'mr-IN') {
        greetingText = 'नमस्कार! तक्रार नोंदवण्यासाठी कृपया आपला मोबाईल नंबर टाका.';
      } else {
        greetingText = 'Welcome to TurboFix. Please enter your 10 digit mobile number to proceed.';
      }
    } else {
      if (lang === 'hi-IN') {
        greetingText = 'नमस्ते! मैं आपका टर्बोफिक्स सहायक हूँ। माइक दबाकर समस्या बताएं।';
      } else if (lang === 'mr-IN') {
        greetingText = 'नमस्कार! मी आपला टर्बोफिक्स सहाय्यक आहे. समस्येचे वर्णन करण्यासाठी माइक दाबा.';
      } else {
        greetingText = 'I am your TurboFix assistant. Tap the big button to speak your problem.';
      }
    }
    
    setAssistantPrompt(greetingText);
    speak(greetingText);
  };

  const suggestCondition = (text) => {
    const t = (text || '').toLowerCase();
    if (/\b(unsafe|fire|smoke|burning|spark|shock|danger)\b/.test(t)) return 'unsafe';
    if (/\b(stopped|not working|breakdown|down|jam)\b/.test(t)) return 'stopped';
    return 'running';
  };

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    setAssistantPrompt(t('transcribing'));
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
        const noSpeechMsg = t('noSpeechDetected');
        setAssistantPrompt(noSpeechMsg);
        speak(noSpeechMsg);
        return;
      }
      
      setTranscript(text);
      setManualCondition(suggestCondition(text));
      setShowTextFallback(true);
      
      const reviewMsg = t('reviewConfirm');
      setAssistantPrompt(reviewMsg);
      speak(reviewMsg);
    } catch (err) {
      console.error(err);
      const errMsg = t('transcribeError');
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 5, width: '100%', maxWidth: '320px', margin: '4px auto' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>
          {t('attachPhoto')}
        </label>
        {photoPreview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0b1118', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={photoPreview} alt="Preview" style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: '#cbd5e1', wordBreak: 'break-all' }}>{photoFile?.name}</span>
              <button 
                type="button" 
                onClick={removePhoto} 
                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}
              >
                <Trash2 size={12} /> {t('removePhoto')}
              </button>
            </div>
          </div>
        ) : (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#0b1118', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
            <Camera size={16} color="#863bff" />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>
              {t('takePhoto')}
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </label>
        )}
      </div>
    );
  };

  const stopVoiceInput = () => {
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch (e) {}
    }
  };

  const startVoiceInput = async () => {
    setErrorAlert(null);
    if (isListening) {
      stopVoiceInput();
      return;
    }
    
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErrorAlert({
        title: t('micBlockedTitle'),
        desc: t('micBlockedDesc')
      });
      setShowTextFallback(true);
      return;
    }

    setExtractedInfo(null);
    setSuccess(false);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        
        recognition.onresult = (event) => {
          let liveText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            liveText += event.results[i][0].transcript;
          }
          if (liveText.trim()) {
            setTranscript(liveText.trim());
          }
        };

        recognition.onerror = (err) => {
          console.warn('SpeechRecognition live error:', err);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn('Could not start live SpeechRecognition:', err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        setIsListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        
        if (speechRecognitionRef.current) {
          try { speechRecognitionRef.current.stop(); } catch (e) {}
          speechRecognitionRef.current = null;
        }

        const liveCaptured = transcriptRef.current ? transcriptRef.current.trim() : '';
        if (liveCaptured) {
          setManualCondition(suggestCondition(liveCaptured));
          setShowTextFallback(true);
          const reviewMsg = t('reviewConfirm');
          setAssistantPrompt(reviewMsg);
          speak(reviewMsg);
        } else {
          await transcribeAudio(blob);
        }
      };

      recorderRef.current = recorder;
      setIsListening(true);
      setAssistantPrompt(t('listening'));
      recorder.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setErrorAlert({
        title: t('micBlockedTitle'),
        desc: t('micBlockedDesc')
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
          factory_id: machine.factory_id,
          lifecycle_stage: 'unverified',
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

        const successText = t('offlineSavedText');
        setAssistantPrompt(successText);
        speak(successText);
        setExtractedInfo(null);
        setDuplicateTicket(null);
        setSuccess(true);
        return;
      }

      if (!bypassDuplicateCheck) {
        const { data: dupData, error: dupErr } = await invokeWithRetry('ai_assistant', {
          body: { action: 'check_duplicate', machine_id: machine.id }
        });
        if (dupErr || !dupData || dupData.error) {
          console.error('Error checking duplicates:', dupErr || dupData?.error);
        } else if (dupData.duplicate) {
          setDuplicateTicket(dupData.duplicate);
          const alertMsg = t('similarTicketOpen');
          setAssistantPrompt(alertMsg);
          speak(alertMsg);
          setCheckingDuplicate(false);
          setUploadingPhoto(false);
          return;
        }
      }

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
        const { data: factData } = await invokeWithRetry('ai_assistant', {
          body: { action: 'get_factory_id' }
        });
        factoryId = factData?.factory_id || null;
      }

      let uploadedUrl = null;
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split('.').pop();
          const fileName = `issue-${machine.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `${machine.id}/${fileName}`;
          
          const { error: uploadErr } = await supabase.storage
            .from('repair-proofs')
            .upload(filePath, photoFile);
            
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('repair-proofs')
              .getPublicUrl(filePath);
            uploadedUrl = publicUrl;
          } else {
            console.warn('Storage upload notice (handled):', uploadErr.message);
          }
        } catch (photoErr) {
          console.warn('Photo upload exception handled:', photoErr);
        }
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

      const successText = t('successTitle');
      setAssistantPrompt(successText);
      speak(successText);
      setExtractedInfo(null);
      setDuplicateTicket(null);
      setSuccess(true);
    } catch (err) {
      console.error('Error logging ticket:', err);
      const errMsg = t('submissionProblemText');
      setAssistantPrompt(errMsg);
      speak(errMsg);
      setErrorAlert({ title: t('submittingErrorTitle'), desc: err.message });
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
        try {
          const fileExt = photoFile.name.split('.').pop();
          const fileName = `issue-${machine.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `${machine.id}/${fileName}`;
          
          const { error: uploadErr } = await supabase.storage
            .from('repair-proofs')
            .upload(filePath, photoFile);
            
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('repair-proofs')
              .getPublicUrl(filePath);
            uploadedUrl = publicUrl;
          }
        } catch (e) {}
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
      const successText = t('successTitle');
      setAssistantPrompt(successText);
      speak(successText);
      setExtractedInfo(null);
      setDuplicateTicket(null);
      setSuccess(true);
    } catch (err) {
      alert('Error appending: ' + err.message);
    } finally {
      setCheckingDuplicate(false);
      setUploadingPhoto(false);
    }
  };

  const handlePhoneProceed = () => {
    if (!phoneInput.trim() || !phoneInput.match(/^\d{10}$/)) {
      alert(t('invalidPhone'));
      return;
    }
    localStorage.setItem('tf_reporter_phone', phoneInput.trim());
    setReporterPhone(phoneInput.trim());
    setPhoneGate(false);
    
    setTimeout(() => {
      greetUser();
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
    <main style={{
      height: '100dvh',
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: 'radial-gradient(circle at center, #111029 0%, #05030a 100%)',
      color: '#e5edf6',
      fontFamily: 'Outfit, sans-serif',
      padding: 'clamp(6px, 1.2vh, 12px) clamp(8px, 2.5vw, 14px)',
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <style>{ORB_ANIMATIONS}</style>

      {/* Top Identity Block - 4 Individual Lines */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '3px', zIndex: 10 }}>
        {/* Line 1: Company Name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" /></svg>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '1px', fontFamily: 'Rajdhani, sans-serif', color: '#ffffff' }}>TURBOFIX</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => setSpeakFeedback(!speakFeedback)} 
              style={{ background: 'transparent', border: 'none', color: speakFeedback ? '#863bff' : '#64748b', cursor: 'pointer', padding: '2px' }}
              title="Toggle Voice Feedback"
            >
              {speakFeedback ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={greetUser}
              style={{
                background: '#863bff',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '0.65rem',
                padding: '2px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 'bold'
              }}
            >
              <Volume2 size={10} />
              {t('listenGuide')}
            </button>
            <select 
              value={lang} 
              onChange={(e) => { 
                const newLang = e.target.value;
                setLang(newLang); 
                localStorage.setItem('tf_lang', newLang);
              }} 
              style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: 'white', fontSize: '0.65rem', padding: '2px 4px', fontWeight: 'bold' }}
            >
              <option value="hi-IN">हिंदी</option>
              <option value="mr-IN">मराठी</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>

        {/* Line 2: Machine Name */}
        <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', marginRight: '6px' }}>Machine:</span>
          {machine.name}
        </div>

        {/* Line 3: Location */}
        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', marginRight: '6px' }}>Location:</span>
          {machine.loc}
          {!phoneGate && reporterPhone && (
            <button 
              type="button" 
              onClick={() => { setPhoneGate(true); setPhoneInput(reporterPhone); }}
              style={{ background: 'transparent', border: 'none', color: '#863bff', cursor: 'pointer', marginLeft: '6px', textDecoration: 'underline', fontSize: '0.7rem', padding: 0 }}
            >
              ({reporterPhone})
            </button>
          )}
        </div>

        {/* Line 4: Machine ID */}
        <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontFamily: 'monospace', fontWeight: 'bold' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', marginRight: '6px', fontFamily: 'Outfit, sans-serif' }}>Machine ID:</span>
          {machine.tag || (machine.id ? machine.id.slice(0, 8) : '')}
        </div>

        {/* Line 5: Andon Visual Machine Health Indicator (Japanese TPS Standard) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '3px', marginTop: '1px' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Andon Health:</span>
          {activeTickets.length > 0 ? (
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span className="glow-dot down" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> 🔴 ATTENTION REQUIRED ({activeTickets.length})
            </span>
          ) : (
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#25D366', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '999px', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366' }} /> 🟢 OPERATIONAL
            </span>
          )}
        </div>
      </div>

      {errorAlert && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px 12px', width: '100%', maxWidth: '340px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444' }}>{errorAlert.title}</span>
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.3' }}>{errorAlert.desc}</span>
          <button type="button" onClick={() => setErrorAlert(null)} style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', color: 'white', cursor: 'pointer' }}>{t('cancel')}</button>
        </div>
      )}

      {/* Main Single-Screen Content Container */}
      {phoneGate ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '340px', width: '100%', margin: '0 auto', gap: '12px', zIndex: 10 }}>
          <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', textAlign: 'center' }}>
              {t('phoneGateTitle')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>
                {t('selectLang')}
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['hi-IN', 'mr-IN', 'en-US'].map((langCode) => {
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
                        padding: '10px 4px',
                        minHeight: '44px',
                        background: active ? '#863bff' : '#0b1118',
                        border: active ? '1px solid #863bff' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.3' }}>
              {t('phoneGateDesc')}
            </p>
            <input 
              type="tel" 
              maxLength={10} 
              value={phoneInput} 
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))} 
              placeholder={t('phoneGatePlaceholder')} 
              style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '12px', fontSize: '1rem', color: 'white', letterSpacing: '2px', textAlign: 'center', boxSizing: 'border-box' }}
            />
            <button 
              type="button" 
              onClick={handlePhoneProceed} 
              style={{ width: '100%', padding: '12px', minHeight: '48px', background: '#863bff', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
            >
              {t('proceed')}
            </button>
          </div>
        </div>
      ) : success ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '340px', width: '100%', margin: '0 auto', gap: '12px', zIndex: 10 }}>
          <div style={{ 
            background: '#151e28', 
            border: '1px solid rgba(22, 163, 74, 0.4)', 
            borderRadius: '14px', 
            padding: '16px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#4ade80' }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>
              {t('successTitle')}
            </h3>
            {submittedTicketInfo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', background: '#0b1118', padding: '10px', borderRadius: '8px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>{t('workOrderNo')}</span>
                  <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{submittedTicketInfo.wo_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>{t('machine')}</span>
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{machine.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>{t('primaryTech')}</span>
                  <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{technicianName || t('notAssigned')}</span>
                </div>
              </div>
            )}
            <button 
              type="button" 
              onClick={resetForm}
              style={{ width: '100%', padding: '12px', minHeight: '48px', background: '#863bff', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {t('reportAnother')}
            </button>
          </div>
        </div>
      ) : showTextFallback ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '340px', width: '100%', margin: '0 auto', gap: '8px', zIndex: 10 }}>
          <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textAlign: 'center' }}>
              {t('writeIssueTitle')}
            </h3>
            
            <div style={{ position: 'relative' }}>
              <textarea 
                rows={2}
                value={transcript} 
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t('issuePlaceholder')}
                style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 42px 10px 10px', color: 'white', fontFamily: 'inherit', resize: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={startVoiceInput}
                disabled={isTranscribing}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  background: isListening ? '#ef4444' : '#863bff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer'
                }}
                title={isListening ? t('tapToStop') : t('tapToSpeak')}
              >
                <Mic size={16} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                {t('machineCondition')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { id: 'running', label: t('condRunning'), color: '#eab308' },
                  { id: 'stopped', label: t('condStopped'), color: '#ef4444' },
                  { id: 'unsafe', label: t('condUnsafe'), color: '#dc2626' },
                  { id: 'not_sure', label: t('condNotSure'), color: '#64748b' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setManualCondition(item.id)}
                    style={{
                      padding: '8px 4px',
                      minHeight: '40px',
                      borderRadius: '6px',
                      background: manualCondition === item.id ? `${item.color}22` : '#0b1118',
                      border: `1px solid ${manualCondition === item.id ? item.color : 'rgba(255,255,255,0.1)'}`,
                      color: manualCondition === item.id ? '#ffffff' : '#94a3b8',
                      fontSize: '0.75rem',
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

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setShowTextFallback(false)}
                style={{ flex: 1, padding: '10px', minHeight: '44px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (!transcript.trim()) {
                    alert(t('writeIssueTitle'));
                    return;
                  }
                  const info = {
                    issue: transcript.trim(),
                    condition: manualCondition,
                    urgency: manualCondition === 'unsafe' ? 'critical' : manualCondition === 'stopped' ? 'high' : 'medium'
                  };
                  setExtractedInfo(info);
                }}
                style={{ flex: 1.5, padding: '10px', minHeight: '44px', background: '#16a34a', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <span>{t('reviewConfirm')}</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
          
          {/* Glowing Orb ripple rings */}
          {isListening && (
            <>
              <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', animation: 'voice-ripple-1 2s infinite ease-out', zIndex: 1 }} />
              <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', animation: 'voice-ripple-2 2s infinite ease-out 1s', zIndex: 1 }} />
            </>
          )}

          {/* Central Voice Orb (Auto-scaled for 4.5" screens) */}
          <button
            id="voice-mic-button"
            type="button"
            onClick={startVoiceInput}
            disabled={isTranscribing}
            style={{
              position: 'relative',
              width: 'clamp(100px, 20vh, 130px)',
              height: 'clamp(100px, 20vh, 130px)',
              borderRadius: '50%',
              background: isTranscribing
                ? 'radial-gradient(circle, rgba(167,139,250,1) 0%, rgba(109,40,217,1) 100%)'
                : isListening 
                ? 'radial-gradient(circle, rgba(239,68,68,1) 0%, rgba(185,28,28,1) 100%)' 
                : 'radial-gradient(circle, rgba(134,59,255,1) 0%, rgba(91,33,182,1) 100%)',
              border: '4px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isTranscribing ? 'default' : 'pointer',
              zIndex: 5,
              outline: 'none',
              animation: isTranscribing ? 'voice-listening-orb 1s infinite ease-in-out' : isListening ? 'voice-listening-orb 1.8s infinite ease-in-out' : 'voice-orb-pulse 2.5s infinite ease-in-out',
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)'
            }}
          >
            {isTranscribing ? (
              <span style={{ color: 'white', display: 'inline-block', fontSize: '1.8rem' }}>⏳</span>
            ) : (
              <Mic size={40} color="white" />
            )}
          </button>

          {/* Orb Hint */}
          <span style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '12px', zIndex: 5, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {isTranscribing ? t('transcribing') : isListening ? t('tapToStop') : t('tapToSpeak')}
          </span>

          <button 
            type="button" 
            onClick={() => { setShowTextFallback(true); setTranscript(''); }}
            disabled={isTranscribing}
            style={{ background: 'rgba(134,59,255,0.12)', border: '1px solid #863bff', borderRadius: '8px', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', padding: '8px 14px', marginTop: '12px', zIndex: 5, fontWeight: 'bold' }}
          >
            {t('troubleSpeaking')}
          </button>

          {renderPhotoAttachment()}

          {/* Assistant Subtitle */}
          <div style={{ marginTop: '8px', textAlign: 'center', padding: '0 10px', zIndex: 5, maxHeight: '48px', overflow: 'hidden' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', margin: 0, lineHeight: '1.2' }}>
              {renderPromptText(assistantPrompt)}
            </p>
            {transcript && (
              <p style={{ fontSize: '0.72rem', color: '#863bff', fontStyle: 'italic', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{transcript}"
              </p>
            )}
          </div>
        </div>
      )}
  
      {/* Confirmation Sliding Overlay Card */}
      {extractedInfo && (
        <div style={{ background: 'rgba(15, 23, 34, 0.98)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px 14px 0 0', padding: '14px', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, boxShadow: '0 -8px 25px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {duplicateTicket ? (
            <>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 2px', fontSize: '0.9rem', fontWeight: 'bold', color: '#fbbf24' }}>
                  {t('similarTicketOpen')}
                </h4>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                  {t('similarTicketDesc')}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button 
                  type="button" 
                  onClick={appendTicket}
                  disabled={checkingDuplicate}
                  style={{ width: '100%', padding: '10px', minHeight: '44px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {t('appendRecommended')}
                </button>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button" 
                    onClick={() => setDuplicateTicket(null)}
                    style={{ flex: 1, padding: '10px', minHeight: '44px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => submitTicket(true)}
                    disabled={checkingDuplicate}
                    style={{ flex: 1, padding: '10px', minHeight: '44px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {t('createSeparate')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>
                  {t('reviewTitle')}
                </h4>
              </div>
  
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold' }}>
                  {t('issueDescEdit')}
                </label>
                <textarea 
                  rows={2}
                  value={extractedInfo.issue}
                  onChange={(e) => setExtractedInfo(prev => ({ ...prev, issue: e.target.value }))}
                  style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', color: 'white', fontFamily: 'inherit', resize: 'none', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
  
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold' }}>
                  {t('machineCondition')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { id: 'running', label: t('condRunning'), color: '#eab308' },
                    { id: 'stopped', label: t('condStopped'), color: '#ef4444' },
                    { id: 'unsafe', label: t('condUnsafe'), color: '#dc2626' },
                    { id: 'not_sure', label: t('condNotSure'), color: '#64748b' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setExtractedInfo(prev => ({ ...prev, condition: item.id, urgency: item.id === 'unsafe' ? 'critical' : item.id === 'stopped' ? 'high' : prev.urgency }))}
                      style={{
                        padding: '6px',
                        minHeight: '36px',
                        borderRadius: '6px',
                        background: extractedInfo.condition === item.id ? `${item.color}22` : '#0b1118',
                        border: `1px solid ${extractedInfo.condition === item.id ? item.color : 'rgba(255,255,255,0.1)'}`,
                        color: extractedInfo.condition === item.id ? '#ffffff' : '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(134,59,255,0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(134,59,255,0.15)', fontSize: '0.75rem' }}>
                <span style={{ color: '#cbd5e1' }}>{t('assignedTech')}</span>
                <strong style={{ color: '#a78bfa', fontWeight: 'bold' }}>{technicianName || t('notAssigned')}</strong>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button 
                  type="button" 
                  onClick={() => setExtractedInfo(null)}
                  style={{ flex: 1, padding: '10px', minHeight: '48px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e5edf6', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  onClick={() => submitTicket(false)}
                  disabled={checkingDuplicate || !extractedInfo.issue.trim()}
                  style={{ flex: 1, padding: '10px', minHeight: '48px', background: '#16a34a', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  {checkingDuplicate ? t('submitting') : t('yesSubmit')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Secondary Footer Actions (100vh bottom) */}
      <footer style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', minHeight: '38px', zIndex: 10 }}>
        <button 
          type="button" 
          onClick={handleFetchStatus}
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 4px', fontSize: '0.75rem', color: '#aab8c8', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {t('viewOpenTickets')}
        </button>
        <button 
          type="button" 
          onClick={() => {
            const base = import.meta.env.BASE_URL || '/';
            window.location.href = `${base}machines.html?machine=${machine.id}`;
          }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 4px', fontSize: '0.75rem', color: '#aab8c8', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {t('loginDashboard')}
        </button>
      </footer>

      {/* Ticket Status Timeline overlay */}
      {showStatus && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,24,0.98)', display: 'flex', flexDirection: 'column', padding: '16px', zIndex: 1000 }}>
          <h3 style={{ fontSize: '1.05rem', fontFamily: 'Rajdhani, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', color: 'white', margin: 0 }}>
            {t('activeOpenTickets')}
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loadingTickets ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Loading…</div>
            ) : activeTickets.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>{t('noActiveTickets')}</div>
            ) : (
              activeTickets.map(t => (
                <div key={t.id} style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>
                    <span>{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>OPEN</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#fff', lineHeight: '1.3' }}>{t.issue_text}</p>
                </div>
              ))
            )}
          </div>
          
          <button 
            type="button" 
            onClick={() => setShowStatus(false)}
            style={{ width: '100%', padding: '12px', minHeight: '48px', background: '#863bff', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {t('close')}
          </button>
        </div>
      )}

    </main>
  );
}
