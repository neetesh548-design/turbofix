/**
 * Voice i18n catalog — completeness, locale resolution, and RTL tests.
 *
 * The completeness check is the important one: a missing key on a shop floor
 * in Pune means an operator sees a raw identifier instead of an instruction.
 */

import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_VOICE_LOCALES,
  createVoiceTranslator,
  getVoiceStrings,
  isRtlLocale,
  resolveVoiceLocale,
  type VoiceLocale,
} from '../components/Voice/voiceI18n';

/** The 9 platform languages, plus Marathi for the Pune-belt QR Gateway. */
const REQUIRED_LOCALES: readonly VoiceLocale[] = [
  'en-US',
  'hi-IN',
  'es-ES',
  'fr-FR',
  'de-DE',
  'pt-BR',
  'ru-RU',
  'zh-CN',
  'ar-SA',
  'mr-IN',
];

describe('voice i18n catalog', () => {
  it('covers all 9 platform languages plus Marathi', () => {
    for (const locale of REQUIRED_LOCALES) {
      expect(SUPPORTED_VOICE_LOCALES).toContain(locale);
    }
  });

  it('defines every key in every locale, with no empty strings', () => {
    const englishKeys = Object.keys(getVoiceStrings('en-US')).sort();
    expect(englishKeys.length).toBeGreaterThan(20);

    for (const locale of SUPPORTED_VOICE_LOCALES) {
      const strings = getVoiceStrings(locale);
      expect(Object.keys(strings).sort(), `${locale} key set`).toEqual(englishKeys);
      for (const key of englishKeys) {
        expect(
          String(strings[key as keyof typeof strings]).trim().length,
          `${locale}.${key} must not be empty`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('actually translates rather than copying English into every locale', () => {
    const english = getVoiceStrings('en-US');
    for (const locale of SUPPORTED_VOICE_LOCALES) {
      if (locale === 'en-US') continue;
      expect(getVoiceStrings(locale).tapToRecord, locale).not.toBe(english.tapToRecord);
    }
  });
});

describe('resolveVoiceLocale', () => {
  it('accepts canonical BCP-47 tags', () => {
    expect(resolveVoiceLocale('hi-IN')).toBe('hi-IN');
    expect(resolveVoiceLocale('pt-BR')).toBe('pt-BR');
  });

  it('accepts the short codes used by the main app LanguageContext', () => {
    expect(resolveVoiceLocale('hi')).toBe('hi-IN');
    expect(resolveVoiceLocale('ar')).toBe('ar-SA');
    expect(resolveVoiceLocale('zh')).toBe('zh-CN');
  });

  it('is case- and separator-insensitive', () => {
    expect(resolveVoiceLocale('HI_in')).toBe('hi-IN');
    expect(resolveVoiceLocale('EN-us')).toBe('en-US');
  });

  it('maps an unlisted regional variant onto its base language', () => {
    expect(resolveVoiceLocale('es-MX')).toBe('es-ES');
    expect(resolveVoiceLocale('pt-PT')).toBe('pt-BR');
    expect(resolveVoiceLocale('ar-EG')).toBe('ar-SA');
  });

  it('falls back to English for unknown, empty, or nullish input', () => {
    expect(resolveVoiceLocale('kl-GL')).toBe('en-US');
    expect(resolveVoiceLocale('')).toBe('en-US');
    expect(resolveVoiceLocale(undefined)).toBe('en-US');
    expect(resolveVoiceLocale(null)).toBe('en-US');
  });
});

describe('isRtlLocale', () => {
  it('identifies Arabic as right-to-left', () => {
    expect(isRtlLocale('ar-SA')).toBe(true);
    expect(isRtlLocale('ar')).toBe(true);
  });

  it('treats the other supported languages as left-to-right', () => {
    for (const locale of SUPPORTED_VOICE_LOCALES) {
      if (locale.startsWith('ar')) continue;
      expect(isRtlLocale(locale), locale).toBe(false);
    }
  });

  it('handles nullish input without throwing', () => {
    expect(isRtlLocale(undefined)).toBe(false);
    expect(isRtlLocale(null)).toBe(false);
  });
});

describe('createVoiceTranslator', () => {
  it('returns localized copy for the requested locale', () => {
    expect(createVoiceTranslator('hi-IN')('reRecord')).toBe('दोबारा रिकॉर्ड करें');
    expect(createVoiceTranslator('de-DE')('reRecord')).toBe('Neu aufnehmen');
  });

  it('resolves short codes the same way as full tags', () => {
    expect(createVoiceTranslator('fr')('retry')).toBe(createVoiceTranslator('fr-FR')('retry'));
  });

  it('falls back to English copy for an unknown locale', () => {
    expect(createVoiceTranslator('xx-XX')('reRecord')).toBe('Re-record');
  });
});
