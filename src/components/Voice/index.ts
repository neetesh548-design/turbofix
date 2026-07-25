/**
 * Voice capture module — public surface.
 */

export { VoiceRecorder, default as VoiceRecorderDefault } from './VoiceRecorder';
export type { VoiceRecorderProps, VoiceTranscriptionPayload } from './VoiceRecorder';

export { AudioPlayback } from './AudioPlayback';
export type { AudioPlaybackProps } from './AudioPlayback';

export {
  SUPPORTED_VOICE_LOCALES,
  createVoiceTranslator,
  getVoiceStrings,
  isRtlLocale,
  resolveVoiceLocale,
  type VoiceLocale,
  type VoiceStringKey,
  type VoiceStrings,
} from './voiceI18n';
