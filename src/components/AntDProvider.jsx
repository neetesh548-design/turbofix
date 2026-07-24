/**
 * Ant Design Provider Component
 * Wraps the app with ConfigProvider for theme, locale, and RTL support
 * Integrates TurboFix's i18n system with Ant Design
 */

import React, { useMemo, useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import { i18n } from '../utils/i18n';
import { generateAntDTheme } from '../config/antd-theme';
import { getExtendedAntDLocale } from '../config/antd-locale-bridge';

export const AntDProvider = ({ children }) => {
  const [language, setLanguage] = useState(i18n.getLanguage());
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('tf_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const unsubscribe = i18n.onChange((lang) => {
      setLanguage(lang);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('tf_theme')) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const theme = useMemo(() => generateAntDTheme(isDark), [isDark]);
  const locale = useMemo(() => getExtendedAntDLocale(language), [language]);

  const isRTL = i18n.isRTL();

  return (
    <ConfigProvider
      theme={theme}
      locale={locale}
      direction={isRTL ? 'rtl' : 'ltr'}
    >
      {children}
    </ConfigProvider>
  );
};

export default AntDProvider;
