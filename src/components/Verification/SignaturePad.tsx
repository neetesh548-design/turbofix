/**
 * SignaturePad — captures a technician/supervisor signature as a PNG data URL.
 *
 * Props:
 * - value (string | null): existing signature URL; renders read-only when set
 * - signerName (string): name recorded alongside the signature
 * - disabled (boolean): locks the pad
 * - onChange (dataUrl: string | null): fired when a signature is drawn or cleared
 * - onSignerNameChange (name: string)
 *
 * Accessibility (WCAG 2.1 AA):
 * - Drawing on a canvas is pointer-only, which fails 2.1.1 Keyboard on its own.
 *   A "type to sign" mode renders the typed name into the same canvas, so the
 *   control is fully operable by keyboard and by assistive technology.
 * - The canvas carries role="img" with a live aria-label describing its state.
 * - Status changes are announced through an aria-live region.
 * - Both modes are reachable in the tab order; the toggle is a real radio group.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Radio, Space, Typography } from 'antd';
import { ClearOutlined, EditOutlined } from '@ant-design/icons';
import { useVerificationT } from '../../lib/verification/verificationI18n';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 180;
const STROKE_WIDTH = 2.5;

export interface SignaturePadProps {
  value: string | null;
  signerName: string;
  disabled?: boolean;
  onChange: (dataUrl: string | null) => void;
  onSignerNameChange: (name: string) => void;
}

type SignMode = 'draw' | 'type';

interface Point {
  x: number;
  y: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  signerName,
  disabled = false,
  onChange,
  onSignerNameChange,
}) => {
  const { t, isRTL } = useVerificationT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<Point | null>(null);
  const [mode, setMode] = useState<SignMode>('draw');
  const [hasInk, setHasInk] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  const context = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const clear = useCallback(() => {
    const ctx = context();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
    setAnnouncement(t('verification.action.clear_signature'));
  }, [context, onChange, t]);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
    setAnnouncement(t('verification.signature.captured'));
  }, [onChange, t]);

  // ---- Draw mode ---------------------------------------------------------

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (disabled || mode !== 'draw') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!drawingRef.current || disabled || mode !== 'draw') return;
    const ctx = context();
    const from = lastPointRef.current;
    if (!ctx || !from) return;

    const to = pointFromEvent(event);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    lastPointRef.current = to;
    if (!hasInk) setHasInk(true);
  };

  const handlePointerUp = (): void => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (hasInk) commit();
  };

  // ---- Type mode (keyboard-operable equivalent) --------------------------

  const renderTypedSignature = useCallback(
    (name: string) => {
      const ctx = context();
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!name.trim()) {
        setHasInk(false);
        onChange(null);
        return;
      }
      ctx.fillStyle = '#111827';
      ctx.font = 'italic 48px "Brush Script MT", "Segoe Script", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = isRTL ? 'rtl' : 'ltr';
      ctx.fillText(name.trim(), canvas.width / 2, canvas.height / 2, canvas.width - 40);
      setHasInk(true);
      onChange(canvas.toDataURL('image/png'));
    },
    [context, onChange, isRTL],
  );

  useEffect(() => {
    if (mode === 'type') renderTypedSignature(signerName);
    // Only re-render the typed signature when the mode or the name changes.
  }, [mode, signerName, renderTypedSignature]);

  const ariaLabel = hasInk || value
    ? `${t('verification.signature.title')} — ${t('verification.signature.captured')}`
    : `${t('verification.signature.title')} — ${t('verification.signature.hint')}`;

  // Existing signature from a previous save: show it, do not re-capture.
  if (value && !hasInk && disabled) {
    return (
      <div>
        <Typography.Text strong>{t('verification.signature.title')}</Typography.Text>
        <div
          style={{
            border: '1px solid var(--tf-border, #d9d9d9)',
            borderRadius: 8,
            padding: 8,
            marginTop: 8,
            background: '#fff',
          }}
        >
          <img
            src={value}
            alt={`${t('verification.signature.title')} — ${signerName}`}
            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
          />
        </div>
        {signerName ? (
          <Typography.Text type="secondary">
            {t('verification.field.signed_by')}: {signerName}
          </Typography.Text>
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid="signature-pad">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Typography.Text strong id="signature-pad-label">
          {t('verification.signature.title')}
        </Typography.Text>
        <Typography.Text type="secondary" id="signature-pad-hint">
          {t('verification.signature.hint')}
        </Typography.Text>

        <Radio.Group
          value={mode}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value as SignMode;
            setMode(next);
            clear();
          }}
          aria-label={t('verification.signature.title')}
          data-testid="signature-mode"
        >
          <Radio.Button value="draw">
            <EditOutlined aria-hidden="true" /> {t('verification.signature.title')}
          </Radio.Button>
          <Radio.Button value="type">{t('verification.field.signed_by')}</Radio.Button>
        </Radio.Group>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          role="img"
          aria-label={ariaLabel}
          aria-describedby="signature-pad-hint"
          data-testid="signature-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
            border: '1px dashed var(--tf-border, #8c8c8c)',
            borderRadius: 8,
            background: '#fff',
            touchAction: 'none',
            cursor: disabled || mode === 'type' ? 'not-allowed' : 'crosshair',
          }}
        />

        <Input
          value={signerName}
          disabled={disabled}
          maxLength={80}
          placeholder={t('verification.field.signed_by')}
          aria-label={t('verification.field.signed_by')}
          data-testid="signature-name"
          onChange={(event) => onSignerNameChange(event.target.value)}
        />

        <Button
          icon={<ClearOutlined aria-hidden="true" />}
          onClick={clear}
          disabled={disabled || (!hasInk && !value)}
          data-testid="signature-clear"
        >
          {t('verification.action.clear_signature')}
        </Button>

        <span
          aria-live="polite"
          role="status"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {announcement}
        </span>
      </Space>
    </div>
  );
};

export default SignaturePad;
