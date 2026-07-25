/**
 * useAudioRecorder — microphone capture for the QR Gateway voice flow.
 *
 * Owns everything the UI should not have to think about:
 *   - capability detection (getUserMedia + MediaRecorder)
 *   - permission querying and the denied/prompt/granted lifecycle
 *   - MediaRecorder start/stop and chunk assembly
 *   - a live duration timer with a hard max-length auto-stop
 *   - min/max length validation before the recording is offered upstream
 *   - object-URL and MediaStream cleanup (the mic indicator must go off)
 *   - optional live Web Speech capture running alongside, so a failed cloud
 *     call still has a draft transcript to fall back on
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickRecorderMimeType } from '../services/speech/audioUtils';
import {
  DEFAULT_VALIDATION_RULES,
  validateRecording,
  type AudioValidationRules,
  type MicPermissionState,
  type RecorderStatus,
  type SpeechErrorCode,
} from '../services/speech/types';
import type { WebSpeechProvider } from '../services/speech/WebSpeechProvider';

/** A finished, validated recording. */
export interface Recording {
  readonly blob: Blob;
  /** Object URL for `<audio src>`. Revoked automatically on reset/unmount. */
  readonly url: string;
  readonly durationMs: number;
  readonly mimeType: string;
}

export interface UseAudioRecorderOptions {
  /** Length/size bounds. Defaults to 1s–60s, min 512 bytes. */
  readonly rules?: AudioValidationRules;
  /** BCP-47 tag passed to live Web Speech capture. */
  readonly languageCode?: string;
  /** Runs live recognition alongside MediaRecorder when supplied. */
  readonly liveProvider?: WebSpeechProvider | null;
  /** Fired once a valid recording is ready. */
  readonly onRecordingComplete?: (recording: Recording) => void;
  /** Fired when capture or validation fails. */
  readonly onError?: (code: SpeechErrorCode) => void;
}

export interface UseAudioRecorderReturn {
  readonly status: RecorderStatus;
  readonly permission: MicPermissionState;
  readonly recording: Recording | null;
  /** Elapsed ms while recording; final length once stopped. */
  readonly durationMs: number;
  readonly error: SpeechErrorCode | null;
  readonly isRecording: boolean;
  /** False when the browser lacks getUserMedia or MediaRecorder. */
  readonly isSupported: boolean;
  /** Live interim transcript, when a `liveProvider` is attached. */
  readonly liveTranscript: string;
  /** 0–1 progress toward `rules.maxDurationMs`, for the timer ring. */
  readonly progress: number;
  start: () => Promise<void>;
  stop: () => void;
  /** Discard the current recording and return to idle. */
  reset: () => void;
  /** Re-query the Permissions API without prompting. */
  checkPermission: () => Promise<MicPermissionState>;
}

/** Capability probe — safe in jsdom and in non-secure contexts. */
export function isRecordingSupported(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder === 'function';
}

const TIMER_TICK_MS = 200;

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {}
): UseAudioRecorderReturn {
  const {
    rules = DEFAULT_VALIDATION_RULES,
    languageCode = 'en-US',
    liveProvider = null,
    onRecordingComplete,
    onError,
  } = options;

  const supported = useMemo(() => isRecordingSupported(), []);

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [permission, setPermission] = useState<MicPermissionState>(
    supported ? 'unknown' : 'unsupported'
  );
  const [recording, setRecording] = useState<Recording | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<SpeechErrorCode | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Callbacks live in a ref so the recorder's `onstop` closure never goes
  // stale and `start` does not need to be re-created on every parent render.
  const callbacksRef = useRef({ onRecordingComplete, onError });
  callbacksRef.current = { onRecordingComplete, onError };

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Stop every track so the browser's recording indicator switches off. */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* already stopped */
      }
    });
    streamRef.current = null;
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const checkPermission = useCallback(async (): Promise<MicPermissionState> => {
    if (!supported) {
      setPermission('unsupported');
      return 'unsupported';
    }
    // Permissions API is absent on Safari and older Firefox — treat that as
    // 'prompt' rather than an error, since getUserMedia still works there.
    const permissions = navigator.permissions as
      | { query?: (d: { name: string }) => Promise<{ state: string }> }
      | undefined;
    if (typeof permissions?.query !== 'function') {
      setPermission('prompt');
      return 'prompt';
    }
    try {
      const result = await permissions.query({ name: 'microphone' });
      const next: MicPermissionState =
        result.state === 'granted' || result.state === 'denied' ? result.state : 'prompt';
      if (mountedRef.current) setPermission(next);
      return next;
    } catch {
      setPermission('prompt');
      return 'prompt';
    }
  }, [supported]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    setStatus('stopping');
    try {
      recorder.stop();
    } catch {
      /* nothing else to do — onstop will not fire, cleanup runs on reset */
    }
  }, []);

  // Held in a ref so the max-duration timer can auto-stop without making
  // `start` depend on `stop` and re-create itself.
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const reset = useCallback(() => {
    clearTimer();
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      /* already stopped */
    }
    recorderRef.current = null;
    chunksRef.current = [];
    releaseStream();
    revokeUrl();
    liveProvider?.reset();
    setRecording(null);
    setDurationMs(0);
    setError(null);
    setLiveTranscript('');
    setStatus('idle');
  }, [clearTimer, releaseStream, revokeUrl, liveProvider]);

  const fail = useCallback((code: SpeechErrorCode) => {
    setError(code);
    setStatus('error');
    callbacksRef.current.onError?.(code);
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (!supported) {
      setPermission('unsupported');
      fail('unsupported');
      return;
    }
    if (recorderRef.current?.state === 'recording') return;

    // Clear the previous take before asking for the mic again, so a
    // re-record never leaves a stale blob or object URL behind.
    revokeUrl();
    chunksRef.current = [];
    setRecording(null);
    setError(null);
    setDurationMs(0);
    setLiveTranscript('');
    setStatus('requesting-permission');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const name = String((err as { name?: string })?.name ?? '');
      // Everything except an outright missing device means the operator (or
      // a policy) refused us — both dead-end into the manual-entry fallback.
      const code: SpeechErrorCode =
        name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? 'unsupported'
          : 'permission';
      setPermission(code === 'permission' ? 'denied' : 'unsupported');
      fail(code);
      return;
    }

    if (!mountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    setPermission('granted');

    let recorder: MediaRecorder;
    try {
      const mimeType = pickRecorderMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      releaseStream();
      fail('unsupported');
      return;
    }

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      clearTimer();
      const elapsed = startedAtRef.current
        ? Math.round(performance.now() - startedAtRef.current)
        : 0;
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      recorderRef.current = null;
      releaseStream();

      liveProvider?.stopLiveCapture();
      const captured = liveProvider?.liveTranscript ?? '';

      if (!mountedRef.current) return;

      setLiveTranscript(captured);
      setDurationMs(elapsed);

      const validation = validateRecording(blob, elapsed, rules);
      if (!validation.valid) {
        fail(validation.code ?? 'audio-too-short');
        return;
      }

      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const result: Recording = { blob, url, durationMs: elapsed, mimeType };
      setRecording(result);
      setStatus('recorded');
      callbacksRef.current.onRecordingComplete?.(result);
    };

    recorder.onerror = () => {
      clearTimer();
      releaseStream();
      liveProvider?.stopLiveCapture();
      recorderRef.current = null;
      if (mountedRef.current) fail('unknown');
    };

    recorderRef.current = recorder;
    startedAtRef.current = performance.now();

    try {
      recorder.start();
    } catch {
      releaseStream();
      recorderRef.current = null;
      fail('unknown');
      return;
    }

    liveProvider?.startLiveCapture(languageCode);
    setStatus('recording');

    clearTimer();
    timerRef.current = setInterval(() => {
      const elapsed = Math.round(performance.now() - startedAtRef.current);
      setDurationMs(elapsed);
      if (liveProvider) setLiveTranscript(liveProvider.liveTranscript);
      // Hard cap: a runaway recording is a large upload on a shop-floor
      // connection, so stop it ourselves rather than trusting the operator.
      if (elapsed >= rules.maxDurationMs) stopRef.current();
    }, TIMER_TICK_MS);
  }, [
    supported,
    revokeUrl,
    fail,
    clearTimer,
    releaseStream,
    liveProvider,
    languageCode,
    rules,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) clearInterval(timerRef.current);
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {
        /* already stopped */
      }
      streamRef.current?.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          /* already stopped */
        }
      });
      streamRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      liveProvider?.reset();
    };
    // `liveProvider` is a stable singleton from the caller; re-running this
    // on identity change would tear down an in-flight recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Surface the current permission state on mount so the UI can warn about a
  // blocked mic before the operator taps and hits a dead end.
  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  const progress = useMemo(() => {
    if (rules.maxDurationMs <= 0) return 0;
    return Math.min(1, durationMs / rules.maxDurationMs);
  }, [durationMs, rules.maxDurationMs]);

  return {
    status,
    permission,
    recording,
    durationMs,
    error,
    isRecording: status === 'recording',
    isSupported: supported,
    liveTranscript,
    progress,
    start,
    stop,
    reset,
    checkPermission,
  };
}

export default useAudioRecorder;
