import { useState, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { i18n, SUPPORTED_LANGUAGES, useI18n } from '../utils/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage, isRTL } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = SUPPORTED_LANGUAGES[language];

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`language-switcher ${isRTL() ? 'rtl' : 'ltr'}`}>
      <button
        className="language-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Change language"
        aria-label={`Current language: ${currentLang.name}`}
      >
        <Globe size={18} />
        <span className="language-code">{language.toUpperCase()}</span>
        <ChevronDown size={16} className={isOpen ? 'open' : ''} />
      </button>

      {isOpen && (
        <div className="language-menu">
          <div className="language-menu-header">
            <span>Select Language</span>
          </div>
          <div className="language-list">
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
              <button
                key={code}
                className={`language-option ${language === code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(code)}
                title={`Switch to ${info.name}`}
              >
                <span className="option-flag">{getFlagEmoji(code)}</span>
                <div className="option-names">
                  <span className="option-name">{info.name}</span>
                  <span className="option-native">{info.nativeName}</span>
                </div>
                {language === code && <span className="active-indicator">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getFlagEmoji(langCode) {
  const flagMap = {
    en: '🇬🇧',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    pt: '🇵🇹',
    ja: '🇯🇵',
    zh: '🇨🇳',
    ar: '🇸🇦',
    hi: '🇮🇳',
  };
  return flagMap[langCode] || '🌐';
}

export function LocalizedText({ keyName, params = {}, fallback = null }) {
  const { t } = useI18n();
  const text = t(keyName, params);

  return text === keyName && fallback ? fallback : text;
}

export function LocalizedDate({ date, format = 'date' }) {
  const { formatDate, formatDateTime, formatTime, formatRelative } = useI18n();

  switch (format) {
    case 'datetime':
      return formatDateTime(date);
    case 'time':
      return formatTime(date);
    case 'relative':
      return formatRelative(date);
    default:
      return formatDate(date);
  }
}

export function LocalizedNumber({ value, format = 'number', currency = 'USD' }) {
  const { formatNumber, formatCurrency, formatPercent, formatCompact } = useI18n();

  switch (format) {
    case 'currency':
      return formatCurrency(value, currency);
    case 'percent':
      return formatPercent(value);
    case 'compact':
      return formatCompact(value);
    default:
      return formatNumber(value);
  }
}

export function DirectionProvider({ children }) {
  const { isRTL } = useI18n();

  return (
    <div className={`direction-provider ${isRTL() ? 'rtl' : 'ltr'}`} dir={isRTL() ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
}

export function LanguageStats() {
  const { language } = useI18n();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const translations = Object.values(SUPPORTED_LANGUAGES).length;
    const keys = Object.keys(i18n.translations[language] || {}).length;

    setStats({
      totalLanguages: translations,
      translatedKeys: keys,
      language: SUPPORTED_LANGUAGES[language].name
    });
  }, [language]);

  if (!stats) return null;

  return (
    <div className="language-stats">
      <div className="stat-item">
        <span className="stat-label">Current Language</span>
        <span className="stat-value">{stats.language}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Available Languages</span>
        <span className="stat-value">{stats.totalLanguages}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Translated Keys</span>
        <span className="stat-value">{stats.translatedKeys}</span>
      </div>
    </div>
  );
}
