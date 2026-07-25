/**
 * Audio helpers shared by the speech providers.
 */

import { SpeechToTextError } from './types';

/**
 * Read a Blob as a `data:` URL.
 *
 * The Supabase edge function accepts base64 payloads, so recordings are
 * inlined rather than uploaded first — this keeps the QR Gateway flow to a
 * single round trip on a shop-floor mobile connection.
 */
export function blobToDataUrl(blob: Blob, signal?: AbortSignal): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new SpeechToTextError('aborted', 'Transcription cancelled.'));
      return;
    }

    const reader = new FileReader();

    const onAbort = () => {
      reader.abort();
      reject(new SpeechToTextError('aborted', 'Transcription cancelled.'));
    };

    reader.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      const result = String(reader.result || '');
      if (!result) {
        reject(new SpeechToTextError('unknown', 'Could not read the recording.'));
        return;
      }
      resolve(result);
    };

    reader.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(
        new SpeechToTextError('unknown', 'Could not read the recording.', {
          cause: reader.error,
        })
      );
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    reader.readAsDataURL(blob);
  });
}

/**
 * Pick a MediaRecorder mimeType this browser actually supports.
 *
 * Order matters: Opus-in-WebM is the smallest and is what Chrome/Firefox
 * prefer; `audio/mp4` is the only option that records on iOS Safari.
 * Returns `undefined` when nothing matches, which tells MediaRecorder to
 * use its own default rather than throwing `NotSupportedError`.
 */
export function pickRecorderMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  const isSupported = (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder
    ?.isTypeSupported;
  if (typeof isSupported !== 'function') return undefined;
  return candidates.find((type) => {
    try {
      return isSupported(type);
    } catch {
      return false;
    }
  });
}

/** Format milliseconds as `m:ss` for the recording timer and playback UI. */
export function formatDuration(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Map an arbitrary thrown value from a transcription backend onto a
 * `SpeechToTextError`, inferring the code from the message when the
 * backend only gives us prose.
 */
export function normalizeTranscriptionError(
  error: unknown,
  provider: string
): SpeechToTextError {
  if (error instanceof SpeechToTextError) return error;

  const message = String(
    (error as { message?: unknown })?.message ?? error ?? ''
  ).trim();

  if (/not configured|api key|secret|missing credential/i.test(message)) {
    return new SpeechToTextError('not-configured', message, { provider, cause: error });
  }
  if (/quota|429|rate.?limit|overloaded|temporarily unavailable/i.test(message)) {
    return new SpeechToTextError('rate-limited', message, { provider, cause: error });
  }
  if (/network|fetch|failed to fetch|timeout|non-2xx|econn/i.test(message)) {
    return new SpeechToTextError('network', message, { provider, cause: error });
  }
  if (/abort|cancel/i.test(message)) {
    return new SpeechToTextError('aborted', message, { provider, cause: error });
  }

  return new SpeechToTextError('unknown', message || 'Transcription failed.', {
    provider,
    cause: error,
  });
}
