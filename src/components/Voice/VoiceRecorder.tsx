/**
 * VoiceRecorder — the complete capture → review → transcribe flow.
 *
 * Screen states, in the order an operator meets them:
 *   unsupported / denied  → explain, then hand off to manual text entry
 *   idle                  → one large mic target, nothing else
 *   recording             → timer, live interim text, stop
 *   recorded              → AudioPlayback with re-record / send
 *   transcribing          → progress, cancellable by re-recording
 *   error                 → localized cause, retry, and a manual-entry escape
 *
 * The design rule throughout: every failure path ends somewhere the operator
 * can still file the ticket. A blocked mic, a dead network, or an
 * unconfigured backend must never be a dead end on a factory floor.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Mic, Square, WifiOff } from 'lucide-react';
import { AudioPlayback } from './AudioPlayback';
import { createVoiceTranslator, isRtlLocale, type VoiceStringKey } from './voiceI18n';
import { useAudioRecorder, type Recording } from '../../hooks/useAudioRecorder';
import { formatDuration } from '../../services/speech/audioUtils';
import { SpeechToTextService } from '../../services/speech/SpeechToTextService';
import { SupabaseSpeechProvider } from '../../services/speech/SupabaseSpeechProvider';
import { WebSpeechProvider } from '../../services/speech/WebSpeechProvider';
import {
  DEFAULT_VALIDATION_RULES,
  SpeechToTextError,
  type AudioValidationRules,
  type SpeechErrorCode,
  type TranscriptionResult,
} from '../../services/speech/types';

/** What the parent receives once a recording has been transcribed. */
export interface VoiceTranscriptionPayload extends TranscriptionResult {
  readonly blob: Blob;
  readonly durationMs: number;
  readonly mimeType: string;
}

export interface VoiceRecorderProps {
  /** BCP-47 tag or short code. Drives both UI copy and the STT language hint. */
  readonly languageCode?: string;
  /** Called with the finished transcript. */
  readonly onTranscript: (payload: VoiceTranscriptionPayload) => void;
  /** Called when the operator (or a dead end) chooses manual text entry. */
  readonly onManualEntry?: (reason: SpeechErrorCode | 'user-choice') => void;
  /** Fired on every state-changing failure, for analytics/telemetry. */
  readonly onError?: (code: SpeechErrorCode) => void;
  /** Speaks assistant prompts aloud. Wired to the QR Gateway's TTS. */
  readonly speak?: (text: string) => void;
  /** Injected in tests; defaults to a Supabase + Web Speech chain. */
  readonly service?: SpeechToTextService;
  /** Length/size bounds. Defaults to 1s–60s. */
  readonly validationRules?: AudioValidationRules;
  readonly 'data-testid'?: string;
}

/** Map a machine-readable failure onto localized copy. */
const ERROR_STRING_KEY: Readonly<Record<SpeechErrorCode, VoiceStringKey>> = {
  offline: 'offlineDesc',
  'not-configured': 'errorNotConfigured',
  'rate-limited': 'errorRateLimited',
  network: 'errorNetwork',
  'no-speech': 'errorNoSpeech',
  unsupported: 'unsupportedDesc',
  permission: 'micDeniedDesc',
  'audio-too-short': 'errorTooShort',
  'audio-too-long': 'errorTooLong',
  aborted: 'errorUnknown',
  unknown: 'errorUnknown',
};

/**
 * Failures where retrying voice is pointless — the flow should push the
 * operator straight to typing rather than let them tap a dead button.
 */
const TERMINAL_CODES: ReadonlySet<SpeechErrorCode> = new Set<SpeechErrorCode>([
  'unsupported',
  'permission',
  'not-configured',
  'offline',
]);

/** Track connectivity so the UI can pre-empt a doomed transcription call. */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' || navigator.onLine !== false
  );
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}

/**
 * Ripple/pulse keyframes, shipped with the component rather than relying on
 * the host page's stylesheet, so VoiceRecorder is self-contained wherever it
 * is mounted. Scoped names avoid clashing with the QR Gateway's own copies.
 */
const ORB_KEYFRAMES = `
@keyframes tf-voice-ripple-a {
  0% { transform: scale(0.8); opacity: 0.7; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes tf-voice-ripple-b {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(2.3); opacity: 0; }
}
@keyframes tf-voice-orb-idle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes tf-voice-orb-active {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
@media (prefers-reduced-motion: reduce) {
  .tf-voice-orb, .tf-voice-ripple { animation: none !important; }
}
`;

const CARD_STYLE: React.CSSProperties = {
  background: '#151e28',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '14px',
  display: 'grid',
  gap: '10px',
  width: '100%',
  maxWidth: '340px',
  margin: '0 auto',
};

const PRIMARY_BUTTON: React.CSSProperties = {
  minHeight: '48px',
  background: 'linear-gradient(135deg, #863bff, #6d28d9)',
  border: 'none',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '0.88rem',
  fontWeight: 800,
  cursor: 'pointer',
  padding: '0 14px',
};

const SECONDARY_BUTTON: React.CSSProperties = {
  minHeight: '48px',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '12px',
  color: '#e5edf6',
  fontSize: '0.86rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '0 14px',
};

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  languageCode = 'en-US',
  onTranscript,
  onManualEntry,
  onError,
  speak,
  service,
  validationRules = DEFAULT_VALIDATION_RULES,
  'data-testid': testId = 'voice-recorder',
}) => {
  const t = createVoiceTranslator(languageCode);
  const rtl = isRtlLocale(languageCode);
  const online = useOnlineStatus();

  // The live provider must be the *same* instance the service falls back to,
  // so the transcript buffered during recording is what gets returned when
  // the cloud call fails. Created once per mount.
  const liveProviderRef = useRef<WebSpeechProvider | null>(null);
  if (liveProviderRef.current === null) {
    liveProviderRef.current = new WebSpeechProvider();
  }
  const liveProvider = liveProviderRef.current;

  const sttService = useMemo(
    () =>
      service ??
      new SpeechToTextService({
        providers: [new SupabaseSpeechProvider(), liveProvider],
        validationRules,
      }),
    [service, liveProvider, validationRules]
  );

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<SpeechErrorCode | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const recorder = useAudioRecorder({
    rules: validationRules,
    languageCode,
    liveProvider,
    onError,
  });

  const { permission, recording, status, durationMs, error: recorderError } = recorder;

  const activeError: SpeechErrorCode | null = transcriptionError ?? recorderError;

  /** Announce state changes through the gateway's TTS, when wired. */
  const announce = useCallback(
    (key: VoiceStringKey) => {
      speak?.(t(key));
    },
    [speak, t]
  );

  const handleManualEntry = useCallback(
    (reason: SpeechErrorCode | 'user-choice') => {
      abortRef.current?.abort();
      recorder.reset();
      onManualEntry?.(reason);
    },
    [onManualEntry, recorder]
  );

  const handleStart = useCallback(async () => {
    setTranscriptionError(null);
    announce('recording');
    await recorder.start();
  }, [announce, recorder]);

  const handleReRecord = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTranscriptionError(null);
    setIsTranscribing(false);
    recorder.reset();
  }, [recorder]);

  const handleTranscribe = useCallback(
    async (target: Recording) => {
      if (isTranscribing) return;

      // Do not burn a round trip on a connection we know is down; drop
      // straight to the offline message and the manual-entry escape.
      if (!online && !sttService.hasOfflineProvider) {
        setTranscriptionError('offline');
        announce('offlineDesc');
        onError?.('offline');
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setTranscriptionError(null);
      setIsTranscribing(true);
      announce('transcribing');

      try {
        const result = await sttService.transcribe({
          blob: target.blob,
          languageCode,
          durationMs: target.durationMs,
          signal: controller.signal,
        });
        if (!mountedRef.current || controller.signal.aborted) return;
        onTranscript({
          ...result,
          blob: target.blob,
          durationMs: target.durationMs,
          mimeType: target.mimeType,
        });
      } catch (err) {
        if (!mountedRef.current) return;
        const code: SpeechErrorCode =
          err instanceof SpeechToTextError ? err.code : 'unknown';
        // An abort is our own re-record/unmount, not something to report.
        if (code === 'aborted') return;
        setTranscriptionError(code);
        announce(ERROR_STRING_KEY[code]);
        onError?.(code);
      } finally {
        if (mountedRef.current) setIsTranscribing(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [isTranscribing, online, sttService, announce, onError, languageCode, onTranscript]
  );

  const renderBanner = (
    icon: React.ReactNode,
    title: string,
    description: string,
    tone: 'warn' | 'error' = 'error'
  ) => (
    <div
      role="alert"
      data-testid={`${testId}-banner`}
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        background: tone === 'warn' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.14)',
        border: `1px solid ${tone === 'warn' ? 'rgba(234,179,8,0.35)' : 'rgba(239,68,68,0.35)'}`,
        color: tone === 'warn' ? '#fde68a' : '#fecaca',
        borderRadius: '12px',
        padding: '10px 12px',
        fontSize: '0.8rem',
        lineHeight: 1.45,
        textAlign: rtl ? 'right' : 'left',
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }}>
        {icon}
      </span>
      <span>
        <strong style={{ display: 'block', marginBottom: '2px' }}>{title}</strong>
        {description}
      </span>
    </div>
  );

  const manualEntryButton = (reason: SpeechErrorCode | 'user-choice') => (
    <button
      type="button"
      onClick={() => handleManualEntry(reason)}
      data-testid={`${testId}-manual-entry`}
      style={SECONDARY_BUTTON}
    >
      {t('typeInstead')}
    </button>
  );

  // --- Hard stops: no mic hardware/API, or the operator blocked us. -------
  if (!recorder.isSupported || permission === 'unsupported') {
    return (
      <div data-testid={testId} dir={rtl ? 'rtl' : 'ltr'} style={CARD_STYLE}>
        {renderBanner(
          <AlertTriangle size={16} />,
          t('unsupportedTitle'),
          t('unsupportedDesc')
        )}
        {manualEntryButton('unsupported')}
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div data-testid={testId} dir={rtl ? 'rtl' : 'ltr'} style={CARD_STYLE}>
        {renderBanner(<AlertTriangle size={16} />, t('micDeniedTitle'), t('micDeniedDesc'))}
        {manualEntryButton('permission')}
      </div>
    );
  }

  // --- Review: playback with approve / re-record. -------------------------
  if (recording && status === 'recorded') {
    const terminal = activeError !== null && TERMINAL_CODES.has(activeError);
    return (
      <div data-testid={testId} dir={rtl ? 'rtl' : 'ltr'} style={CARD_STYLE}>
        <h3
          style={{
            margin: 0,
            fontSize: '0.96rem',
            fontWeight: 850,
            color: '#ffffff',
            fontFamily: 'Rajdhani, sans-serif',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '.04em',
          }}
        >
          {t('hearItBack')}
        </h3>
        <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.45 }}>
          {t('playbackHint')}
        </p>

        <AudioPlayback
          src={recording.url}
          durationMs={recording.durationMs}
          locale={languageCode}
          data-testid={`${testId}-playback`}
        />

        {!online &&
          renderBanner(<WifiOff size={16} />, t('offlineTitle'), t('offlineDesc'), 'warn')}

        {activeError &&
          renderBanner(<AlertTriangle size={16} />, t('retry'), t(ERROR_STRING_KEY[activeError]))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={handleReRecord}
            data-testid={`${testId}-re-record`}
            style={SECONDARY_BUTTON}
          >
            {t('reRecord')}
          </button>
          <button
            type="button"
            onClick={() => void handleTranscribe(recording)}
            disabled={isTranscribing || terminal}
            data-testid={`${testId}-send`}
            style={{
              ...PRIMARY_BUTTON,
              opacity: isTranscribing || terminal ? 0.55 : 1,
              cursor: isTranscribing || terminal ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isTranscribing ? (
              <>
                <Loader2 size={16} aria-hidden="true" />
                {t('transcribing')}
              </>
            ) : activeError ? (
              t('retry')
            ) : (
              t('sendForTranscription')
            )}
          </button>
        </div>

        {manualEntryButton('user-choice')}

        <span
          aria-live="polite"
          data-testid={`${testId}-live-region`}
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
        >
          {isTranscribing ? t('transcribing') : activeError ? t(ERROR_STRING_KEY[activeError]) : t('hearItBack')}
        </span>
      </div>
    );
  }

  // --- Capture: idle, requesting permission, or recording. ----------------
  const isBusy = status === 'requesting-permission';
  const label = recorder.isRecording
    ? t('stopRecording')
    : isBusy
      ? t('requestingMic')
      : t('tapToRecord');

  return (
    <div data-testid={testId} dir={rtl ? 'rtl' : 'ltr'} style={CARD_STYLE}>
      {!online &&
        renderBanner(<WifiOff size={16} />, t('offlineTitle'), t('offlineDesc'), 'warn')}

      {activeError &&
        renderBanner(<AlertTriangle size={16} />, t('retry'), t(ERROR_STRING_KEY[activeError]))}

      <style>{ORB_KEYFRAMES}</style>

      <div style={{ display: 'grid', justifyItems: 'center', gap: '10px', padding: '6px 0' }}>
        <div
          style={{
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            width: '112px',
            height: '112px',
          }}
        >
          {/* Ripples are pure decoration — kept out of the a11y tree. */}
          {recorder.isRecording && (
            <>
              <span
                aria-hidden="true"
                className="tf-voice-ripple"
                style={{
                  position: 'absolute',
                  width: '112px',
                  height: '112px',
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.18)',
                  animation: 'tf-voice-ripple-a 2s infinite ease-out',
                }}
              />
              <span
                aria-hidden="true"
                className="tf-voice-ripple"
                style={{
                  position: 'absolute',
                  width: '112px',
                  height: '112px',
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.12)',
                  animation: 'tf-voice-ripple-b 2s infinite ease-out 1s',
                }}
              />
            </>
          )}

          <button
            type="button"
            onClick={() => (recorder.isRecording ? recorder.stop() : void handleStart())}
            disabled={isBusy}
            data-testid={`${testId}-mic`}
            className="tf-voice-orb"
            aria-label={label}
            aria-pressed={recorder.isRecording}
            style={{
              position: 'relative',
              width: '112px',
              height: '112px',
              borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.15)',
              background: recorder.isRecording
                ? 'radial-gradient(circle, rgba(239,68,68,1) 0%, rgba(185,28,28,1) 100%)'
                : 'radial-gradient(circle, rgba(134,59,255,1) 0%, rgba(91,33,182,1) 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isBusy ? 'wait' : 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
              animation: recorder.isRecording
                ? 'tf-voice-orb-active 1.8s infinite ease-in-out'
                : 'tf-voice-orb-idle 2.5s infinite ease-in-out',
            }}
          >
            {recorder.isRecording ? (
              <Square size={36} aria-hidden="true" />
            ) : (
              <Mic size={40} aria-hidden="true" />
            )}
          </button>
        </div>

        <span style={{ fontSize: '0.85rem', color: '#e5edf6', fontWeight: 700, textAlign: 'center' }}>
          {label}
        </span>

        {recorder.isRecording && (
          <span
            data-testid={`${testId}-timer`}
            style={{ fontSize: '0.95rem', color: '#a78bfa', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}
          >
            {formatDuration(durationMs)} / {formatDuration(validationRules.maxDurationMs)}
          </span>
        )}

        {recorder.isRecording && recorder.liveTranscript && (
          <p
            data-testid={`${testId}-live-transcript`}
            style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.45 }}
          >
            {recorder.liveTranscript}
          </p>
        )}
      </div>

      {manualEntryButton('user-choice')}

      <span
        aria-live="polite"
        data-testid={`${testId}-live-region`}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
    </div>
  );
};

export default VoiceRecorder;
