/**
 * Ant Design Locale Bridge
 * Maps TurboFix's i18n system to Ant Design's built-in locales
 * Ensures consistent translation across both systems
 */

import enUS from 'antd/locale/en_US';
import esES from 'antd/locale/es_ES';
import frFR from 'antd/locale/fr_FR';
import deDE from 'antd/locale/de_DE';
import ptBR from 'antd/locale/pt_BR';
import jaJP from 'antd/locale/ja_JP';
import zhCN from 'antd/locale/zh_CN';
import arEG from 'antd/locale/ar_EG';
import hiIN from 'antd/locale/hi_IN';

/**
 * Map of TurboFix language codes to Ant Design locale objects
 * Each entry combines Ant Design's default locale with TurboFix customizations
 */
export const antdLocaleMap = {
  en: enUS,
  es: esES,
  fr: frFR,
  de: deDE,
  pt: ptBR,
  ja: jaJP,
  zh: zhCN,
  ar: arEG,
  hi: hiIN,
};

/**
 * Get the Ant Design locale object for a given language
 * @param {string} languageCode - TurboFix language code (e.g., 'en', 'es')
 * @returns {Object} Ant Design locale object
 */
export const getAntDLocale = (languageCode) => {
  return antdLocaleMap[languageCode] || antdLocaleMap.en;
};

/**
 * Custom Ant Design locale extensions for TurboFix
 * These override/extend Ant Design's defaults with TurboFix-specific strings
 */
export const antdLocaleExtensions = {
  en: {
    // Extend Ant Design's English locale
    ...enUS,
    locale: 'en',
    Pagination: {
      ...enUS.Pagination,
      items_per_page: 'per page',
    },
    Modal: {
      ...enUS.Modal,
      okText: 'Confirm',
      cancelText: 'Cancel',
    },
    Table: {
      ...enUS.Table,
      filterTitle: 'Filter',
      filterConfirm: 'OK',
      filterReset: 'Reset',
      selectAll: 'Select current page',
      selectInvert: 'Invert current page',
      selectionAll: 'Select all data',
      sorterTitle: 'Sort',
      expand: 'Expand row',
      collapse: 'Collapse row',
      triggerDesc: 'Click sort descending',
      triggerAsc: 'Click sort ascending',
      cancelSort: 'Click to cancel sorting',
    },
  },
  es: {
    ...esES,
    locale: 'es',
  },
  fr: {
    ...frFR,
    locale: 'fr',
  },
  de: {
    ...deDE,
    locale: 'de',
  },
  pt: {
    ...ptBR,
    locale: 'pt',
  },
  ja: {
    ...jaJP,
    locale: 'ja',
  },
  zh: {
    ...zhCN,
    locale: 'zh',
  },
  ar: {
    ...arEG,
    locale: 'ar',
  },
  hi: {
    ...hiIN,
    locale: 'hi',
  },
};

/**
 * Get extended Ant Design locale with TurboFix customizations
 * @param {string} languageCode - TurboFix language code
 * @returns {Object} Extended Ant Design locale
 */
export const getExtendedAntDLocale = (languageCode) => {
  return antdLocaleExtensions[languageCode] || antdLocaleExtensions.en;
};

/**
 * Translation key mappings from TurboFix to Ant Design component props
 * Used to override Ant Design's built-in text with TurboFix translations
 */
export const turboFixToAntDKeys = {
  // Common translations
  'common.save': 'okText',
  'common.cancel': 'cancelText',
  'common.delete': 'deleteText',
  'common.close': 'closeText',

  // Modal-specific
  'modal.confirm': 'okText',
  'modal.cancel': 'cancelText',

  // Table-specific
  'table.filter': 'filterTitle',
  'table.reset': 'filterReset',

  // Form-specific
  'form.submit': 'okText',
  'form.reset': 'resetText',

  // Pagination-specific
  'pagination.previous': 'prevPage',
  'pagination.next': 'nextPage',
};

/**
 * Bridge function to translate Ant Design component props using TurboFix's i18n
 * @param {Object} i18nManager - TurboFix's i18n manager instance
 * @param {Object} componentProps - Ant Design component props
 * @param {Array} translationKeys - Array of {antdProp, i18nKey} mappings
 * @returns {Object} Updated component props with TurboFix translations
 */
export const bridgeAntDTranslations = (i18nManager, componentProps = {}, translationKeys = []) => {
  const bridgedProps = { ...componentProps };

  translationKeys.forEach(({ antdProp, i18nKey }) => {
    if (i18nKey) {
      bridgedProps[antdProp] = i18nManager.t(i18nKey);
    }
  });

  return bridgedProps;
};

/**
 * Hook to get Ant Design locale and apply TurboFix i18n
 * Should be used inside components wrapped by ConfigProvider
 *
 * @example
 * const locale = useAntDLocale(); // Gets locale from i18n
 * <ConfigProvider locale={locale}>
 *   <App />
 * </ConfigProvider>
 */
export const getAntDLocaleFromI18n = (i18nManager) => {
  const currentLanguage = i18nManager.getLanguage();
  return getExtendedAntDLocale(currentLanguage);
};
