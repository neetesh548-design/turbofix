/**
 * SpeechToTextService — provider-agnostic transcription facade.
 *
 * Responsibilities:
 *   1. Validate the recording before spending a network round trip on it.
 *   2. Short-circuit when the device is offline, so the UI can drop straight
 *      to manual text entry instead of waiting out a doomed request.
 *   3. Try each registered provider in order, falling through on failure.
 *   4. Collapse the pile of provider failures into one actionable error.
 *
 * Swapping backends means registering a different `SpeechProvider`. No
 * component imports a provider directly.
 */

import { SupabaseSpeechProvider } from './SupabaseSpeechProvider';
import { WebSpeechProvider } from './WebSpeechProvider';
import {
  DEFAULT_VALIDATION_RULES,
  SpeechToTextError,
  validateRecording,
  type AudioValidationRules,
  type SpeechProvider,
  type TranscriptionRequest,
  type TranscriptionResult,
} from './types';

export interface SpeechToTextServiceOptions {
  /** Providers in priority order. Defaults to [Supabase, WebSpeech]. */
  readonly providers?: readonly SpeechProvider[];
  /** Length/size bounds enforced before any provider is called. */
  readonly validationRules?: AudioValidationRules;
  /** Injected for tests; defaults to `navigator.onLine`. */
  readonly isOnline?: () => boolean;
}

const defaultIsOnline = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false;

export class SpeechToTextService {
  readonly #providers: readonly SpeechProvider[];
  readonly #rules: AudioValidationRules;
  readonly #isOnline: () => boolean;

  constructor(options: SpeechToTextServiceOptions = {}) {
    this.#providers = options.providers ?? [
      new SupabaseSpeechProvider(),
      new WebSpeechProvider(),
    ];
    this.#rules = options.validationRules ?? DEFAULT_VALIDATION_RULES;
    this.#isOnline = options.isOnline ?? defaultIsOnline;
  }

  get providers(): readonly SpeechProvider[] {
    return this.#providers;
  }

  get validationRules(): AudioValidationRules {
    return this.#rules;
  }

  /** True when at least one registered provider works without a network. */
  get hasOfflineProvider(): boolean {
    return this.#providers.some((provider) => provider.offlineCapable);
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const validation = validateRecording(
      request.blob,
      request.durationMs ?? 0,
      this.#rules
    );
    if (!validation.valid) {
      throw new SpeechToTextError(
        validation.code ?? 'audio-too-short',
        validation.code === 'audio-too-long'
          ? 'That recording is too long. Please keep it under a minute.'
          : 'That recording was too short to understand. Please record again.'
      );
    }

    if (!this.#isOnline() && !this.hasOfflineProvider) {
      throw new SpeechToTextError(
        'offline',
        'No network connection. Please type the problem instead.'
      );
    }

    const failures: SpeechToTextError[] = [];

    for (const provider of this.#providers) {
      if (request.signal?.aborted) {
        throw new SpeechToTextError('aborted', 'Transcription cancelled.');
      }
      // Skip network-bound providers while offline rather than waiting for
      // them to time out on a dead connection.
      if (!provider.offlineCapable && !this.#isOnline()) continue;

      let available = false;
      try {
        available = await provider.isAvailable();
      } catch {
        available = false;
      }
      if (!available) continue;

      try {
        return await provider.transcribe(request);
      } catch (err) {
        const failure =
          err instanceof SpeechToTextError
            ? err
            : new SpeechToTextError('unknown', String(err), { provider: provider.id });
        // A cancelled request is the caller's intent, not a provider fault —
        // do not fall through to the next provider.
        if (failure.code === 'aborted') throw failure;
        failures.push(failure);
      }
    }

    throw this.#collapseFailures(failures);
  }

  /**
   * Pick the single most actionable error to show the operator.
   *
   * Priority reflects what the person can actually do about it: a config
   * problem or an empty recording tells them something concrete, whereas
   * a generic "unknown" tells them nothing.
   */
  #collapseFailures(failures: readonly SpeechToTextError[]): SpeechToTextError {
    if (failures.length === 0) {
      return new SpeechToTextError(
        this.#isOnline() ? 'unsupported' : 'offline',
        this.#isOnline()
          ? 'Voice transcription is not available on this device. Please type the problem.'
          : 'No network connection. Please type the problem instead.'
      );
    }

    const priority: readonly string[] = [
      'not-configured',
      'no-speech',
      'rate-limited',
      'network',
      'offline',
      'unsupported',
      'unknown',
    ];
    const ranked = [...failures].sort(
      (a, b) => priority.indexOf(a.code) - priority.indexOf(b.code)
    );
    return ranked[0];
  }
}

/** Shared singleton used by the QR Gateway. */
export const speechToTextService = new SpeechToTextService();
