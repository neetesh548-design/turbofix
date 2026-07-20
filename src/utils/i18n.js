// Internationalization (i18n) utilities for TurboFix
import React from 'react';

// Supported languages and locales
export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
};

const DEFAULT_LANGUAGE = 'en';

// Translation keys and messages (extensible)
const TRANSLATIONS = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.add': 'Add',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Information',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.machines': 'Machines',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.help': 'Help',

    // Machine Status
    'machine.running': 'Running',
    'machine.idle': 'Idle',
    'machine.alert': 'Alert',
    'machine.maintenance': 'Maintenance',
    'machine.offline': 'Offline',

    // Ticket Status
    'ticket.open': 'Open',
    'ticket.in_progress': 'In Progress',
    'ticket.completed': 'Completed',
    'ticket.cancelled': 'Cancelled',

    // Time
    'time.just_now': 'just now',
    'time.minutes_ago': '{n} minutes ago',
    'time.hours_ago': '{n} hours ago',
    'time.days_ago': '{n} days ago',
    'time.months_ago': '{n} months ago',

    // Messages
    'msg.welcome': 'Welcome to TurboFix',
    'msg.loading_data': 'Loading data...',
    'msg.no_data': 'No data available',
    'msg.confirm_delete': 'Are you sure you want to delete this item?',
  },

  es: {
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.close': 'Cerrar',
    'common.add': 'Añadir',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.warning': 'Advertencia',
    'common.info': 'Información',

    'nav.dashboard': 'Panel de Control',
    'nav.machines': 'Máquinas',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Análisis',
    'nav.settings': 'Configuración',
    'nav.help': 'Ayuda',

    'machine.running': 'En funcionamiento',
    'machine.idle': 'Inactivo',
    'machine.alert': 'Alerta',
    'machine.maintenance': 'Mantenimiento',
    'machine.offline': 'Desconectado',

    'ticket.open': 'Abierto',
    'ticket.in_progress': 'En Progreso',
    'ticket.completed': 'Completado',
    'ticket.cancelled': 'Cancelado',

    'time.just_now': 'hace poco',
    'time.minutes_ago': 'hace {n} minutos',
    'time.hours_ago': 'hace {n} horas',
    'time.days_ago': 'hace {n} días',
    'time.months_ago': 'hace {n} meses',

    'msg.welcome': 'Bienvenido a TurboFix',
    'msg.loading_data': 'Cargando datos...',
    'msg.no_data': 'No hay datos disponibles',
    'msg.confirm_delete': '¿Está seguro de que desea eliminar este elemento?',
  },

  fr: {
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.add': 'Ajouter',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.warning': 'Avertissement',
    'common.info': 'Information',

    'nav.dashboard': 'Tableau de bord',
    'nav.machines': 'Machines',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Analyses',
    'nav.settings': 'Paramètres',
    'nav.help': 'Aide',

    'machine.running': 'En cours d\'exécution',
    'machine.idle': 'Inactif',
    'machine.alert': 'Alerte',
    'machine.maintenance': 'Maintenance',
    'machine.offline': 'Hors ligne',

    'ticket.open': 'Ouvert',
    'ticket.in_progress': 'En cours',
    'ticket.completed': 'Complété',
    'ticket.cancelled': 'Annulé',

    'time.just_now': 'à l\'instant',
    'time.minutes_ago': 'il y a {n} minutes',
    'time.hours_ago': 'il y a {n} heures',
    'time.days_ago': 'il y a {n} jours',
    'time.months_ago': 'il y a {n} mois',

    'msg.welcome': 'Bienvenue sur TurboFix',
    'msg.loading_data': 'Chargement des données...',
    'msg.no_data': 'Aucune donnée disponible',
    'msg.confirm_delete': 'Êtes-vous sûr de vouloir supprimer cet élément?',
  },
};

// i18n Manager Class
class I18nManager {
  constructor() {
    this.currentLanguage = this.getInitialLanguage();
    this.translations = TRANSLATIONS;
    this.listeners = new Set();
  }

  getInitialLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('tf_language');
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      return saved;
    }

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES[browserLang]) {
      return browserLang;
    }

    return DEFAULT_LANGUAGE;
  }

  setLanguage(langCode) {
    if (!SUPPORTED_LANGUAGES[langCode]) {
      console.warn(`Language ${langCode} not supported`);
      return;
    }

    this.currentLanguage = langCode;
    localStorage.setItem('tf_language', langCode);
    this.notifyListeners();

    // Update HTML lang attribute and dir
    document.documentElement.lang = langCode;
    const isRTL = SUPPORTED_LANGUAGES[langCode].rtl;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-dir', isRTL ? 'rtl' : 'ltr');
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getLanguageInfo() {
    return SUPPORTED_LANGUAGES[this.currentLanguage];
  }

  isRTL() {
    return SUPPORTED_LANGUAGES[this.currentLanguage].rtl;
  }

  // Translate a key with optional parameters
  t(key, params = {}) {
    const translations = this.translations[this.currentLanguage] || {};
    let message = translations[key] || key;

    // Replace parameters with HTML escaping (prevent XSS)
    message = message.replace(/\{(\w+)\}/g, (match, param) => {
      const value = params[param];
      if (value === undefined || value === null) return match;

      // HTML escape the parameter value
      const escaped = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      return escaped;
    });

    return message;
  }

  // Bulk translate multiple keys
  tm(keys) {
    const result = {};
    keys.forEach((key) => {
      result[key] = this.t(key);
    });
    return result;
  }

  // Add or update translations
  addTranslations(langCode, translations) {
    if (!this.translations[langCode]) {
      this.translations[langCode] = {};
    }
    this.translations[langCode] = {
      ...this.translations[langCode],
      ...translations
    };
  }

  // Subscribe to language changes
  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentLanguage);
      } catch (err) {
        console.error('Error in i18n listener:', err);
      }
    });
  }
}

export const i18n = new I18nManager();

// Date formatting utilities
export const dateFormatter = {
  formatDate(date, locale = i18n.getLanguage()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale).format(d);
  },

  formatDateTime(date, locale = i18n.getLanguage()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  },

  formatTime(date, locale = i18n.getLanguage()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  },

  formatRelative(date) {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);

    if (diff < 60) {
      return i18n.t('time.just_now');
    }
    if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return i18n.t('time.minutes_ago', { n: minutes });
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return i18n.t('time.hours_ago', { n: hours });
    }
    if (diff < 2592000) {
      const days = Math.floor(diff / 86400);
      return i18n.t('time.days_ago', { n: days });
    }

    const months = Math.floor(diff / 2592000);
    return i18n.t('time.months_ago', { n: months });
  }
};

// Number and currency formatting utilities
export const numberFormatter = {
  formatNumber(value, locale = i18n.getLanguage()) {
    return new Intl.NumberFormat(locale).format(value);
  },

  formatCurrency(value, currency = 'USD', locale = i18n.getLanguage()) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(value);
  },

  formatPercent(value, locale = i18n.getLanguage()) {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 2
    }).format(value / 100);
  },

  formatCompact(value, locale = i18n.getLanguage()) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return this.formatNumber(value, locale);
  }
};

// React hook for i18n
export function useI18n() {
  const [language, setLanguage] = React.useState(i18n.getLanguage());

  React.useEffect(() => {
    const unsubscribe = i18n.onChange((lang) => {
      setLanguage(lang);
    });

    return unsubscribe;
  }, []);

  return {
    language,
    setLanguage: (lang) => i18n.setLanguage(lang),
    t: (key, params) => i18n.t(key, params),
    isRTL: () => i18n.isRTL(),
    formatDate: (date) => dateFormatter.formatDate(date, language),
    formatDateTime: (date) => dateFormatter.formatDateTime(date, language),
    formatTime: (date) => dateFormatter.formatTime(date, language),
    formatRelative: (date) => dateFormatter.formatRelative(date),
    formatNumber: (value) => numberFormatter.formatNumber(value, language),
    formatCurrency: (value, currency) => numberFormatter.formatCurrency(value, currency, language),
    formatPercent: (value) => numberFormatter.formatPercent(value, language)
  };
}

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
