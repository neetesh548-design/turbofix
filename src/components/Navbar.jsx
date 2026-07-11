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
          <svg className="brand-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{width: '32px', height: '32px'}}>
            <rect width="100" height="100" rx="20" fill="var(--brand)" />
            <path d="M 53 32 L 38 52 L 48 52 L 44 68 L 62 46 L 50 46 Z" fill="#ffffff" />
          </svg>
          <span className="brand-name" style={{color: 'var(--ink)'}}>Fixpro</span>
        </Link>

        <nav className={`nav-links ${isOpen ? 'open' : ''}`} id="navLinks">
          <Link to="/why-turbofix.html" className={isActive('/why-turbofix.html') ? 'active' : ''} onClick={() => setIsOpen(false)}>Services</Link>
          {location.pathname === '/' ? (
            <>
              <a href="#demo" className={isActive('#demo') ? 'active' : ''} onClick={() => setIsOpen(false)}>Live Demo</a>
              <a href="#how" className={isActive('#how') ? 'active' : ''} onClick={() => setIsOpen(false)}>How It Works</a>
            </>
          ) : (
            <>
              <Link to="/#demo" onClick={() => setIsOpen(false)}>Live Demo</Link>
              <Link to="/#how" onClick={() => setIsOpen(false)}>How It Works</Link>
            </>
          )}
          <a href="/#contact" className="btn btn-sm nav-get-started" onClick={() => setIsOpen(false)} style={{background: 'var(--brand)', color: 'white', border: 'none', borderRadius: '4px'}}>
            <span className="nav-btn-primary">Book Repair</span>
            <span className="nav-btn-sub">Get a Free Quote</span>
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
