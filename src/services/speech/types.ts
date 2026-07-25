/**
 * Speech-to-Text service — shared types.
 *
 * These types are the contract between the recording layer
 * (useAudioRecorder / VoiceRecorder) and the transcription layer
 * (SpeechToTextService + its providers).
 *
 * Everything here is provider-agnostic on purpose: swapping the cloud
 * backend (Supabase edge function today, Whisper/Deepgram tomorrow)
 * must not require touching component code.
 */

/** Machine-readable failure reasons. UI maps these to localized copy. */
export type SpeechErrorCode =
  | 'offline'          // device has no network and no local engine
  | 'not-configured'   // backend missing API key / secret
  | 'rate-limited'     // quota exhausted or 429 / overloaded
  | 'network'          // transient transport failure
  | 'no-speech'        // request succeeded but produced an empty transcript
  | 'unsupported'      // browser cannot run any provider
  | 'permission'       // microphone access denied
  | 'audio-too-short'  // recording failed min-length validation
  | 'audio-too-long'   // recording failed max-length validation
  | 'aborted'          // caller cancelled the request
  | 'unknown';

/** Error thrown by every provider and by SpeechToTextService itself. */
export class SpeechToTextError extends Error {
  readonly code: SpeechErrorCode;
  /** Whether retrying the same request could plausibly succeed. */
  readonly retryable: boolean;
  /** Provider that produced the failure, when known. */
  readonly provider?: string;

  constructor(
    code: SpeechErrorCode,
    message: string,
    options: { retryable?: boolean; provider?: string; cause?: unknown } = {}
  ) {
    super(message);
    this.name = 'SpeechToTextError';
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
    this.provider = options.provider;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

const RETRYABLE_CODES: ReadonlySet<SpeechErrorCode> = new Set<SpeechErrorCode>([
  'network',
  'rate-limited',
  'no-speech',
  'unknown',
]);

/** A single transcription request. */
export interface TranscriptionRequest {
  /** Recorded audio. Required for cloud providers. */
  readonly blob: Blob;
  /** BCP-47 hint, e.g. `hi-IN`, `en-US`, `ar-SA`. */
  readonly languageCode: string;
  /** Measured recording length in milliseconds (0 when unknown). */
  readonly durationMs?: number;
  /** Aborts an in-flight request (component unmount, re-record). */
  readonly signal?: AbortSignal;
}

/** A successful transcription. */
export interface TranscriptionResult {
  /** Recognized text, already trimmed. Never empty on success. */
  readonly text: string;
  /** Language the provider actually detected, or the requested hint. */
  readonly languageCode: string;
  /** 0–1 when the provider reports it; `undefined` otherwise. */
  readonly confidence?: number;
  /** Identifier of the provider that produced the result. */
  readonly provider: string;
  /** True when produced on-device with no network round trip. */
  readonly offlineCapable: boolean;
}

/**
 * A transcription backend. Providers are tried in registration order;
 * the first one whose `isAvailable()` resolves true gets the request.
 */
export interface SpeechProvider {
  /** Stable identifier, surfaced in results and error reports. */
  readonly id: string;
  /** True when this provider works on-device without a network. */
  readonly offlineCapable: boolean;
  /** Cheap capability probe — must not perform network I/O. */
  isAvailable(): boolean | Promise<boolean>;
  /** Perform the transcription, or throw a `SpeechToTextError`. */
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
}

/** Microphone permission lifecycle, including states the DOM API lacks. */
export type MicPermissionState =
  | 'unknown'      // not yet queried
  | 'prompt'       // will show the browser permission dialog
  | 'granted'
  | 'denied'
  | 'unsupported'; // no getUserMedia / MediaRecorder in this browser

/** Recorder state machine. */
export type RecorderStatus =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'stopping'
  | 'recorded'
  | 'error';

/** Length/size bounds applied before a recording may be transcribed. */
export interface AudioValidationRules {
  /** Reject recordings shorter than this (default 1000 ms). */
  readonly minDurationMs: number;
  /** Auto-stop and reject recordings longer than this (default 60000 ms). */
  readonly maxDurationMs: number;
  /** Reject blobs smaller than this — catches silent/empty captures. */
  readonly minBytes: number;
}

export const DEFAULT_VALIDATION_RULES: AudioValidationRules = {
  minDurationMs: 1000,
  maxDurationMs: 60_000,
  minBytes: 512,
};

/** Result of validating a finished recording. */
export interface AudioValidationResult {
  readonly valid: boolean;
  readonly code?: Extract<SpeechErrorCode, 'audio-too-short' | 'audio-too-long'>;
}

/**
 * Validate a finished recording against `rules`.
 *
 * Duration is authoritative when supplied; byte size is a secondary guard
 * because MediaRecorder can emit a nonzero-length blob containing silence.
 */
export function validateRecording(
  blob: Blob | null,
  durationMs: number,
  rules: AudioValidationRules = DEFAULT_VALIDATION_RULES
): AudioValidationResult {
  if (!blob || blob.size < rules.minBytes) {
    return { valid: false, code: 'audio-too-short' };
  }
  if (durationMs > 0 && durationMs < rules.minDurationMs) {
    return { valid: false, code: 'audio-too-short' };
  }
  if (durationMs > rules.maxDurationMs) {
    return { valid: false, code: 'audio-too-long' };
  }
  return { valid: true };
}
