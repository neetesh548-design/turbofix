import React, { useState, useEffect } from 'react';

export default function LanguageGate() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const hasLang = localStorage.getItem('turbofix_lang');
    if (!hasLang) {
      setIsVisible(true);
    }
  }, []);

  const handleSelect = (lang) => {
    localStorage.setItem('turbofix_lang', lang);
    if (window.applyTranslations) {
      window.applyTranslations(lang);
    }
    
    // Dispatch custom event so Navbar can update its <select> state
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    
    // Play the demo animation globally if the legacy script exposed it, or we just trust the scroll triggers
    if (window.initVanillaHome && window.demoInstance) {
      // If we exposed the demo instance we could trigger it here
    }

    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="lang-gate" id="langGate" style={{ display: 'flex', opacity: isFading ? 0 : 1, transition: 'opacity 0.3s ease' }}>
      <div className="lang-gate-blob lang-gate-blob-1" aria-hidden="true"></div>
      <div className="lang-gate-blob lang-gate-blob-2" aria-hidden="true"></div>
      <div className="lang-gate-card">
        <span className="brand-mark lang-gate-mark">⚡</span>
        <h2 className="lang-gate-title">Choose your language<br/>अपनी भाषा चुनें · तुमची भाषा निवडा</h2>
        <p className="lang-gate-sub">We'll load the page and float the live demo onto your screen automatically.</p>
        <div className="lang-gate-options">
          <button className="lang-gate-btn" data-lang="en" style={{'--i':0}} onClick={() => handleSelect('en')}>
            <span className="lang-gate-badge">A</span>
            <span className="lang-gate-text">
              <span className="lang-gate-native">English</span>
              <span className="lang-gate-hint">Continue in English</span>
            </span>
            <span className="lang-gate-check">✓</span>
          </button>
          <button className="lang-gate-btn" data-lang="hi" style={{'--i':1}} onClick={() => handleSelect('hi')}>
            <span className="lang-gate-badge">अ</span>
            <span className="lang-gate-text">
              <span className="lang-gate-native">हिंदी</span>
              <span className="lang-gate-hint">हिंदी में जारी रखें</span>
            </span>
            <span className="lang-gate-check">✓</span>
          </button>
          <button className="lang-gate-btn" data-lang="mr" style={{'--i':2}} onClick={() => handleSelect('mr')}>
            <span className="lang-gate-badge">म</span>
            <span className="lang-gate-text">
              <span className="lang-gate-native">मराठी</span>
              <span className="lang-gate-hint">मराठीत सुरू ठेवा</span>
            </span>
            <span className="lang-gate-check">✓</span>
          </button>
        </div>
      </div>
    </div>
  );
}
