import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, Edit3 } from 'lucide-react';

export function PhotoAnnotatorModal({ open, imageSrc, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#EF4444'); // Red default
  const [brushSize] = useState(4);

  useEffect(() => {
    if (!open || !imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width > 800 ? 800 : img.width;
      canvas.height = (img.height * canvas.width) / img.width;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  if (!open || !imageSrc) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageSrc;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onSave(dataUrl);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--surface-card, #1E293B)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
            <Edit3 size={18} style={{ color: '#38BDF8' }} />
            <strong style={{ fontSize: '0.95rem' }}>Annotate Photo / Highlight Problem Area</strong>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Canvas Area */}
        <div
          style={{
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'auto',
            background: '#0F172A',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ cursor: 'crosshair', borderRadius: 8, touchAction: 'none' }}
          />
        </div>

        {/* Toolbar & Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Color:</span>
            {['#EF4444', '#F59E0B', '#10B981', '#38BDF8'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid #FFFFFF' : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
            <button
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94A3B8',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94A3B8',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                background: '#0EA5E9',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Check size={16} /> Save Markup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
