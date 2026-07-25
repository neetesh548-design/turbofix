/**
 * EvidenceUploader — attaches photo/PDF evidence to a verification.
 *
 * Props:
 * - evidence (VerificationEvidence[]): items already attached
 * - disabled (boolean)
 * - uploading (boolean): a request is in flight
 * - minRequired (number): shown in the hint; 0 hides the requirement
 * - onUpload (file: File) => Promise<VerificationEvidence | null>
 * - onRemove (item: VerificationEvidence) => void
 * - onCaptionChange (id: string, caption: string) => void
 *
 * Behaviour:
 * - `capture="environment"` opens the rear camera straight away on a phone,
 *   which is how this is used 95% of the time — a technician standing at the
 *   machine. Desktop falls back to the normal file picker.
 * - Local object URLs are used for the preview until the signed URL arrives,
 *   and are revoked on unmount so a long shift does not leak memory.
 *
 * Accessibility:
 * - The picker is a real <input type="file"> behind a labelled button, so it
 *   keeps native keyboard and screen-reader behaviour.
 * - Each thumbnail exposes its caption as the image alt text and its remove
 *   button names the item it removes.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Space, Spin, Typography } from 'antd';
import { CameraOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useVerificationT } from '../../lib/verification/verificationI18n';
import type { VerificationEvidence } from '../../lib/verification/types';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

export interface EvidenceUploaderProps {
  evidence: VerificationEvidence[];
  disabled?: boolean;
  uploading?: boolean;
  minRequired?: number;
  onUpload: (file: File) => Promise<VerificationEvidence | null>;
  onRemove: (item: VerificationEvidence) => void;
  onCaptionChange: (id: string, caption: string) => void;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  evidence,
  disabled = false,
  uploading = false,
  minRequired = 1,
  onUpload,
  onRemove,
  onCaptionChange,
}) => {
  const { t } = useVerificationT();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const previewsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    previewsRef.current = localPreviews;
  }, [localPreviews]);

  useEffect(
    () => () => {
      Object.values(previewsRef.current).forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null): Promise<void> => {
      if (!fileList) return;
      for (const file of Array.from(fileList)) {
        const previewUrl = URL.createObjectURL(file);
        const uploaded = await onUpload(file);
        if (uploaded) {
          setLocalPreviews((previous) => ({ ...previous, [uploaded.id]: previewUrl }));
        } else {
          URL.revokeObjectURL(previewUrl);
        }
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [onUpload],
  );

  const shortfall = Math.max(0, minRequired - evidence.length);

  return (
    <section aria-labelledby="evidence-uploader-title" data-testid="evidence-uploader">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Typography.Text strong id="evidence-uploader-title">
            {t('verification.evidence.title')}
          </Typography.Text>
          <br />
          <Typography.Text type="secondary" id="evidence-uploader-hint">
            {t('verification.evidence.hint')}
          </Typography.Text>
        </div>

        {shortfall > 0 && minRequired > 0 ? (
          <Alert
            type="warning"
            showIcon
            role="status"
            message={t('verification.error.evidence_required')}
            data-testid="evidence-shortfall"
          />
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          capture="environment"
          multiple
          disabled={disabled || uploading}
          onChange={(event) => {
            void handleFiles(event.target.files);
          }}
          data-testid="evidence-input"
          aria-labelledby="evidence-uploader-title"
          aria-describedby="evidence-uploader-hint"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            overflow: 'hidden',
          }}
        />

        <Button
          type="dashed"
          block
          size="large"
          icon={uploading ? <Spin size="small" /> : <CameraOutlined aria-hidden="true" />}
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          data-testid="evidence-add"
        >
          {t('verification.action.add_photo')}
        </Button>

        {evidence.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('verification.evidence.empty')}
            data-testid="evidence-empty"
          />
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            }}
            aria-label={t('verification.evidence.count', { n: evidence.length })}
            data-testid="evidence-list"
          >
            {evidence.map((item) => {
              const source = localPreviews[item.id] ?? item.url;
              const label = item.caption || item.file_name || t('verification.evidence.title');
              return (
                <li key={item.id}>
                  <Card
                    size="small"
                    styles={{ body: { padding: 8 } }}
                    cover={
                      item.kind === 'document' ? (
                        <div
                          style={{
                            height: 120,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.04)',
                          }}
                        >
                          <FilePdfOutlined style={{ fontSize: 36 }} aria-hidden="true" />
                        </div>
                      ) : (
                        <img
                          src={source}
                          alt={label}
                          loading="lazy"
                          style={{ height: 120, width: '100%', objectFit: 'cover' }}
                        />
                      )
                    }
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Input
                        size="small"
                        value={item.caption}
                        disabled={disabled}
                        maxLength={120}
                        placeholder={t('verification.field.caption')}
                        aria-label={`${t('verification.field.caption')} — ${label}`}
                        onChange={(event) => onCaptionChange(item.id, event.target.value)}
                      />
                      <Button
                        size="small"
                        danger
                        block
                        disabled={disabled}
                        icon={<DeleteOutlined aria-hidden="true" />}
                        onClick={() => onRemove(item)}
                        aria-label={`${t('verification.action.remove')} — ${label}`}
                      >
                        {t('verification.action.remove')}
                      </Button>
                    </Space>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Space>
    </section>
  );
};

export default EvidenceUploader;
