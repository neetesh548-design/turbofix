/**
 * Test doubles for the media capture APIs jsdom does not implement.
 *
 * jsdom ships neither `MediaRecorder` nor `navigator.mediaDevices`, so every
 * voice test would otherwise only ever exercise the "unsupported browser"
 * branch. These fakes let tests drive the recorder deterministically:
 * `emitData()` and `finish()` are called by the test, not by a timer.
 */

import { vi } from 'vitest';

export class FakeMediaStreamTrack {
  readyState: 'live' | 'ended' = 'live';
  kind = 'audio';
  stop = vi.fn(() => {
    this.readyState = 'ended';
  });
}

export class FakeMediaStream {
  readonly tracks: FakeMediaStreamTrack[];
  constructor(trackCount = 1) {
    this.tracks = Array.from({ length: trackCount }, () => new FakeMediaStreamTrack());
  }
  getTracks(): FakeMediaStreamTrack[] {
    return this.tracks;
  }
  getAudioTracks(): FakeMediaStreamTrack[] {
    return this.tracks;
  }
}

type RecorderState = 'inactive' | 'recording' | 'paused';

/** Minimal MediaRecorder whose lifecycle the test drives explicitly. */
export class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static supportedTypes: string[] = ['audio/webm;codecs=opus', 'audio/webm'];

  static isTypeSupported(type: string): boolean {
    return FakeMediaRecorder.supportedTypes.includes(type);
  }

  static reset(): void {
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.supportedTypes = ['audio/webm;codecs=opus', 'audio/webm'];
  }

  static get last(): FakeMediaRecorder | undefined {
    return FakeMediaRecorder.instances[FakeMediaRecorder.instances.length - 1];
  }

  state: RecorderState = 'inactive';
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? 'audio/webm';
    FakeMediaRecorder.instances.push(this);
  }

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.onstop?.();
  }

  /** Push a chunk of the given size, as a real recorder would. */
  emitData(bytes = 4096): void {
    this.ondataavailable?.({ data: new Blob(['x'.repeat(bytes)], { type: this.mimeType }) });
  }

  /** Emit one chunk and stop — the common "operator taps stop" path. */
  finish(bytes = 4096): void {
    this.emitData(bytes);
    this.stop();
  }

  raiseError(): void {
    this.state = 'inactive';
    this.onerror?.();
  }
}

export interface MediaMockHandle {
  readonly stream: FakeMediaStream;
  readonly getUserMedia: ReturnType<typeof vi.fn>;
  readonly permissionQuery: ReturnType<typeof vi.fn>;
  /** Change what `navigator.permissions.query` reports. */
  setPermissionState(state: 'granted' | 'denied' | 'prompt'): void;
  /** Make the next `getUserMedia` reject with the given DOMException name. */
  denyWith(name: string): void;
  restore(): void;
}

/**
 * Install the media fakes onto the global object.
 * Call `restore()` in `afterEach` to put the originals back.
 */
export function installMediaMocks(
  options: { permission?: 'granted' | 'denied' | 'prompt'; online?: boolean } = {}
): MediaMockHandle {
  FakeMediaRecorder.reset();

  const stream = new FakeMediaStream();
  let permissionState = options.permission ?? 'prompt';

  const getUserMedia = vi.fn(async () => stream as unknown as MediaStream);
  const permissionQuery = vi.fn(async () => ({ state: permissionState }));

  const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  const originalPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions');
  const originalOnLine = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(navigator),
    'onLine'
  );
  const originalRecorder = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: permissionQuery },
  });
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => options.online ?? true,
  });

  (globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeMediaRecorder;
  (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = FakeMediaRecorder;

  return {
    stream,
    getUserMedia,
    permissionQuery,
    setPermissionState(state) {
      permissionState = state;
    },
    denyWith(name) {
      getUserMedia.mockImplementationOnce(async () => {
        const error = new Error(name);
        error.name = name;
        throw error;
      });
    },
    restore() {
      if (originalMediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
      } else {
        delete (navigator as unknown as Record<string, unknown>).mediaDevices;
      }
      if (originalPermissions) {
        Object.defineProperty(navigator, 'permissions', originalPermissions);
      } else {
        delete (navigator as unknown as Record<string, unknown>).permissions;
      }
      if (originalOnLine) {
        Object.defineProperty(Object.getPrototypeOf(navigator), 'onLine', originalOnLine);
      }
      (globalThis as { MediaRecorder?: unknown }).MediaRecorder = originalRecorder;
      (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = originalRecorder;
      FakeMediaRecorder.reset();
    },
  };
}

/** Blob of a given byte size, for validation tests. */
export function makeAudioBlob(bytes = 4096, type = 'audio/webm'): Blob {
  return new Blob(['x'.repeat(bytes)], { type });
}
