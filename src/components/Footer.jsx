import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <svg className="brand-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="20" fill="url(#brand-grad-footer)" />
              <defs>
                <linearGradient id="brand-grad-footer" x1="0" y1="0" x2="100" y2="100">
                  <stop offset="0%" stopColor="#22a35a" />
                  <stop offset="100%" stopColor="#125c31" />
                </linearGradient>
              </defs>
              <g fill="#0f172a" opacity="0.15">
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(0)" />
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(45)" />
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(90)" />
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(135)" />
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(180)" />
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(225)" />
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(270)" />
                <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(315)" />
              </g>
              <circle cx="50" cy="50" r="12" fill="#0f172a" />
              <path d="M 53 32 L 38 52 L 48 52 L 44 68 L 62 46 L 50 46 Z" fill="#f59e0b" />
            </svg>
            <span className="brand-name"><span className="brand-turbo">TURBO</span><span className="brand-fix">FIX</span></span>
          </Link>
          <p data-i18n="footer.tagline">Machines fixed at turbo speed. AI-powered, WhatsApp-native maintenance ticketing for factories.</p>
        </div>
        <div className="footer-links">
          <h4 data-i18n="footer.product">Product</h4>
          <a href="/#how" data-i18n="nav.how">How it works</a>
          <a href="/#demo" data-i18n="nav.demo">Live demo</a>
          <a href="/#trial" data-i18n="nav.trial">Free Trial</a>
          <a href="/#faq" data-i18n="nav.faq">FAQ</a>
        </div>
        <div className="footer-links">
          <h4 data-i18n="footer.contact">Get in touch</h4>
          <a data-wa="general" target="_blank" rel="noopener noreferrer"><span data-i18n="footer.chat">💬 Chat on WhatsApp</span></a>
          <a href="/#contact"><span data-i18n="footer.callback">📩 Request a callback</span></a>
        </div>
      </div>
      <div className="container footer-bottom">
        <p><span data-i18n="footer.copyrightPrefix">&copy;</span> <span id="year">{year}</span> <span data-i18n="footer.copyrightSuffix">TurboFix. Built for the Pune MIDC industrial belt — and beyond.</span></p>
        <a href="https://turbofix-backend-ehxb.onrender.com/admin" target="_blank" rel="noopener noreferrer" className="team-admin-link" title="TurboFix team — internal">TurboFix team</a>
      </div>
    </footer>
  );
}
