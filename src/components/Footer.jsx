import React from 'react';
import { Factory, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919637438044';

const SocialIconLinkedIn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3Z"/>
  </svg>
);

const SocialIconYouTube = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const SocialIconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const SocialIconInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const SocialIconFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function Footer() {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();
  const copy = {
    en: {
      tagline: 'Turn existing maintenance records into trusted AI knowledge—from old paper history to verified work.',
      product: 'Explore', platform: 'Platform', records: 'Use old records', workflow: 'How it works', demo: 'Product demo', faq: 'Questions', contact: 'Get started', book: 'Book a guided demo', signIn: 'Staff sign in', chat: 'Talk on WhatsApp',
      socialTitle: 'Connect with Us',
      trust: ['Handwritten and digital records', 'Maintenance Head approval before AI use', 'Exportable plant-owned backup'],
      note: 'TurboFix supports the workflow layer. Analytics stays underneath, and authorized plant personnel remain responsible for safety, approval, and execution.',
      rights: 'All rights reserved.',
    },
    hi: {
      tagline: 'पुराने मेंटेनेंस रिकॉर्ड को विश्वसनीय AI ज्ञान में बदलें—इतिहास से सत्यापित कार्य तक।',
      product: 'देखें', platform: 'प्लेटफॉर्म', records: 'पुराने रिकॉर्ड', workflow: 'कैसे काम करता है', demo: 'प्रोडक्ट डेमो', faq: 'सवाल', contact: 'शुरू करें', book: 'गाइडेड डेमो बुक करें', signIn: 'स्टाफ साइन इन', chat: 'WhatsApp पर बात करें',
      socialTitle: 'हमसे जुड़ें',
      trust: ['हस्तलिखित और डिजिटल रिकॉर्ड', 'AI उपयोग से पहले Maintenance Head मंज़ूरी', 'Export योग्य प्लांट बैकअप'],
      note: 'TurboFix मेंटेनेंस के workflow में सहायता करता है। Analytics नीचे रहता है, और सुरक्षा, मंजूरी और काम की जिम्मेदारी अधिकृत प्लांट टीम की रहती है।',
      rights: 'सर्वाधिकार सुरक्षित।',
    },
    mr: {
      tagline: 'जुने मेंटेनन्स रेकॉर्ड विश्वसनीय AI ज्ञानात बदला—इतिहासापासून पडताळलेल्या कामापर्यंत.',
      product: 'पाहा', platform: 'प्लॅटफॉर्म', records: 'जुने रेकॉर्ड', workflow: 'कसे काम करते', demo: 'प्रॉडक्ट डेमो', faq: 'प्रश्न', contact: 'सुरू करा', book: 'मार्गदर्शित डेमो बुक करा', signIn: 'स्टाफ साइन इन', chat: 'WhatsApp वर बोला',
      socialTitle: 'आमच्याशी जोडा',
      trust: ['हस्तलिखित आणि डिजिटल रेकॉर्ड', 'AI वापरापूर्वी Maintenance Head मंजुरी', 'Export करता येणारा प्लांट बॅकअप'],
      note: 'TurboFix मेंटेनन्सच्या workflow ला सहाय्य करते. Analytics खाली राहते, आणि सुरक्षा, मंजुरी आणि अंमलबजावणीची जबाबदारी अधिकृत प्लांट टीमची राहते.',
      rights: 'सर्व हक्क राखीव.',
    },
  }[lang] || {};

  return (
    <footer className="footer marketing-footer" aria-label="Site footer">
      <div className="container marketing-footer-main">
        <div className="footer-brand marketing-footer-brand">
          <Link to="/" className="brand" aria-label="TurboFix home">
            <svg className="brand-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="100" height="100" rx="20" fill="url(#brand-grad-footer)" />
              <defs><linearGradient id="brand-grad-footer" x1="0" y1="0" x2="100" y2="100"><stop offset="0%" stopColor="#22a35a" /><stop offset="100%" stopColor="#125c31" /></linearGradient></defs>
              <circle cx="50" cy="50" r="12" fill="#0f172a" />
              <path d="M 53 32 L 38 52 L 48 52 L 44 68 L 62 46 L 50 46 Z" fill="#f59e0b" />
            </svg>
            <span className="brand-name"><span className="brand-turbo">TURBO</span><span className="brand-fix">FIX</span></span>
          </Link>
          <p>{copy.tagline}</p>
          <span className="marketing-footer-note"><ShieldCheck aria-hidden="true" />{copy.note}</span>
        </div>

        <div className="footer-links">
          <h4>{copy.product}</h4>
          <Link to="/platform.html">{copy.platform}</Link>
          <Link to="/records-platform.html">{copy.records}</Link>
          <Link to="/workflow.html">{copy.workflow}</Link>
          <Link to="/demo.html">{copy.demo}</Link>
          <Link to="/pricing.html">Pricing & ROI</Link>
          <Link to="/why-turbofix.html">{copy.faq}</Link>
        </div>

        <div className="footer-links marketing-footer-contact">
          <h4>{copy.contact}</h4>
          <Link to="/contact.html">{copy.book}</Link>
          <Link to="/login.html">{copy.signIn}</Link>
          <a className="marketing-footer-whatsapp" href={`https://wa.me/${SALES_WHATSAPP}`} target="_blank" rel="noopener noreferrer" aria-label="Contact TurboFix Sales on WhatsApp"><MessageCircle aria-hidden="true" />{copy.chat}</a>

          <div className="marketing-footer-socials" style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>{copy.socialTitle}</span>
            <div className="marketing-footer-social-list">
              <a className="marketing-footer-social-link" href="https://www.linkedin.com/company/turbofix-ai" target="_blank" rel="noopener noreferrer" aria-label="TurboFix on LinkedIn" title="LinkedIn">
                <SocialIconLinkedIn />
              </a>
              <a className="marketing-footer-social-link" href="https://youtube.com/@turbofix-ai" target="_blank" rel="noopener noreferrer" aria-label="TurboFix on YouTube" title="YouTube">
                <SocialIconYouTube />
              </a>
              <a className="marketing-footer-social-link" href="https://x.com/turbofix_ai" target="_blank" rel="noopener noreferrer" aria-label="TurboFix on X (Twitter)" title="X (Twitter)">
                <SocialIconX />
              </a>
              <a className="marketing-footer-social-link" href="https://www.instagram.com/turbofix_ai" target="_blank" rel="noopener noreferrer" aria-label="TurboFix on Instagram" title="Instagram">
                <SocialIconInstagram />
              </a>
              <a className="marketing-footer-social-link" href="https://www.facebook.com/turbofix.ai" target="_blank" rel="noopener noreferrer" aria-label="TurboFix on Facebook" title="Facebook">
                <SocialIconFacebook />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container marketing-footer-trust">
        {copy.trust.map((item, index) => {
          const Icon = index === 0 ? Factory : index === 1 ? LockKeyhole : ShieldCheck;
          return <span key={item}><Icon aria-hidden="true" />{item}</span>;
        })}
      </div>

      <div className="container footer-bottom marketing-footer-bottom">
        <p>&copy; {year} TurboFix. {copy.rights}</p>
      </div>
    </footer>
  );
}
