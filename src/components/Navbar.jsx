import React, { useEffect, useState } from 'react';
import {
  ArchiveRestore,
  ArrowRight,
  Globe2,
  Layers3,
  LogIn,
  Menu,
  PlayCircle,
  Route,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [isAuth, setIsAuth] = useState(() => Boolean(localStorage.getItem('tf_token')));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tf_user')) || null; }
    catch { return null; }
  });
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();

  const navItems = [
    { id: 'platform', label: t('menu.platform'), description: t('menu.platformDesc'), icon: Layers3 },
    { id: 'records', label: t('menu.records'), description: t('menu.recordsDesc'), icon: ArchiveRestore },
    { id: 'how', label: t('menu.how'), description: t('menu.howDesc'), icon: Route },
    { id: 'demo', label: t('menu.demo'), description: t('menu.demoDesc'), icon: PlayCircle },
  ];

  useEffect(() => {
    const handleAuth = () => {
      setIsAuth(Boolean(localStorage.getItem('tf_token')));
      try { setUser(JSON.parse(localStorage.getItem('tf_user')) || null); }
      catch { setUser(null); }
    };
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
      if (location.pathname !== '/') {
        setActiveHash('');
        return;
      }

      let current = '';
      for (const sectionId of ['platform', 'records', 'how', 'demo', 'contact']) {
        const section = document.getElementById(sectionId);
        if (section && window.scrollY >= section.offsetTop - 170) current = `#${sectionId}`;
      }
      setActiveHash(current);
    };

    window.addEventListener('authChanged', handleAuth);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('authChanged', handleAuth);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const scrollToContact = (event) => {
    event.preventDefault();
    setIsOpen(false);
    if (location.pathname !== '/') {
      window.location.href = `${import.meta.env.BASE_URL}#contact`;
      return;
    }
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const sectionLink = ({ id, label, description, icon: Icon }) => {
    const className = `public-nav-link ${activeHash === `#${id}` ? 'active' : ''}`;
    const children = (
      <>
        <span className="public-nav-link-icon"><Icon /></span>
        <span><strong>{label}</strong><small>{description}</small></span>
      </>
    );

    return location.pathname === '/'
      ? <a key={id} href={`#${id}`} className={className} onClick={() => setIsOpen(false)}>{children}</a>
      : <Link key={id} to={`/#${id}`} className={className} onClick={() => setIsOpen(false)}>{children}</Link>;
  };

  const accountLink = (
    <Link className="public-nav-account" to={isAuth ? '/dashboard.html' : '/login.html'} onClick={() => setIsOpen(false)}>
      <span className="public-nav-avatar">{isAuth ? (user?.name?.charAt(0) || 'S').toUpperCase() : <LogIn />}</span>
      <span>
        <small>{isAuth ? `${t('menu.signedIn')} • ${user?.company_code || 'TurboFix'}` : 'TurboFix workspace'}</small>
        <strong>{isAuth ? t('menu.dashboard') : t('menu.login')}</strong>
      </span>
    </Link>
  );

  return (
    <header className={`nav public-nav ${isScrolled ? 'scrolled' : ''} ${isOpen ? 'menu-open' : ''}`} id="nav">
      <div className="container nav-inner public-nav-inner">
        <Link to="/" className="brand public-nav-brand" onClick={() => setIsOpen(false)} aria-label="TurboFix home">
          <svg className="brand-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="100" height="100" rx="20" fill="url(#brand-grad)" />
            <defs><linearGradient id="brand-grad" x1="0" y1="0" x2="100" y2="100"><stop offset="0%" stopColor="#22a35a" /><stop offset="100%" stopColor="#125c31" /></linearGradient></defs>
            <circle cx="50" cy="50" r="12" fill="#0f172a" />
            <path d="M 53 32 L 38 52 L 48 52 L 44 68 L 62 46 L 50 46 Z" fill="#f59e0b" />
          </svg>
          <span className="public-nav-brand-copy">
            <span className="brand-name"><span className="brand-turbo">TURBO</span><span className="brand-fix">FIX</span></span>
            <small>Workflow layer · analytics underneath</small>
          </span>
        </Link>

        <nav className={`public-nav-menu ${isOpen ? 'open' : ''}`} id="mainNavigation" aria-label="Main navigation">
          <div className="public-nav-mobile-heading">{t('menu.explore')}</div>
          <div className="public-nav-primary">{navItems.map(sectionLink)}</div>
          <div className="public-nav-mobile-actions">
            {accountLink}
            {!isAuth && <a href="#contact" className="public-nav-demo" onClick={scrollToContact}>{t('menu.start')}<ArrowRight /></a>}
          </div>
        </nav>

        <div className="public-nav-actions">
          <label className="public-nav-language">
            <Globe2 aria-hidden="true" />
            <span className="sr-only">{t('menu.language')}</span>
            <select aria-label={t('menu.language')} value={lang} onChange={(event) => setLang(event.target.value)}>
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
          <div className="public-nav-desktop-account">{accountLink}</div>
          {!isAuth && <a href="#contact" className={`public-nav-demo ${activeHash === '#contact' ? 'active' : ''}`} onClick={scrollToContact}>{t('menu.start')}<ArrowRight /></a>}
          <button
            type="button"
            className="public-nav-toggle"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mainNavigation"
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {isOpen && <button type="button" className="public-nav-backdrop" aria-label="Close menu" onClick={() => setIsOpen(false)} />}
    </header>
  );
}
