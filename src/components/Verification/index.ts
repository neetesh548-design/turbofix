/**
 * Verification Flow — public surface.
 *
 * Pages should import from here rather than reaching into individual files, so
 * the internal layout of the feature can change without touching callers.
 */

export { default as VerificationFlow } from './VerificationFlow';
export type { VerificationFlowProps } from './VerificationFlow';

export { default as VerificationModal } from './VerificationModal';
export type { VerificationModalProps, VerificationModalMode } from './VerificationModal';

export { default as VerificationHistory } from './VerificationHistory';
export type { VerificationHistoryProps } from './VerificationHistory';

export { default as EvidenceUploader } from './EvidenceUploader';
export type { EvidenceUploaderProps } from './EvidenceUploader';

export { default as SignaturePad } from './SignaturePad';
export type { SignaturePadProps } from './SignaturePad';

export { default as useVerification } from '../../hooks/useVerification';
export type { UseVerificationOptions, UseVerificationResult } from '../../hooks/useVerification';

export * from '../../lib/verification/types';
export {
  VerificationError,
  approveVerification,
  cancelVerification,
  closeTicketWithOverride,
  createVerification,
  getActiveVerification,
  getGoverningVerification,
  getVerificationPolicy,
  listVerificationEvents,
  listVerificationQueue,
  listVerifications,
  rejectVerification,
  requestChanges,
  saveDraft,
  submitVerification,
  uploadEvidence,
  uploadSignature,
} from '../../lib/verification/verificationApi';
export type { VerificationQueueItem } from '../../lib/verification/verificationApi';
