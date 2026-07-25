/**
 * Cloud transcription via the existing `ai_translation` Supabase edge function.
 *
 * This is the primary provider: it is the only one that reliably handles the
 * Indic languages the shop floor actually speaks (Hindi, Marathi) as well as
 * the wider locale set, and it works from a recorded Blob rather than
 * requiring a live microphone.
 */

import { supabase } from '../../supabaseClient';
import { blobToDataUrl, normalizeTranscriptionError } from './audioUtils';
import {
  SpeechToTextError,
  type SpeechProvider,
  type TranscriptionRequest,
  type TranscriptionResult,
} from './types';

/** Minimal shape of the Supabase functions client we depend on. */
export interface FunctionsInvoker {
  invoke(
    name: string,
    options: { body: unknown }
  ): Promise<{ data?: unknown; error?: { message?: string } | null }>;
}

export interface SupabaseSpeechProviderOptions {
  /** Injected for tests; defaults to the app's shared Supabase client. */
  readonly functions?: FunctionsInvoker;
  /** Edge function name. */
  readonly functionName?: string;
  /** Retries for transient transport failures (default 2). */
  readonly maxRetries?: number;
  /** Base backoff in ms, doubled per attempt (default 800). */
  readonly retryBaseMs?: number;
  /** Injected for tests so backoff does not really sleep. */
  readonly sleep?: (ms: number) => Promise<void>;
}

interface TranscribeResponse {
  transcript?: unknown;
  language_code?: unknown;
  confidence?: unknown;
  error?: unknown;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class SupabaseSpeechProvider implements SpeechProvider {
  readonly id = 'supabase-ai-translation';
  readonly offlineCapable = false;

  readonly #functions: FunctionsInvoker;
  readonly #functionName: string;
  readonly #maxRetries: number;
  readonly #retryBaseMs: number;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(options: SupabaseSpeechProviderOptions = {}) {
    this.#functions = options.functions ?? (supabase.functions as FunctionsInvoker);
    this.#functionName = options.functionName ?? 'ai_translation';
    this.#maxRetries = options.maxRetries ?? 2;
    this.#retryBaseMs = options.retryBaseMs ?? 800;
    this.#sleep = options.sleep ?? defaultSleep;
  }

  /** Cloud transcription needs a network; nothing else to probe. */
  isAvailable(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const { blob, languageCode, signal } = request;
    const dataUrl = await blobToDataUrl(blob, signal);

    const data = await this.#invokeWithRetry(
      {
        action: 'transcribe',
        audio: dataUrl,
        language_code: languageCode,
      },
      signal
    );

    const text = String(data.transcript ?? '').trim();
    if (!text) {
      throw new SpeechToTextError('no-speech', 'No speech was detected in the recording.', {
        provider: this.id,
      });
    }

    const rawConfidence = Number(data.confidence);

    return {
      text,
      languageCode: String(data.language_code || languageCode),
      confidence: Number.isFinite(rawConfidence) ? rawConfidence : undefined,
      provider: this.id,
      offlineCapable: false,
    };
  }

  /**
   * Invoke the edge function, retrying only failures that could plausibly
   * succeed on a second attempt. A `not-configured` backend is terminal —
   * retrying it just makes the operator wait longer for the same error.
   */
  async #invokeWithRetry(body: unknown, signal?: AbortSignal): Promise<TranscribeResponse> {
    let lastError: SpeechToTextError | null = null;

    for (let attempt = 0; attempt <= this.#maxRetries; attempt += 1) {
      if (signal?.aborted) {
        throw new SpeechToTextError('aborted', 'Transcription cancelled.', {
          provider: this.id,
        });
      }

      try {
        const { data, error } = await this.#functions.invoke(this.#functionName, { body });
        const payload = (data ?? {}) as TranscribeResponse;

        if (error) {
          throw normalizeTranscriptionError(error, this.id);
        }
        if (payload.error) {
          throw normalizeTranscriptionError(
            new Error(String(payload.error)),
            this.id
          );
        }
        return payload;
      } catch (err) {
        lastError = normalizeTranscriptionError(err, this.id);
        const isLastAttempt = attempt === this.#maxRetries;
        if (!lastError.retryable || isLastAttempt) throw lastError;
        await this.#sleep(this.#retryBaseMs * 2 ** attempt);
      }
    }

    throw lastError ?? new SpeechToTextError('unknown', 'Transcription failed.', {
      provider: this.id,
    });
  }
}
