import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArchiveRestore,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CloudUpload,
  Database,
  Factory,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  Gauge,
  History,
  Image,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  PackageSearch,
  ScanLine,
  ScanText,
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

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919637438044';

const PUBLIC_PAGE_SECTIONS = {
  '/': ['transformation'],
  '/why-turbofix.html': ['transformation', 'platform', 'workflow', 'fit', 'faq'],
  '/platform.html': ['platform', 'knowledge', 'fit'],
  '/records-platform.html': ['records', 'knowledge'],
  '/workflow.html': ['workflow'],
  '/demo.html': ['demo'],
  '/pricing.html': ['pricing', 'faq'],
  '/contact.html': ['contact', 'faq'],
};

const contentByLanguage = {
  en: {
    eyebrow: 'The maintenance control system for modern manufacturing',
    heroTitle: 'Control every breakdown. Protect every production hour.',
    heroBody: 'TurboFix gives plant leaders one verified system for breakdown response, technician accountability, machine history, and maintenance decisions.',
    bookDemo: 'Book a plant walkthrough',
    explore: 'Explore the live product',
    trust: ['10-second QR reporting', 'Verified repair closure', 'Exportable plant data', 'AWS Mumbai hosting'],
    previewQuestion: 'Which critical machine needs Sunday maintenance?',
    previewScope: 'Plant-wide scan • 12 machines monitored',
    previewFinding: 'Hydraulic Press 250T (P1-PRS-HYD-250-002)',
    previewReason: 'Overdue PM inspection, 2 open tickets, oil leak near ram seal.',
    previewAction: 'Schedule 5-Why RCA & PM',
    previewSafe: 'Recommendation grounded in approved machine history',
    strip: ['Instant WhatsApp SLA Alerts', '5-Why Root Cause Analysis', 'Mandatory LOTO Safety Check', 'Verified Photo Repair Proof'],
    platformEyebrow: 'One platform for plant reliability',
    platformTitle: 'Eliminate Paper Chaos & Repeat Breakdowns',
    platformBody: 'Connect floor operators, technicians, maintenance heads, and plant owners in one real-time workflow.',
    recordsEyebrow: 'Digitize legacy plant history',
    recordsTitle: 'Turn paper logbooks and soft copies into living machine memory.',
    recordsBody: 'Snap handwritten registers or upload PDFs, Excel, Word, and manuals. TurboFix extracts structured machine history for Maintenance Head sign-off.',
    recordsSources: [
      { title: 'Handwritten Logbooks', body: 'Registers, job cards, logbooks, and inspection sheets.' },
      { title: 'Digital Records', body: 'PDFs, Excel, Word, CSV exports, and historic reports.' },
      { title: 'Technical Docs', body: 'Machine manuals, hydraulic diagrams, BOMs, and spare lists.' },
    ],
    recordsSafetyTitle: 'Maintenance Head Approval Required',
    recordsSafetyBody: 'Extracted data creates a draft. Only the Maintenance Head approves trusted records for future AI analysis.',
    recordsReviewKicker: 'AI records review',
    recordsReviewTitle: 'CNC Lathe service register · 2019–2025',
    recordsReviewMeta: '24 handwritten pages · Linked to CNC Lathe 1',
    recordsDraftLabel: 'Pending Maintenance Head approval',
    recordsExtracted: ['Maintenance events', 'Breakdown causes', 'Spare references', 'PM tasks'],
    recordsSteps: [
      { title: 'Capture Existing Logbooks', body: 'Snap photos of physical registers or upload files.' },
      { title: 'AI Formats & Extracts', body: 'TurboFix structures machine history, spares, and symptoms.' },
      { title: 'Team Review', body: 'Uncertain values are highlighted for quick human verification.' },
      { title: 'Maintenance Head Approves', body: 'Only approved records join official plant memory.' },
      { title: 'Knowledge at Work', body: 'Approved history powers 5-Why RCA and MTTR optimization.' },
    ],
    recordsOutcomes: [
      { title: 'Faster Troubleshooting', body: 'Review previous breakdown causes and verified fixes instantly.' },
      { title: 'Accurate Spare Planning', body: 'Track spare consumption and reorder points automatically.' },
      { title: '100% Data Backup', body: 'Export complete plant data in CSV, JSON, and Excel format.' },
    ],
    recordsCta: 'Explore AI Records Workflow',
    workflowEyebrow: '4-step verified workflow',
    workflowTitle: 'Zero Breakdown Signals Fall Through the Cracks',
    workflowBody: 'Every breakdown moves through a 4-stage verified loop from operator scan to Maintenance Head sign-off.',
    knowledgeEyebrow: 'Machine Memory Engine',
    knowledgeTitle: 'Your Plant History Becomes Intelligent Knowledge',
    knowledgeBody: 'Approved records form a machine knowledge base used for RCA troubleshooting and shutdown planning.',
    knowledgeItems: ['Approved service & breakdown history', 'Machine manuals & schematics', 'BOM, spares & consumables', 'Exportable MachineData files'],
    demoEyebrow: 'Interactive Product Demo',
    demoTitle: 'See How TurboFix Solves Shop-Floor Breakdown Chaos',
    demoBody: 'Watch how operators report issues, technicians log photo proof, and maintenance heads track MTTR in real time.',
    demoLogin: 'Sign in to Live Demo',
    demoList: ['Scan QR code to report breakdown', 'Verify technician photo proof', 'Complete 5-Why Root Cause Analysis', 'Track plant downtime cost in ₹ Lakhs'],
    fitEyebrow: 'Built for SMEs & Enterprise Plants',
    fitTitle: 'Designed for Factory Floor Realities',
    fitBody: 'Replace paper registers, fragmented WhatsApp groups, and lost work orders with structured closed-loop execution.',
    faqTitle: 'Frequently Asked Questions',
    contactEyebrow: 'Get Started Today',
    contactTitle: 'Book Your 15-Minute Plant Walkthrough',
    contactBody: 'We will map TurboFix to one machine in your plant so you can test the 4-step workflow live.',
    contactPoints: ['Review sample handwritten logbooks', 'Map 1 critical machine & breakdown history', 'Test 10-second QR breakdown reporting'],
    formTitle: 'Request Plant Walkthrough',
    name: 'Your Name',
    phone: 'Phone / WhatsApp',
    company: 'Company / Plant Name',
    machines: 'Approximate Machines',
    challenge: 'Primary Maintenance Goal',
    challengePlaceholder: 'Select primary goal',
    challengeOptions: ['Eliminating Unplanned Breakdowns', 'Digitizing Paper Logbooks', 'Technician Follow-through & Proof', '5-Why RCA & Safety Compliance', 'Downtime & MTTR Reduction', 'Other'],
    submit: 'Request Plant Demo',
    formNote: 'We use these details only to schedule your walkthrough.',
    successTitle: 'Walkthrough Request Created',
    successBody: 'A WhatsApp message has opened with your details. Click send to confirm your appointment.',
  },
  hi: {
    eyebrow: 'मैन्युफैक्चरिंग SMEs के लिए AI मेंटेनेंस निर्णय प्लेटफॉर्म',
    heroTitle: 'डाउनटाइम से पहले जानें—अगला काम क्या होना चाहिए।',
    heroBody: 'TurboFix पुराने कागज़ी रिकॉर्ड और सॉफ्ट कॉपी को मंज़ूर मशीन ज्ञान में बदलकर उसे ब्रेकडाउन, PM और शटडाउन निर्णयों से जोड़ता है।',
    bookDemo: 'गाइडेड डेमो बुक करें',
    trust: ['सीधा WhatsApp API इंटीग्रेशन', 'AI उपयोग से पहले Maintenance Head की मंज़ूरी', 'एक्सपोर्ट योग्य प्लांट बैकअप'],
    previewQuestion: 'इस रविवार किस मशीन की सर्विस करें?',
    previewScope: 'पूरे प्लांट का प्रश्न • 2 मशीनों की समीक्षा',
    previewFinding: 'Hydraulic Press पर पहले ध्यान दें',
    previewReason: 'निरीक्षण लंबित है, तेल रिसाव दोहराया गया है और सील उपलब्ध है।',
    previewAction: 'शटडाउन प्लान में जोड़ें',
    previewSafe: 'सिफारिश अनुमोदित मशीन संदर्भ पर आधारित है',
    strip: ['WhatsApp अलर्ट प्रेषण प्रणाली', 'एक या सभी मशीनों पर AI', 'गाइडेड शटडाउन प्लानिंग', 'क्लोज़्ड-लूप तकनीशियन कार्य'],
    platformEyebrow: 'एक मेंटेनेंस ऑपरेटिंग सिस्टम',
    platformTitle: 'बिखरे रिकॉर्ड से स्पष्ट निर्णय तक',
    platformBody: 'मौजूदा रिकॉर्ड को आगे लाएँ। हर मंज़ूर स्रोत अगले निर्णय को बेहतर बनाता है, ताकि वर्षों का इतिहास वास्तविक कार्रवाई में बदले।',
    recordsEyebrow: 'अपना मौजूदा मेंटेनेंस इतिहास साथ लाएँ',
    recordsTitle: 'कागज़ी फाइल और सॉफ्ट कॉपी को AI-ready मशीन ज्ञान में बदलें।',
    recordsBody: 'हस्तलिखित रजिस्टर की फोटो लें या PDF, Excel, Word, CSV, job cards, inspection sheets, manuals, BOM और spare lists अपलोड करें। TurboFix इन्हें टीम द्वारा जाँचे जाने योग्य structured draft में बदलता है।',
    recordsSources: [
      { title: 'हस्तलिखित और स्कैन', body: 'रजिस्टर, job cards, logbooks, marked drawings और inspection sheets।' },
      { title: 'सॉफ्ट-कॉपी रिकॉर्ड', body: 'PDF, Excel, Word, CSV, text exports और पुराने maintenance reports।' },
      { title: 'तकनीकी ज्ञान', body: 'Manuals, wiring और hydraulic diagrams, BOM, spares और consumables।' },
    ],
    recordsSafetyTitle: 'AI draft बनाता है—अंतिम तथ्य नहीं।',
    recordsSafetyBody: 'टीम अनिश्चित जानकारी जाँचती है। भविष्य की AI सिफारिशों के लिए केवल Maintenance Head डेटा मंज़ूर कर सकता है।',
    recordsReviewKicker: 'AI रिकॉर्ड समीक्षा',
    recordsReviewTitle: 'CNC Lathe service register · 2019–2025',
    recordsReviewMeta: '24 हस्तलिखित पेज · CNC Lathe 1 से जुड़े',
    recordsDraftLabel: 'Maintenance Head की मंज़ूरी बाकी',
    recordsExtracted: ['मेंटेनेंस घटनाएँ', 'ब्रेकडाउन कारण', 'स्पेयर संदर्भ', 'PM कार्य'],
    recordsSteps: [
      { title: 'मौजूदा रिकॉर्ड कैप्चर करें', body: 'कागज़ी रजिस्टर की फोटो लें या परिचित फॉर्मेट में फाइल अपलोड करें।' },
      { title: 'AI पढ़ता और व्यवस्थित करता है', body: 'TurboFix मशीन पहचान, इतिहास, कार्य, स्पेयर और संकेतों को संरचित करता है।' },
      { title: 'टीम जाँच करती है', body: 'कम confidence वाले fields सुधार के लिए साफ दिखाई देते हैं।' },
      { title: 'Maintenance Head मंज़ूर करता है', body: 'बिना मंज़ूरी draft AI निर्णयों को प्रभावित नहीं करता।' },
      { title: 'ज्ञान काम में आता है', body: 'मंज़ूर इतिहास breakdown, spare, consumable, PM और shutdown निर्णयों में उपयोग होता है।' },
    ],
    recordsOutcomes: [
      { title: 'बेहतर breakdown निर्णय', body: 'AI पुराने लक्षण, कारण और सफल corrective actions देख सकता है।' },
      { title: 'बेहतर material planning', body: 'पुराना spare और consumable usage तैयारी और reorder में मदद करता है।' },
      { title: 'Portable plant backup', body: 'Original files, JSON, Excel-ready CSV, approvals और MachineData export करें।' },
    ],
    recordsCta: 'AI Records workflow देखें',
    workflowEyebrow: 'पूरा मेंटेनेंस लूप',
    workflowTitle: 'मशीन डेटा से सत्यापित कार्य तक',
    workflowBody: 'अपनी मौजूदा जानकारी से शुरू करें। TurboFix उसे संरचित करता है, मानव मंज़ूरी से सुरक्षित रखता है और निर्णय व काम को स्पष्ट बनाता है।',
    knowledgeEyebrow: 'उपयोगी मशीन इंटेलिजेंस',
    knowledgeTitle: 'पुराने रिकॉर्ड जीवित मशीन मेमोरी बनते हैं',
    knowledgeBody: 'मंज़ूर ऐतिहासिक रिकॉर्ड और तकनीकी दस्तावेज मशीन-विशिष्ट knowledge file में जुड़ते हैं। Plant data और internet-enriched context अलग रहते हैं।',
    knowledgeItems: ['मंज़ूर service और breakdown history', 'मैनुअल और तकनीकी दस्तावेज', 'BOM, स्पेयर और consumables', 'Export योग्य MachineData'],
    demoEyebrow: 'वर्कफ़्लो देखें',
    demoTitle: 'सिर्फ AI प्रस्तुति नहीं—एक व्यावहारिक प्रोडक्ट',
    demoBody: 'वे स्क्रीन देखें जिनसे मेंटेनेंस हेड, तकनीशियन और मालिक काम तय, पूरा और समीक्षा करते हैं।',
    demoLogin: 'डेमो साइन-इन खोलें',
    demoList: ['हस्तलिखित या डिजिटल रिकॉर्ड अपलोड करें', 'AI-extracted डेटा जाँचें और मंज़ूर करें', 'एक या सभी मशीनों पर प्रश्न पूछें', 'Shutdown और technician closure देखें'],
    fitEyebrow: 'असल फैक्ट्री फ्लोर के लिए',
    fitTitle: 'आज की सबसे बड़ी मेंटेनेंस समस्या से शुरू करें',
    fitBody: 'उन टीमों के लिए जो कागज़, Excel और बिखरी फाइलों से आगे बढ़ना चाहती हैं—पुराना इतिहास खोए बिना।',
    faqTitle: 'मेंटेनेंस लीडर के शुरुआती सवाल',
    contactEyebrow: 'गाइडेड ऑनबोर्डिंग',
    contactTitle: 'हमें अपनी मेंटेनेंस स्थिति बताएं',
    contactBody: 'अपने प्लांट और सबसे बड़ी चुनौती बताएं। डेमो आपके वर्तमान काम के अनुसार होगा, किसी सामान्य सॉफ्टवेयर प्रस्तुति जैसा नहीं।',
    contactPoints: ['नमूना paper और soft-copy records की समीक्षा', 'एक मशीन और उसके इतिहास की mapping', 'पहला उपयोगी AI workflow पहचानना'],
    formTitle: 'प्लांट walkthrough बुक करें',
    name: 'आपका नाम', phone: 'फोन / WhatsApp', company: 'कंपनी का नाम', machines: 'लगभग मशीनें', challenge: 'सबसे बड़ी मेंटेनेंस चुनौती', challengePlaceholder: 'एक चुनें',
    challengeOptions: ['पुराने maintenance records डिजिटाइज़ करना', 'अनियोजित breakdown', 'Shutdown planning', 'मशीन जानकारी की कमी', 'Technician follow-through', 'मेंटेनेंस visibility', 'अन्य'],
    submit: 'गाइडेड डेमो माँगें', formNote: 'इन विवरणों का उपयोग केवल walkthrough की योजना के लिए होगा।',
    successTitle: 'आपका अनुरोध तैयार है', successBody: 'आपकी जानकारी के साथ WhatsApp खुल गया है। walkthrough की पुष्टि के लिए संदेश भेजें।',
  },
  mr: {
    eyebrow: 'उत्पादन SMEs साठी AI मेंटेनन्स निर्णय प्लॅटफॉर्म',
    heroTitle: 'डाउनटाइम ठरवण्याआधी जाणून घ्या—पुढे काय दुरुस्त करायचे.',
    heroBody: 'TurboFix जुने कागदी रेकॉर्ड आणि सॉफ्ट कॉपी मंजूर मशीन ज्ञानात बदलून ते ब्रेकडाउन, PM आणि शटडाउन निर्णयांशी जोडतो.',
    bookDemo: 'मार्गदर्शित डेमो बुक करा', explore: 'प्रॉडक्ट पाहा',
    trust: ['थेट WhatsApp API इंटिग्रेशन', 'AI वापरापूर्वी Maintenance Head मंजुरी', 'Export करता येणारा प्लांट बॅकअप'],
    previewQuestion: 'या रविवारी कोणत्या मशीनची सर्व्हिस करावी?', previewScope: 'संपूर्ण प्लांट प्रश्न • 2 मशीन तपासल्या', previewFinding: 'Hydraulic Press ला प्रथम प्राधान्य', previewReason: 'तпасणी बाकी, वारंवार तेल गळती आणि सील उपलब्ध.', previewAction: 'शटडाउन प्लॅनमध्ये जोडा', previewSafe: 'शिफारस मंजूर मशीन संदर्भ वापरते',
    strip: ['WhatsApp अलर्ट प्रेषण प्रणाली', 'एका किंवा सर्व मशीनसाठी AI', 'मार्गदर्शित शटडाउन नियोजन', 'क्लोज्ड-लूप तंत्रज्ञ काम'],
    platformEyebrow: 'एक मेंटेनन्स ऑपरेटिंग सिस्टम', platformTitle: 'विखुरलेल्या नोंदींपासून स्पष्ट निर्णयापर्यंत', platformBody: 'तुमचे विद्यमान रेकॉर्ड पुढे आणा. प्रत्येक मंजूर स्रोत पुढील निर्णय सुधारतो आणि वर्षांचा इतिहास कृतीत बदलतो.',
    recordsEyebrow: 'तुमचा विद्यमान मेंटेनन्स इतिहास वापरा',
    recordsTitle: 'कागदी फाइल आणि सॉफ्ट कॉपी AI-ready मशीन ज्ञानात बदला.',
    recordsBody: 'हस्तलिखित रजिस्टरचे फोटो घ्या किंवा PDF, Excel, Word, CSV, job cards, inspection sheets, manuals, BOM आणि spare lists अपलोड करा. TurboFix पडताळणीसाठी structured draft तयार करतो.',
    recordsSources: [
      { title: 'हस्तलिखित आणि स्कॅन', body: 'रजिस्टर, job cards, logbooks, marked drawings आणि inspection sheets.' },
      { title: 'सॉफ्ट-कॉपी रेकॉर्ड', body: 'PDF, Excel, Word, CSV, text exports आणि जुने maintenance reports.' },
      { title: 'तांत्रिक ज्ञान', body: 'Manuals, wiring आणि hydraulic diagrams, BOM, spares आणि consumables.' },
    ],
    recordsSafetyTitle: 'AI draft तयार करतो—अंतिम सत्य नाही.',
    recordsSafetyBody: 'टीम अनिश्चित माहिती तपासते. भविष्यातील AI शिफारसींसाठी केवळ Maintenance Head डेटा मंजूर करू शकतो.',
    recordsReviewKicker: 'AI रेकॉर्ड समीक्षा',
    recordsReviewTitle: 'CNC Lathe service register · 2019–2025',
    recordsReviewMeta: '24 हस्तलिखित पाने · CNC Lathe 1 शी जोडलेले',
    recordsDraftLabel: 'Maintenance Head मंजुरी बाकी',
    recordsExtracted: ['मेंटेनन्स घटना', 'ब्रेकडाउन कारणे', 'स्पेअर संदर्भ', 'PM कामे'],
    recordsSteps: [
      { title: 'विद्यमान रेकॉर्ड घ्या', body: 'कागदी रजिस्टरचे फोटो घ्या किंवा ओळखीच्या फॉरमॅटमध्ये फाइल अपलोड करा.' },
      { title: 'AI वाचतो आणि रचना करतो', body: 'TurboFix मशीन ओळख, इतिहास, काम, स्पेअर्स आणि संकेत व्यवस्थित करतो.' },
      { title: 'टीम पडताळते', body: 'कमी confidence fields दुरुस्तीसाठी स्पष्ट दिसतात.' },
      { title: 'Maintenance Head मंजूर करतो', body: 'मंजुरी नसलेला draft AI निर्णयांवर परिणाम करत नाही.' },
      { title: 'ज्ञान काम करू लागते', body: 'मंजूर इतिहास breakdown, spares, consumables, PM आणि shutdown निर्णयांना मदत करतो.' },
    ],
    recordsOutcomes: [
      { title: 'चांगले breakdown निर्णय', body: 'AI जुनी लक्षणे, कारणे आणि यशस्वी corrective actions विचारात घेतो.' },
      { title: 'चांगले material planning', body: 'जुना spare आणि consumable वापर तयारी व reorder साठी मदत करतो.' },
      { title: 'Portable plant backup', body: 'Original files, JSON, Excel-ready CSV, approvals आणि MachineData export करा.' },
    ],
    recordsCta: 'AI Records workflow पाहा',
    workflowEyebrow: 'पूर्ण मेंटेनन्स लूप', workflowTitle: 'मशीन डेटापासून पडताळलेल्या कामापर्यंत', workflowBody: 'तुमच्याकडील माहितीपासून सुरुवात करा. TurboFix ती रचतो, मानवी मंजुरीने सुरक्षित ठेवतो आणि निर्णय व काम स्पष्ट करतो.',
    knowledgeEyebrow: 'उपयुक्त मशीन इंटेलिजन्स', knowledgeTitle: 'जुने रेकॉर्ड जिवंत मशीन मेमरी बनतात', knowledgeBody: 'मंजूर ऐतिहासिक रेकॉर्ड आणि तांत्रिक कागदपत्रे मशीन-विशिष्ट knowledge file मध्ये एकत्र होतात. Plant data आणि internet context वेगळे राहतात.', knowledgeItems: ['मंजूर service आणि breakdown history', 'मॅन्युअल आणि तांत्रिक कागदपत्रे', 'BOM, spares आणि consumables', 'Export करता येणारे MachineData'],
    demoEyebrow: 'वर्कफ्लो पाहा', demoTitle: 'फक्त AI सादरीकरण नाही—प्रत्यक्ष उपयोगी प्रॉडक्ट', demoBody: 'मेंटेनन्स हेड, तंत्रज्ञ आणि मालक निर्णय, काम आणि समीक्षा करण्यासाठी वापरतात त्या स्क्रीन पाहा.', demoLogin: 'डेमो साइन-इन उघडा', demoList: ['हस्तलिखित किंवा डिजिटल रेकॉर्ड अपलोड करा', 'AI-extracted डेटा तपासा आणि मंजूर करा', 'एका किंवा सर्व मशीनवर प्रश्न विचारा', 'Shutdown आणि technician closure पाहा'],
    fitEyebrow: 'खऱ्या फॅक्टरी फ्लोअरसाठी', fitTitle: 'आजच्या सर्वात कठीण मेंटेनन्स समस्येपासून सुरू करा', fitBody: 'कागद, Excel आणि विखुरलेल्या फाइल्समधून पुढे जाणाऱ्या टीमसाठी—जुना इतिहास न गमावता.',
    faqTitle: 'मेंटेनन्स लीडरचे पहिले प्रश्न',
    contactEyebrow: 'मार्गदर्शित ऑनबोर्डिंग', contactTitle: 'तुमची मेंटेनन्स स्थिती आम्हाला सांगा', contactBody: 'तुमचा प्लांट आणि मोठी समस्या सांगा. walkthrough तुमच्या प्रक्रियेनुसार असेल—सामान्य सॉफ्टवेअर डेमोसारखा नाही.', contactPoints: ['नमुना paper आणि soft-copy records तपासा', 'एक मशीन आणि त्याचा इतिहास map करा', 'पहिला उपयुक्त AI workflow ओळखा'],
    formTitle: 'प्लांट walkthrough बुक करा', name: 'तुमचे नाव', phone: 'फोन / WhatsApp', company: 'कंपनीचे नाव', machines: 'अंदाजे मशीन', challenge: 'सर्वात मोठी मेंटेनन्स समस्या', challengePlaceholder: 'एक निवडा', challengeOptions: ['जुने maintenance records डिजिटाइझ करणे', 'अनियोजित breakdown', 'Shutdown planning', 'मशीन ज्ञानाची कमतरता', 'Technician follow-through', 'मेंटेनन्स visibility', 'इतर'], submit: 'मार्गदर्शित डेमो मागवा', formNote: 'ही माहिती फक्त walkthrough नियोजनासाठी वापरली जाईल.', successTitle: 'तुमची विनंती तयार आहे', successBody: 'तुमच्या माहितीसह WhatsApp उघडले आहे. walkthrough निश्चित करण्यासाठी संदेश पाठवा.',
  },
};

const platformFeatures = [
  { icon: ScanText, title: 'Records & Machine Knowledge', body: 'Photograph handwritten registers or upload PDFs, Excel, Word, CSV, manuals, job cards, BOMs, and spare lists for structured review.' },
  { icon: BrainCircuit, title: 'Maintenance Help', body: 'Ask about one machine or the entire plant. Get recommendations grounded in machine knowledge, history, and current work.' },
  { icon: CalendarClock, title: 'Shutdown Planner', body: 'Prioritize the right machines and prepare an achievable sequence.' },
  { icon: ClipboardCheck, title: 'Technician Work Board', body: 'Give technicians a focused queue with checklists, notes, parts, evidence, and supervisor review.' },
  { icon: TicketCheck, title: 'WhatsApp Dispatch', body: 'Capture machine breakdowns, dispatch tickets to technicians, and track resolution progress.' },
  { icon: LayoutDashboard, title: 'Control Board', body: 'See machine attention, PM status, open work, knowledge gaps, and the next exception to handle without chasing updates.' },
];

const workflowSteps = [
  { icon: ScanLine, number: '01', title: 'Register the machine', body: 'Create the machine record, QR identity, location, ownership, and preventive context.' },
  { icon: Upload, number: '02', title: 'Bring existing records', body: 'Upload old maintenance history and technical files, including handwritten pages and soft copies.' },
  { icon: ShieldCheck, number: '03', title: 'Verify and approve', body: 'Correct uncertain extracted fields and let the Maintenance Head approve trusted data for AI use.' },
  { icon: MessageSquareText, number: '04', title: 'Ask, plan, and execute', body: 'Use approved history for breakdown guidance, spare preparation, shutdown priorities, and technician work.' },
  { icon: UserCheck, number: '05', title: 'Close the loop and learn', body: 'Reviewed work becomes new machine history, keeping future recommendations connected to actual results.' },
];

const roleCards = [
  { icon: Wrench, title: 'Maintenance teams', body: 'A simpler daily queue, faster access to machine information, and fewer decisions made from memory.' },
  { icon: UsersRound, title: 'Plant leadership', body: 'One view of attention, accountability, shutdown readiness, and where maintenance effort is going.' },
  { icon: Factory, title: 'Growing factories', body: 'A practical step beyond paper and spreadsheets without starting with a heavy enterprise implementation.' },
];

const faqs = [
  { question: 'Can TurboFix read handwritten maintenance registers?', answer: 'Yes. The first version accepts photos and scans of handwritten registers, job cards, inspection sheets, and marked drawings, along with PDF, Excel, Word, CSV, text, manuals, and BOM files.' },
  { question: 'Can AI use extracted data immediately?', answer: 'No. AI creates a review draft first. Your team can correct uncertain fields, and only the Maintenance Head can approve that data before it becomes trusted context for future recommendations.' },
  { question: 'How will old records help future maintenance?', answer: 'Approved history can support breakdown troubleshooting, recurring-failure analysis, spare and consumable preparation, preventive maintenance planning, shutdown decisions, and machine-specific AI answers.' },
  { question: 'Can we export our machine history as a backup?', answer: 'Yes. TurboFix can export original uploads, structured JSON, Excel-ready CSV, approval history, and each machine’s MachineData Markdown knowledge file.' },
  { question: 'Does TurboFix replace our maintenance engineer?', answer: 'No. TurboFix organizes plant knowledge, highlights risk, and supports decisions. Your authorized team remains responsible for approval, safety procedures, and execution.' },
  { question: 'What happens when machine information is missing?', answer: 'TurboFix identifies the gap and can propose internet enrichment. External information is used only after the user approves it, and the source remains distinguishable from uploaded plant data.' },
  { question: 'Do we need to digitize the whole factory first?', answer: 'No. Start with one representative machine and a useful sample of its records, verify the workflow, and then expand in practical batches.' },
];

const recordSourceIcons = [Image, FileSpreadsheet, FileSearch];
const recordStepIcons = [CloudUpload, ScanText, UserCheck, ShieldCheck, BrainCircuit];
const recordOutcomeIcons = [History, PackageSearch, ArchiveRestore];

const HERO_SCENARIOS = [
  {
    id: 'press',
    label: 'Hydraulic Press 250T',
    scope: 'Plant-wide scan • 12 machines monitored',
    question: 'Which critical machine needs Sunday maintenance?',
    finding: 'Hydraulic Press 250T (P1-PRS-HYD-250-002)',
    priority: 'High',
    estTime: '2.5h',
    spares: '1 spare confirmed',
    sources: '3 context sources',
    reason: 'Overdue PM inspection, 2 open tickets, oil leak near ram seal.',
    action: 'Schedule 5-Why RCA & PM',
    safe: 'Recommendation grounded in approved machine history'
  },
  {
    id: 'cnc',
    label: 'CNC Lathe 500',
    scope: 'Machine alert • High-frequency vibration',
    question: 'Why is CNC Lathe 1 temperature spiking?',
    finding: 'CNC Lathe 500 (P2-CNC-LTH-500-001)',
    priority: 'Medium',
    estTime: '1.0h',
    spares: 'SKF 6205 bearing in stock',
    sources: '4 context sources',
    reason: 'Spindle vibration anomaly (3.8 mm/s), temp 68°C. Lubrication due.',
    action: 'Assign Spindle Maintenance',
    safe: 'Recommendation matched with 2024 OEM manual'
  },
  {
    id: 'compressor',
    label: 'Screw Compressor 50HP',
    scope: 'Preventive scan • Utility section',
    question: 'What PM tasks are due for Utility section?',
    finding: 'Screw Compressor 50HP (P3-CMP-SCR-050-004)',
    priority: 'Low',
    estTime: '0.5h',
    spares: 'Air filter kit ready',
    sources: '2 context sources',
    reason: 'Differential pressure elevated (0.8 bar). Filter cleaning recommended.',
    action: 'Inspect Air Filter Cartridge',
    safe: 'Verified with plant preventive maintenance schedule'
  }
];

export default function Home() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;
  const [formSent, setFormSent] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [machineCount, setMachineCount] = useState(15);
  const [isAnnual, setIsAnnual] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const videoRef = useRef(null);

  const activeScenario = HERO_SCENARIOS[selectedScenario] || HERO_SCENARIOS[0];
  const sections = PUBLIC_PAGE_SECTIONS[pathname] || PUBLIC_PAGE_SECTIONS['/'];
  const showSection = (sectionId) => sections.includes(sectionId);

  useEffect(() => {
    document.title = 'TurboFix — AI Maintenance Control & Breakdown Decision Platform for Manufacturing SMEs';
    if (!window.location.hash) return;
    const sectionId = window.location.hash.slice(1);
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView(), 80);
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const contactSection = document.getElementById('contact');
    if (!contactSection) {
      setShowStickyCta(false);
      return undefined;
    }

    const updateStickyState = () => {
      if (!mediaQuery.matches) {
        setShowStickyCta(false);
        return;
      }

      const contactTop = contactSection?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const isBeforeContact = contactTop > window.innerHeight - 140;
      setShowStickyCta(window.scrollY > 450 && isBeforeContact);
    };

    updateStickyState();
    window.addEventListener('scroll', updateStickyState, { passive: true });
    window.addEventListener('resize', updateStickyState);

    return () => {
      window.removeEventListener('scroll', updateStickyState);
      window.removeEventListener('resize', updateStickyState);
    };
  }, [pathname]);

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

  // Dynamic pricing calculations
  const discountFactor = isAnnual ? 0.85 : 1;
  const liteUnitPrice = Math.round(499 * discountFactor);
  const growthUnitPrice = Math.round(699 * discountFactor);
  const enterpriseUnitPrice = Math.round(499 * discountFactor);

  const liteMonthly = machineCount * liteUnitPrice;
  const growthMonthly = machineCount * growthUnitPrice;
  const enterpriseMonthly = machineCount * enterpriseUnitPrice;

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
                <Link className="marketing-btn marketing-btn-primary" to="/contact.html">{copy.bookDemo}<ArrowRight /></Link>
                <Link className="marketing-btn marketing-btn-secondary" to="/login.html">{copy.explore}</Link>
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
              <div className="marketing-scenario-tabs" aria-label="Select machine preview scenario">
                {HERO_SCENARIOS.map((scen, idx) => (
                  <button
                    key={scen.id}
                    type="button"
                    className={`marketing-scenario-tab ${selectedScenario === idx ? 'active' : ''}`}
                    onClick={() => setSelectedScenario(idx)}
                  >
                    {scen.label.split(' ')[0]} {scen.label.split(' ')[1]}
                  </button>
                ))}
              </div>
              <div className="marketing-preview-question">
                <span className="marketing-preview-icon"><BrainCircuit /></span>
                <div>
                  <small>{activeScenario.scope}</small>
                  <strong>{activeScenario.question}</strong>
                </div>
              </div>
              <div className="marketing-preview-answer">
                <div className="marketing-preview-priority">
                  <span>0{selectedScenario + 1}</span>
                  <div><small>Priority recommendation</small><strong>{activeScenario.finding}</strong></div>
                  <b className={`priority-badge-${activeScenario.priority.toLowerCase()}`}>{activeScenario.priority}</b>
                </div>
                <p>{activeScenario.reason}</p>
                <div className="marketing-preview-metrics">
                  <span><b>{activeScenario.estTime}</b> estimated work</span>
                  <span><b>{activeScenario.spares}</b></span>
                  <span><b>{activeScenario.sources}</b></span>
                </div>
                <button type="button">{activeScenario.action}<ArrowRight /></button>
              </div>
              <div className="marketing-preview-safe"><ShieldCheck />{activeScenario.safe}</div>
            </div>
          </div>
        </section>

        <div className="marketing-capability-strip">
          <div className="container">
            {copy.strip.map((item) => <span key={item}><Check />{item}</span>)}
          </div>
        </div>

        {/* ── Pilot Proof Banner ── */}
        <div className="marketing-proof-banner">
          <div className="container marketing-proof-grid">
            <div className="marketing-proof-item">
              <strong>20+ SME Plants</strong>
              <span>Monitored in MH & GJ</span>
            </div>
            <div className="marketing-proof-item">
              <strong>99.4% SLA Compliance</strong>
              <span>Verified repair closure</span>
            </div>
            <div className="marketing-proof-item">
              <strong>&lt; 10 Seconds</strong>
              <span>QR breakdown reporting</span>
            </div>
            <div className="marketing-proof-item">
              <strong>₹4.2 Lakhs/Yr</strong>
              <span>Avg downtime savings</span>
            </div>
          </div>
        </div>

        {showSection('transformation') && <section className="marketing-section marketing-outcomes" id="transformation">
          <div className="container">
            <div className="marketing-outcomes-heading">
              <div>
                <span>One operating story</span>
                <h2>From breakdown signal to verified closure—without the daily chase.</h2>
              </div>
              <p>Bring in old machine history, verify what is trustworthy, and then run daily maintenance from the same system instead of switching between records and execution.</p>
            </div>
            <div className="marketing-outcomes-grid">
              <article>
                <span>01</span>
                <Gauge />
                <h3>See operational risk</h3>
                <p>Track open breakdowns, SLA risk, MTTR, downtime cost, and plant health from one owner-ready view.</p>
                <strong>For plant owners</strong>
              </article>
              <article>
                <span>02</span>
                <ClipboardCheck />
                <h3>Enforce accountable work</h3>
                <p>Route every issue to an owner, require repair evidence, and close work only after verification.</p>
                <strong>For maintenance heads</strong>
              </article>
              <article>
                <span>03</span>
                <BrainCircuit />
                <h3>Build machine intelligence</h3>
                <p>Turn approved records, repairs, spares, and root causes into trusted machine-specific knowledge.</p>
                <strong>For long-term reliability</strong>
              </article>
            </div>
            <div className="marketing-executive-proof">
              <span><b>10 sec</b> QR breakdown reporting</span>
              <span><b>4 steps</b> to verified closure</span>
              <span><b>5-Why</b> structured root-cause analysis</span>
              <span><b>100%</b> exportable plant data</span>
            </div>
          </div>
        </section>}

        {showSection('platform') && <section className="marketing-section" id="platform">
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
        </section>}

        {showSection('records') && <section className="marketing-section marketing-records-section" id="records">
          <div className="container">
            <div className="marketing-records-grid">
              <div className="marketing-records-copy">
                <span className="marketing-eyebrow"><ArchiveRestore />{copy.recordsEyebrow}</span>
                <h2>{copy.recordsTitle}</h2>
                <p>{copy.recordsBody}</p>
                <div className="marketing-record-sources">
                  {copy.recordsSources.map(({ title, body }, index) => {
                    const Icon = recordSourceIcons[index];
                    return <article key={title}><span><Icon /></span><div><h3>{title}</h3><p>{body}</p></div></article>;
                  })}
                </div>
                <div className="marketing-record-safety"><ShieldCheck /><div><strong>{copy.recordsSafetyTitle}</strong><span>{copy.recordsSafetyBody}</span></div></div>
              </div>

              <div className="marketing-record-review" aria-label="AI record review preview">
                <header><div><span className="marketing-live-dot" />{copy.recordsReviewKicker}</div><b>ACME3</b></header>
                <div className="marketing-record-document">
                  <span><Image /></span>
                  <div><strong>{copy.recordsReviewTitle}</strong><small>{copy.recordsReviewMeta}</small></div>
                  <b>Draft</b>
                </div>
                <div className="marketing-record-confidence"><span><b>AI extraction confidence</b><strong>82%</strong></span><i><b /></i><small>Low-confidence values are highlighted for human checking.</small></div>
                <div className="marketing-record-extracted">
                  {copy.recordsExtracted.map((item, index) => <span key={item}><FileCheck2 /><small>{item}</small><b>{[48, 12, 9, 16][index]}</b></span>)}
                </div>
                <div className="marketing-record-approval"><span><LockKeyhole /><small>{copy.recordsDraftLabel}</small></span><button type="button"><ShieldCheck />Approve for AI use</button></div>
              </div>
            </div>

            <div className="marketing-record-flow">
              {copy.recordsSteps.map(({ title, body }, index) => {
                const Icon = recordStepIcons[index];
                return <article key={title}><div><span>{index + 1}</span><Icon /></div><h3>{title}</h3><p>{body}</p></article>;
              })}
            </div>

            <div className="marketing-record-outcomes">
              {copy.recordsOutcomes.map(({ title, body }, index) => {
                const Icon = recordOutcomeIcons[index];
                return <article key={title}><Icon /><div><h3>{title}</h3><p>{body}</p></div></article>;
              })}
              <Link className="marketing-record-cta" to="/login.html">{copy.recordsCta}<ArrowRight /></Link>
            </div>
          </div>
        </section>}

        {showSection('workflow') && <section className="marketing-section marketing-workflow" id="how">
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
        </section>}

        {showSection('knowledge') && <section className="marketing-section marketing-knowledge-section">
          <div className="container marketing-knowledge-grid">
            <div className="marketing-knowledge-visual">
              <div className="marketing-file-card marketing-file-card-back">
                <FileSearch /><span>Service_Register_2019-2025.pdf</span><small>Handwritten scan • review completed</small>
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
              <Link to="/login.html" className="marketing-text-link">See machine workspace <ArrowRight /></Link>
            </div>
          </div>
        </section>}

        {showSection('demo') && <section className="marketing-section marketing-demo-section" id="demo">
          <div className="container">
            <div className="marketing-section-heading">
              <span>{copy.demoEyebrow}</span>
              <h2>{copy.demoTitle}</h2>
              <p>{copy.demoBody}</p>
            </div>
            <div className="marketing-demo-grid">
              <div className="marketing-video-wrap">
                <video ref={videoRef} src={`${import.meta.env.BASE_URL}demo.mp4`} preload="metadata" playsInline controls={videoPlaying} onEnded={() => setVideoPlaying(false)} />
                {!videoPlaying && (
                  <button type="button" onClick={handlePlay} aria-label="Play AI-generated TurboFix walkthrough">
                    <span>▶</span>
                    <b>Watch the AI-generated walkthrough</b>
                    <small>Illustrative video — explore the live product below</small>
                  </button>
                )}
              </div>
              <aside className="marketing-demo-checklist">
                <span>What you can explore</span>
                <h3>See how TurboFix works in practice</h3>
                <ul>{copy.demoList.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
                <Link className="marketing-btn marketing-btn-primary" to="/login.html">{copy.demoLogin}<ArrowRight /></Link>
              </aside>
            </div>
          </div>
        </section>}

        {showSection('fit') && <section className="marketing-section marketing-fit-section">
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
        </section>}

        {/* ── Pricing Section with Dynamic Calculator ── */}
        {showSection('pricing') && <section className="marketing-section marketing-pricing-section" id="pricing">
          <div className="container">
            <div className="marketing-section-heading">
              <span>Simple per-machine pricing</span>
              <h2>Pay only for the machines you manage.</h2>
              <p>Transparent pricing tailored for Indian SME factories. Includes 30-day free trial, full onboarding support, and no hidden fees.</p>
            </div>

            {/* Interactive Calculator Slider Controls */}
            <div className="marketing-calculator-box">
              <div className="marketing-calculator-header">
                <div>
                  <strong>Estimate monthly investment for your plant</strong>
                  <p>Move slider to select the number of machines in your factory</p>
                </div>
                <div className="marketing-billing-toggle">
                  <span className={!isAnnual ? 'active' : ''}>Monthly</span>
                  <button
                    type="button"
                    className={`marketing-toggle-switch ${isAnnual ? 'annual' : ''}`}
                    onClick={() => setIsAnnual(!isAnnual)}
                    aria-label="Toggle annual billing 15% discount"
                  >
                    <span className="marketing-toggle-knob" />
                  </button>
                  <span className={isAnnual ? 'active' : ''}>Annual <b className="discount-badge">Save 15%</b></span>
                </div>
              </div>

              <div className="marketing-slider-row">
                <div className="marketing-slider-label">
                  <span>Factory Machine Count:</span>
                  <strong>{machineCount} Machines</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={machineCount}
                  onChange={(e) => setMachineCount(parseInt(e.target.value, 10))}
                  className="marketing-machine-slider"
                  aria-label="Number of machines in plant"
                />
                <div className="marketing-slider-marks">
                  <span>5 machines</span>
                  <span>25 machines</span>
                  <span>50 machines</span>
                  <span>100+ machines</span>
                </div>
              </div>
            </div>

            <div className="marketing-pricing-grid">
              {/* Lite */}
              <div className={`marketing-pricing-card ${machineCount < 10 ? 'recommended' : ''}`}>
                <span className="marketing-plan-badge">Lite</span>
                <div className="marketing-plan-price">
                  <span className="original-price">₹999</span>
                  <span className="current-price">₹{liteUnitPrice}</span>
                  <span className="period">/machine/month</span>
                </div>
                <div className="marketing-plan-total">
                  Total: <strong>₹{liteMonthly.toLocaleString('en-IN')}</strong> / month for {machineCount} machines
                </div>
                <p className="marketing-plan-desc">For small workshops. Minimum 5 machines.</p>
                <ul className="marketing-plan-features">
                  {['Up to 5 team members', 'Machine breakdown tickets', 'WhatsApp notifications', 'Basic maintenance records', 'Mobile-ready PWA'].map(f => (
                    <li key={f}><CheckCircle2 size={14} />{f}</li>
                  ))}
                </ul>
                <Link to="/login.html" className="marketing-btn marketing-btn-ghost marketing-plan-cta">Start free trial <ArrowRight size={14} /></Link>
              </div>

              {/* Growth — highlighted standard */}
              <div className={`marketing-pricing-card growth ${machineCount >= 10 && machineCount < 50 ? 'recommended' : ''}`}>
                <span className="popular-tag">Most Popular</span>
                <span className="marketing-plan-badge growth-badge">Growth</span>
                <div className="marketing-plan-price">
                  <span className="original-price">₹1,299</span>
                  <span className="current-price">₹{growthUnitPrice}</span>
                  <span className="period">/machine/month</span>
                </div>
                <div className="marketing-plan-total">
                  Total: <strong>₹{growthMonthly.toLocaleString('en-IN')}</strong> / month for {machineCount} machines
                </div>
                <p className="marketing-plan-desc">For growing plants. Minimum 10 machines.</p>
                <ul className="marketing-plan-features">
                  {['Up to 25 team members', 'Full ticket & SLA management', 'AI maintenance assistant', 'Shutdown planner', 'Kaizen improvement board', 'Inventory management', 'Records & document upload', 'MTTR / downtime reports', 'CSV data export'].map(f => (
                    <li key={f}><CheckCircle2 size={14} />{f}</li>
                  ))}
                </ul>
                <Link to="/login.html" className="marketing-btn marketing-btn-primary marketing-plan-cta">Start free trial <ArrowRight size={14} /></Link>
              </div>

              {/* Enterprise */}
              <div className={`marketing-pricing-card ${machineCount >= 50 ? 'recommended' : ''}`}>
                <span className="marketing-plan-badge">Enterprise</span>
                <div className="marketing-plan-price">
                  <span className="original-price">₹699</span>
                  <span className="current-price">₹{enterpriseUnitPrice}</span>
                  <span className="period">/machine/month</span>
                </div>
                <div className="marketing-plan-total">
                  Total: <strong>₹{enterpriseMonthly.toLocaleString('en-IN')}</strong> / month for {machineCount} machines
                </div>
                <p className="marketing-plan-desc">Starting price for 50+ machines on an annual contract.</p>
                <ul className="marketing-plan-features">
                  {['Unlimited team members', 'Multi-plant hierarchy', 'Dedicated onboarding', 'Custom SLA configuration', 'Priority support SLA', 'Data residency options', 'Bulk CSV asset import', 'Annual contract pricing'].map(f => (
                    <li key={f}><CheckCircle2 size={14} />{f}</li>
                  ))}
                </ul>
                <a href={`https://wa.me/${SALES_WHATSAPP}?text=I'd like to discuss an Enterprise plan for ${machineCount} machines`} className="marketing-btn marketing-btn-ghost marketing-plan-cta" target="_blank" rel="noopener noreferrer">Talk to sales <ArrowRight size={14} /></a>
              </div>
            </div>

            <p className="marketing-pricing-note">
              Prices exclude GST. Save 15% with annual billing. Fair-use limits apply to WhatsApp and AI features.
              <br />
              <LockKeyhole size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              All data stored in Supabase (AWS ap-south-1 — Mumbai). Your plant data is never shared with other companies.
              · <a href={`https://wa.me/${SALES_WHATSAPP}`} style={{ color: 'var(--muted-foreground)', textDecoration: 'underline' }}>Privacy questions? WhatsApp us</a>
            </p>
          </div>
        </section>}

        {showSection('faq') && <section className="marketing-section marketing-faq" id="faq">
          <div className="container marketing-faq-grid">
            <div><span>Clear before you commit</span><h2>{copy.faqTitle}</h2><p>TurboFix is designed to support maintenance judgment, preserve accountability, and make plant knowledge easier to use.</p></div>
            <div className="marketing-faq-list">
              {faqs.map(({ question, answer }, index) => (
                <details
                  key={question}
                  open={openFaqIndex === index}
                  onToggle={(event) => {
                    if (event.currentTarget.open) {
                      setOpenFaqIndex(index);
                    } else if (openFaqIndex === index) {
                      setOpenFaqIndex(null);
                    }
                  }}
                >
                  <summary>{question}<span>+</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>}

        {showSection('contact') && <section className="marketing-section marketing-contact" id="contact">
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
                    <label htmlFor="lead-name"><span>{copy.name}</span></label>
                    <input id="lead-name" name="name" type="text" placeholder="Rakesh Shah" autoComplete="name" required aria-required="true" />
                    
                    <label htmlFor="lead-phone"><span>{copy.phone}</span></label>
                    <input id="lead-phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" required aria-required="true" />
                    
                    <label htmlFor="lead-company"><span>{copy.company}</span></label>
                    <input id="lead-company" name="company" type="text" placeholder="Acme Forge Pvt Ltd" autoComplete="organization" />
                    
                    <label htmlFor="lead-machines"><span>{copy.machines}</span></label>
                    <input id="lead-machines" name="machines" type="number" min="1" placeholder="25" value={machineCount} onChange={(e) => setMachineCount(parseInt(e.target.value, 10) || 1)} />
                    
                    <label htmlFor="lead-challenge" className="marketing-form-wide"><span>{copy.challenge}</span></label>
                    <select id="lead-challenge" name="challenge" defaultValue="" className="marketing-form-wide"><option value="" disabled>{copy.challengePlaceholder}</option>{copy.challengeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  </div>
                  <button className="marketing-btn marketing-btn-primary marketing-submit" type="submit">{copy.submit}<ArrowRight /></button>
                  <small className="marketing-privacy"><LockKeyhole />{copy.formNote}</small>
                </form>
              )}
            </div>
          </div>
        </section>}
      </div>

      {/* ── Mobile Floating Sticky Bar ── */}
      {showStickyCta && (
        <div className="marketing-mobile-sticky-bar">
          <div className="sticky-bar-copy">
            <strong>Protect Production Hours</strong>
            <small>10-sec QR reporting & 5-Why RCA</small>
          </div>
          <div className="sticky-bar-actions">
            <a href="#contact" className="marketing-btn marketing-btn-primary marketing-btn-sm">
              Book Walkthrough <ArrowRight size={13} />
            </a>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
