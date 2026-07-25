/**
 * Quick Report Dialog — WhatsApp Entry Point for Ticket Creation
 *
 * Simplified ticket creation workflow:
 * 1. Scan QR code or select machine
 * 2. Describe issue (text, voice, or photo)
 * 3. Submit ticket
 *
 * Integrates with Tickets page to enable rapid issue reporting
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Camera, Plus, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { supabase } from '../supabaseClient';

export function QuickReportDialog({ open, onClose, machines, onTicketCreated }) {
  const [step, setStep] = useState('machine'); // machine, issue, review, submitting
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [issueText, setIssueText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (!open) {
      setStep('machine');
      setSelectedMachineId('');
      setIssueText('');
      setPhotoFile(null);
      setPhotoPreview('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const selectedMachine = (machines || []).find(m => m.machine_id === selectedMachineId);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.onstart = () => setIsListening(true);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setIsListening(false);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // For now, just show a note that voice was captured
        // In a real implementation, this would transcribe via speech-to-text API
        setIssueText(prev => prev + '\n[Voice message recorded]');

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch (err) {
      setError('Microphone access denied. Please use text instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10 MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPhotoPreview(event.target?.result || '');
    reader.readAsDataURL(file);
    setError('');
  };

  const submitTicket = async () => {
    if (!selectedMachineId || !issueText.trim()) {
      setError('Please select a machine and describe the issue');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const payload = {
        machine_id: selectedMachineId,
        issue_text: issueText,
        urgency: 'high', // Quick reports default to high urgency
      };

      let ticket = null;
      try {
        const response = await apiFetch('/vault/tickets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await response.json().catch(() => ({}));
          throw new Error(msg.detail || 'API endpoint error');
        }

        ticket = await response.json();
      } catch (apiErr) {
        console.warn('API endpoint unavailable/failed, executing direct Supabase DB fallback:', apiErr);
        const ticketRecord = {
          machine_id: selectedMachineId,
          issue_text: issueText,
          urgency: 'high',
          status: 'open',
          created_at: new Date().toISOString(),
        };
        const { data: dbData, error: dbErr } = await supabase.from('tickets').insert(ticketRecord).select().single();
        if (dbErr) {
          throw new Error(dbErr.message || apiErr.message || 'Failed to create ticket');
        }
        ticket = dbData;
      }

      onTicketCreated?.(ticket);
      setStep('submitting');

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="quick-report-overlay" role="dialog" aria-modal="true" aria-labelledby="quick-report-title">
      <button className="quick-report-backdrop" onClick={onClose} aria-label="Close" />

      <div className="quick-report-dialog">
        <header className="quick-report-header">
          <div>
            <span className="quick-report-kicker">
              <Sparkles size={16} /> Quick Report
            </span>
            <h2 id="quick-report-title">Report a machine issue</h2>
            <p>Scan QR or select machine, then describe the problem</p>
          </div>
          <button
            type="button"
            className="quick-report-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {error && (
          <div className="quick-report-alert error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === 'machine' && (
          <div className="quick-report-content">
            <label className="quick-report-field">
              <span>Select Machine</span>
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                autoFocus
              >
                <option value="">Choose a machine...</option>
                {machines.map((machine) => (
                  <option key={machine.machine_id} value={machine.machine_id}>
                    {machine.machine_name} · {machine.location || machine.machine_id}
                  </option>
                ))}
              </select>
            </label>
            <div className="quick-report-info">
              <p>💡 <strong>Tip:</strong> You can also scan the QR code on the machine (feature coming soon)</p>
            </div>
            <div className="quick-report-actions">
              <button
                type="button"
                className="quick-report-button secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="quick-report-button primary"
                disabled={!selectedMachineId}
                onClick={() => setStep('issue')}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 'issue' && (
          <div className="quick-report-content">
            <div className="quick-report-context">
              <span className="quick-report-machine">
                <strong>Machine:</strong> {selectedMachine?.machine_name}
              </span>
            </div>

            <label className="quick-report-field">
              <span>Describe the Issue</span>
              <textarea
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                placeholder="What's wrong with the machine? (e.g., Oil leak, noise, not starting, smoke)"
                rows={4}
              />
            </label>

            <div className="quick-report-actions-inline">
              <button
                type="button"
                className={`quick-report-button voice ${isListening ? 'recording' : ''}`}
                onClick={isListening ? stopRecording : startRecording}
              >
                {isListening ? (
                  <>
                    <Square size={16} /> Stop recording
                  </>
                ) : (
                  <>
                    <Mic size={16} /> Record voice
                  </>
                )}
              </button>

              <label className="quick-report-button photo">
                <Camera size={16} /> Add photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {photoPreview && (
              <div className="quick-report-photo-preview">
                <img src={photoPreview} alt="Issue photo" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            <div className="quick-report-actions">
              <button
                type="button"
                className="quick-report-button secondary"
                onClick={() => setStep('machine')}
              >
                Back
              </button>
              <button
                type="button"
                className="quick-report-button primary"
                disabled={!issueText.trim()}
                onClick={() => setStep('review')}
              >
                Review
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="quick-report-content">
            <div className="quick-report-review-card">
              <h3>Review Ticket</h3>
              <dl>
                <dt>Machine:</dt>
                <dd>{selectedMachine?.machine_name}</dd>
                <dt>Location:</dt>
                <dd>{selectedMachine?.location || 'Not specified'}</dd>
                <dt>Issue:</dt>
                <dd className="issue-text">{issueText}</dd>
                {photoPreview && (
                  <>
                    <dt>Photo attached:</dt>
                    <dd className="photo-attached">✓ Yes</dd>
                  </>
                )}
              </dl>
            </div>

            <div className="quick-report-actions">
              <button
                type="button"
                className="quick-report-button secondary"
                onClick={() => setStep('issue')}
                disabled={busy}
              >
                Edit
              </button>
              <button
                type="button"
                className="quick-report-button primary"
                onClick={submitTicket}
                disabled={busy}
              >
                {busy ? 'Creating ticket…' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}

        {step === 'submitting' && (
          <div className="quick-report-content quick-report-success">
            <CheckCircle2 size={48} />
            <h3>Ticket Created!</h3>
            <p>Supervisor has been notified via WhatsApp</p>
            <p className="small">Closing in a moment...</p>
          </div>
        )}
      </div>

      <style>{`
        .quick-report-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: flex-end;
          z-index: 9999;
        }

        .quick-report-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
          border: none;
          padding: 0;
        }

        .quick-report-dialog {
          position: relative;
          background: var(--bg-primary);
          border-radius: 12px 12px 0 0;
          max-height: 90vh;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
        }

        .quick-report-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .quick-report-header h2 {
          margin: 8px 0 4px;
          font-size: 20px;
        }

        .quick-report-header p {
          margin: 0;
          font-size: 14px;
          color: var(--slate);
        }

        .quick-report-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--brand);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quick-report-close {
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--slate);
          transition: all 200ms ease;
        }

        .quick-report-close:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .quick-report-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .quick-report-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          font-size: 14px;
        }

        .quick-report-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .quick-report-field span {
          font-weight: 600;
          font-size: 14px;
        }

        .quick-report-field select,
        .quick-report-field textarea {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          resize: none;
        }

        .quick-report-field select:focus,
        .quick-report-field textarea:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(34, 163, 90, 0.1);
        }

        .quick-report-info {
          padding: 12px 16px;
          background: rgba(59, 130, 246, 0.1);
          border-left: 3px solid #3b82f6;
          border-radius: 4px;
          font-size: 14px;
        }

        .quick-report-info p {
          margin: 0;
        }

        .quick-report-context {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 14px;
        }

        .quick-report-machine {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quick-report-actions-inline {
          display: flex;
          gap: 12px;
        }

        .quick-report-button {
          padding: 10px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 200ms ease;
        }

        .quick-report-button.primary {
          background: var(--brand);
          color: white;
        }

        .quick-report-button.primary:hover:not(:disabled) {
          background: #1e7e34;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(34, 163, 90, 0.3);
        }

        .quick-report-button.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quick-report-button.secondary {
          background: var(--bg-secondary);
          color: var(--slate);
          border: 1px solid var(--border-color);
        }

        .quick-report-button.secondary:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        .quick-report-button.voice {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid #8b5cf6;
          color: #8b5cf6;
        }

        .quick-report-button.voice.recording {
          background: #8b5cf6;
          color: white;
          animation: pulse 1s infinite;
        }

        .quick-report-button.photo {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid #06b6d4;
          color: #06b6d4;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .quick-report-photo-preview {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
        }

        .quick-report-photo-preview img {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          display: block;
        }

        .quick-report-photo-preview button {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .quick-report-review-card {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .quick-report-review-card h3 {
          margin: 0 0 16px;
          font-size: 16px;
        }

        .quick-report-review-card dl {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 12px 16px;
          margin: 0;
        }

        .quick-report-review-card dt {
          font-weight: 600;
          font-size: 13px;
          color: var(--slate);
        }

        .quick-report-review-card dd {
          margin: 0;
          font-size: 14px;
        }

        .quick-report-review-card .issue-text {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .quick-report-review-card .photo-attached {
          color: var(--brand);
          font-weight: 600;
        }

        .quick-report-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .quick-report-actions button {
          flex: 1;
        }

        .quick-report-success {
          text-align: center;
          min-height: 200px;
          justify-content: center;
          align-items: center;
        }

        .quick-report-success svg {
          color: var(--brand);
          margin-bottom: 16px;
        }

        .quick-report-success h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .quick-report-success p {
          margin: 0;
          color: var(--slate);
          font-size: 14px;
        }

        .quick-report-success p.small {
          font-size: 12px;
          margin-top: 8px;
        }

        @media (max-width: 600px) {
          .quick-report-dialog {
            border-radius: 16px 16px 0 0;
          }

          .quick-report-header {
            padding: 16px;
          }

          .quick-report-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default QuickReportDialog;
