/**
 * VoiceRecorder — end-to-end component behaviour.
 *
 * Every failure path is asserted to still leave the operator a route to
 * filing the ticket: that is the whole point of the component on a factory
 * floor where a blocked mic must never be a dead end.
 */

import React from 'react';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceRecorder } from '../components/Voice/VoiceRecorder';
import { SpeechToTextService, SpeechToTextError } from '../services/speech';
import type { SpeechErrorCode, SpeechProvider } from '../services/speech';
import { FakeMediaRecorder, installMediaMocks, type MediaMockHandle } from './helpers/mediaMocks';

function serviceReturning(text: string): SpeechToTextService {
  const provider: SpeechProvider = {
    id: 'test-provider',
    offlineCapable: false,
    isAvailable: () => true,
    transcribe: async () => ({
      text,
      languageCode: 'en-US',
      provider: 'test-provider',
      offlineCapable: false,
    }),
  };
  return new SpeechToTextService({ providers: [provider], isOnline: () => true });
}

function serviceFailing(code: SpeechErrorCode): SpeechToTextService {
  const provider: SpeechProvider = {
    id: 'test-provider',
    offlineCapable: false,
    isAvailable: () => true,
    transcribe: async () => {
      throw new SpeechToTextError(code, `${code} failure`);
    },
  };
  return new SpeechToTextService({ providers: [provider], isOnline: () => true });
}

describe('VoiceRecorder', () => {
  let media: MediaMockHandle;

  beforeEach(() => {
    media = installMediaMocks({ permission: 'prompt' });
  });

  afterEach(() => {
    cleanup();
    media.restore();
    vi.restoreAllMocks();
  });

  /** Record a take and land on the review screen. */
  async function recordTake(durationMs = 3000) {
    const user = userEvent.setup();
    await user.click(screen.getByTestId('voice-recorder-mic'));
    await waitFor(() => expect(FakeMediaRecorder.last?.state).toBe('recording'));

    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + durationMs);
    await act(async () => {
      FakeMediaRecorder.last?.finish(8192);
    });
    await screen.findByTestId('voice-recorder-playback');
    return user;
  }

  describe('capture', () => {
    it('renders the mic button in the idle state', () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      expect(screen.getByTestId('voice-recorder-mic')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tap to speak the problem' })).toBeInTheDocument();
    });

    it('starts recording and shows a live timer', async () => {
      const user = userEvent.setup();
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      await user.click(screen.getByTestId('voice-recorder-mic'));

      await waitFor(() => expect(screen.getByTestId('voice-recorder-timer')).toBeInTheDocument());
      expect(media.getUserMedia).toHaveBeenCalled();
      expect(screen.getByTestId('voice-recorder-mic')).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows the timer against the configured maximum', async () => {
      const user = userEvent.setup();
      render(
        <VoiceRecorder
          onTranscript={vi.fn()}
          validationRules={{ minDurationMs: 1000, maxDurationMs: 30_000, minBytes: 512 }}
        />
      );
      await user.click(screen.getByTestId('voice-recorder-mic'));

      await waitFor(() =>
        expect(screen.getByTestId('voice-recorder-timer')).toHaveTextContent('/ 0:30')
      );
    });

    it('the mic button doubles as stop while recording', async () => {
      const user = userEvent.setup();
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      await user.click(screen.getByTestId('voice-recorder-mic'));
      await waitFor(() => expect(FakeMediaRecorder.last?.state).toBe('recording'));

      expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument();
      vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 3000);
      await user.click(screen.getByTestId('voice-recorder-mic'));

      await waitFor(() => expect(FakeMediaRecorder.last?.state).toBe('inactive'));
    });

    it('speaks the prompt through the injected TTS callback', async () => {
      const speak = vi.fn();
      const user = userEvent.setup();
      render(<VoiceRecorder onTranscript={vi.fn()} speak={speak} />);

      await user.click(screen.getByTestId('voice-recorder-mic'));
      expect(speak).toHaveBeenCalledWith('Listening…');
    });
  });

  describe('playback before transcription', () => {
    it('moves to the review screen with a player once stopped', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      await recordTake();

      expect(screen.getByRole('heading', { name: 'Hear it back' })).toBeInTheDocument();
      expect(screen.getByTestId('voice-recorder-playback')).toBeInTheDocument();
      expect(screen.getByTestId('voice-recorder-send')).toBeInTheDocument();
      expect(screen.getByTestId('voice-recorder-re-record')).toBeInTheDocument();
    });

    it('does not transcribe until the operator approves the recording', async () => {
      const onTranscript = vi.fn();
      const service = serviceReturning('oil leak');
      const spy = vi.spyOn(service, 'transcribe');

      render(<VoiceRecorder onTranscript={onTranscript} service={service} />);
      await recordTake();

      expect(spy).not.toHaveBeenCalled();
      expect(onTranscript).not.toHaveBeenCalled();
    });

    it('shows the measured duration in the player', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      await recordTake(7000);

      expect(screen.getByTestId('voice-recorder-playback-duration')).toHaveTextContent('0:07');
    });
  });

  describe('transcription', () => {
    it('returns the transcript with the audio payload on approval', async () => {
      const onTranscript = vi.fn();
      render(<VoiceRecorder onTranscript={onTranscript} service={serviceReturning('bearing noise')} />);
      const user = await recordTake(4000);

      await user.click(screen.getByTestId('voice-recorder-send'));

      await waitFor(() => expect(onTranscript).toHaveBeenCalledTimes(1));
      const payload = onTranscript.mock.calls[0][0];
      expect(payload.text).toBe('bearing noise');
      // Measured from a real clock, so allow for the few ms the test itself takes.
      expect(payload.durationMs).toBeGreaterThanOrEqual(4000);
      expect(payload.durationMs).toBeLessThan(4500);
      expect(payload.blob).toBeInstanceOf(Blob);
      expect(payload.mimeType).toContain('audio/');
    });

    it('passes the selected language to the service as the STT hint', async () => {
      const service = serviceReturning('मशीन बंद है');
      const spy = vi.spyOn(service, 'transcribe');

      render(<VoiceRecorder onTranscript={vi.fn()} service={service} languageCode="hi-IN" />);
      const user = await recordTake();
      await user.click(screen.getByTestId('voice-recorder-send'));

      await waitFor(() => expect(spy).toHaveBeenCalled());
      expect(spy.mock.calls[0][0].languageCode).toBe('hi-IN');
    });

    it('disables the send button while a request is in flight', async () => {
      let release: (() => void) | undefined;
      const provider: SpeechProvider = {
        id: 'slow',
        offlineCapable: false,
        isAvailable: () => true,
        transcribe: async () => {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return { text: 'done', languageCode: 'en-US', provider: 'slow', offlineCapable: false };
        },
      };
      const service = new SpeechToTextService({ providers: [provider], isOnline: () => true });

      render(<VoiceRecorder onTranscript={vi.fn()} service={service} />);
      const user = await recordTake();
      await user.click(screen.getByTestId('voice-recorder-send'));

      await waitFor(() => expect(screen.getByTestId('voice-recorder-send')).toBeDisabled());
      expect(screen.getByTestId('voice-recorder-send')).toHaveTextContent('Transcribing…');

      await act(async () => {
        release?.();
      });
    });
  });

  describe('re-record', () => {
    it('returns to capture and clears the previous take', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      const user = await recordTake();

      await user.click(screen.getByTestId('voice-recorder-re-record'));

      expect(screen.queryByTestId('voice-recorder-playback')).not.toBeInTheDocument();
      expect(screen.getByTestId('voice-recorder-mic')).toBeInTheDocument();
    });

    it('lets the operator re-record after a failed transcription', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} service={serviceFailing('no-speech')} />);
      const user = await recordTake();

      await user.click(screen.getByTestId('voice-recorder-send'));
      await screen.findByTestId('voice-recorder-banner');

      await user.click(screen.getByTestId('voice-recorder-re-record'));
      expect(screen.getByTestId('voice-recorder-mic')).toBeInTheDocument();
    });

    it('offers a retry rather than a fresh send after a recoverable failure', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} service={serviceFailing('network')} />);
      const user = await recordTake();

      await user.click(screen.getByTestId('voice-recorder-send'));

      await waitFor(() =>
        expect(screen.getByTestId('voice-recorder-send')).toHaveTextContent('Try again')
      );
      expect(screen.getByTestId('voice-recorder-send')).toBeEnabled();
    });
  });

  describe('microphone permission handling', () => {
    it('explains a pre-blocked microphone and offers manual entry', async () => {
      media.setPermissionState('denied');
      const onManualEntry = vi.fn();
      render(<VoiceRecorder onTranscript={vi.fn()} onManualEntry={onManualEntry} />);

      await screen.findByText('Microphone access blocked');
      expect(screen.getByTestId('voice-recorder-banner')).toHaveAttribute('role', 'alert');
      expect(screen.queryByTestId('voice-recorder-mic')).not.toBeInTheDocument();

      await userEvent.setup().click(screen.getByTestId('voice-recorder-manual-entry'));
      expect(onManualEntry).toHaveBeenCalledWith('permission');
    });

    it('handles a refusal at the browser prompt', async () => {
      media.denyWith('NotAllowedError');
      const onError = vi.fn();
      render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

      await userEvent.setup().click(screen.getByTestId('voice-recorder-mic'));

      await screen.findByText('Microphone access blocked');
      expect(onError).toHaveBeenCalledWith('permission');
    });

    it('explains missing hardware as unsupported rather than blaming the operator', async () => {
      media.denyWith('NotFoundError');
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      await userEvent.setup().click(screen.getByTestId('voice-recorder-mic'));
      await screen.findByText('Voice not supported here');
    });
  });

  describe('offline degradation', () => {
    it('warns while offline but still lets the operator record', async () => {
      media.restore();
      media = installMediaMocks({ permission: 'prompt', online: false });
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      expect(screen.getByText('You are offline')).toBeInTheDocument();
      expect(screen.getByTestId('voice-recorder-mic')).toBeInTheDocument();
    });

    it('does not attempt a doomed request while offline', async () => {
      media.restore();
      media = installMediaMocks({ permission: 'prompt', online: false });
      const service = serviceReturning('never reached');
      const spy = vi.spyOn(service, 'transcribe');
      const onError = vi.fn();

      render(<VoiceRecorder onTranscript={vi.fn()} service={service} onError={onError} />);
      const user = await recordTake();
      await user.click(screen.getByTestId('voice-recorder-send'));

      await waitFor(() => expect(onError).toHaveBeenCalledWith('offline'));
      expect(spy).not.toHaveBeenCalled();
    });

    it('reacts to the browser going offline mid-session', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      expect(screen.queryByText('You are offline')).not.toBeInTheDocument();

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(screen.getByText('You are offline')).toBeInTheDocument();
    });

    it('always keeps the manual-entry escape available', async () => {
      const onManualEntry = vi.fn();
      render(<VoiceRecorder onTranscript={vi.fn()} onManualEntry={onManualEntry} />);

      await userEvent.setup().click(screen.getByTestId('voice-recorder-manual-entry'));
      expect(onManualEntry).toHaveBeenCalledWith('user-choice');
    });
  });

  describe('error recovery', () => {
    const cases: ReadonlyArray<[SpeechErrorCode, string]> = [
      ['no-speech', 'No speech was detected. Please record again or type the problem.'],
      ['not-configured', 'Voice transcription is not set up right now. Please type the problem.'],
      ['rate-limited', 'Voice transcription is busy right now. Please try again in a moment.'],
      ['network', 'Network problem while transcribing. Please try again or type the problem.'],
      ['unknown', 'Could not transcribe the recording. Please try again or type the problem.'],
    ];

    it.each(cases)('shows actionable copy for a %s failure', async (code, expected) => {
      render(<VoiceRecorder onTranscript={vi.fn()} service={serviceFailing(code)} />);
      const user = await recordTake();

      await user.click(screen.getByTestId('voice-recorder-send'));
      const banner = await screen.findByTestId('voice-recorder-banner');
      expect(within(banner).getByText(expected)).toBeInTheDocument();
    });

    it('disables retry for a terminal backend misconfiguration', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} service={serviceFailing('not-configured')} />);
      const user = await recordTake();

      await user.click(screen.getByTestId('voice-recorder-send'));

      await waitFor(() => expect(screen.getByTestId('voice-recorder-send')).toBeDisabled());
      expect(screen.getByTestId('voice-recorder-manual-entry')).toBeEnabled();
    });

    it('rejects a recording that is too short before any network call', async () => {
      const service = serviceReturning('never reached');
      const spy = vi.spyOn(service, 'transcribe');
      render(
        <VoiceRecorder
          onTranscript={vi.fn()}
          service={service}
          validationRules={{ minDurationMs: 5000, maxDurationMs: 60_000, minBytes: 512 }}
        />
      );
      const user = userEvent.setup();

      await user.click(screen.getByTestId('voice-recorder-mic'));
      await waitFor(() => expect(FakeMediaRecorder.last?.state).toBe('recording'));
      vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 800);
      await act(async () => {
        FakeMediaRecorder.last?.finish(8192);
      });

      await screen.findByText(
        'That recording was too short. Hold the button and speak for a moment longer.'
      );
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not report an aborted request as a failure', async () => {
      const onError = vi.fn();
      render(<VoiceRecorder onTranscript={vi.fn()} service={serviceFailing('aborted')} onError={onError} />);
      const user = await recordTake();

      await user.click(screen.getByTestId('voice-recorder-send'));

      await waitFor(() => expect(screen.getByTestId('voice-recorder-send')).toBeEnabled());
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('accessibility (WCAG 2.1 AA)', () => {
    it('names the mic button for screen readers in every state', async () => {
      const user = userEvent.setup();
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      expect(screen.getByTestId('voice-recorder-mic')).toHaveAccessibleName('Tap to speak the problem');

      await user.click(screen.getByTestId('voice-recorder-mic'));
      await waitFor(() =>
        expect(screen.getByTestId('voice-recorder-mic')).toHaveAccessibleName('Stop recording')
      );
    });

    it('exposes a polite live region that tracks the current state', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      const region = screen.getByTestId('voice-recorder-live-region');
      expect(region).toHaveAttribute('aria-live', 'polite');
      expect(region).toHaveTextContent('Tap to speak the problem');
    });

    it('announces errors through role=alert', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} service={serviceFailing('network')} />);
      const user = await recordTake();

      await user.click(screen.getByTestId('voice-recorder-send'));
      const banner = await screen.findByTestId('voice-recorder-banner');
      expect(banner).toHaveAttribute('role', 'alert');
    });

    it('is fully keyboard operable', async () => {
      const onManualEntry = vi.fn();
      const user = userEvent.setup();
      render(<VoiceRecorder onTranscript={vi.fn()} onManualEntry={onManualEntry} />);

      await user.tab();
      expect(screen.getByTestId('voice-recorder-mic')).toHaveFocus();
      await user.tab();
      expect(screen.getByTestId('voice-recorder-manual-entry')).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onManualEntry).toHaveBeenCalled();
    });

    it('meets the 44px minimum target size on the mic button', () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);
      const mic = screen.getByTestId('voice-recorder-mic');
      expect(parseInt(mic.style.width, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(mic.style.height, 10)).toBeGreaterThanOrEqual(44);
    });
  });

  describe('localization', () => {
    it('renders Hindi copy for hi-IN', () => {
      render(<VoiceRecorder onTranscript={vi.fn()} languageCode="hi-IN" />);
      expect(screen.getByRole('button', { name: 'समस्या बताने के लिए दबाएं' })).toBeInTheDocument();
      expect(screen.getByText('लिखकर बताएं')).toBeInTheDocument();
    });

    it('renders Marathi copy for the Pune-belt shop floor', () => {
      render(<VoiceRecorder onTranscript={vi.fn()} languageCode="mr-IN" />);
      expect(screen.getByRole('button', { name: 'समस्या सांगण्यासाठी दाबा' })).toBeInTheDocument();
    });

    it.each(['es-ES', 'fr-FR', 'de-DE', 'pt-BR', 'ru-RU', 'zh-CN', 'ar-SA'])(
      'renders non-English copy for %s',
      (locale) => {
        render(<VoiceRecorder onTranscript={vi.fn()} languageCode={locale} />);
        expect(
          screen.getByTestId('voice-recorder-mic').getAttribute('aria-label')
        ).not.toBe('Tap to speak the problem');
      }
    );

    it('flips the layout to RTL for Arabic', () => {
      render(<VoiceRecorder onTranscript={vi.fn()} languageCode="ar-SA" />);
      expect(screen.getByTestId('voice-recorder')).toHaveAttribute('dir', 'rtl');
    });

    it('localizes the error banner, not just the happy path', async () => {
      render(
        <VoiceRecorder
          onTranscript={vi.fn()}
          service={serviceFailing('no-speech')}
          languageCode="hi-IN"
        />
      );
      const user = await recordTake();
      await user.click(screen.getByTestId('voice-recorder-send'));

      const banner = await screen.findByTestId('voice-recorder-banner');
      expect(
        within(banner).getByText('कोई आवाज़ नहीं मिली। दोबारा रिकॉर्ड करें या लिखकर बताएं।')
      ).toBeInTheDocument();
    });
  });
});
