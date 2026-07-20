import { describe, it, expect } from 'vitest';
import { translations } from '../translations.js';

describe('Translations', () => {
  const locales = Object.keys(translations);
  const enKeys = Object.keys(translations.en);

  it('should have en, hi, and mr locales', () => {
    expect(locales).toContain('en');
    expect(locales).toContain('hi');
    expect(locales).toContain('mr');
  });

  it('all locales should have the same keys as English', () => {
    for (const locale of locales) {
      const localeKeys = Object.keys(translations[locale]);
      const missingKeys = enKeys.filter(k => !localeKeys.includes(k));
      expect(missingKeys, `Locale "${locale}" is missing keys: ${missingKeys.join(', ')}`).toHaveLength(0);
    }
  });

  it('no translation value should be empty', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(translations[locale])) {
        expect(value, `${locale}.${key} is empty`).toBeTruthy();
        expect(typeof value, `${locale}.${key} is not a string`).toBe('string');
      }
    }
  });

  it('English keys should not contain Devanagari text', () => {
    for (const [key, value] of Object.entries(translations.en)) {
      const hasDevanagari = /[\u0900-\u097F]/.test(value);
      expect(hasDevanagari, `en.${key} contains Devanagari characters: "${value}"`).toBe(false);
    }
  });

  it('Hindi and Marathi should primarily contain Devanagari text', () => {
    const sampleKeys = ['hero.title1', 'problem.title', 'how.title', 'cta.title'];
    for (const key of sampleKeys) {
      for (const locale of ['hi', 'mr']) {
        const value = translations[locale][key];
        const hasDevanagari = /[\u0900-\u097F]/.test(value);
        expect(hasDevanagari, `${locale}.${key} should contain Devanagari: "${value}"`).toBe(true);
      }
    }
  });

  it('nav keys should exist in all locales', () => {
    const navKeys = enKeys.filter(k => k.startsWith('nav.'));
    expect(navKeys.length).toBeGreaterThanOrEqual(5);
    for (const locale of locales) {
      for (const key of navKeys) {
        expect(translations[locale][key], `${locale} missing ${key}`).toBeDefined();
      }
    }
  });

  it('menu keys should exist in all locales', () => {
    const menuKeys = enKeys.filter(k => k.startsWith('menu.'));
    expect(menuKeys.length).toBeGreaterThanOrEqual(8);
    for (const locale of locales) {
      for (const key of menuKeys) {
        expect(translations[locale][key], `${locale} missing ${key}`).toBeDefined();
      }
    }
  });
});
