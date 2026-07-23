import React from 'react';
import { Factory, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919637438044';

export default function Footer() {
  const { lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const copy = {
    en: {
      tagline: 'Turn existing maintenance records into trusted AI knowledge—from old history to verified work.',
      product: 'Explore', platform: 'Platform', records: 'Use old records', workflow: 'How it works', demo: 'Product demo', faq: 'Questions', contact: 'Get started', book: 'Book a guided demo', signIn: 'Staff sign in', chat: 'Talk on WhatsApp',
      trust: ['Handwritten and digital records', 'Maintenance Head approval before AI use', 'Exportable plant-owned backup'],
      note: 'TurboFix supports the workflow layer. Analytics stays underneath, and authorized plant personnel remain responsible for safety, approval, and execution.',
      rights: 'All rights reserved.',
    },
    hi: {
      tagline: 'पुराने मेंटेनेंस रिकॉर्ड को विश्वसनीय AI ज्ञान में बदलें—इतिहास से सत्यापित कार्य तक।',
      product: 'देखें', platform: 'प्लेटफॉर्म', records: 'पुराने रिकॉर्ड', workflow: 'कैसे काम करता है', demo: 'प्रोडक्ट डेमो', faq: 'सवाल', contact: 'शुरू करें', book: 'गाइडेड डेमो बुक करें', signIn: 'स्टाफ साइन इन', chat: 'WhatsApp पर बात करें',
      trust: ['हस्तलिखित और डिजिटल रिकॉर्ड', 'AI उपयोग से पहले Maintenance Head मंज़ूरी', 'Export योग्य प्लांट बैकअप'],
      note: 'TurboFix मेंटेनेंस के workflow में सहायता करता है। Analytics नीचे रहता है, और सुरक्षा, मंजूरी और काम की जिम्मेदारी अधिकृत प्लांट टीम की रहती है।',
      rights: 'सर्वाधिकार सुरक्षित।',
    },
    mr: {
      tagline: 'जुने मेंटेनन्स रेकॉर्ड विश्वसनीय AI ज्ञानात बदला—इतिहासापासून पडताळलेल्या कामापर्यंत.',
      product: 'पाहा', platform: 'प्लॅटफॉर्म', records: 'जुने रेकॉर्ड', workflow: 'कसे काम करते', demo: 'प्रॉडक्ट डेमो', faq: 'प्रश्न', contact: 'सुरू करा', book: 'मार्गदर्शित डेमो बुक करा', signIn: 'स्टाफ साइन इन', chat: 'WhatsApp वर बोला',
      trust: ['हस्तलिखित आणि डिजिटल रेकॉर्ड', 'AI वापरापूर्वी Maintenance Head मंजुरी', 'Export करता येणारा प्लांट बॅकअप'],
      note: 'TurboFix मेंटेनन्सच्या workflow ला सहाय्य करते. Analytics खाली राहते, आणि सुरक्षा, मंजुरी आणि अंमलबजावणीची जबाबदारी अधिकृत प्लांट टीमची राहते.',
      rights: 'सर्व हक्क राखीव.',
    },
  }[lang] || {};

  const scrollTo = (sectionId) => (event) => {
    event.preventDefault();
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="footer marketing-footer">
      <div className="container marketing-footer-main">
        <div className="footer-brand marketing-footer-brand">
          <Link to="/" className="brand" aria-label="TurboFix home">
            <svg className="brand-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="20" fill="url(#brand-grad-footer)" />
              <defs><linearGradient id="brand-grad-footer" x1="0" y1="0" x2="100" y2="100"><stop offset="0%" stopColor="#22a35a" /><stop offset="100%" stopColor="#125c31" /></linearGradient></defs>
              <circle cx="50" cy="50" r="12" fill="#0f172a" />
              <path d="M 53 32 L 38 52 L 48 52 L 44 68 L 62 46 L 50 46 Z" fill="#f59e0b" />
            </svg>
            <span className="brand-name"><span className="brand-turbo">TURBO</span><span className="brand-fix">FIX</span></span>
          </Link>
          <p>{copy.tagline}</p>
          <span className="marketing-footer-note"><ShieldCheck />{copy.note}</span>
        </div>

        <div className="footer-links">
          <h4>{copy.product}</h4>
          <a href="#platform" onClick={scrollTo('platform')}>{copy.platform}</a>
          <a href="#records" onClick={scrollTo('records')}>{copy.records}</a>
          <a href="#how" onClick={scrollTo('how')}>{copy.workflow}</a>
          <a href="#demo" onClick={scrollTo('demo')}>{copy.demo}</a>
          <a href="#faq" onClick={scrollTo('faq')}>{copy.faq}</a>
        </div>

        <div className="footer-links marketing-footer-contact">
          <h4>{copy.contact}</h4>
          <a href="#contact" onClick={scrollTo('contact')}>{copy.book}</a>
          <Link to="/login.html">{copy.signIn}</Link>
          <a className="marketing-footer-whatsapp" href={`https://wa.me/${SALES_WHATSAPP}`} target="_blank" rel="noopener noreferrer"><MessageCircle />{copy.chat}</a>
        </div>
      </div>

      <div className="container marketing-footer-trust">
        {copy.trust.map((item, index) => {
          const Icon = index === 0 ? Factory : index === 1 ? LockKeyhole : ShieldCheck;
          return <span key={item}><Icon />{item}</span>;
        })}
      </div>

      <div className="container footer-bottom marketing-footer-bottom">
        <p>&copy; {year} TurboFix. {copy.rights}</p>
      </div>
    </footer>
  );
}
