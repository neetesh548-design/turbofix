/**
 * AudioPlayback — rendering, transport, and accessibility tests.
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayback } from '../components/Voice/AudioPlayback';

afterEach(cleanup);

const SRC = 'blob:turbofix/test-recording';

describe('AudioPlayback', () => {
  it('renders the transport controls', () => {
    render(<AudioPlayback src={SRC} durationMs={5000} />);
    expect(screen.getByTestId('audio-playback')).toBeInTheDocument();
    expect(screen.getByTestId('audio-playback-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('audio-playback-replay')).toBeInTheDocument();
    expect(screen.getByTestId('audio-playback-seek')).toBeInTheDocument();
  });

  it('points the audio element at the supplied source', () => {
    render(<AudioPlayback src={SRC} durationMs={5000} />);
    expect(screen.getByTestId('audio-playback-element')).toHaveAttribute('src', SRC);
  });

  it('shows the caller-measured duration', () => {
    render(<AudioPlayback src={SRC} durationMs={65_000} />);
    expect(screen.getByTestId('audio-playback-duration')).toHaveTextContent('1:05');
    expect(screen.getByTestId('audio-playback-position')).toHaveTextContent('0:00');
  });

  it('prefers the caller-measured duration over element metadata', () => {
    // MediaRecorder WebM blobs report `Infinity` until played through, which
    // is exactly why the measured value has to win.
    render(<AudioPlayback src={SRC} durationMs={7000} />);
    const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;
    Object.defineProperty(element, 'duration', { configurable: true, value: Infinity });
    fireEvent.loadedMetadata(element);
    expect(screen.getByTestId('audio-playback-duration')).toHaveTextContent('0:07');
  });

  it('falls back to element metadata when no duration was measured', () => {
    render(<AudioPlayback src={SRC} />);
    const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;
    Object.defineProperty(element, 'duration', { configurable: true, value: 12 });
    fireEvent.loadedMetadata(element);
    expect(screen.getByTestId('audio-playback-duration')).toHaveTextContent('0:12');
  });

  it('plays when the toggle is pressed', () => {
    render(<AudioPlayback src={SRC} durationMs={5000} />);
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');

    fireEvent.click(screen.getByTestId('audio-playback-toggle'));
    expect(play).toHaveBeenCalled();
  });

  it('pauses when toggled while playing', () => {
    render(<AudioPlayback src={SRC} durationMs={5000} />);
    const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;
    const pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause');

    fireEvent.play(element);
    Object.defineProperty(element, 'paused', { configurable: true, value: false });
    fireEvent.click(screen.getByTestId('audio-playback-toggle'));

    expect(pause).toHaveBeenCalled();
  });

  it('rewinds to the start on replay', () => {
    render(<AudioPlayback src={SRC} durationMs={5000} />);
    const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;
    element.currentTime = 3;

    fireEvent.click(screen.getByTestId('audio-playback-replay'));
    expect(element.currentTime).toBe(0);
  });

  it('tracks playback position as time advances', () => {
    render(<AudioPlayback src={SRC} durationMs={10_000} />);
    const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;

    element.currentTime = 4;
    fireEvent.timeUpdate(element);
    expect(screen.getByTestId('audio-playback-position')).toHaveTextContent('0:04');
  });

  it('seeks the audio element when the scrubber moves', () => {
    render(<AudioPlayback src={SRC} durationMs={10_000} />);
    const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;

    fireEvent.change(screen.getByTestId('audio-playback-seek'), { target: { value: '6000' } });
    expect(element.currentTime).toBe(6);
  });

  it('fires onEnded and parks the position at the end', () => {
    const onEnded = vi.fn();
    render(<AudioPlayback src={SRC} durationMs={8000} onEnded={onEnded} />);

    fireEvent.ended(screen.getByTestId('audio-playback-element'));
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('audio-playback-position')).toHaveTextContent('0:08');
  });

  it('resets the transport when a re-record replaces the source', () => {
    const { rerender } = render(<AudioPlayback src={SRC} durationMs={8000} />);
    const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;
    element.currentTime = 5;
    fireEvent.timeUpdate(element);
    expect(screen.getByTestId('audio-playback-position')).toHaveTextContent('0:05');

    rerender(<AudioPlayback src="blob:turbofix/second-take" durationMs={3000} />);
    expect(screen.getByTestId('audio-playback-position')).toHaveTextContent('0:00');
  });

  describe('accessibility (WCAG 2.1 AA)', () => {
    it('labels the control group', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} />);
      expect(screen.getByRole('group', { name: 'Your recorded problem report' })).toBeInTheDocument();
    });

    it('gives every control an accessible name', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} />);
      expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Replay from start' })).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: 'Recording length' })).toBeInTheDocument();
    });

    it('reflects play state through aria-pressed and the label', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} />);
      const toggle = screen.getByTestId('audio-playback-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      fireEvent.play(screen.getByTestId('audio-playback-element'));
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(toggle).toHaveAccessibleName('Pause recording');
    });

    it('announces the scrub position as human-readable time, not raw milliseconds', () => {
      render(<AudioPlayback src={SRC} durationMs={90_000} />);
      const element = screen.getByTestId('audio-playback-element') as HTMLAudioElement;
      element.currentTime = 30;
      fireEvent.timeUpdate(element);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '0:30 / 1:30');
    });

    it('exposes a polite live region for state changes', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} />);
      expect(screen.getByTestId('audio-playback-status')).toHaveAttribute('aria-live', 'polite');
    });

    it('hides decorative icons from assistive technology', () => {
      const { container } = render(<AudioPlayback src={SRC} durationMs={5000} />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
      icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
    });

    it('meets the 44px minimum target size on every control', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} />);
      const toggle = screen.getByTestId('audio-playback-toggle');
      const replay = screen.getByTestId('audio-playback-replay');
      expect(parseInt(toggle.style.width, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(toggle.style.height, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(replay.style.width, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(replay.style.height, 10)).toBeGreaterThanOrEqual(44);
    });
  });

  describe('localization', () => {
    it('renders Hindi labels for hi-IN', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} locale="hi-IN" />);
      expect(screen.getByRole('button', { name: 'रिकॉर्डिंग चलाएं' })).toBeInTheDocument();
    });

    it('accepts short language codes from the main app', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} locale="de" />);
      expect(screen.getByRole('button', { name: 'Aufnahme abspielen' })).toBeInTheDocument();
    });

    it('switches the container to RTL for Arabic', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} locale="ar-SA" />);
      expect(screen.getByTestId('audio-playback')).toHaveAttribute('dir', 'rtl');
    });

    it('keeps LTR direction for left-to-right locales', () => {
      render(<AudioPlayback src={SRC} durationMs={5000} locale="fr-FR" />);
      expect(screen.getByTestId('audio-playback')).toHaveAttribute('dir', 'ltr');
    });
  });
});
