import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('turbofix_lang') || 'en');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem('turbofix_lang', newLang);
    if (window.applyTranslations) {
      window.applyTranslations(newLang);
    }
  };

  return (
    <header className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <svg className="brand-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="url(#brand-grad)" />
            <defs>
              <linearGradient id="brand-grad" x1="0" y1="0" x2="100" y2="100">
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

        <nav className={`nav-links ${isOpen ? 'open' : ''}`} id="navLinks">
          <Link to="/why-turbofix.html" onClick={() => setIsOpen(false)}>Why TurboFix</Link>
          <a href="/#demo" onClick={() => setIsOpen(false)}>Live Demo</a>
          <a href="/#how" onClick={() => setIsOpen(false)}>How Does It Work</a>
          <a href="/#contact" className="btn btn-sm" onClick={() => setIsOpen(false)} style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2, padding: '6px 16px'}}>
            <span style={{fontWeight: 700, fontSize: '14px'}}>Get Started</span>
            <span style={{fontSize: '10px', fontWeight: 400, opacity: 0.9}}>Free Trial</span>
          </a>
        </nav>

        <div className="nav-cta">
          <select className="lang-switch" id="langSwitch" aria-label="Choose language" value={lang} onChange={handleLangChange}>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
          <Link to="/vault.html" style={{fontWeight: 600, color: 'var(--text-dark)', textDecoration: 'none', marginLeft: '12px', fontSize: '15px'}}>Login</Link>
          <button className={`nav-toggle ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
