import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('turbofix_lang') || 'en');
  const [activeHash, setActiveHash] = useState('');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
      
      // Scroll spy logic
      if (location.pathname === '/') {
        const sections = ['demo', 'how'];
        let current = '';
        for (const section of sections) {
          const el = document.getElementById(section);
          if (el && window.scrollY >= (el.offsetTop - 150)) {
            current = `#${section}`;
          }
        }
        setActiveHash(current);
      } else {
        setActiveHash('');
      }
    };
    const handleLangSync = (e) => {
      setLang(e.detail);
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('languageChanged', handleLangSync);
    
    // Initial check
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('languageChanged', handleLangSync);
    };
  }, [location.pathname]);

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem('turbofix_lang', newLang);
    if (window.applyTranslations) {
      window.applyTranslations(newLang);
    }
  };

  const isActive = (path) => {
    if (path.startsWith('#')) return activeHash === path;
    if (path === '/' && location.pathname === '/' && activeHash === '') return true; // Optional: home active
    return location.pathname === path;
  };

  return (
    <header className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={() => setIsOpen(false)}>
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
          <Link to="/why-turbofix.html" className={isActive('/why-turbofix.html') ? 'active' : ''} onClick={() => setIsOpen(false)}>Why TurboFix</Link>
          {location.pathname === '/' ? (
            <>
              <a href="#demo" className={isActive('#demo') ? 'active' : ''} onClick={() => setIsOpen(false)}>Live Demo</a>
              <a href="#how" className={isActive('#how') ? 'active' : ''} onClick={() => setIsOpen(false)}>How Does It Work</a>
            </>
          ) : (
            <>
              <Link to="/#demo" onClick={() => setIsOpen(false)}>Live Demo</Link>
              <Link to="/#how" onClick={() => setIsOpen(false)}>How Does It Work</Link>
            </>
          )}
          <a href="/#contact" className="btn btn-sm nav-get-started" onClick={() => setIsOpen(false)}>
            <span className="nav-btn-primary">Get Started</span>
            <span className="nav-btn-sub">Free Trial</span>
          </a>
        </nav>

        <div className="nav-cta">
          <select className="lang-switch" id="langSwitch" aria-label="Choose language" value={lang} onChange={handleLangChange}>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
          <Link to="/vault.html" className="login-link">Login</Link>
          <button className={`nav-toggle ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
