import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { t } = useLanguage();

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
            <span className="brand-name"><span className="brand-turbo">TURBO</span><span className="brand-fix" style={{ color: '#fff' }}>FIX</span></span>
          </Link>
          <p className="footer-tagline">Zero unplanned downtime.</p>
        </div>
        <div className="footer-links">
          <h4>{t('footer.product')}</h4>
          <a href={import.meta.env.BASE_URL + '#how'}>{t('footer.how')}</a>
          <a href={import.meta.env.BASE_URL + '#demo'}>{t('nav.demo')}</a>
          <a href={import.meta.env.BASE_URL + '#trial'}>{t('nav.trial')}</a>
          <a href={import.meta.env.BASE_URL + '#faq'}>{t('footer.faq')}</a>
        </div>
        <div className="footer-links">
          <h4>{t('footer.contact')}</h4>
          <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--brand)', fontWeight: 'bold' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.227 5.227 0 00-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {t('footer.chat')}
          </a>
          <a href={import.meta.env.BASE_URL + '#contact'}><span>{t('footer.callback')}</span></a>
        </div>
      </div>
      <div className="container footer-trust">
        <div className="footer-trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>{t('footer.address')}</span>
        </div>
        <div className="footer-trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/></svg>
          <span>{t('footer.registered')}</span>
        </div>
        <div className="footer-trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
          <span>{t('footer.gstin')}</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>&copy; {year} TurboFix Technologies Pvt. Ltd. {t('footer.rights')}</p>
        <a href="https://turbofix-backend-ehxb.onrender.com/admin" target="_blank" rel="noopener noreferrer" className="team-admin-link" title="TurboFix team — internal">TurboFix team</a>
      </div>
    </footer>
  );
}
