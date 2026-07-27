import React, { useEffect, useState } from 'react';
import {
  ArchiveRestore,
  ArrowRight,
  ChevronDown,
  Grid,
  Layers3,
  LogIn,
  Menu,
  PlayCircle,
  Route,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import MicrosoftAppLauncher from './MicrosoftAppLauncher';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);
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
  const showMarketingCta = !isAuth;

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
      <span className="public-nav-account-text">
        <small>{isAuth ? `${t('menu.signedIn')} • ${user?.company_code || 'TurboFix'}` : 'TURBOFIX WORKSPACE'}</small>
        <strong>{isAuth ? t('menu.dashboard') : t('menu.login')}</strong>
      </span>
    </Link>
  );

  return (
    <>
      <header className={`nav public-nav ${isScrolled ? 'scrolled' : ''} ${isOpen ? 'menu-open' : ''}`} id="nav">
        <div className="container nav-inner public-nav-inner flex items-center justify-between gap-4">
          <div className="public-nav-brand-cluster">
            <button
              type="button"
              className="public-nav-waffle-btn"
              onClick={() => setAppLauncherOpen(true)}
              aria-label="Open Microsoft-style App Launcher"
              title="TurboFix Workspace Apps (Microsoft Waffle Menu)"
            >
              <Grid />
            </button>

            <Link to="/" className="brand public-nav-brand" onClick={() => setIsOpen(false)} aria-label="TurboFix home">
              <div className="brand-logo-icon">
                <svg viewBox="0 0 24 24" className="bolt-icon" fill="currentColor" aria-hidden="true">
                  <path d="M13 2L3 14h8l-1 8 11-12h-9l1-8z" />
                </svg>
              </div>
              <span className="public-nav-brand-copy">
                <span className="brand-name"><span className="brand-turbo">TURBO</span><span className="brand-fix">FIX</span></span>
                <small className="public-nav-brand-sub">WORKFLOW LAYER · ANALYTICS UNDERNEATH</small>
              </span>
            </Link>
          </div>

          <nav className={`public-nav-menu ${isOpen ? 'open' : ''}`} id="mainNavigation" aria-label="Main navigation">
            <div className="public-nav-mobile-heading">{t('menu.explore')}</div>
            <div className="public-nav-primary">
              {navItems.map(sectionLink)}
              <div className="public-nav-language-wrapper">
                <label className="public-nav-language">
                  <span className="sr-only">{t('menu.language')}</span>
                  <select aria-label={t('menu.language')} value={lang} onChange={(event) => setLang(event.target.value)}>
                    <option value="en">EN</option>
                    <option value="hi">HI</option>
                    <option value="mr">MR</option>
                  </select>
                  <ChevronDown className="lang-chevron" aria-hidden="true" />
                </label>
              </div>
            </div>
            <div className="public-nav-mobile-actions">
              {accountLink}
              {showMarketingCta && (
                <a href="#contact" className="public-nav-demo" onClick={scrollToContact}>
                  <span>{t('menu.start')}</span>
                  <ArrowRight />
                </a>
              )}
            </div>
          </nav>

          <div className="public-nav-actions">
            <div className="public-nav-desktop-account">{accountLink}</div>
            {showMarketingCta && (
              <a href="#contact" className={`public-nav-demo ${activeHash === '#contact' ? 'active' : ''}`} onClick={scrollToContact}>
                <span>{t('menu.start')}</span>
                <ArrowRight />
              </a>
            )}
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
        <MicrosoftAppLauncher
          open={appLauncherOpen}
          onClose={() => setAppLauncherOpen(false)}
        />
      </header>

      {/* Secondary Sub-Navigation Bar with Quick Sign In */}
      <div className="public-nav-subbar">
        <div className="container public-nav-subbar-inner flex items-center justify-between gap-3">
          <div className="subbar-left flex items-center gap-2">
            <span className="subbar-badge">⚡ WORKSPACE PORTAL</span>
            <span className="subbar-label">Already registered? Sign in to manage plant maintenance & tickets</span>
          </div>
          <div className="subbar-actions flex items-center gap-2">
            <Link to={isAuth ? '/dashboard.html' : '/login.html'} className="subbar-signin-btn">
              <LogIn className="subbar-btn-icon" />
              <span>{isAuth ? t('menu.dashboard') : 'Staff Sign In'}</span>
              <ArrowRight className="subbar-btn-arrow" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

