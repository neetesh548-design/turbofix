import React, { useEffect, useState } from 'react';
import {
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
import { ThemeToggle } from './ThemeToggle';
import { readAuth } from '../utils/auth';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [{ authed: isAuth, user }, setAuth] = useState(readAuth);
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();

  const navItems = [
    { path: '/platform.html', label: 'Product', description: 'What TurboFix does', icon: Layers3 },
    { path: '/workflow.html', label: 'How It Works', description: 'Report, assign, verify', icon: Route },
    { path: '/pricing.html', label: 'Pricing', description: 'Plans and onboarding', icon: Grid },
    { path: '/demo.html', label: 'Demo', description: 'See one live scenario', icon: PlayCircle },
  ];
  const showMarketingCta = !isAuth;

  useEffect(() => {
    const handleAuth = () => {
      setAuth(readAuth());
    };
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
      setActiveHash(location.pathname);
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
      window.location.href = `${import.meta.env.BASE_URL}contact.html`;
      return;
    }
    window.location.href = `${import.meta.env.BASE_URL}contact.html`;
  };

  const sectionLink = ({ path, label, description, icon: Icon }) => {
    const className = `public-nav-link ${activeHash === path ? 'active' : ''}`;
    const children = (
      <>
        <span className="public-nav-link-icon"><Icon /></span>
        <span><strong>{label}</strong><small>{description}</small></span>
      </>
    );

    return <Link key={path} to={path} className={className} onClick={() => setIsOpen(false)}>{children}</Link>;
  };

  // On the staff sign-in page itself, the account corner would otherwise just
  // link back to the page you're already on. Repurpose it as the one way in
  // to the demo workspace instead of a second, separately-labelled link.
  const isLoginPage = location.pathname === '/login.html';
  const accountLink = isLoginPage && !isAuth ? (
    <Link className="public-nav-account" to="/demo-login.html" onClick={() => setIsOpen(false)}>
      <span className="public-nav-avatar"><PlayCircle /></span>
      <span className="public-nav-account-text">
        <small>NO ACCOUNT NEEDED</small>
        <strong>Try a Live Demo</strong>
      </span>
    </Link>
  ) : (
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
            {isAuth && (
              <button
                type="button"
                className="public-nav-waffle-btn"
                onClick={() => setAppLauncherOpen(true)}
                aria-label="Open Workspace Apps"
                title="Workspace Apps"
              >
                <Grid />
              </button>
            )}

            <Link to="/" className="brand public-nav-brand" onClick={() => setIsOpen(false)} aria-label="TurboFix home">
              <div className="brand-logo-icon">
                <svg viewBox="0 0 24 24" className="bolt-icon" fill="currentColor" aria-hidden="true">
                  <path d="M13 2L3 14h8l-1 8 11-12h-9l1-8z" />
                </svg>
              </div>
              <span className="public-nav-brand-copy">
                <span className="brand-name"><span className="brand-turbo">TURBO</span><span className="brand-fix">FIX</span></span>
                <small className="public-nav-brand-sub">WORKFLOW LAYER</small>
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
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                    <option value="mr">मराठी</option>
                  </select>
                  <ChevronDown className="lang-chevron" aria-hidden="true" />
                </label>
              </div>
            </div>
            <div className="public-nav-mobile-actions">
              <div className="public-nav-mobile-account">{accountLink}</div>
              {showMarketingCta && (
                <a href="/contact.html" className="public-nav-demo" onClick={scrollToContact}>
                  <span>{t('menu.start')}</span>
                  <ArrowRight />
                </a>
              )}
            </div>
          </nav>

          <div className="public-nav-actions">
            <ThemeToggle />
            <div className="public-nav-desktop-account">{accountLink}</div>
            {showMarketingCta && (
              <a href="/contact.html" className={`public-nav-demo ${activeHash === '/contact.html' ? 'active' : ''}`} onClick={scrollToContact}>
                <span>Book a Plant Walkthrough</span>
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
        {isAuth && (
          <MicrosoftAppLauncher
            open={appLauncherOpen}
            onClose={() => setAppLauncherOpen(false)}
            role={user?.role}
          />
        )}
      </header>
    </>
  );
}
