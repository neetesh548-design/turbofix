/**
 * useAudioRecorder — unit tests.
 *
 * Drives the fake MediaRecorder explicitly so every branch (permission
 * denied, no hardware, empty capture, too short, too long, cleanup) is
 * exercised deterministically rather than by waiting on real timers.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioRecorder, isRecordingSupported } from '../hooks/useAudioRecorder';
import { FakeMediaRecorder, installMediaMocks, type MediaMockHandle } from './helpers/mediaMocks';

describe('useAudioRecorder', () => {
  let media: MediaMockHandle;

  beforeEach(() => {
    media = installMediaMocks({ permission: 'prompt' });
  });

  afterEach(() => {
    media.restore();
    vi.restoreAllMocks();
  });

  /** Start a recording and wait for the recorder to actually be running. */
  async function startRecording(result: { current: ReturnType<typeof useAudioRecorder> }) {
    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.isRecording).toBe(true));
  }

  it('reports the browser as supported when both APIs exist', () => {
    expect(isRecordingSupported()).toBe(true);
  });

  it('starts idle with no recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.status).toBe('idle');
    expect(result.current.recording).toBeNull();
    expect(result.current.durationMs).toBe(0);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.permission).toBe('prompt'));
  });

  it('queries the Permissions API on mount', async () => {
    media.setPermissionState('granted');
    const { result } = renderHook(() => useAudioRecorder());
    await waitFor(() => expect(result.current.permission).toBe('granted'));
    expect(media.permissionQuery).toHaveBeenCalledWith({ name: 'microphone' });
  });

  it('reports a pre-blocked microphone without prompting', async () => {
    media.setPermissionState('denied');
    const { result } = renderHook(() => useAudioRecorder());
    await waitFor(() => expect(result.current.permission).toBe('denied'));
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });

  it('transitions to recording and requests the microphone', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('recording');
    expect(result.current.permission).toBe('granted');
  });

  it('requests noise suppression and echo cancellation for shop-floor noise', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    const constraints = media.getUserMedia.mock.calls[0][0] as {
      audio: { noiseSuppression: boolean; echoCancellation: boolean };
    };
    expect(constraints.audio.noiseSuppression).toBe(true);
    expect(constraints.audio.echoCancellation).toBe(true);
  });

  it('produces a playable recording once stopped', async () => {
    const onRecordingComplete = vi.fn();
    const { result } = renderHook(() => useAudioRecorder({ onRecordingComplete }));
    await startRecording(result);

    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 3000);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });

    await waitFor(() => expect(result.current.status).toBe('recorded'));
    expect(result.current.recording?.blob.size).toBeGreaterThan(512);
    expect(result.current.recording?.url).toMatch(/^blob:/);
    expect(onRecordingComplete).toHaveBeenCalledTimes(1);
  });

  it('stops every microphone track so the recording indicator switches off', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });

    await waitFor(() =>
      expect(media.stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true)
    );
  });

  it('reports `permission` when the operator dismisses the browser prompt', async () => {
    const onError = vi.fn();
    media.denyWith('NotAllowedError');
    const { result } = renderHook(() => useAudioRecorder({ onError }));

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => expect(result.current.error).toBe('permission'));
    expect(result.current.permission).toBe('denied');
    expect(result.current.status).toBe('error');
    expect(onError).toHaveBeenCalledWith('permission');
  });

  it('distinguishes missing hardware from a refusal', async () => {
    media.denyWith('NotFoundError');
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => expect(result.current.error).toBe('unsupported'));
    expect(result.current.permission).toBe('unsupported');
  });

  it('rejects an empty capture instead of sending silence for transcription', async () => {
    const onRecordingComplete = vi.fn();
    const { result } = renderHook(() => useAudioRecorder({ onRecordingComplete }));
    await startRecording(result);

    // Stop without ever emitting a data chunk.
    await act(async () => {
      FakeMediaRecorder.last?.stop();
    });

    await waitFor(() => expect(result.current.error).toBe('audio-too-short'));
    expect(result.current.recording).toBeNull();
    expect(onRecordingComplete).not.toHaveBeenCalled();
  });

  it('rejects a recording shorter than the minimum duration', async () => {
    const start = performance.now();
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(start);
    const { result } = renderHook(() =>
      useAudioRecorder({ rules: { minDurationMs: 2000, maxDurationMs: 60_000, minBytes: 512 } })
    );
    await startRecording(result);

    nowSpy.mockReturnValue(start + 300);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });

    await waitFor(() => expect(result.current.error).toBe('audio-too-short'));
    expect(result.current.recording).toBeNull();
  });

  it('rejects a recording longer than the maximum duration', async () => {
    const start = performance.now();
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(start);
    const { result } = renderHook(() =>
      useAudioRecorder({ rules: { minDurationMs: 1000, maxDurationMs: 5000, minBytes: 512 } })
    );
    await startRecording(result);

    nowSpy.mockReturnValue(start + 9000);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });

    await waitFor(() => expect(result.current.error).toBe('audio-too-long'));
  });

  it('auto-stops a runaway recording at the maximum duration', async () => {
    vi.useFakeTimers();
    try {
      const start = performance.now();
      const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(start);
      const { result } = renderHook(() =>
        useAudioRecorder({ rules: { minDurationMs: 500, maxDurationMs: 3000, minBytes: 512 } })
      );

      await act(async () => {
        await result.current.start();
      });
      expect(FakeMediaRecorder.last?.state).toBe('recording');

      // Advance past the cap; the internal 200 ms tick should stop us.
      nowSpy.mockReturnValue(start + 3500);
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(FakeMediaRecorder.last?.state).toBe('inactive');
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces a recorder hardware error', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    await act(async () => {
      FakeMediaRecorder.last?.raiseError();
    });

    await waitFor(() => expect(result.current.error).toBe('unknown'));
  });

  it('reset() discards the take and returns to idle for a re-record', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);
    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 3000);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });
    await waitFor(() => expect(result.current.recording).not.toBeNull());

    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    act(() => {
      result.current.reset();
    });

    expect(result.current.recording).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.durationMs).toBe(0);
    expect(result.current.error).toBeNull();
    expect(revoke).toHaveBeenCalled();
  });

  it('a second start() replaces the previous take rather than stacking', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);
    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 3000);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });
    await waitFor(() => expect(result.current.recording).not.toBeNull());

    await startRecording(result);
    expect(result.current.recording).toBeNull();
    expect(media.getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('ignores a second start() while already recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    await act(async () => {
      await result.current.start();
    });

    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('computes progress toward the maximum duration', async () => {
    const start = performance.now();
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(start);
    const { result } = renderHook(() =>
      useAudioRecorder({ rules: { minDurationMs: 500, maxDurationMs: 10_000, minBytes: 512 } })
    );
    await startRecording(result);

    nowSpy.mockReturnValue(start + 5000);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });

    await waitFor(() => expect(result.current.progress).toBeCloseTo(0.5, 1));
  });

  it('releases the microphone when the component unmounts mid-recording', async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    unmount();

    expect(media.stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
  });

  it('drives the attached live-speech provider through the recording lifecycle', async () => {
    const liveProvider = {
      startLiveCapture: vi.fn(),
      stopLiveCapture: vi.fn(),
      reset: vi.fn(),
      liveTranscript: 'motor is overheating',
      isListening: true,
    };
    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useAudioRecorder({ liveProvider: liveProvider as any, languageCode: 'hi-IN' })
    );
    await startRecording(result);

    expect(liveProvider.startLiveCapture).toHaveBeenCalledWith('hi-IN');

    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 3000);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });

    await waitFor(() => expect(liveProvider.stopLiveCapture).toHaveBeenCalled());
    expect(result.current.liveTranscript).toBe('motor is overheating');
  });
});

describe('useAudioRecorder in an unsupported browser', () => {
  it('reports unsupported when MediaRecorder is missing', async () => {
    const originalRecorder = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    delete (window as unknown as Record<string, unknown>).MediaRecorder;

    try {
      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.isSupported).toBe(false);
      await waitFor(() => expect(result.current.permission).toBe('unsupported'));

      await act(async () => {
        await result.current.start();
      });
      expect(result.current.error).toBe('unsupported');
    } finally {
      (globalThis as { MediaRecorder?: unknown }).MediaRecorder = originalRecorder;
      (window as unknown as Record<string, unknown>).MediaRecorder = originalRecorder;
      if (originalDevices) Object.defineProperty(navigator, 'mediaDevices', originalDevices);
    }
  });
});
