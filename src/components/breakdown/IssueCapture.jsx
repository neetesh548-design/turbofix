/**
 * IssueCapture — step 2, "what's wrong?"
 *
 * One box, plain language, no taxonomy. The operator types or speaks
 * the sentence they would say out loud, and TurboFix does the
 * classifying. That ordering matters: a dropdown of eleven subsystems
 * is how a 10-second report becomes a 90-second one, and how "spindle
 * noise" gets filed under "Other".
 *
 * The AI suggestion is shown as a *prefilled, editable* answer, never
 * as a locked verdict — the urgency chips sit right there and the
 * reporter can override with one tap. When they do, we stop
 * re-suggesting for that report: the human has spoken.
 *
 * Voice is a first-class input, not a novelty. On a shop floor typing
 * is the slow path, so the mic is the same size as the text box's own
 * affordance and the transcript lands in the textarea for review
 * before submit. If transcription fails we keep the audio and say so,
 * rather than losing what the operator just said.
 *
 * Props:
 * - value (string)             the issue text
 * - onChange (fn(text))
 * - classification (object)    from classifyIssue(value)
 * - urgency (string)           the effective urgency (suggested or chosen)
 * - onUrgencyChange (fn)       user override; also flips off auto-suggest
 * - urgencyOverridden (bool)
 * - onTranscribe (fn(blob) => Promise<string>)  page-supplied, may reject
 * - disabled (bool)
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Mic, Sparkles, Square, Wrench } from 'lucide-react';
import { URGENCY_ORDER, urgencyMeta } from '../../utils/breakdownRouter.js';

const ISSUE_LIMIT = 400;

/** Openers that get someone from blank box to filed report fastest. */
const QUICK_PHRASES = [
  'Not starting',
  'Unusual noise',
  'Oil leak',
  'Overheating',
  'Pressure dropping',
];

export default function IssueCapture({
  value = '',
  onChange,
  classification,
  urgency,
  onUrgencyChange,
  urgencyOverridden = false,
  onTranscribe,
  disabled = false,
}) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Never leave the microphone hot behind a navigation.
  useEffect(() => () => {
    try { recorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop()); } catch { /* already gone */ }
  }, []);

  const appendTranscript = (text) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    onChange?.(value.trim() ? `${value.trim()} ${clean}` : clean);
  };

  const stopVoice = () => {
    try { recorderRef.current?.stop(); } catch { setListening(false); }
  };

  const microphoneErrorMessage = async (error) => {
    if (error?.name === 'NotFoundError') return 'No microphone was found. Connect one or type the issue instead.';
    if (error?.name === 'NotReadableError') return 'The microphone is busy in another app. Close it there and try again.';
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
      try {
        const permission = await navigator.permissions?.query?.({ name: 'microphone' });
        if (permission?.state === 'granted') {
          return 'This in-app browser cannot capture microphone audio. Open TurboFix in Chrome or Safari, or type the issue.';
        }
      } catch { /* permission queries are not supported everywhere */ }
      return 'Microphone access is blocked. Allow it in your browser settings, then tap Speak again.';
    }
    return 'Could not start the microphone. Try again or type the issue instead.';
  };

  const startVoice = async () => {
    setVoiceNote('');
    if (!navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setVoiceNote('Voice input is not supported on this device — please type it.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      recorder.stream = stream;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!onTranscribe) {
          setVoiceNote('Recording kept with the report. Add a line of text so the technician can read it too.');
          return;
        }
        setTranscribing(true);
        try {
          const transcript = await onTranscribe(blob);
          if (transcript) {
            appendTranscript(transcript);
            setVoiceNote('Transcribed — check the words below before you send it.');
          } else {
            setVoiceNote('Nothing was picked up. The recording is kept — try again or type it.');
          }
        } catch {
          setVoiceNote('Could not transcribe here. The recording is attached to the report anyway.');
        } finally {
          setTranscribing(false);
        }
      };

      recorderRef.current = recorder;
      setListening(true);
      recorder.start();
    } catch (error) {
      setListening(false);
      setVoiceNote(await microphoneErrorMessage(error));
    }
  };

  const suggested = classification?.confidence !== 'none';
  const effectiveUrgency = urgency || classification?.urgency;
  const meta = urgencyMeta(effectiveUrgency);

  return (
    <div className="brk-issue">
      <div className="brk-issue-box">
        <label className="sr-only" htmlFor="brk-issue-text">What is wrong?</label>
        <textarea
          id="brk-issue-text"
          value={value}
          onChange={(event) => onChange?.(event.target.value.slice(0, ISSUE_LIMIT))}
          placeholder="Say it however you'd say it out loud — “spindle making weird noise”"
          rows={3}
          disabled={disabled}
          data-testid="breakdown-issue-text"
        />
        <div className="brk-issue-tools">
          <button
            type="button"
            className={`brk-mic${listening ? ' recording' : ''}`}
            onClick={listening ? stopVoice : startVoice}
            disabled={disabled || transcribing}
            aria-pressed={listening}
            aria-label={listening ? 'Stop recording' : 'Record the issue with your voice'}
            data-testid="breakdown-mic"
          >
            {transcribing ? <Loader2 size={16} className="brk-spin" /> : listening ? <Square size={16} /> : <Mic size={16} />}
            <span>{transcribing ? 'Transcribing…' : listening ? 'Stop' : 'Speak'}</span>
          </button>
          <span className="brk-count">{value.length}/{ISSUE_LIMIT}</span>
        </div>
      </div>

      {voiceNote && (
        <p className="brk-voice-note" role="status" data-testid="breakdown-voice-status">
          {voiceNote}
        </p>
      )}

      {!value.trim() && (
        <div className="brk-quick-phrases" data-testid="breakdown-quick-phrases">
          {QUICK_PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              className="brk-chip-btn"
              onClick={() => onChange?.(phrase)}
              disabled={disabled}
            >
              {phrase}
            </button>
          ))}
        </div>
      )}

      {suggested && (
        <div className={`brk-suggestion tone-${meta.tone}`} data-testid="breakdown-suggestion" role="status">
          <span className="brk-suggestion-icon" aria-hidden="true"><Sparkles size={14} /></span>
          <div className="brk-suggestion-text">
            <strong>
              Reads as {meta.label.toLowerCase()}
              {urgencyOverridden ? ' — you set this' : ''}
              {classification?.categoryLabel && classification.category !== 'general'
                ? ` · likely ${classification.categoryLabel.toLowerCase()}`
                : ''}
            </strong>
            <small><Wrench size={11} aria-hidden="true" /> {classification.hint}</small>
          </div>
        </div>
      )}

      <fieldset className="brk-urgency" disabled={disabled}>
        <legend>How urgent?</legend>
        <div className="brk-urgency-row" role="radiogroup" aria-label="Urgency">
          {URGENCY_ORDER.map((level) => {
            const option = urgencyMeta(level);
            const active = effectiveUrgency === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={active}
                className={`brk-urgency-btn tone-${option.tone}${active ? ' active' : ''}`}
                onClick={() => onUrgencyChange?.(level)}
                data-testid={`breakdown-urgency-${level}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="brk-urgency-hint">{meta.hint}</p>
      </fieldset>

      {meta.rank <= 1 && (
        <p className="brk-nudge" data-testid="breakdown-photo-nudge">
          <AlertTriangle size={13} aria-hidden="true" />
          Photos cut diagnosis time on urgent jobs. Worth adding one below.
        </p>
      )}
    </div>
  );
}
