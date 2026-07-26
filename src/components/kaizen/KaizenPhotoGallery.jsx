/**
 * KaizenPhotoGallery — before/after evidence with a lightbox.
 *
 * A Kaizen argues for itself far better with two photographs than with
 * two paragraphs, so this is deliberately prominent wherever an idea has
 * evidence attached. Both images lazy-load: the hall of fame can carry
 * ten of them and none should block first paint.
 *
 * Props:
 * - before (string)  URL of the "before" state
 * - after  (string)  URL of the "after" state
 * - title  (string)  idea title, used in alt text and the lightbox caption
 * - compact (bool)   thumbnail strip rather than the full side-by-side pair
 *
 * Renders nothing at all when there is no photo — an empty frame that
 * says "no image" is worse than the absence of the section.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function Frame({ src, label, alt, onOpen }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <figure className="kz-photo kz-photo-missing">
        <div className="kz-photo-blank">{src ? 'Image unavailable' : 'Not captured yet'}</div>
        <figcaption>{label}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="kz-photo">
      <button type="button" className="kz-photo-btn" onClick={() => onOpen(src, `${label} — ${alt}`)}>
        <img src={src} alt={`${label}: ${alt}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </button>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function KaizenPhotoGallery({ before, after, title = 'Kaizen idea', compact = false }) {
  const [lightbox, setLightbox] = useState(null);

  const open = useCallback((src, caption) => setLightbox({ src, caption }), []);
  const close = useCallback(() => setLightbox(null), []);

  // Escape closes the lightbox; the listener only exists while it is open.
  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, close]);

  if (!before && !after) return null;

  return (
    <>
      <div className={`kz-gallery ${compact ? 'compact' : ''}`} data-testid="kaizen-photo-gallery">
        <Frame src={before} label="Before" alt={title} onOpen={open} />
        <Frame src={after} label="After" alt={title} onOpen={open} />
      </div>

      {/* Portalled to <body> deliberately. The Kaizen page inherits
          `.md-dashboard { isolation: isolate }` from Dashboard.css, which
          opens a stacking context — a `position: fixed` overlay rendered
          inside it is trapped below the app's sticky topbar no matter how
          high its z-index goes, putting the close button under the header. */}
      {lightbox && typeof document !== 'undefined' && createPortal(
        <div
          className="kz-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption}
          onClick={close}
          data-testid="kaizen-lightbox"
        >
          <button type="button" className="kz-lightbox-close" onClick={close} aria-label="Close image">
            <X size={18} />
          </button>
          {/* Stop propagation so clicking the photo itself does not dismiss it. */}
          <img src={lightbox.src} alt={lightbox.caption} onClick={(event) => event.stopPropagation()} />
          <p className="kz-lightbox-caption">{lightbox.caption}</p>
        </div>,
        document.body,
      )}
    </>
  );
}
