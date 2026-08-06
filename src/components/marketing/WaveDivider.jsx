import React from 'react';

/**
 * Wave-shaped SVG section divider.
 * fill    — the color of the wave shape (matches the NEXT section's background)
 * flip    — flips the wave horizontally for variety
 * className — extra classes on wrapper
 */
export default function WaveDivider({ fill = '#101923', flip = false, className = '' }) {
  return (
    <div
      className={`wave-divider ${className}`}
      aria-hidden="true"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <path
          d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
