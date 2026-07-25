/**
 * SpeechToText service abstraction — unit tests.
 *
 * Covers validation, the provider fallback chain, offline short-circuiting,
 * retry/backoff behaviour, abort handling, and error normalization.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SpeechToTextService,
  SpeechToTextError,
  SupabaseSpeechProvider,
  WebSpeechProvider,
  validateRecording,
  formatDuration,
  blobToDataUrl,
  normalizeTranscriptionError,
  pickRecorderMimeType,
  DEFAULT_VALIDATION_RULES,
  type SpeechErrorCode,
  type SpeechProvider,
  type TranscriptionResult,
} from '../services/speech';
import { makeAudioBlob } from './helpers/mediaMocks';

/** Provider stub that always succeeds with the given text. */
function okProvider(
  id: string,
  text = 'oil leak on line two',
  offlineCapable = false
): SpeechProvider {
  return {
    id,
    offlineCapable,
    isAvailable: () => true,
    transcribe: async (): Promise<TranscriptionResult> => ({
      text,
      languageCode: 'en-US',
      provider: id,
      offlineCapable,
    }),
  };
}

/** Provider stub that always fails with the given code. */
function failProvider(
  id: string,
  code: SpeechErrorCode,
  offlineCapable = false
): SpeechProvider {
  return {
    id,
    offlineCapable,
    isAvailable: () => true,
    transcribe: async () => {
      throw new SpeechToTextError(code, `${id} failed`, { provider: id });
    },
  };
}

const VALID_BLOB = makeAudioBlob(8192);
const VALID_DURATION = 4000;

describe('validateRecording', () => {
  it('accepts a normal recording', () => {
    expect(validateRecording(VALID_BLOB, VALID_DURATION).valid).toBe(true);
  });

  it('rejects a null blob as too short', () => {
    expect(validateRecording(null, 5000)).toEqual({ valid: false, code: 'audio-too-short' });
  });

  it('rejects a blob below the byte floor, catching empty captures', () => {
    expect(validateRecording(makeAudioBlob(10), 5000)).toEqual({
      valid: false,
      code: 'audio-too-short',
    });
  });

  it('rejects a recording below the minimum duration', () => {
    expect(validateRecording(VALID_BLOB, 400)).toEqual({
      valid: false,
      code: 'audio-too-short',
    });
  });

  it('rejects a recording above the maximum duration', () => {
    expect(validateRecording(VALID_BLOB, 90_000)).toEqual({
      valid: false,
      code: 'audio-too-long',
    });
  });

  it('treats an unknown (zero) duration as acceptable, deferring to byte size', () => {
    expect(validateRecording(VALID_BLOB, 0).valid).toBe(true);
  });

  it('honours custom rules', () => {
    const rules = { minDurationMs: 5000, maxDurationMs: 10_000, minBytes: 100 };
    expect(validateRecording(VALID_BLOB, 3000, rules).code).toBe('audio-too-short');
    expect(validateRecording(VALID_BLOB, 7000, rules).valid).toBe(true);
  });

  it('exposes sane defaults', () => {
    expect(DEFAULT_VALIDATION_RULES.minDurationMs).toBe(1000);
    expect(DEFAULT_VALIDATION_RULES.maxDurationMs).toBe(60_000);
  });
});

describe('SpeechToTextError', () => {
  it('marks network and rate-limit failures retryable', () => {
    expect(new SpeechToTextError('network', 'x').retryable).toBe(true);
    expect(new SpeechToTextError('rate-limited', 'x').retryable).toBe(true);
  });

  it('marks configuration and permission failures non-retryable', () => {
    expect(new SpeechToTextError('not-configured', 'x').retryable).toBe(false);
    expect(new SpeechToTextError('permission', 'x').retryable).toBe(false);
    expect(new SpeechToTextError('offline', 'x').retryable).toBe(false);
  });

  it('lets callers override retryability explicitly', () => {
    expect(new SpeechToTextError('network', 'x', { retryable: false }).retryable).toBe(false);
  });
});

describe('SpeechToTextService', () => {
  const request = { blob: VALID_BLOB, languageCode: 'en-US', durationMs: VALID_DURATION };

  it('returns the first available provider result', async () => {
    const service = new SpeechToTextService({
      providers: [okProvider('primary', 'bearing noise')],
      isOnline: () => true,
    });
    const result = await service.transcribe(request);
    expect(result.text).toBe('bearing noise');
    expect(result.provider).toBe('primary');
  });

  it('falls through to the next provider when the first fails', async () => {
    const service = new SpeechToTextService({
      providers: [failProvider('cloud', 'network'), okProvider('backup', 'from backup')],
      isOnline: () => true,
    });
    const result = await service.transcribe(request);
    expect(result.provider).toBe('backup');
    expect(result.text).toBe('from backup');
  });

  it('skips providers whose isAvailable() is false', async () => {
    const unavailable: SpeechProvider = {
      id: 'asleep',
      offlineCapable: false,
      isAvailable: () => false,
      transcribe: vi.fn(),
    };
    const service = new SpeechToTextService({
      providers: [unavailable, okProvider('backup')],
      isOnline: () => true,
    });
    const result = await service.transcribe(request);
    expect(result.provider).toBe('backup');
    expect(unavailable.transcribe).not.toHaveBeenCalled();
  });

  it('treats a provider whose isAvailable() throws as unavailable', async () => {
    const exploding: SpeechProvider = {
      id: 'exploding',
      offlineCapable: false,
      isAvailable: () => {
        throw new Error('probe blew up');
      },
      transcribe: vi.fn(),
    };
    const service = new SpeechToTextService({
      providers: [exploding, okProvider('backup')],
      isOnline: () => true,
    });
    await expect(service.transcribe(request)).resolves.toMatchObject({ provider: 'backup' });
  });

  it('rejects an invalid recording before calling any provider', async () => {
    const provider = okProvider('primary');
    const spy = vi.spyOn(provider, 'transcribe');
    const service = new SpeechToTextService({ providers: [provider], isOnline: () => true });

    await expect(
      service.transcribe({ blob: makeAudioBlob(8192), languageCode: 'en-US', durationMs: 200 })
    ).rejects.toMatchObject({ code: 'audio-too-short' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an over-long recording with audio-too-long', async () => {
    const service = new SpeechToTextService({
      providers: [okProvider('primary')],
      isOnline: () => true,
    });
    await expect(
      service.transcribe({ blob: VALID_BLOB, languageCode: 'en-US', durationMs: 120_000 })
    ).rejects.toMatchObject({ code: 'audio-too-long' });
  });

  it('short-circuits to `offline` when there is no network and no offline provider', async () => {
    const provider = okProvider('cloud');
    const spy = vi.spyOn(provider, 'transcribe');
    const service = new SpeechToTextService({ providers: [provider], isOnline: () => false });

    await expect(service.transcribe(request)).rejects.toMatchObject({ code: 'offline' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('still runs an offline-capable provider while the network is down', async () => {
    const service = new SpeechToTextService({
      providers: [okProvider('cloud'), okProvider('local', 'local text', true)],
      isOnline: () => false,
    });
    const result = await service.transcribe(request);
    expect(result.provider).toBe('local');
  });

  it('reports hasOfflineProvider accurately', () => {
    expect(
      new SpeechToTextService({ providers: [okProvider('cloud')] }).hasOfflineProvider
    ).toBe(false);
    expect(
      new SpeechToTextService({ providers: [okProvider('local', 'x', true)] }).hasOfflineProvider
    ).toBe(true);
  });

  it('surfaces the most actionable failure when every provider fails', async () => {
    const service = new SpeechToTextService({
      providers: [failProvider('a', 'unknown'), failProvider('b', 'not-configured')],
      isOnline: () => true,
    });
    // `not-configured` outranks `unknown`: it tells the operator something real.
    await expect(service.transcribe(request)).rejects.toMatchObject({
      code: 'not-configured',
    });
  });

  it('prefers no-speech over a transport error, since it is the actionable one', async () => {
    const service = new SpeechToTextService({
      providers: [failProvider('a', 'network'), failProvider('b', 'no-speech')],
      isOnline: () => true,
    });
    await expect(service.transcribe(request)).rejects.toMatchObject({ code: 'no-speech' });
  });

  it('reports `unsupported` when no provider is available at all', async () => {
    const service = new SpeechToTextService({ providers: [], isOnline: () => true });
    await expect(service.transcribe(request)).rejects.toMatchObject({ code: 'unsupported' });
  });

  it('does not fall through on abort — cancellation is the caller\'s intent', async () => {
    const controller = new AbortController();
    const second = okProvider('backup');
    const spy = vi.spyOn(second, 'transcribe');
    const aborting: SpeechProvider = {
      id: 'aborting',
      offlineCapable: false,
      isAvailable: () => true,
      transcribe: async () => {
        throw new SpeechToTextError('aborted', 'cancelled');
      },
    };
    const service = new SpeechToTextService({
      providers: [aborting, second],
      isOnline: () => true,
    });

    await expect(
      service.transcribe({ ...request, signal: controller.signal })
    ).rejects.toMatchObject({ code: 'aborted' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const service = new SpeechToTextService({
      providers: [okProvider('primary')],
      isOnline: () => true,
    });
    await expect(
      service.transcribe({ ...request, signal: controller.signal })
    ).rejects.toMatchObject({ code: 'aborted' });
  });
});

describe('SupabaseSpeechProvider', () => {
  const noSleep = async () => {};
  const request = { blob: VALID_BLOB, languageCode: 'hi-IN', durationMs: VALID_DURATION };

  it('returns the trimmed transcript from the edge function', async () => {
    const invoke = vi.fn(async () => ({
      data: { transcript: '  मशीन बंद है  ', language_code: 'hi-IN', confidence: 0.91 },
    }));
    const provider = new SupabaseSpeechProvider({ functions: { invoke }, sleep: noSleep });

    const result = await provider.transcribe(request);
    expect(result.text).toBe('मशीन बंद है');
    expect(result.languageCode).toBe('hi-IN');
    expect(result.confidence).toBeCloseTo(0.91);
    expect(result.offlineCapable).toBe(false);
  });

  it('sends the transcribe action with the language hint and a data URL', async () => {
    const invoke = vi.fn(async () => ({ data: { transcript: 'ok' } }));
    const provider = new SupabaseSpeechProvider({ functions: { invoke }, sleep: noSleep });
    await provider.transcribe(request);

    const [fnName, options] = invoke.mock.calls[0];
    expect(fnName).toBe('ai_translation');
    const body = options.body as { action: string; audio: string; language_code: string };
    expect(body.action).toBe('transcribe');
    expect(body.language_code).toBe('hi-IN');
    expect(body.audio.startsWith('data:')).toBe(true);
  });

  it('raises no-speech for an empty transcript rather than a blank ticket', async () => {
    const invoke = vi.fn(async () => ({ data: { transcript: '   ' } }));
    const provider = new SupabaseSpeechProvider({ functions: { invoke }, sleep: noSleep });
    await expect(provider.transcribe(request)).rejects.toMatchObject({ code: 'no-speech' });
  });

  it('retries transient network failures and succeeds on a later attempt', async () => {
    const invoke = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({ data: { transcript: 'second try' } });
    const provider = new SupabaseSpeechProvider({ functions: { invoke }, sleep: noSleep });

    const result = await provider.transcribe(request);
    expect(result.text).toBe('second try');
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a not-configured backend — the outcome cannot change', async () => {
    const invoke = vi.fn(async () => ({ error: { message: 'OPENAI_API_KEY not configured' } }));
    const provider = new SupabaseSpeechProvider({ functions: { invoke }, sleep: noSleep });

    await expect(provider.transcribe(request)).rejects.toMatchObject({
      code: 'not-configured',
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries and reports the last failure', async () => {
    const invoke = vi.fn(async () => ({ error: { message: 'non-2xx status code' } }));
    const provider = new SupabaseSpeechProvider({
      functions: { invoke },
      sleep: noSleep,
      maxRetries: 2,
    });

    await expect(provider.transcribe(request)).rejects.toMatchObject({ code: 'network' });
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it('maps a quota message onto rate-limited', async () => {
    const invoke = vi.fn(async () => ({ data: { error: 'quota exceeded (429)' } }));
    const provider = new SupabaseSpeechProvider({
      functions: { invoke },
      sleep: noSleep,
      maxRetries: 0,
    });
    await expect(provider.transcribe(request)).rejects.toMatchObject({ code: 'rate-limited' });
  });

  it('is unavailable while the browser reports being offline', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'onLine'
    );
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    try {
      expect(new SupabaseSpeechProvider().isAvailable()).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(Object.getPrototypeOf(navigator), 'onLine', descriptor);
      }
    }
  });
});

describe('WebSpeechProvider', () => {
  class FakeRecognition {
    static instances: FakeRecognition[] = [];
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    started = false;
    constructor() {
      FakeRecognition.instances.push(this);
    }
    start() {
      this.started = true;
    }
    stop() {
      this.started = false;
    }
    abort() {
      this.started = false;
    }
    /** Feed a result the way the browser would. */
    emit(transcript: string, isFinal: boolean, confidence = 0.8) {
      this.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal, length: 1, 0: { transcript, confidence } },
        },
      });
    }
  }

  beforeEach(() => {
    FakeRecognition.instances = [];
    (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRecognition;
  });

  afterEach(() => {
    delete (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it('buffers final results captured during live recording', async () => {
    const provider = new WebSpeechProvider();
    provider.startLiveCapture('en-US');
    FakeRecognition.instances[0].emit('pump is leaking', true);

    expect(provider.liveTranscript).toBe('pump is leaking');
    const result = await provider.transcribe({ blob: VALID_BLOB, languageCode: 'en-US' });
    expect(result.text).toBe('pump is leaking');
    expect(result.provider).toBe('web-speech-api');
  });

  it('includes the in-flight interim result in the live transcript', () => {
    const provider = new WebSpeechProvider();
    provider.startLiveCapture('en-US');
    FakeRecognition.instances[0].emit('the motor is', false);
    expect(provider.liveTranscript).toBe('the motor is');
  });

  it('passes the requested language to the recognizer', () => {
    const provider = new WebSpeechProvider();
    provider.startLiveCapture('hi-IN');
    expect(FakeRecognition.instances[0].lang).toBe('hi-IN');
    expect(FakeRecognition.instances[0].continuous).toBe(true);
  });

  it('reports unavailable until something has actually been recognized', () => {
    const provider = new WebSpeechProvider();
    expect(provider.isAvailable()).toBe(false);
    provider.startLiveCapture('en-US');
    FakeRecognition.instances[0].emit('hello', true);
    expect(provider.isAvailable()).toBe(true);
  });

  it('throws no-speech when nothing was captured', async () => {
    const provider = new WebSpeechProvider();
    await expect(
      provider.transcribe({ blob: VALID_BLOB, languageCode: 'en-US' })
    ).rejects.toMatchObject({ code: 'no-speech' });
  });

  it('discards the buffer on reset, so a re-record does not reuse old text', () => {
    const provider = new WebSpeechProvider();
    provider.startLiveCapture('en-US');
    FakeRecognition.instances[0].emit('old text', true);
    provider.reset();
    expect(provider.liveTranscript).toBe('');
  });

  it('reports unsupported when the browser has no SpeechRecognition', async () => {
    delete (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition;
    const provider = new WebSpeechProvider();
    expect(WebSpeechProvider.isSupported()).toBe(false);
    await expect(
      provider.transcribe({ blob: VALID_BLOB, languageCode: 'en-US' })
    ).rejects.toMatchObject({ code: 'unsupported' });
  });

  it('survives a recognizer that throws on start, so recording is unaffected', () => {
    class ExplodingRecognition extends FakeRecognition {
      start() {
        throw new Error('not allowed');
      }
    }
    (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition = ExplodingRecognition;
    const provider = new WebSpeechProvider();
    expect(() => provider.startLiveCapture('en-US')).not.toThrow();
    expect(provider.isListening).toBe(false);
  });
});

describe('audio utilities', () => {
  it('formats durations as m:ss with zero padding', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5_000)).toBe('0:05');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(600_000)).toBe('10:00');
  });

  it('formats invalid durations as 0:00 rather than NaN', () => {
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(-100)).toBe('0:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('reads a blob as a data URL', async () => {
    const url = await blobToDataUrl(makeAudioBlob(64));
    expect(url.startsWith('data:')).toBe(true);
  });

  it('rejects with `aborted` when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(blobToDataUrl(VALID_BLOB, controller.signal)).rejects.toMatchObject({
      code: 'aborted',
    });
  });

  it('picks a supported recorder mimeType', () => {
    const original = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = {
      isTypeSupported: (type: string) => type === 'audio/mp4',
    };
    expect(pickRecorderMimeType()).toBe('audio/mp4');
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = original;
  });

  it('returns undefined when no MediaRecorder exists, letting the browser decide', () => {
    const original = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    expect(pickRecorderMimeType()).toBeUndefined();
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = original;
  });

  it('classifies backend error prose into actionable codes', () => {
    expect(normalizeTranscriptionError(new Error('API key missing'), 'p').code).toBe(
      'not-configured'
    );
    expect(normalizeTranscriptionError(new Error('429 Too Many Requests'), 'p').code).toBe(
      'rate-limited'
    );
    expect(normalizeTranscriptionError(new Error('Failed to fetch'), 'p').code).toBe('network');
    expect(normalizeTranscriptionError(new Error('the user aborted'), 'p').code).toBe('aborted');
    expect(normalizeTranscriptionError(new Error('weird'), 'p').code).toBe('unknown');
  });

  it('passes an existing SpeechToTextError through unchanged', () => {
    const original = new SpeechToTextError('no-speech', 'silence');
    expect(normalizeTranscriptionError(original, 'p')).toBe(original);
  });
});
