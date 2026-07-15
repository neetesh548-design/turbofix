import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Factory,
  FileSearch,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Upload,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import MainLayout from '../layouts/MainLayout';

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919876543210';

const contentByLanguage = {
  en: {
    eyebrow: 'AI maintenance decision platform for manufacturing SMEs',
    heroTitle: 'Know what to fix next—before downtime decides for you.',
    heroBody: 'TurboFix turns machine records, manuals, breakdowns, preventive work, and shutdown capacity into one clear maintenance workflow.',
    bookDemo: 'Book a guided demo',
    explore: 'Explore the product',
    trust: ['Machine-specific knowledge', 'Approval before internet enrichment', 'Built for practical plant teams'],
    previewQuestion: 'What should we service this Sunday?',
    previewScope: 'Plant-wide question • 2 machines reviewed',
    previewFinding: 'Hydraulic Press needs attention first',
    previewReason: 'Overdue inspection, repeated oil leak, and spare seal available.',
    previewAction: 'Add to shutdown plan',
    previewSafe: 'Recommendation uses approved machine context',
    strip: ['One machine register', 'AI across one or all machines', 'Guided shutdown planning', 'Closed-loop technician work'],
    platformEyebrow: 'One maintenance operating system',
    platformTitle: 'Move from scattered records to confident decisions',
    platformBody: 'Every module feeds the next step, so knowledge becomes action instead of another dashboard nobody follows.',
    workflowEyebrow: 'A complete maintenance loop',
    workflowTitle: 'From machine data to verified work',
    workflowBody: 'Start with the information you already have. TurboFix organizes it, supports the decision, and keeps execution visible.',
    knowledgeEyebrow: 'Machine intelligence that stays useful',
    knowledgeTitle: 'Every machine gets its own approved knowledge file',
    knowledgeBody: 'Upload manuals, wiring diagrams, hydraulic diagrams, BOMs, or spare lists. TurboFix creates a machine-specific Markdown knowledge file used by AI capabilities. If data is missing, internet enrichment is proposed only after user approval.',
    knowledgeItems: ['Manuals and technical documents', 'BOM, spares, and consumables', 'Maintenance history and open risks', 'Approved internet-enriched context'],
    demoEyebrow: 'See the workflow',
    demoTitle: 'A practical product—not an AI presentation',
    demoBody: 'Explore the same screens maintenance heads, technicians, and owners use to decide, execute, and review work.',
    demoLogin: 'Open demo sign-in',
    demoList: ['Ask one-machine or plant-wide questions', 'Adjust shutdown effort and available hours', 'Review technician evidence and closure status', 'Configure escalation roles and AI approval'],
    fitEyebrow: 'Built for the real factory floor',
    fitTitle: 'Start where maintenance is hardest today',
    fitBody: 'TurboFix fits teams that have outgrown paper, spreadsheets, calls, and disconnected files—but do not want a complex enterprise rollout.',
    faqTitle: 'Questions maintenance leaders ask first',
    contactEyebrow: 'Guided onboarding',
    contactTitle: 'Show us your maintenance reality',
    contactBody: 'Tell us about your plant and biggest maintenance challenge. We will use the walkthrough to map TurboFix to your current process—not force a generic software demo.',
    contactPoints: ['Review your present breakdown and PM flow', 'Map one representative machine', 'Identify the first useful workflow to launch'],
    formTitle: 'Book your plant walkthrough',
    name: 'Your name',
    phone: 'Phone / WhatsApp',
    company: 'Company name',
    machines: 'Approximate machines',
    challenge: 'Biggest maintenance challenge',
    challengePlaceholder: 'Select one',
    challengeOptions: ['Unplanned breakdowns', 'Shutdown planning', 'Missing machine knowledge', 'Technician follow-through', 'Maintenance visibility', 'Other'],
    submit: 'Request guided demo',
    formNote: 'We use these details only to plan your walkthrough.',
    successTitle: 'Your request is ready',
    successBody: 'A WhatsApp message has opened with your details. Send it to confirm the walkthrough.',
  },
  hi: {
    eyebrow: 'मैन्युफैक्चरिंग SMEs के लिए AI मेंटेनेंस निर्णय प्लेटफॉर्म',
    heroTitle: 'डाउनटाइम से पहले जानें—अगला काम क्या होना चाहिए।',
    heroBody: 'TurboFix मशीन रिकॉर्ड, मैनुअल, ब्रेकडाउन, PM और शटडाउन क्षमता को एक सरल मेंटेनेंस वर्कफ़्लो में जोड़ता है।',
    bookDemo: 'गाइडेड डेमो बुक करें',
    explore: 'प्रोडक्ट देखें',
    trust: ['हर मशीन का अलग ज्ञान', 'इंटरनेट डेटा से पहले अनुमति', 'व्यावहारिक प्लांट टीमों के लिए'],
    previewQuestion: 'इस रविवार किस मशीन की सर्विस करें?',
    previewScope: 'पूरे प्लांट का प्रश्न • 2 मशीनों की समीक्षा',
    previewFinding: 'Hydraulic Press पर पहले ध्यान दें',
    previewReason: 'निरीक्षण लंबित है, तेल रिसाव दोहराया गया है और सील उपलब्ध है।',
    previewAction: 'शटडाउन प्लान में जोड़ें',
    previewSafe: 'सिफारिश अनुमोदित मशीन संदर्भ पर आधारित है',
    strip: ['एक मशीन रजिस्टर', 'एक या सभी मशीनों पर AI', 'गाइडेड शटडाउन प्लानिंग', 'क्लोज़्ड-लूप तकनीशियन कार्य'],
    platformEyebrow: 'एक मेंटेनेंस ऑपरेटिंग सिस्टम',
    platformTitle: 'बिखरे रिकॉर्ड से स्पष्ट निर्णय तक',
    platformBody: 'हर मॉड्यूल अगले कदम को जानकारी देता है, ताकि डेटा वास्तविक कार्रवाई में बदले।',
    workflowEyebrow: 'पूरा मेंटेनेंस लूप',
    workflowTitle: 'मशीन डेटा से सत्यापित कार्य तक',
    workflowBody: 'अपनी मौजूदा जानकारी से शुरू करें। TurboFix उसे व्यवस्थित करता है, निर्णय में मदद करता है और काम को दिखाई देने योग्य रखता है।',
    knowledgeEyebrow: 'उपयोगी मशीन इंटेलिजेंस',
    knowledgeTitle: 'हर मशीन की अपनी अनुमोदित नॉलेज फाइल',
    knowledgeBody: 'मैनुअल, वायरिंग, हाइड्रोलिक डायग्राम, BOM या स्पेयर सूची अपलोड करें। TurboFix AI के लिए मशीन-विशिष्ट Markdown नॉलेज फाइल बनाता है। डेटा न होने पर इंटरनेट सहायता केवल अनुमति के बाद प्रस्तावित होती है।',
    knowledgeItems: ['मैनुअल और तकनीकी दस्तावेज', 'BOM, स्पेयर और कंज्यूमेबल', 'मेंटेनेंस इतिहास और जोखिम', 'अनुमोदित इंटरनेट संदर्भ'],
    demoEyebrow: 'वर्कफ़्लो देखें',
    demoTitle: 'सिर्फ AI प्रस्तुति नहीं—एक व्यावहारिक प्रोडक्ट',
    demoBody: 'वे स्क्रीन देखें जिनसे मेंटेनेंस हेड, तकनीशियन और मालिक काम तय, पूरा और समीक्षा करते हैं।',
    demoLogin: 'डेमो साइन-इन खोलें',
    demoList: ['एक या सभी मशीनों पर प्रश्न', 'शटडाउन समय और क्षमता बदलें', 'तकनीशियन प्रमाण और क्लोज़र देखें', 'एस्केलेशन और AI अनुमति सेट करें'],
    fitEyebrow: 'असल फैक्ट्री फ्लोर के लिए',
    fitTitle: 'आज की सबसे बड़ी मेंटेनेंस समस्या से शुरू करें',
    fitBody: 'उन टीमों के लिए जो कागज़, Excel, कॉल और बिखरी फाइलों से आगे बढ़ना चाहती हैं—बिना भारी enterprise rollout के।',
    faqTitle: 'मेंटेनेंस लीडर के शुरुआती सवाल',
    contactEyebrow: 'गाइडेड ऑनबोर्डिंग',
    contactTitle: 'हमें अपनी मेंटेनेंस स्थिति बताएं',
    contactBody: 'अपने प्लांट और सबसे बड़ी चुनौती बताएं। डेमो आपके वर्तमान काम के अनुसार होगा, किसी सामान्य सॉफ्टवेयर प्रस्तुति जैसा नहीं।',
    contactPoints: ['मौजूदा breakdown और PM flow की समीक्षा', 'एक प्रतिनिधि मशीन की mapping', 'पहला उपयोगी workflow पहचानना'],
    formTitle: 'प्लांट walkthrough बुक करें',
    name: 'आपका नाम', phone: 'फोन / WhatsApp', company: 'कंपनी का नाम', machines: 'लगभग मशीनें', challenge: 'सबसे बड़ी मेंटेनेंस चुनौती', challengePlaceholder: 'एक चुनें',
    challengeOptions: ['अनियोजित breakdown', 'Shutdown planning', 'मशीन जानकारी की कमी', 'Technician follow-through', 'मेंटेनेंस visibility', 'अन्य'],
    submit: 'गाइडेड डेमो माँगें', formNote: 'इन विवरणों का उपयोग केवल walkthrough की योजना के लिए होगा।',
    successTitle: 'आपका अनुरोध तैयार है', successBody: 'आपकी जानकारी के साथ WhatsApp खुल गया है। walkthrough की पुष्टि के लिए संदेश भेजें।',
  },
  mr: {
    eyebrow: 'उत्पादन SMEs साठी AI मेंटेनन्स निर्णय प्लॅटफॉर्म',
    heroTitle: 'डाउनटाइम ठरवण्याआधी जाणून घ्या—पुढे काय दुरुस्त करायचे.',
    heroBody: 'TurboFix मशीन नोंदी, मॅन्युअल, ब्रेकडाउन, PM आणि शटडाउन क्षमता एका सोप्या मेंटेनन्स वर्कफ्लोमध्ये जोडतो.',
    bookDemo: 'मार्गदर्शित डेमो बुक करा', explore: 'प्रॉडक्ट पाहा',
    trust: ['प्रत्येक मशीनचे स्वतंत्र ज्ञान', 'इंटरनेट डेटापूर्वी मंजुरी', 'प्रत्यक्ष प्लांट टीमसाठी'],
    previewQuestion: 'या रविवारी कोणत्या मशीनची सर्व्हिस करावी?', previewScope: 'संपूर्ण प्लांट प्रश्न • 2 मशीन तपासल्या', previewFinding: 'Hydraulic Press ला प्रथम प्राधान्य', previewReason: 'तपासणी बाकी, वारंवार तेल गळती आणि सील उपलब्ध.', previewAction: 'शटडाउन प्लॅनमध्ये जोडा', previewSafe: 'शिफारस मंजूर मशीन संदर्भ वापरते',
    strip: ['एक मशीन रजिस्टर', 'एका किंवा सर्व मशीनसाठी AI', 'मार्गदर्शित शटडाउन नियोजन', 'क्लोज्ड-लूप तंत्रज्ञ काम'],
    platformEyebrow: 'एक मेंटेनन्स ऑपरेटिंग सिस्टम', platformTitle: 'विखुरलेल्या नोंदींपासून स्पष्ट निर्णयापर्यंत', platformBody: 'प्रत्येक मॉड्यूल पुढील टप्प्याला माहिती देते, त्यामुळे डेटा प्रत्यक्ष कृतीत बदलतो.',
    workflowEyebrow: 'पूर्ण मेंटेनन्स लूप', workflowTitle: 'मशीन डेटापासून पडताळलेल्या कामापर्यंत', workflowBody: 'तुमच्याकडील माहितीपासून सुरुवात करा. TurboFix ती व्यवस्थित करतो, निर्णयाला मदत करतो आणि काम स्पष्ट ठेवतो.',
    knowledgeEyebrow: 'उपयुक्त मशीन इंटेलिजन्स', knowledgeTitle: 'प्रत्येक मशीनची स्वतंत्र मंजूर नॉलेज फाइल', knowledgeBody: 'मॅन्युअल, वायरिंग, हायड्रॉलिक डायग्राम, BOM किंवा स्पेअर सूची अपलोड करा. TurboFix AI साठी मशीन-विशिष्ट Markdown फाइल बनवतो. इंटरनेट सहाय्य फक्त वापरकर्त्याच्या मंजुरीनंतर सुचवले जाते.', knowledgeItems: ['मॅन्युअल आणि तांत्रिक कागदपत्रे', 'BOM, स्पेअर्स आणि कंझ्युमेबल्स', 'मेंटेनन्स इतिहास आणि धोके', 'मंजूर इंटरनेट संदर्भ'],
    demoEyebrow: 'वर्कफ्लो पाहा', demoTitle: 'फक्त AI सादरीकरण नाही—प्रत्यक्ष उपयोगी प्रॉडक्ट', demoBody: 'मेंटेनन्स हेड, तंत्रज्ञ आणि मालक निर्णय, काम आणि समीक्षा करण्यासाठी वापरतात त्या स्क्रीन पाहा.', demoLogin: 'डेमो साइन-इन उघडा', demoList: ['एका किंवा सर्व मशीनवर प्रश्न', 'शटडाउन वेळ आणि क्षमता बदला', 'तंत्रज्ञ पुरावा आणि क्लोजर तपासा', 'एस्केलेशन आणि AI मंजुरी सेट करा'],
    fitEyebrow: 'खऱ्या फॅक्टरी फ्लोअरसाठी', fitTitle: 'आजच्या सर्वात कठीण मेंटेनन्स समस्येपासून सुरू करा', fitBody: 'कागद, Excel, कॉल आणि विखुरलेल्या फाइल्समधून पुढे जाणाऱ्या टीमसाठी—जटिल enterprise rollout शिवाय.',
    faqTitle: 'मेंटेनन्स लीडरचे पहिले प्रश्न',
    contactEyebrow: 'मार्गदर्शित ऑनबोर्डिंग', contactTitle: 'तुमची मेंटेनन्स स्थिती आम्हाला सांगा', contactBody: 'तुमचा प्लांट आणि मोठी समस्या सांगा. walkthrough तुमच्या प्रक्रियेनुसार असेल—सामान्य सॉफ्टवेअर डेमोसारखा नाही.', contactPoints: ['सध्याच्या breakdown आणि PM flow ची समीक्षा', 'एका प्रतिनिधी मशीनचे mapping', 'पहिला उपयुक्त workflow ओळखणे'],
    formTitle: 'प्लांट walkthrough बुक करा', name: 'तुमचे नाव', phone: 'फोन / WhatsApp', company: 'कंपनीचे नाव', machines: 'अंदाजे मशीन', challenge: 'सर्वात मोठी मेंटेनन्स समस्या', challengePlaceholder: 'एक निवडा', challengeOptions: ['अनियोजित breakdown', 'Shutdown planning', 'मशीन ज्ञानाची कमतरता', 'Technician follow-through', 'मेंटेनन्स visibility', 'इतर'], submit: 'मार्गदर्शित डेमो मागवा', formNote: 'ही माहिती फक्त walkthrough नियोजनासाठी वापरली जाईल.', successTitle: 'तुमची विनंती तयार आहे', successBody: 'तुमच्या माहितीसह WhatsApp उघडले आहे. walkthrough निश्चित करण्यासाठी संदेश पाठवा.',
  },
};

const platformFeatures = [
  { icon: BrainCircuit, title: 'AI Maintenance Assistant', body: 'Ask about one machine or the entire plant. Get recommendations grounded in machine knowledge, history, and current work.' },
  { icon: CalendarClock, title: 'Shutdown Planner', body: 'Prioritize the right machines, edit effort assumptions, compare work with available hours, and prepare an achievable sequence.' },
  { icon: Database, title: 'Machine Workspace', body: 'Keep manuals, wiring and hydraulic diagrams, BOMs, spares, maintenance history, and QR identity together.' },
  { icon: ClipboardCheck, title: 'Technician Workspace', body: 'Give technicians a focused work queue with checklists, notes, parts, evidence, and supervisor review.' },
  { icon: TicketCheck, title: 'Breakdown & Escalation', body: 'Capture issues quickly, assign responsibility, track response status, and escalate using plant-defined rules.' },
  { icon: LayoutDashboard, title: 'Maintenance Control View', body: 'See machine attention, PM status, open work, knowledge gaps, and operational priorities without chasing updates.' },
];

const workflowSteps = [
  { icon: ScanLine, number: '01', title: 'Register the machine', body: 'Create the machine record, QR identity, location, ownership, and preventive context.' },
  { icon: Upload, number: '02', title: 'Build machine knowledge', body: 'Upload technical documents and create an approved machine-specific knowledge file.' },
  { icon: MessageSquareText, number: '03', title: 'Ask or report', body: 'Raise a breakdown or ask AI about one machine, a group, or the whole plant.' },
  { icon: Wrench, number: '04', title: 'Plan and execute', body: 'Prioritize work, assign the technician, adjust effort, record parts, and add evidence.' },
  { icon: UserCheck, number: '05', title: 'Review and learn', body: 'Supervisor review closes the loop and keeps future recommendations connected to actual work.' },
];

const roleCards = [
  { icon: Wrench, title: 'Maintenance teams', body: 'A simpler daily queue, faster access to machine information, and fewer decisions made from memory.' },
  { icon: UsersRound, title: 'Plant leadership', body: 'One view of attention, accountability, shutdown readiness, and where maintenance effort is going.' },
  { icon: Factory, title: 'Growing factories', body: 'A practical step beyond paper and spreadsheets without starting with a heavy enterprise implementation.' },
];

const faqs = [
  { question: 'Does TurboFix replace our maintenance engineer?', answer: 'No. TurboFix organizes plant knowledge, highlights risk, and supports decisions. Your authorized team remains responsible for approval, safety procedures, and execution.' },
  { question: 'How does AI use our manuals and machine data?', answer: 'Each machine can have an approved MachineData knowledge file generated from uploaded manuals, diagrams, BOMs, spare lists, and maintenance information. AI uses that plant-scoped context when answering relevant questions.' },
  { question: 'What happens when machine information is missing?', answer: 'TurboFix identifies the gap and can propose internet enrichment. External information is used only after the user approves it, and the source remains distinguishable from uploaded plant data.' },
  { question: 'Do we need to digitize the whole factory first?', answer: 'No. Start with a small set of representative machines and one useful workflow—such as breakdown response, machine knowledge, or shutdown planning—then expand.' },
  { question: 'Can technicians and managers have different responsibilities?', answer: 'Yes. The product includes role-aware work areas, technician execution, supervisor review, maintenance leadership controls, and configurable escalation responsibilities.' },
];

export default function Home() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;
  const [formSent, setFormSent] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!window.location.hash) return;
    const sectionId = window.location.hash.slice(1);
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView(), 80);
  }, []);

  const handleLeadSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name')?.trim();
    const phone = formData.get('phone')?.trim();
    if (!name || !phone) return;

    const message = [
      'Hi, I would like a guided TurboFix plant walkthrough.',
      '',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Company: ${formData.get('company')?.trim() || '—'}`,
      `Approx. machines: ${formData.get('machines')?.trim() || '—'}`,
      `Biggest challenge: ${formData.get('challenge') || '—'}`,
    ].join('\n');

    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setFormSent(true);
  };

  const handlePlay = () => {
    videoRef.current?.play();
    setVideoPlaying(true);
  };

  return (
    <MainLayout>
      <div className="marketing-home">
        <section className="marketing-hero">
          <div className="container marketing-hero-grid">
            <div className="marketing-hero-copy">
              <span className="marketing-eyebrow"><Sparkles />{copy.eyebrow}</span>
              <h1>{copy.heroTitle}</h1>
              <p>{copy.heroBody}</p>
              <div className="marketing-actions">
                <a className="marketing-btn marketing-btn-primary" href="#contact">{copy.bookDemo}<ArrowRight /></a>
                <Link className="marketing-btn marketing-btn-secondary" to="/vault.html">{copy.explore}</Link>
              </div>
              <div className="marketing-trust-row">
                {copy.trust.map((item) => <span key={item}><CheckCircle2 />{item}</span>)}
              </div>
            </div>

            <div className="marketing-product-preview" aria-label="TurboFix AI recommendation preview">
              <div className="marketing-preview-top">
                <span><span className="marketing-live-dot" />ACME3 LIVE</span>
                <span className="marketing-preview-role">Maintenance head</span>
              </div>
              <div className="marketing-preview-question">
                <span className="marketing-preview-icon"><BrainCircuit /></span>
                <div>
                  <small>{copy.previewScope}</small>
                  <strong>{copy.previewQuestion}</strong>
                </div>
              </div>
              <div className="marketing-preview-answer">
                <div className="marketing-preview-priority">
                  <span>01</span>
                  <div><small>Priority recommendation</small><strong>{copy.previewFinding}</strong></div>
                  <b>High</b>
                </div>
                <p>{copy.previewReason}</p>
                <div className="marketing-preview-metrics">
                  <span><b>2.5h</b> estimated work</span>
                  <span><b>1</b> spare confirmed</span>
                  <span><b>3</b> context sources</span>
                </div>
                <button type="button">{copy.previewAction}<ArrowRight /></button>
              </div>
              <div className="marketing-preview-safe"><ShieldCheck />{copy.previewSafe}</div>
            </div>
          </div>
        </section>

        <div className="marketing-capability-strip">
          <div className="container">
            {copy.strip.map((item) => <span key={item}><Check />{item}</span>)}
          </div>
        </div>

        <section className="marketing-section" id="platform">
          <div className="container">
            <div className="marketing-section-heading">
              <span>{copy.platformEyebrow}</span>
              <h2>{copy.platformTitle}</h2>
              <p>{copy.platformBody}</p>
            </div>
            <div className="marketing-feature-grid">
              {platformFeatures.map(({ icon: Icon, title, body }, index) => (
                <article className="marketing-feature-card" key={title}>
                  <div className="marketing-feature-icon"><Icon /></div>
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-workflow" id="how">
          <div className="container marketing-workflow-grid">
            <div className="marketing-workflow-intro">
              <span>{copy.workflowEyebrow}</span>
              <h2>{copy.workflowTitle}</h2>
              <p>{copy.workflowBody}</p>
              <div className="marketing-workflow-callout">
                <Gauge />
                <div><strong>One visible next step</strong><small>Everyone knows what needs attention, who owns it, and what evidence closes it.</small></div>
              </div>
            </div>
            <div className="marketing-workflow-list">
              {workflowSteps.map(({ icon: Icon, number, title, body }) => (
                <article key={number}>
                  <span>{number}</span>
                  <div className="marketing-workflow-icon"><Icon /></div>
                  <div><h3>{title}</h3><p>{body}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-knowledge-section">
          <div className="container marketing-knowledge-grid">
            <div className="marketing-knowledge-visual">
              <div className="marketing-file-card marketing-file-card-back">
                <FileSearch /><span>HydraulicPress_MachineDataInet.md</span><small>External context • approval recorded</small>
              </div>
              <div className="marketing-file-card">
                <Database /><span>HydraulicPress_MachineData.md</span><small>Manuals • BOM • maintenance history</small>
                <div className="marketing-file-lines"><i /><i /><i /><i /></div>
                <b><LockKeyhole />Plant-approved AI context</b>
              </div>
            </div>
            <div className="marketing-knowledge-copy">
              <span>{copy.knowledgeEyebrow}</span>
              <h2>{copy.knowledgeTitle}</h2>
              <p>{copy.knowledgeBody}</p>
              <ul>{copy.knowledgeItems.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
              <Link to="/vault.html" className="marketing-text-link">See machine workspace <ArrowRight /></Link>
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-demo-section" id="demo">
          <div className="container">
            <div className="marketing-section-heading">
              <span>{copy.demoEyebrow}</span>
              <h2>{copy.demoTitle}</h2>
              <p>{copy.demoBody}</p>
            </div>
            <div className="marketing-demo-grid">
              <div className="marketing-video-wrap">
                <video ref={videoRef} src={`${import.meta.env.BASE_URL}demo.mp4`} preload="metadata" playsInline controls={videoPlaying} onEnded={() => setVideoPlaying(false)} />
                {!videoPlaying && <button type="button" onClick={handlePlay} aria-label="Play TurboFix product demo"><span>▶</span><b>Watch product overview</b><small>See the maintenance flow in action</small></button>}
              </div>
              <aside className="marketing-demo-checklist">
                <span>What you can explore</span>
                <h3>Follow a real maintenance decision</h3>
                <ul>{copy.demoList.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
                <Link className="marketing-btn marketing-btn-primary" to="/vault.html">{copy.demoLogin}<ArrowRight /></Link>
              </aside>
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-fit-section">
          <div className="container">
            <div className="marketing-section-heading">
              <span>{copy.fitEyebrow}</span>
              <h2>{copy.fitTitle}</h2>
              <p>{copy.fitBody}</p>
            </div>
            <div className="marketing-role-grid">
              {roleCards.map(({ icon: Icon, title, body }) => <article key={title}><Icon /><h3>{title}</h3><p>{body}</p></article>)}
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-faq" id="faq">
          <div className="container marketing-faq-grid">
            <div><span>Clear before you commit</span><h2>{copy.faqTitle}</h2><p>TurboFix is designed to support maintenance judgment, preserve accountability, and make plant knowledge easier to use.</p></div>
            <div className="marketing-faq-list">
              {faqs.map(({ question, answer }, index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-contact" id="contact">
          <div className="container marketing-contact-grid">
            <div className="marketing-contact-copy">
              <span>{copy.contactEyebrow}</span>
              <h2>{copy.contactTitle}</h2>
              <p>{copy.contactBody}</p>
              <ul>{copy.contactPoints.map((item) => <li key={item}><Check />{item}</li>)}</ul>
            </div>
            <div className="marketing-lead-card">
              {formSent ? (
                <div className="marketing-success"><CheckCircle2 /><h3>{copy.successTitle}</h3><p>{copy.successBody}</p><button type="button" onClick={() => setFormSent(false)}>Send another request</button></div>
              ) : (
                <form onSubmit={handleLeadSubmit}>
                  <div className="marketing-form-heading"><span><Factory /></span><div><h3>{copy.formTitle}</h3><p>{copy.formNote}</p></div></div>
                  <div className="marketing-form-grid">
                    <label><span>{copy.name}</span><input name="name" type="text" placeholder="Rakesh Shah" autoComplete="name" required /></label>
                    <label><span>{copy.phone}</span><input name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" required /></label>
                    <label><span>{copy.company}</span><input name="company" type="text" placeholder="Acme Forge Pvt Ltd" autoComplete="organization" /></label>
                    <label><span>{copy.machines}</span><input name="machines" type="number" min="1" placeholder="25" /></label>
                    <label className="marketing-form-wide"><span>{copy.challenge}</span><select name="challenge" defaultValue=""><option value="" disabled>{copy.challengePlaceholder}</option>{copy.challengeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                  </div>
                  <button className="marketing-btn marketing-btn-primary marketing-submit" type="submit">{copy.submit}<ArrowRight /></button>
                  <small className="marketing-privacy"><LockKeyhole />{copy.formNote}</small>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
