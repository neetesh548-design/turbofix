/**
 * Browser Web Speech API provider — the secondary/backup transcription path.
 *
 * IMPORTANT CONSTRAINT: `SpeechRecognition` cannot transcribe a recorded
 * Blob. It only listens to a live microphone. So this provider does not
 * transcribe on demand — instead it runs *alongside* MediaRecorder during
 * capture and buffers whatever the browser recognized. `transcribe()` then
 * returns that buffered text.
 *
 * Practical effect: if the cloud call fails after the operator has already
 * spoken, we can still hand them a draft instead of making them re-record.
 *
 * A second caveat worth stating plainly: this is NOT a true offline engine.
 * Chrome streams Web Speech audio to Google's servers; only Safari/iOS uses
 * on-device dictation. `offlineCapable` is therefore false, and genuine
 * offline handling is the manual-text-entry fallback in the UI.
 */

import {
  SpeechToTextError,
  type SpeechProvider,
  type TranscriptionRequest,
  type TranscriptionResult,
} from './types';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Resolve the vendor-prefixed constructor, if this browser has one. */
export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  const w = globalThis as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export class WebSpeechProvider implements SpeechProvider {
  readonly id = 'web-speech-api';
  /** See the file header — Chrome routes this through the network. */
  readonly offlineCapable = false;

  #recognition: SpeechRecognitionLike | null = null;
  #finalTranscript = '';
  #interimTranscript = '';
  #bestConfidence: number | undefined;
  #languageCode = '';
  #listening = false;

  isAvailable(): boolean {
    return Boolean(getSpeechRecognitionCtor()) && this.#bufferedText().length > 0;
  }

  /** True when this browser can run live capture at all. */
  static isSupported(): boolean {
    return Boolean(getSpeechRecognitionCtor());
  }

  /** Text recognized so far — final results plus the in-flight interim one. */
  #bufferedText(): string {
    return `${this.#finalTranscript} ${this.#interimTranscript}`.trim();
  }

  /** Live transcript for display while the operator is still speaking. */
  get liveTranscript(): string {
    return this.#bufferedText();
  }

  get isListening(): boolean {
    return this.#listening;
  }

  /**
   * Begin live recognition. Safe to call when unsupported — it simply
   * no-ops so callers never have to feature-detect at the call site.
   * Never throws: a failure here must not abort the MediaRecorder capture,
   * which is the path that actually matters.
   */
  startLiveCapture(languageCode: string): void {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || this.#listening) return;

    this.reset();
    this.#languageCode = languageCode;

    try {
      const recognition = new Ctor();
      recognition.lang = languageCode;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const alternative = result?.[0];
          if (!alternative) continue;
          if (result.isFinal) {
            this.#finalTranscript = `${this.#finalTranscript} ${alternative.transcript}`.trim();
            const confidence = Number(alternative.confidence);
            if (Number.isFinite(confidence) && confidence > 0) {
              this.#bestConfidence = Math.max(this.#bestConfidence ?? 0, confidence);
            }
          } else {
            interim += alternative.transcript;
          }
        }
        this.#interimTranscript = interim.trim();
      };

      // Recognition errors are non-fatal by design: the recorded audio is
      // still going to the cloud provider, which is the primary path.
      recognition.onerror = () => {
        this.#listening = false;
      };
      recognition.onend = () => {
        this.#listening = false;
      };

      recognition.start();
      this.#recognition = recognition;
      this.#listening = true;
    } catch {
      this.#listening = false;
      this.#recognition = null;
    }
  }

  /** Stop recognition, keeping whatever was buffered. */
  stopLiveCapture(): void {
    this.#listening = false;
    try {
      this.#recognition?.stop();
    } catch {
      /* already stopped */
    }
    this.#recognition = null;
  }

  /** Stop recognition and discard the buffer (used when re-recording). */
  reset(): void {
    this.#listening = false;
    try {
      this.#recognition?.abort();
    } catch {
      /* already stopped */
    }
    this.#recognition = null;
    this.#finalTranscript = '';
    this.#interimTranscript = '';
    this.#bestConfidence = undefined;
  }

  /**
   * Return the transcript captured live during recording.
   *
   * The `blob` on the request is deliberately unused — see the file header.
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    if (request.signal?.aborted) {
      throw new SpeechToTextError('aborted', 'Transcription cancelled.', {
        provider: this.id,
      });
    }
    if (!WebSpeechProvider.isSupported()) {
      throw new SpeechToTextError(
        'unsupported',
        'This browser does not support on-device speech recognition.',
        { provider: this.id }
      );
    }

    const text = this.#bufferedText();
    if (!text) {
      throw new SpeechToTextError('no-speech', 'No speech was detected in the recording.', {
        provider: this.id,
      });
    }

    return {
      text,
      languageCode: this.#languageCode || request.languageCode,
      confidence: this.#bestConfidence,
      provider: this.id,
      offlineCapable: false,
    };
  }
}
