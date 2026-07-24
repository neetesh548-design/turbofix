/**
 * QR Gateway — Machine Ticket Creation Flow (Primary Technician Interface)
 *
 * Workflow:
 *   1. Scan machine QR code (contains machine_id)
 *   2. Enter phone number or auto-detect from session
 *   3. Describe issue (text, voice, or photo)
 *   4. System optionally suggests spare parts
 *   5. Submit ticket → real-time WhatsApp notification to supervisor
 *   6. Offline fallback: queue locally, sync when online
 *
 * @api
 *   POST /api/v1/tickets - Create new ticket (text/voice/photo)
 *     @body {
 *       machine_id: string,
 *       issue_text: string,
 *       issue_voice_media_id?: string (Supabase File Storage path),
 *       issue_photo_media_id?: string,
 *       reported_by_phone: string,
 *       reported_by_technician_id?: string,
 *       company_code: string,
 *       language: string (ISO 639-1: 'en', 'hi', 'mr', ...)
 *     }
 *     @response { ticket_id: string, created_at: ISO8601 }
 *
 *   GET /api/v1/machines/:machine_id/checklist - Retrieve machine checklist
 *     @response { checklist_items: [...], spare_parts: [...] }
 *
 * @supabaseStorage
 *   Bucket: ticket_media
 *   Paths: {company_code}/tickets/{ticket_id}/{voice|photo}.{ext}
 *
 * @features
 *   - Offline first: queue tickets in localStorage, sync on reconnect
 *   - Multi-language support (9 languages: EN, HI, MR, etc.)
 *   - Voice recording & transcription
 *   - Photo attachment & metadata extraction
 *   - Smart part suggestions via AI
 *   - Real-time WhatsApp fanout to supervisor & maintenance head
 *   - Technician presence (who reported, when, device type)
 *
 * @whatsappIntegration
 *   - Ticket creation → immediate WhatsApp message to supervisor
 *   - Escalation at N hours → WhatsApp reminder
 *   - Closure notification → WhatsApp to all stakeholders
 *
 * @permissions
 *   - Any technician can create tickets for their assigned machines
 *   - Cross-machine tickets require supervisor override
 *   - Session-based rate limiting (20 tickets/hour/technician)
 */

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
    reporterNameLabel: 'रिपोर्ट करने वाले का नाम (वैकल्पिक):',
    reporterNamePlaceholder: 'उदा. रमेश',
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
    reporterNameLabel: 'रिपोर्ट करणाऱ्याचे नाव (ऐच्छिक):',
    reporterNamePlaceholder: 'उदा. रमेश',
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
    reviewTitle: 'Review & Confirm Work Order',
    issueDescEdit: 'Issue Description (Edit if needed):',
    reporterNameLabel: 'Reporter name (optional):',
    reporterNamePlaceholder: 'e.g. Ramesh',
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
  const [workflowStage, setWorkflowStage] = useState('capture');
  const [voiceError, setVoiceError] = useState('');
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
  const [voiceArtifacts, setVoiceArtifacts] = useState(null);
  
  // Photo capture and upload state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittedTicketInfo, setSubmittedTicketInfo] = useState(null);
  const [pendingAudioBlob, setPendingAudioBlob] = useState(null);
  const [pendingAudioUrl, setPendingAudioUrl] = useState('');

  // Reporter state (remembered)
  const [reporterPhone, setReporterPhone] = useState(() => localStorage.getItem('tf_reporter_phone') || '');
  const [reporterName, setReporterName] = useState(() => localStorage.getItem('tf_reporter_name') || '');
  const [phoneGate, setPhoneGate] = useState(() => !localStorage.getItem('tf_reporter_phone'));
  const [phoneInput, setPhoneInput] = useState('');

  // Offline queue state
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);

  const t = (key) => (GATEWAY_I18N[lang] || GATEWAY_I18N['hi-IN'])[key] || key;
  const machineContextLabel = machine.name ? `${machine.name}${machine.loc ? ` · ${machine.loc}` : ''}` : 'Selected machine';
  const draftKey = machine?.id ? `tf_qr_draft_${machine.id}` : 'tf_qr_draft_pending';
  const workflowLabel = {
    phone: 'Phone verification',
    capture: 'Capture',
    listening: 'Listening',
    transcribing: 'Transcribing',
    review: 'Review',
    submitting: 'Submitting',
    done: 'Done'
  }[workflowStage] || 'Capture';

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
          const { error } = await supabase.functions.invoke('ticket_gateway', {
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
  const micStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const getLiveMicStream = async () => {
    const existing = micStreamRef.current;
    const hasLiveTrack = existing?.getAudioTracks?.().some((track) => track.readyState === 'live');
    if (hasLiveTrack) return existing;
    micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    return micStreamRef.current;
  };

  const releaseMicStream = () => {
    micStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    micStreamRef.current = null;
  };

  const getRecorderOptions = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = types.find((type) => window.MediaRecorder?.isTypeSupported?.(type));
    return mimeType ? { mimeType } : undefined;
  };

  useEffect(() => {
    if (!machine.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (!saved) return;
      if (saved.transcript) setTranscript(saved.transcript);
      if (saved.extractedInfo) setExtractedInfo(saved.extractedInfo);
      if (saved.voiceArtifacts) setVoiceArtifacts(saved.voiceArtifacts);
      if (saved.manualCondition) setManualCondition(saved.manualCondition);
      if (typeof saved.showTextFallback === 'boolean') setShowTextFallback(saved.showTextFallback);
      if (saved.workflowStage) setWorkflowStage(saved.workflowStage);
      if (saved.phoneInput) setPhoneInput(saved.phoneInput);
      if (saved.technicianName) setTechnicianName(saved.technicianName);
      if (saved.reporterName) setReporterName(saved.reporterName);
    } catch (err) {
      console.warn('Could not restore QR draft', err);
    }
  }, [machine.id, draftKey]);

  useEffect(() => {
    if (!machine.id) return;
    const hasDraft = Boolean(transcript || extractedInfo || showTextFallback || phoneInput || technicianName || voiceArtifacts);
    if (!hasDraft) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        transcript,
        extractedInfo,
        voiceArtifacts,
        manualCondition,
        showTextFallback,
        workflowStage,
        phoneInput,
        technicianName,
        reporterName
      }));
    } catch (err) {
      console.warn('Could not save QR draft', err);
    }
  }, [machine.id, draftKey, transcript, extractedInfo, voiceArtifacts, manualCondition, showTextFallback, workflowStage, phoneInput, technicianName, reporterName]);

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
        const { data, error } = await invokeWithRetry('ticket_gateway', {
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
        greetingText = 'Welcome to TurboFix. This is the guided reporting flow while analytics works underneath. Please enter your 10 digit mobile number to proceed.';
      }
    } else {
      if (lang === 'hi-IN') {
        greetingText = 'नमस्ते! मैं आपका टर्बोफिक्स सहायक हूँ। माइक दबाकर समस्या बताएं।';
      } else if (lang === 'mr-IN') {
        greetingText = 'नमस्कार! मी आपला टर्बोफिक्स सहाय्यक आहे. समस्येचे वर्णन करण्यासाठी माइक दाबा.';
      } else {
        greetingText = 'I am your TurboFix assistant. This is the guided reporting flow while analytics works underneath. Tap the big button to speak your problem.';
      }
    }
    if (!phoneGate) {
      greetingText += ` ${machine.name ? `For ${machine.name}${machine.loc ? ` at ${machine.loc}` : ''}.` : 'For the selected machine.'}`;
    }
    
    setAssistantPrompt(greetingText);
    speak(greetingText);
    setWorkflowStage(phoneGate ? 'phone' : 'capture');
  };

  const normalizeTranscriptForApproval = ({ rawText = '', language = lang, machineName = '', machineLocation = '' }) => {
    const original = String(rawText || '').trim();
    const lower = original.toLowerCase();
    const nameMatch = original.match(/(?:my name is|mera naam|मेरा नाम|माझे नाव|माझं नाव)\s+([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F .'-]{1,40})/i);
    const spokenReporterName = nameMatch?.[1]?.replace(/\b(hai|है|आहे)\b.*$/i, '').trim() || '';

    const replacements = [
      [/मशीन/gi, machineName || 'machine'],
      [/मेसिन/gi, machineName || 'machine'],
      [/मशिन/gi, machineName || 'machine'],
      [/नंबर/gi, 'number'],
      [/फोन/gi, 'phone'],
      [/तेल|ऑइल|oil/gi, 'oil'],
      [/लीक|गळती|leak/gi, 'leak'],
      [/गर्म|heat|overheating/gi, 'overheating'],
      [/कंपन|vibration/gi, 'vibration'],
      [/बंद|off|down|stopped/gi, 'stopped'],
      [/चालू|running/gi, 'running'],
      [/असुरक्षित|unsafe|danger/gi, 'unsafe'],
      [/टूट|broken|damage/gi, 'broken'],
      [/जाम|stuck|jam/gi, 'stuck'],
    ];

    let normalized = original;
    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement);
    }

    const isMachineSpecific = Boolean(machineName || machineLocation);
    const contextPrefix = isMachineSpecific
      ? `${machineName || 'Selected machine'}${machineLocation ? ` at ${machineLocation}` : ''}`
      : 'Selected machine';

    const issueSeeds = [
      /oil leak|leak/i.test(normalized) && 'oil leak',
      /overheating|heat/i.test(normalized) && 'overheating',
      /vibration/i.test(normalized) && 'vibration',
      /stuck|jam/i.test(normalized) && 'stuck component',
      /broken|damage/i.test(normalized) && 'broken part',
      /unsafe|danger/i.test(normalized) && 'unsafe condition',
    ].filter(Boolean);

    const extractedIssue = issueSeeds[0]
      || (normalized || original || 'Issue not clearly captured').slice(0, 120);

    const condition = /unsafe|danger/i.test(lower)
      ? 'unsafe'
      : /stopped|down|not working|jam|stuck|बंद|खराब/i.test(lower)
        ? 'stopped'
        : 'running';

    const urgency = condition === 'unsafe'
      ? 'critical'
      : condition === 'stopped'
        ? 'high'
        : /leak|overheating|vibration|broken|damage/i.test(lower)
          ? 'high'
          : 'medium';

    const approvalNote = language === 'hi-IN'
      ? 'AI ने आपकी आवाज़ से साफ़ रिपोर्ट बनाई है — कृपया approval से पहले जाँच लें।'
      : language === 'mr-IN'
        ? 'AI ने तुमच्या बोलण्यातून साफ draft तयार केला आहे — approval आधी तपासा.'
        : 'AI prepared a clean draft from your voice. Please review before approval.';

    return {
      issue: extractedIssue,
      condition,
      urgency,
      machineContext: contextPrefix,
      reporterName: spokenReporterName,
      originalText: original,
      normalizedText: normalized.trim(),
      aiDraft: true,
      confidence: issueSeeds[0] ? 82 : 68,
      approvalNote,
    };
  };

  const buildApprovalSummary = (draft) => {
    if (!draft) return '';
    const machineText = draft.machineContext || (machine.name ? `${machine.name}${machine.loc ? ` at ${machine.loc}` : ''}` : 'Selected machine');
    return `${machineText} · ${draft.issue || 'issue needs approval'}`;
  };

  const approvalSummary = buildApprovalSummary(extractedInfo);

  const suggestCondition = (text) => {
    const t = (text || '').toLowerCase();
    if (/\b(unsafe|fire|smoke|burning|spark|shock|danger)\b/.test(t)) return 'unsafe';
    if (/\b(stopped|not working|breakdown|down|jam)\b/.test(t)) return 'stopped';
    return 'running';
  };

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    setWorkflowStage('transcribing');
    setAssistantPrompt(t('transcribing'));
    setVoiceError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error } = await invokeWithRetry('ai_translation', {
        body: { action: 'transcribe', audio: dataUrl }
      });
      if (error || !data || data.error) throw new Error(data?.error || error?.message || 'Transcription failed.');
      const text = String(data.transcript || '').trim();
      if (!text) {
        const noSpeechMsg = t('noSpeechDetected');
        setVoiceError(noSpeechMsg);
        setAssistantPrompt(noSpeechMsg);
        speak(noSpeechMsg);
        setWorkflowStage('listenback');
        return;
      }
      
      setTranscript(text);
      const normalized = normalizeTranscriptForApproval({
        rawText: text,
        language: lang,
        machineName: machine.name,
        machineLocation: machine.loc
      });
      if (normalized.reporterName) {
        setReporterName(normalized.reporterName);
        localStorage.setItem('tf_reporter_name', normalized.reporterName);
      }
      setManualCondition(normalized.condition || suggestCondition(text));
      setExtractedInfo(normalized);
      setVoiceArtifacts({
        raw_audio_data_url: dataUrl,
        transcript: text,
        language_code: data.language_code || lang,
        ai_output_snapshot: {
          transcript: text,
          language_code: data.language_code || lang,
          normalized_issue: normalized.issue,
          normalized_condition: normalized.condition,
          normalized_urgency: normalized.urgency,
          reporter_name: normalized.reporterName || reporterName || '',
          approval_note: normalized.approvalNote || '',
          ai_draft: true
        },
        review_snapshot: null,
        final_submission_snapshot: null
      });
      setShowTextFallback(true);
      clearPendingAudio();
      setWorkflowStage('review');
      
      const reviewMsg = machine.name
        ? `${t('reviewConfirm')} ${machine.name}${machine.loc ? ` at ${machine.loc}` : ''}.`
        : t('reviewConfirm');
      setAssistantPrompt(reviewMsg);
      speak(reviewMsg);
    } catch (err) {
      console.error(err);
      const rawMsg = String(err?.message || '').trim();
      const errMsg = /not configured|api key|secret/i.test(rawMsg)
        ? 'Voice transcription is not configured right now.'
        : /temporarily unavailable|quota|429|overloaded/i.test(rawMsg)
          ? 'Voice transcription is temporarily unavailable. Please try again.'
          : rawMsg || t('transcribeError');
      setVoiceError(errMsg);
      setAssistantPrompt(errMsg);
      speak(errMsg);
      setWorkflowStage('listenback');
    } finally {
      setIsTranscribing(false);
    }
  };

  const clearPendingAudio = () => {
    setPendingAudioBlob(null);
    if (pendingAudioUrl) {
      URL.revokeObjectURL(pendingAudioUrl);
      setPendingAudioUrl('');
    }
  };

  const transcribePendingAudio = async () => {
    if (!pendingAudioBlob || pendingAudioBlob.size < 512) {
      const msg = 'Recording is empty. Please re-record once.';
      setVoiceError(msg);
      setAssistantPrompt(msg);
      return;
    }
    await transcribeAudio(pendingAudioBlob);
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

  const uploadIssuePhoto = async () => {
    if (!photoFile) return null;
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `issue-${machine.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${machine.id}/${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('repair-proofs')
        .upload(filePath, photoFile);
      if (uploadErr) {
        console.warn('Storage upload notice (handled):', uploadErr.message);
        return null;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('repair-proofs')
        .getPublicUrl(filePath);
      return publicUrl;
    } catch (photoErr) {
      console.warn('Photo upload exception handled:', photoErr);
      return null;
    }
  };

  const buildSnapshots = ({ uploadedUrl = null, includeTechnician = true } = {}) => {
    const reporter = reporterPhone.match(/^\d+$/) ? reporterPhone : null;
    const cleanReporterName = reporterName.trim() || null;
    const base = {
      machine_id: machine.id,
      machine_name: machine.name,
      location: machine.loc,
      issue_text: extractedInfo.issue,
      urgency: extractedInfo.urgency,
      condition: extractedInfo.condition,
      reporter_phone: reporter,
      reporter_name: cleanReporterName,
      voice_language: voiceArtifacts?.language_code || lang,
    };
    const technician = includeTechnician ? { technician_name: technicianName || null } : {};
    return {
      ai_output_snapshot: voiceArtifacts?.ai_output_snapshot || {
        transcript,
        normalized_issue: extractedInfo.issue,
        normalized_condition: extractedInfo.condition,
        normalized_urgency: extractedInfo.urgency,
        reporter_name: cleanReporterName
      },
      review_snapshot: {
        ...base,
        ...technician,
        photo_url: uploadedUrl,
        draft_mode: false,
        reviewed_at: new Date().toISOString()
      },
      final_submission_snapshot: {
        ...base,
        ...technician,
        photo_url: uploadedUrl,
        submitted_at: new Date().toISOString(),
        source: showTextFallback ? 'text' : 'voice'
      }
    };
  };

  const buildTicketPayload = ({ uploadedUrl = null, verified = false, offline = false } = {}) => {
    const reporter = reporterPhone.match(/^\d+$/) ? reporterPhone : null;
    const cleanReporterName = reporterName.trim() || null;
    return {
      machine_id: machine.id,
      status: 'open',
      issue_text: extractedInfo.issue,
      urgency: extractedInfo.urgency,
      type: 'breakdown',
      reporter_phone: reporter,
      factory_id: machine.factory_id,
      lifecycle_stage: verified ? 'open' : 'unverified',
      voice_language: voiceArtifacts?.language_code || lang,
      ai_summary: {
        voice_reported: !showTextFallback,
        extracted_condition: extractedInfo.condition,
        reporter_id: reporterPhone,
        reporter_name: cleanReporterName,
        verified_reporter: verified,
        flag: offline ? 'offline_submission' : verified ? null : 'unverified_reporter',
        photo_url: uploadedUrl
      },
      ...buildSnapshots({ uploadedUrl, includeTechnician: !offline }),
      voice_artifacts: voiceArtifacts
    };
  };

  const resetForm = () => {
    setSuccess(false);
    setSubmittedTicketInfo(null);
    removePhoto();
    setTranscript('');
    setExtractedInfo(null);
    setVoiceArtifacts(null);
    clearPendingAudio();
    setDuplicateTicket(null);
    setShowTextFallback(false);
    setManualCondition('running');
    setCheckingDuplicate(false);
    setUploadingPhoto(false);
    setWorkflowStage('capture');
    try {
      localStorage.removeItem(draftKey);
    } catch (err) {
      console.warn('Could not clear QR draft', err);
    }
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
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch (e) {}
    }
  };

  const fallBackToText = (title, desc) => {
    setIsListening(false);
    setIsTranscribing(false);
    setErrorAlert({ title, desc });
    setShowTextFallback(true);
    setAssistantPrompt(t('troubleSpeaking'));
  };

  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  const startVoiceInput = async () => {
    setErrorAlert(null);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
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
    setTranscript('');
    setWorkflowStage('listening');
    setIsListening(true);

    try {
      setVoiceError('');
      chunksRef.current = [];
      const stream = await getLiveMicStream();
      const recorder = new MediaRecorder(stream, getRecorderOptions());
      
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        setIsListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        recorderRef.current = null;
        if (!blob.size) {
          const msg = 'Recording is empty. Please re-record once.';
          setVoiceError(msg);
          setWorkflowStage('capture');
          setAssistantPrompt(msg);
          return;
        }
        clearPendingAudio();
        const url = URL.createObjectURL(blob);
        setPendingAudioBlob(blob);
        setPendingAudioUrl(url);
        setWorkflowStage('listenback');
        setAssistantPrompt('Listen to your recording, then send it for transcription.');
      };

      recorderRef.current = recorder;
      setAssistantPrompt(t('listening'));
      recorder.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      fallBackToText(t('micBlockedTitle'), t('micBlockedDesc'));
      setWorkflowStage('capture');
    }
  };

  const submitTicket = async (bypassDuplicateCheck = false) => {
    if (!extractedInfo || isSubmittingTicket) return;
    setIsSubmittingTicket(true);
    setCheckingDuplicate(true);
    setUploadingPhoto(true);
    setWorkflowStage('submitting');

    try {
      if (reporterName.trim()) localStorage.setItem('tf_reporter_name', reporterName.trim());
      if (!navigator.onLine) {
        console.log('Device is offline. Queuing ticket locally.');
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        queue.push(buildTicketPayload({ offline: true }));
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        setOfflineQueued(true);

        const successText = t('offlineSavedText');
        setAssistantPrompt(successText);
        speak(successText);
        setExtractedInfo(null);
        setDuplicateTicket(null);
        setSuccess(true);
        setWorkflowStage('done');
        try {
          localStorage.removeItem(draftKey);
        } catch (err) {}
        return;
      }

      if (!bypassDuplicateCheck) {
        const { data: dupData, error: dupErr } = await invokeWithRetry('ticket_gateway', {
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

      const uploadedUrl = await uploadIssuePhoto();
      const payload = buildTicketPayload({ uploadedUrl, verified });

      const { data, error: fnError } = await invokeWithRetry('ticket_gateway', {
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
      setWorkflowStage('done');
      setVoiceArtifacts(null);
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {}
    } catch (err) {
      console.error('Error logging ticket:', err);
      const errMsg = t('submissionProblemText');
      setAssistantPrompt(errMsg);
      speak(errMsg);
      setErrorAlert({ title: t('submittingErrorTitle'), desc: err.message });
      setWorkflowStage('review');
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
    setWorkflowStage('submitting');
    try {
      const uploadedUrl = await uploadIssuePhoto();

      const { data: fetchResult, error: fetchErr } = await invokeWithRetry('ticket_gateway', {
        body: { action: 'get_ticket', ticket_id: duplicateTicket.id }
      });
      if (fetchErr || !fetchResult || fetchResult.error) {
        throw new Error(fetchResult?.error || fetchErr?.message || 'Could not fetch existing ticket details.');
      }
      const currentTicket = fetchResult.data;
      
      const mergedSummary = {
        ...(currentTicket?.ai_summary || {}),
        reporter_name: reporterName.trim() || currentTicket?.ai_summary?.reporter_name || null,
        photo_url: uploadedUrl || currentTicket?.ai_summary?.photo_url || null
      };

      const reporterLabel = reporterName.trim() || reporterPhone || 'QR reporter';
      const mergedText = `${duplicateTicket.issue_text}\n[Append from ${reporterLabel}]: ${extractedInfo.issue}`;
      
      const { data, error: fnError } = await invokeWithRetry('ticket_gateway', {
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
      setWorkflowStage('done');
      setVoiceArtifacts(null);
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {}
    } catch (err) {
      alert('Error appending: ' + err.message);
      setWorkflowStage('review');
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
    if (reporterName.trim()) localStorage.setItem('tf_reporter_name', reporterName.trim());
    setReporterPhone(phoneInput.trim());
    setPhoneGate(false);
    setWorkflowStage('capture');
    
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
    <main className="qr-gateway-page" style={{
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
      <div className="qr-gateway-shell" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
        <div className="qr-gateway-identity-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" /></svg>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '1px', fontFamily: 'Rajdhani, sans-serif', color: '#ffffff' }}>TURBOFIX</span>
          </div>
          <div className="qr-gateway-identity-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
        <div className="qr-gateway-identity-stack" style={{ display: 'grid', gap: '5px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 700, lineHeight: 1.25 }}>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '.04em' }}>Machine</span>
            <span>{machine.name}</span>
            <span style={{ color: '#334155' }}>•</span>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '.04em' }}>Location</span>
            <span>{machine.loc}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              {activeTickets.length > 0 ? (
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="glow-dot down" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> Attention ({activeTickets.length})
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#25D366', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '999px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366' }} /> Operational
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {errorAlert && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px 12px', width: '100%', maxWidth: '340px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444' }}>{errorAlert.title}</span>
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.3' }}>{errorAlert.desc}</span>
          <button type="button" onClick={() => setErrorAlert(null)} style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', color: 'white', cursor: 'pointer' }}>{t('cancel')}</button>
        </div>
      )}

      {!phoneGate && (
        <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto', display: 'grid', gap: '8px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '0 4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>Current step</span>
            <span style={{ color: '#a78bfa', fontSize: '0.72rem', fontWeight: 800 }}>{workflowStage === 'listening' ? t('listening') : workflowStage === 'transcribing' ? t('transcribing') : workflowStage === 'submitting' ? t('submitting') : workflowLabel}</span>
          </div>
        </div>
      )}

      {/* Main Single-Screen Content Container */}
      {phoneGate ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '340px', width: '100%', margin: '0 auto', gap: '12px', zIndex: 10 }}>
          <div className="qr-gateway-card qr-gateway-gate" style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 850, color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '.04em' }}>
              {t('phoneGateTitle')}
            </h3>
            
            <div className="qr-gateway-segment-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                {t('selectLang')}
              </label>
              <div className="qr-gateway-segmented" style={{ display: 'flex', gap: '6px' }}>
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
                      className={`qr-gateway-segment ${active ? 'active' : ''}`}
                      style={{
                        flex: 1,
                        padding: '9px 4px',
                        minHeight: '42px',
                        background: active ? '#863bff' : '#0b1118',
                        border: active ? '1px solid #863bff' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
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

            <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.35' }}>
              {t('phoneGateDesc')}
            </p>
            <input 
              type="tel" 
              maxLength={10} 
              value={phoneInput} 
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))} 
              placeholder={t('phoneGatePlaceholder')} 
              style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px', fontSize: '1rem', color: 'white', letterSpacing: '2px', textAlign: 'center', boxSizing: 'border-box' }}
            />
            <input
              type="text"
              maxLength={48}
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder={t('reporterNamePlaceholder')}
              style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px', fontSize: '0.95rem', color: 'white', boxSizing: 'border-box' }}
            />
            <button 
              type="button" 
              onClick={handlePhoneProceed} 
              style={{ width: '100%', padding: '12px', minHeight: '48px', background: '#863bff', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 8px 20px rgba(134,59,255,0.28)' }}
            >
              {t('proceed')}
            </button>
          </div>
        </div>
      ) : success ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '340px', width: '100%', margin: '0 auto', gap: '12px', zIndex: 10 }}>
          <div className="qr-gateway-card qr-gateway-success" style={{ 
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
      ) : workflowStage === 'listenback' && pendingAudioUrl ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '340px', width: '100%', margin: '0 auto', gap: '10px', zIndex: 10 }}>
          <div className="qr-gateway-card qr-gateway-listenback" style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', display: 'grid', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 850, color: 'white', fontFamily: 'Rajdhani, sans-serif', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Hear it back
            </h3>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.45 }}>
              Play once, re-record if needed, then send it for transcription.
            </div>
            <audio controls src={pendingAudioUrl} style={{ width: '100%' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  clearPendingAudio();
                  releaseMicStream();
                  setTranscript('');
                  setExtractedInfo(null);
                  setVoiceError('');
                  setWorkflowStage('capture');
                  setAssistantPrompt('Tap the mic and record again.');
                }}
                style={{ minHeight: '46px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', color: '#e5edf6', fontSize: '0.85rem', fontWeight: 750, cursor: 'pointer' }}
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={transcribePendingAudio}
                style={{ minHeight: '46px', background: 'linear-gradient(135deg, #863bff, #6d28d9)', border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 850, cursor: 'pointer', boxShadow: '0 8px 20px rgba(134,59,255,0.25)' }}
              >
                Send for transcription
              </button>
            </div>
            {voiceError ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fecaca', borderRadius: '12px', padding: '10px 12px', fontSize: '0.8rem', lineHeight: 1.45, textAlign: 'center' }}>
                {voiceError}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                clearPendingAudio();
                setShowTextFallback(true);
                setVoiceError('');
                setWorkflowStage('capture');
                setAssistantPrompt(t('troubleSpeaking'));
              }}
              style={{ minHeight: '42px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#aab8c8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              {t('troubleSpeaking')}
            </button>
          </div>
        </div>
      ) : showTextFallback ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '340px', width: '100%', margin: '0 auto', gap: '8px', zIndex: 10 }}>
          <div className="qr-gateway-card qr-gateway-text-fallback" style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: 'white', fontFamily: 'Rajdhani, sans-serif', textAlign: 'center' }}>
              {t('writeIssueTitle')}
            </h3>
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', lineHeight: '1.35' }}>
              {machineContextLabel}
            </div>
            
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
                className={`qr-gateway-mic ${isListening ? 'listening' : ''} ${isTranscribing ? 'transcribing' : ''}`}
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
              <div className="qr-gateway-condition-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
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
                    className={`qr-gateway-condition ${manualCondition === item.id ? 'active' : ''}`}
                    style={{
                      padding: '8px 4px',
                      minHeight: '40px',
                      borderRadius: '10px',
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

            <div className="qr-gateway-action-row" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setShowTextFallback(false)}
                className="qr-gateway-secondary"
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
                className="qr-gateway-primary"
                style={{ flex: 1.5, padding: '10px', minHeight: '44px', background: '#16a34a', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <span>{t('reviewConfirm')}</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div className="qr-gateway-voice-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
          
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
            className={`qr-gateway-mic qr-gateway-orb ${isListening ? 'listening' : ''} ${isTranscribing ? 'transcribing' : ''}`}
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
            className="qr-gateway-text-toggle"
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
        <div className="qr-gateway-card qr-gateway-review" style={{ background: 'rgba(15, 23, 34, 0.98)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '20px 20px 0 0', padding: '14px', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, boxShadow: '0 -18px 40px rgba(0,0,0,0.42)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {duplicateTicket ? (
            <>
              <div style={{ textAlign: 'center', display: 'grid', gap: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 850, color: '#fbbf24', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  {t('similarTicketOpen')}
                </h4>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0, lineHeight: 1.45 }}>
                  {t('similarTicketDesc')}
                </p>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={appendTicket}
                  disabled={checkingDuplicate}
                  style={{ width: '100%', minHeight: '46px', border: '0', borderRadius: '12px', color: '#081a2e', background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', fontSize: '0.84rem', fontWeight: 850, cursor: 'pointer' }}
                >
                  {t('appendRecommended')}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setDuplicateTicket(null)}
                    style={{ minHeight: '44px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', color: '#e5edf6', background: 'rgba(255,255,255,0.02)', fontSize: '0.84rem', fontWeight: 750, cursor: 'pointer' }}
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => submitTicket(true)}
                    disabled={checkingDuplicate}
                    style={{ minHeight: '44px', border: '0', borderRadius: '12px', color: '#fff', background: 'linear-gradient(135deg, #ef4444, #dc2626)', fontSize: '0.84rem', fontWeight: 850, cursor: 'pointer' }}
                  >
                    {t('createSeparate')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', display: 'grid', gap: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 850, color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {t('reviewTitle')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.45 }}>
                  {approvalSummary} · AI draft ready for approval
                </p>
              </div>

              <div style={{ display: 'grid', gap: '8px', padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  ['Machine', machine.name || 'Selected machine'],
                  ['Location', machine.loc || 'Not set'],
                  ['Reporter', reporterName.trim() || 'Not provided'],
                  ['Report type', extractedInfo?.aiDraft ? 'AI-reviewed voice' : showTextFallback ? 'Text / Voice' : 'Voice'],
                  ['Assigned technician', technicianName || t('notAssigned')]
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.76rem', alignItems: 'start' }}>
                    <span style={{ color: '#94a3b8' }}>{label}</span>
                    <strong style={{ color: label === 'Report type' ? '#a78bfa' : '#f8fafc', textAlign: 'right', lineHeight: 1.35 }}>{value}</strong>
                  </div>
                ))}
                {extractedInfo?.confidence != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.76rem' }}>
                    <span style={{ color: '#94a3b8' }}>AI confidence</span>
                    <strong style={{ color: extractedInfo.confidence >= 80 ? '#4ade80' : '#fbbf24', textAlign: 'right' }}>{extractedInfo.confidence}%</strong>
                  </div>
                )}
                {photoPreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                    <img src={photoPreview} alt="Selected evidence" style={{ width: '46px', height: '46px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ minWidth: 0, display: 'grid', gap: '2px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Image attached</div>
                      <div style={{ fontSize: '0.76rem', color: '#e5edf6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {photoFile?.name || 'Selected image'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '.03em' }}>
                  {t('reporterNameLabel')}
                </label>
                <input
                  type="text"
                  maxLength={48}
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder={t('reporterNamePlaceholder')}
                  style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '12px', color: 'white', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '.03em' }}>
                  {t('issueDescEdit')}
                </label>
                <textarea 
                  rows={3}
                  value={extractedInfo.issue}
                  onChange={(e) => setExtractedInfo(prev => ({ ...prev, issue: e.target.value }))}
                  style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '12px', color: 'white', fontFamily: 'inherit', resize: 'none', fontSize: '0.88rem', boxSizing: 'border-box', lineHeight: 1.45 }}
                />
                <div style={{ color: '#94a3b8', fontSize: '0.74rem', lineHeight: '1.45' }}>
                  {extractedInfo?.approvalNote || 'Review the AI draft before approval.'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '.03em' }}>
                  {t('machineCondition')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
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
                        minHeight: '42px',
                        borderRadius: '14px',
                        background: extractedInfo.condition === item.id ? `${item.color}22` : '#0b1118',
                        border: `1px solid ${extractedInfo.condition === item.id ? item.color : 'rgba(255,255,255,0.1)'}`,
                        color: extractedInfo.condition === item.id ? '#ffffff' : '#94a3b8',
                        fontSize: '0.76rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        textAlign: 'center',
                        padding: '10px 8px',
                        lineHeight: 1.25
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px', background: 'rgba(134,59,255,0.08)', padding: '10px 12px', borderRadius: '14px', border: '1px solid rgba(134,59,255,0.15)', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: '#cbd5e1' }}>{t('assignedTech')}</span>
                  <strong style={{ color: '#a78bfa', fontWeight: 800, textAlign: 'right' }}>{technicianName || t('notAssigned')}</strong>
                </div>
                <span style={{ color: '#94a3b8', lineHeight: 1.4 }}>After approval, TurboFix creates the WO and saves voice, AI draft, review snapshot and final submission.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '8px', marginTop: '2px' }}>
                <button 
                  type="button" 
                  onClick={() => setExtractedInfo(null)}
                  style={{ minHeight: '48px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', color: '#e5edf6', fontSize: '0.86rem', fontWeight: 750, cursor: 'pointer' }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  onClick={() => submitTicket(false)}
                  disabled={checkingDuplicate || !extractedInfo.issue.trim()}
                  style={{ minHeight: '48px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '14px', color: '#ffffff', fontSize: '0.86rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  {checkingDuplicate ? t('submitting') : t('yesSubmit')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Secondary Footer Actions (100vh bottom) */}
      {!phoneGate && (
        <footer className="qr-gateway-footer" style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', minHeight: '38px', zIndex: 10, opacity: 0.92 }}>
          <button 
            type="button" 
            onClick={handleFetchStatus}
            className="qr-gateway-footer-btn"
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
            className="qr-gateway-footer-btn"
            style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 4px', fontSize: '0.75rem', color: '#aab8c8', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {t('loginDashboard')}
          </button>
        </footer>
      )}

      {/* Ticket Status Timeline overlay */}
      {showStatus && (
        <div className="qr-gateway-card qr-gateway-status" style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,24,0.98)', display: 'flex', flexDirection: 'column', padding: '16px', zIndex: 1000 }}>
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
