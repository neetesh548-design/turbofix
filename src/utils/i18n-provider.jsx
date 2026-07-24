/**
 * I18n React Provider Component
 * Separated from i18n.js to avoid JSX in .js files
 */

import React from 'react';
import { i18n } from './i18n';

// React context for i18n
export const I18nContext = React.createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguage] = React.useState(i18n.getLanguage());

  React.useEffect(() => {
    const unsubscribe = i18n.onChange(setLanguage);
    return unsubscribe;
  }, []);

  const value = {
    language,
    setLanguage: (lang) => i18n.setLanguage(lang),
    t: (key, params) => i18n.t(key, params),
    isRTL: () => i18n.isRTL()
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return context;
}
