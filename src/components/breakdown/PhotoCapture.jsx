/**
 * PhotoCapture — step 3, "photo?"
 *
 * Optional by design. Making a photo mandatory is how a 10-second
 * report becomes a report nobody files, so this step is skippable in
 * one tap and merely *encouraged* when the issue reads as urgent.
 *
 * Two things happen before the file leaves the phone:
 *
 *   1. Compression. A modern phone camera hands back 4-8 MB; over a
 *      shed's worth of concrete and two bars of signal that is a
 *      minute of waiting. Downscaling to 1280px at JPEG 0.7 puts a
 *      diagnosable photo of a leaking seal at ~150 KB, which uploads
 *      before the operator has walked back to their station.
 *   2. Local preview first. The preview is the compressed data URL,
 *      so what they approve is what the technician receives.
 *
 * Upload is fire-and-forget through `onUpload`: the report is never
 * blocked on it. A failed upload keeps the compressed image on the
 * record so the submit still carries something.
 *
 * Props:
 * - value (string)     current photo data URL / remote URL
 * - onChange (fn(url)) called with the compressed data URL, or ''
 * - onUpload (fn(dataUrl) => Promise<string>)  optional background upload
 * - encouraged (bool)  show the "photos help" prompt
 * - disabled (bool)
 */

import React, { useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Loader2, X } from 'lucide-react';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.7;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * Downscale to `MAX_EDGE` on the long side and re-encode as JPEG.
 * Falls back to the original data URL wherever canvas is unavailable
 * (older WebViews, jsdom) — a big photo beats no photo.
 */
async function compressImage(file, { maxEdge = MAX_EDGE, quality = JPEG_QUALITY } = {}) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined' || typeof Image === 'undefined') return dataUrl;

  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('decode failed'));
      element.src = dataUrl;
    });

    const scale = Math.min(1, maxEdge / Math.max(image.width || 1, image.height || 1));
    if (scale >= 1) return dataUrl;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round((image.width || maxEdge) * scale);
    canvas.height = Math.round((image.height || maxEdge) * scale);
    const context = canvas.getContext('2d');
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

export default function PhotoCapture({
  value = '',
  onChange,
  onUpload,
  encouraged = false,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      setError('That is not an image file.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('That photo is too large even to compress. Take a new one.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const compressed = await compressImage(file);
      onChange?.(compressed);

      // Background upload — deliberately not awaited by the caller's
      // submit path. The report goes with the local copy either way.
      if (onUpload) {
        setUploading(true);
        onUpload(compressed)
          .then((remoteUrl) => { if (remoteUrl) onChange?.(remoteUrl); })
          .catch(() => setError('Photo kept on this device — it will sync when you are back online.'))
          .finally(() => setUploading(false));
      }
    } catch (err) {
      setError(err?.message || 'Could not attach that photo.');
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="brk-photo-preview" data-testid="breakdown-photo-preview">
        <img src={value} alt="The problem, as photographed by the reporter" />
        <button
          type="button"
          className="brk-photo-remove"
          onClick={() => { onChange?.(''); setError(''); }}
          disabled={disabled}
          aria-label="Remove photo"
        >
          <X size={14} />
        </button>
        <span className="brk-photo-status">
          {uploading
            ? <><Loader2 size={12} className="brk-spin" aria-hidden="true" /> Uploading in the background…</>
            : <><Check size={12} aria-hidden="true" /> Attached</>}
        </span>
        {error && <p className="brk-inline-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`brk-photo${encouraged ? ' encouraged' : ''}`}>
      {encouraged && (
        <p className="brk-photo-prompt">Photos help the technician arrive with the right part. Add one?</p>
      )}
      <div className="brk-photo-actions">
        <button
          type="button"
          className="brk-btn brk-btn-photo"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          data-testid="breakdown-photo-take"
        >
          {busy ? <Loader2 size={15} className="brk-spin" /> : <Camera size={15} />}
          <span>{busy ? 'Preparing…' : 'Take photo'}</span>
        </button>
        <span className="brk-photo-skip">
          <ImagePlus size={12} aria-hidden="true" /> Optional — skip it and send
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
        data-testid="breakdown-photo-input"
      />
      {error && <p className="brk-inline-error" role="alert">{error}</p>}
    </div>
  );
}
