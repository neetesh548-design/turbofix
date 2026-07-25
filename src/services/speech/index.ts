/**
 * Speech-to-text service abstraction.
 *
 * Consumers should import from this barrel rather than reaching into
 * individual provider modules, so backends can be swapped without
 * touching component code.
 */

export {
  SpeechToTextError,
  DEFAULT_VALIDATION_RULES,
  validateRecording,
  type AudioValidationResult,
  type AudioValidationRules,
  type MicPermissionState,
  type RecorderStatus,
  type SpeechErrorCode,
  type SpeechProvider,
  type TranscriptionRequest,
  type TranscriptionResult,
} from './types';

export {
  blobToDataUrl,
  formatDuration,
  normalizeTranscriptionError,
  pickRecorderMimeType,
} from './audioUtils';

export { SupabaseSpeechProvider } from './SupabaseSpeechProvider';
export { WebSpeechProvider, getSpeechRecognitionCtor } from './WebSpeechProvider';
export {
  SpeechToTextService,
  speechToTextService,
  type SpeechToTextServiceOptions,
} from './SpeechToTextService';
