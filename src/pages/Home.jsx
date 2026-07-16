import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919876543210';

const contentByLanguage = {
  en: {
    eyebrow: 'AI maintenance decision platform for manufacturing SMEs',
    heroTitle: 'Know what to fix next—before downtime decides for you.',
    heroBody: 'TurboFix turns your old paper records and soft copies into approved machine knowledge, then combines that history with live breakdowns, preventive work, and shutdown capacity.',
    bookDemo: 'Book a guided demo',
    explore: 'Explore the product',
    trust: ['Handwritten and soft-copy records', 'Maintenance Head approval before AI use', 'Exportable plant-owned backup'],
    previewQuestion: 'What should we service this Sunday?',
    previewScope: 'Plant-wide question • 2 machines reviewed',
    previewFinding: 'Hydraulic Press needs attention first',
    previewReason: 'Overdue inspection, repeated oil leak, and spare seal available.',
    previewAction: 'Add to shutdown plan',
    previewSafe: 'Recommendation uses approved machine context',
    strip: ['Digitize existing machine history', 'AI across one or all machines', 'Guided shutdown planning', 'Closed-loop technician work'],
    platformEyebrow: 'One maintenance operating system',
    platformTitle: 'Move from scattered records to confident decisions',
    platformBody: 'Bring forward the records you already trust. Every approved source feeds the next decision, so years of maintenance history become action instead of remaining in cupboards and folders.',
    recordsEyebrow: 'Bring your existing maintenance history',
    recordsTitle: 'Turn paper files and soft copies into AI-ready machine knowledge.',
    recordsBody: 'Photograph handwritten registers or upload PDFs, Excel, Word, CSV, text files, job cards, inspection sheets, manuals, BOMs, and spare lists. TurboFix reads them into a structured draft your team can verify.',
    recordsSources: [
      { title: 'Handwritten and scanned', body: 'Registers, job cards, logbooks, marked drawings, and inspection sheets.' },
      { title: 'Soft-copy records', body: 'PDF, Excel, Word, CSV, text exports, and historic maintenance reports.' },
      { title: 'Technical knowledge', body: 'Manuals, wiring and hydraulic diagrams, BOMs, spares, and consumable lists.' },
    ],
    recordsSafetyTitle: 'AI creates a draft—not a fact.',
    recordsSafetyBody: 'Your team checks uncertain values. Only the Maintenance Head can approve the extracted data for future AI recommendations.',
    recordsReviewKicker: 'AI records review',
    recordsReviewTitle: 'CNC Lathe service register · 2019–2025',
    recordsReviewMeta: '24 handwritten pages · linked to CNC Lathe 1',
    recordsDraftLabel: 'Waiting for Maintenance Head approval',
    recordsExtracted: ['Maintenance events', 'Breakdown causes', 'Spare references', 'PM tasks'],
    recordsSteps: [
      { title: 'Capture what you already have', body: 'Photograph physical registers or upload existing files in familiar formats.' },
      { title: 'AI reads and structures', body: 'TurboFix organizes machine identity, history, work performed, spares, and maintenance signals.' },
      { title: 'Your team verifies', body: 'Low-confidence fields are highlighted so people can correct them against the source.' },
      { title: 'Maintenance Head approves', body: 'Unapproved drafts remain isolated and cannot influence AI decisions.' },
      { title: 'Knowledge starts working', body: 'Approved history supports breakdown guidance, spare planning, consumables, PM, and shutdown decisions.' },
    ],
    recordsOutcomes: [
      { title: 'Better breakdown decisions', body: 'AI can consider recurring symptoms, previous causes, and successful corrective actions.' },
      { title: 'Smarter material planning', body: 'Historic spare and consumable usage becomes available for preparation and replenishment.' },
      { title: 'Portable plant backup', body: 'Export originals, structured JSON, Excel-ready CSV, approval history, and MachineData files.' },
    ],
    recordsCta: 'See the AI Records workflow',
    workflowEyebrow: 'A complete maintenance loop',
    workflowTitle: 'From machine data to verified work',
    workflowBody: 'Start with the information you already have. TurboFix structures it, protects it with human approval, supports the decision, and keeps execution visible.',
    knowledgeEyebrow: 'Machine intelligence that stays useful',
    knowledgeTitle: 'Your old records become living machine memory',
    knowledgeBody: 'Approved historic records and technical documents are consolidated into a machine-specific knowledge file used across TurboFix. Plant data stays distinct from internet-enriched context, which still requires separate approval.',
    knowledgeItems: ['Approved service and breakdown history', 'Manuals and technical documents', 'BOM, spares, and consumables', 'Exportable MachineData knowledge'],
    demoEyebrow: 'See the workflow',
    demoTitle: 'A practical product—not an AI presentation',
    demoBody: 'Explore the same screens maintenance heads, technicians, and owners use to decide, execute, and review work.',
    demoLogin: 'Open demo sign-in',
    demoList: ['Upload a handwritten or digital record', 'Review and approve AI-extracted machine data', 'Ask one-machine or plant-wide questions', 'Plan shutdown work and review technician closure'],
    fitEyebrow: 'Built for the real factory floor',
    fitTitle: 'Start where maintenance is hardest today',
    fitBody: 'TurboFix fits teams that have outgrown paper, spreadsheets, calls, and disconnected files—but want to preserve that history instead of starting from zero.',
    faqTitle: 'Questions maintenance leaders ask first',
    contactEyebrow: 'Guided onboarding',
    contactTitle: 'Show us your maintenance reality',
    contactBody: 'Tell us about your plant and biggest maintenance challenge. We will use the walkthrough to map TurboFix to your current process—not force a generic software demo.',
    contactPoints: ['Review sample paper and soft-copy records', 'Map one representative machine and its history', 'Identify the first useful AI workflow to launch'],
    formTitle: 'Book your plant walkthrough',
    name: 'Your name',
    phone: 'Phone / WhatsApp',
    company: 'Company name',
    machines: 'Approximate machines',
    challenge: 'Biggest maintenance challenge',
    challengePlaceholder: 'Select one',
    challengeOptions: ['Digitizing old maintenance records', 'Unplanned breakdowns', 'Shutdown planning', 'Missing machine knowledge', 'Technician follow-through', 'Maintenance visibility', 'Other'],
    submit: 'Request guided demo',
    formNote: 'We use these details only to plan your walkthrough.',
    successTitle: 'Your request is ready',
    successBody: 'A WhatsApp message has opened with your details. Send it to confirm the walkthrough.',
  },
  hi: {
    eyebrow: 'मैन्युफैक्चरिंग SMEs के लिए AI मेंटेनेंस निर्णय प्लेटफॉर्म',
    heroTitle: 'डाउनटाइम से पहले जानें—अगला काम क्या होना चाहिए।',
    heroBody: 'TurboFix पुराने कागज़ी रिकॉर्ड और सॉफ्ट कॉपी को मंज़ूर मशीन ज्ञान में बदलकर उसे ब्रेकडाउन, PM और शटडाउन निर्णयों से जोड़ता है।',
    bookDemo: 'गाइडेड डेमो बुक करें',
    explore: 'प्रोडक्ट देखें',
    trust: ['हस्तलिखित और डिजिटल रिकॉर्ड', 'AI उपयोग से पहले Maintenance Head की मंज़ूरी', 'एक्सपोर्ट योग्य प्लांट बैकअप'],
    previewQuestion: 'इस रविवार किस मशीन की सर्विस करें?',
    previewScope: 'पूरे प्लांट का प्रश्न • 2 मशीनों की समीक्षा',
    previewFinding: 'Hydraulic Press पर पहले ध्यान दें',
    previewReason: 'निरीक्षण लंबित है, तेल रिसाव दोहराया गया है और सील उपलब्ध है।',
    previewAction: 'शटडाउन प्लान में जोड़ें',
    previewSafe: 'सिफारिश अनुमोदित मशीन संदर्भ पर आधारित है',
    strip: ['पुराना मशीन इतिहास डिजिटाइज़ करें', 'एक या सभी मशीनों पर AI', 'गाइडेड शटडाउन प्लानिंग', 'क्लोज़्ड-लूप तकनीशियन कार्य'],
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
    trust: ['हस्तलिखित आणि डिजिटल रेकॉर्ड', 'AI वापरापूर्वी Maintenance Head मंजुरी', 'Export करता येणारा प्लांट बॅकअप'],
    previewQuestion: 'या रविवारी कोणत्या मशीनची सर्व्हिस करावी?', previewScope: 'संपूर्ण प्लांट प्रश्न • 2 मशीन तपासल्या', previewFinding: 'Hydraulic Press ला प्रथम प्राधान्य', previewReason: 'तपासणी बाकी, वारंवार तेल गळती आणि सील उपलब्ध.', previewAction: 'शटडाउन प्लॅनमध्ये जोडा', previewSafe: 'शिफारस मंजूर मशीन संदर्भ वापरते',
    strip: ['जुना मशीन इतिहास डिजिटाइझ करा', 'एका किंवा सर्व मशीनसाठी AI', 'मार्गदर्शित शटडाउन नियोजन', 'क्लोज्ड-लूप तंत्रज्ञ काम'],
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
  { icon: ScanText, title: 'AI Records & Machine Knowledge', body: 'Photograph handwritten registers or upload PDFs, Excel, Word, CSV, manuals, job cards, BOMs, and spare lists for structured review.' },
  { icon: BrainCircuit, title: 'AI Maintenance Assistant', body: 'Ask about one machine or the entire plant. Get recommendations grounded in machine knowledge, history, and current work.' },
  { icon: CalendarClock, title: 'Shutdown Planner', body: 'Prioritize the right machines, edit effort assumptions, compare work with available hours, and prepare an achievable sequence.' },
  { icon: ClipboardCheck, title: 'Technician Workspace', body: 'Give technicians a focused work queue with checklists, notes, parts, evidence, and supervisor review.' },
  { icon: TicketCheck, title: 'Breakdown & Escalation', body: 'Capture issues quickly, assign responsibility, track response status, and escalate using plant-defined rules.' },
  { icon: LayoutDashboard, title: 'Maintenance Control View', body: 'See machine attention, PM status, open work, knowledge gaps, and operational priorities without chasing updates.' },
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

        <section className="marketing-section marketing-records-section" id="records">
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
              <Link className="marketing-record-cta" to="/vault.html">{copy.recordsCta}<ArrowRight /></Link>
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
