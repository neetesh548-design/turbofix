/**
 * AudioPlayback — accessible review player for a recorded problem report.
 *
 * Deliberately not a bare `<audio controls>`: native controls give no
 * consistent cross-browser hit target on a phone held in a gloved hand, and
 * they cannot show a trustworthy duration for MediaRecorder blobs. WebM
 * produced by MediaRecorder carries no duration in its header, so
 * `audio.duration` reads `Infinity` in Chrome until the clip has been played
 * through once. We therefore prefer the caller-measured `durationMs` and only
 * fall back to the element's own metadata when it is finite.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - every control is a real <button> / <input>, so keyboard and screen
 *     reader support come for free
 *   - the seek bar is a labelled range input with aria-valuetext in m:ss
 *   - play state changes are announced via a polite live region
 *   - all targets are >= 44x44 CSS px (2.5.5), contrast >= 4.5:1 (1.4.3)
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { formatDuration } from '../../services/speech/audioUtils';
import { createVoiceTranslator, isRtlLocale } from './voiceI18n';

export interface AudioPlaybackProps {
  /** Object URL or remote URL of the recording. */
  readonly src: string;
  /** Caller-measured length in ms. Preferred over element metadata. */
  readonly durationMs?: number;
  /** BCP-47 tag or short code, e.g. `hi-IN` or `hi`. */
  readonly locale?: string;
  /** Fired when playback reaches the end. */
  readonly onEnded?: () => void;
  /** Test hook; child elements derive their ids from it. */
  readonly 'data-testid'?: string;
}

export const AudioPlayback: React.FC<AudioPlaybackProps> = ({
  src,
  durationMs = 0,
  locale = 'en-US',
  onEnded,
  'data-testid': testId = 'audio-playback',
}) => {
  const t = createVoiceTranslator(locale);
  const rtl = isRtlLocale(locale);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sliderId = useId();

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [metadataDurationMs, setMetadataDurationMs] = useState(0);

  // Caller-measured duration wins; element metadata is the fallback for
  // remote files, and 1 is a floor so the slider never has a zero range.
  const totalMs = durationMs > 0 ? durationMs : metadataDurationMs;
  const sliderMax = Math.max(totalMs, 1);

  // A new recording must reset the transport, otherwise the scrubber keeps
  // the previous take's position after a re-record.
  useEffect(() => {
    setIsPlaying(false);
    setPositionMs(0);
    setMetadataDurationMs(0);
  }, [src]);

  const handleLoadedMetadata = useCallback(() => {
    const seconds = audioRef.current?.duration ?? 0;
    if (Number.isFinite(seconds) && seconds > 0) {
      setMetadataDurationMs(Math.round(seconds * 1000));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const seconds = audioRef.current?.currentTime ?? 0;
    setPositionMs(Math.round(seconds * 1000));
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setPositionMs(totalMs);
    onEnded?.();
  }, [onEnded, totalMs]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Older Safari returns undefined rather than a promise.
      void Promise.resolve(audio.play())
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const replay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setPositionMs(0);
    void Promise.resolve(audio.play())
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  const seek = useCallback((nextMs: number) => {
    const audio = audioRef.current;
    setPositionMs(nextMs);
    if (audio) audio.currentTime = nextMs / 1000;
  }, []);

  const positionLabel = formatDuration(positionMs);
  const totalLabel = formatDuration(totalMs);

  return (
    <div
      data-testid={testId}
      dir={rtl ? 'rtl' : 'ltr'}
      role="group"
      aria-label={t('audioPlayerLabel')}
      style={{
        display: 'grid',
        gap: '10px',
        background: '#0b1118',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px',
        padding: '12px',
      }}
    >
      {/* Kept out of the a11y tree: the visible controls below drive it. */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        data-testid={`${testId}-element`}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={togglePlay}
          data-testid={`${testId}-toggle`}
          aria-label={isPlaying ? t('pause') : t('play')}
          aria-pressed={isPlaying}
          style={{
            width: '48px',
            height: '48px',
            flexShrink: 0,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #863bff, #6d28d9)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor={sliderId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
            {t('recordingLength')}
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={sliderMax}
            step={100}
            value={Math.min(positionMs, sliderMax)}
            onChange={(event) => seek(Number(event.target.value))}
            data-testid={`${testId}-seek`}
            aria-valuetext={`${positionLabel} / ${totalLabel}`}
            style={{ width: '100%', accentColor: '#863bff', cursor: 'pointer' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#94a3b8',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span data-testid={`${testId}-position`}>{positionLabel}</span>
            <span data-testid={`${testId}-duration`}>{totalLabel}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={replay}
          data-testid={`${testId}-replay`}
          aria-label={t('replay')}
          style={{
            width: '44px',
            height: '44px',
            flexShrink: 0,
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'transparent',
            color: '#e5edf6',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={18} aria-hidden="true" />
        </button>
      </div>

      <span
        aria-live="polite"
        data-testid={`${testId}-status`}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
      >
        {isPlaying ? t('pause') : t('play')}
      </span>
    </div>
  );
};

export default AudioPlayback;
