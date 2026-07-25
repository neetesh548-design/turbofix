/**
 * useVerification — all verification state for a single ticket.
 *
 * Owns the governing verification record, the audit trail, the company policy
 * and the closure gate, plus the mutations that move a verification through its
 * lifecycle. Components stay presentational.
 *
 * Usage:
 *   const v = useVerification({ ticketId, actor, companyId });
 *   if (!v.gate.allowed) disable the Close button and show t(v.gate.reason_key)
 *
 * A Supabase realtime subscription keeps a supervisor's screen in step with the
 * technician's submission without a refresh.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  DEFAULT_VERIFICATION_POLICY,
  canApproveVerification,
  evaluateClosureGate,
  type ClosureGateResult,
  type TicketVerification,
  type VerificationActor,
  type VerificationDecisionInput,
  type VerificationDraft,
  type VerificationEvent,
  type VerificationEvidence,
  type VerificationPolicy,
} from '../lib/verification/types';
import {
  VerificationError,
  approveVerification,
  cancelVerification,
  closeTicketWithOverride,
  createVerification,
  getGoverningVerification,
  getVerificationPolicy,
  listVerificationEvents,
  rejectVerification,
  requestChanges,
  saveDraft,
  submitVerification,
  uploadEvidence,
  uploadSignature,
} from '../lib/verification/verificationApi';

export interface UseVerificationOptions {
  ticketId: string | null;
  actor: VerificationActor;
  companyId?: string | null;
  /** Disable the realtime channel (tests, or screens that poll already). */
  realtime?: boolean;
}

export interface UseVerificationResult {
  verification: TicketVerification | null;
  events: VerificationEvent[];
  policy: VerificationPolicy;
  gate: ClosureGateResult;
  canApprove: boolean;
  loading: boolean;
  busy: boolean;
  /** i18n key of the last failure, or null. */
  errorKey: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  start: () => Promise<TicketVerification | null>;
  save: (draft: VerificationDraft) => Promise<TicketVerification | null>;
  submit: (draft: VerificationDraft) => Promise<TicketVerification | null>;
  approve: (input: VerificationDecisionInput) => Promise<TicketVerification | null>;
  reject: (input: VerificationDecisionInput) => Promise<TicketVerification | null>;
  sendBack: (input: VerificationDecisionInput) => Promise<TicketVerification | null>;
  cancel: () => Promise<TicketVerification | null>;
  addEvidence: (file: File, caption?: string) => Promise<VerificationEvidence | null>;
  captureSignature: (dataUrl: string) => Promise<string | null>;
  overrideClosure: (reason: string) => Promise<boolean>;
}

function errorKeyOf(error: unknown): string {
  if (error instanceof VerificationError) return error.messageKey;
  return 'verification.error.generic';
}

export function useVerification({
  ticketId,
  actor,
  companyId = null,
  realtime = true,
}: UseVerificationOptions): UseVerificationResult {
  const [verification, setVerification] = useState<TicketVerification | null>(null);
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [policy, setPolicy] = useState<VerificationPolicy>(DEFAULT_VERIFICATION_POLICY);
  const [loading, setLoading] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Guards against setState after unmount on a slow factory-floor connection.
  const mountedRef = useRef<boolean>(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!ticketId) {
      setVerification(null);
      setEvents([]);
      return;
    }
    setLoading(true);
    setErrorKey(null);
    try {
      const [current, trail, companyPolicy] = await Promise.all([
        getGoverningVerification(ticketId),
        listVerificationEvents(ticketId),
        getVerificationPolicy(companyId),
      ]);
      if (!mountedRef.current) return;
      setVerification(current);
      setEvents(trail);
      setPolicy(companyPolicy);
    } catch (error) {
      if (!mountedRef.current) return;
      setErrorKey(errorKeyOf(error));
      console.error('[useVerification] refresh failed', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [ticketId, companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!realtime || !ticketId) return undefined;
    const channel = supabase
      .channel(`verification:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_verifications',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, realtime, refresh]);

  /** Runs a mutation with shared busy/error handling; null on failure. */
  const run = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setErrorKey(null);
      try {
        const result = await operation();
        return result;
      } catch (error) {
        if (mountedRef.current) setErrorKey(errorKeyOf(error));
        console.error('[useVerification] operation failed', error);
        return null;
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [],
  );

  const start = useCallback(
    () =>
      run(async () => {
        if (!ticketId) throw new VerificationError('NO_TICKET', 'verification.error.generic');
        const created = await createVerification(ticketId, actor);
        if (mountedRef.current) setVerification(created);
        await refresh();
        return created;
      }),
    [run, ticketId, actor, refresh],
  );

  const save = useCallback(
    (draft: VerificationDraft) =>
      run(async () => {
        if (!verification) throw new VerificationError('NO_VERIFICATION', 'verification.error.generic');
        const updated = await saveDraft(verification.id, draft);
        if (mountedRef.current) setVerification(updated);
        return updated;
      }),
    [run, verification],
  );

  const submit = useCallback(
    (draft: VerificationDraft) =>
      run(async () => {
        if (!verification) throw new VerificationError('NO_VERIFICATION', 'verification.error.generic');
        const updated = await submitVerification(verification.id, draft, actor, policy);
        if (mountedRef.current) setVerification(updated);
        await refresh();
        return updated;
      }),
    [run, verification, actor, policy, refresh],
  );

  const decideWith = useCallback(
    (
      operation: (id: string, input: VerificationDecisionInput) => Promise<TicketVerification>,
    ) =>
      (input: VerificationDecisionInput) =>
        run(async () => {
          if (!verification) throw new VerificationError('NO_VERIFICATION', 'verification.error.generic');
          const updated = await operation(verification.id, input);
          if (mountedRef.current) setVerification(updated);
          await refresh();
          return updated;
        }),
    [run, verification, refresh],
  );

  const approve = useMemo(() => decideWith(approveVerification), [decideWith]);
  const reject = useMemo(() => decideWith(rejectVerification), [decideWith]);
  const sendBack = useMemo(() => decideWith(requestChanges), [decideWith]);

  const cancel = useCallback(
    () =>
      run(async () => {
        if (!verification) throw new VerificationError('NO_VERIFICATION', 'verification.error.generic');
        const updated = await cancelVerification(verification.id, actor);
        if (mountedRef.current) setVerification(updated);
        await refresh();
        return updated;
      }),
    [run, verification, actor, refresh],
  );

  const addEvidence = useCallback(
    (file: File, caption = '') =>
      run(async () => {
        if (!ticketId) throw new VerificationError('NO_TICKET', 'verification.error.generic');
        return uploadEvidence(ticketId, file, caption);
      }),
    [run, ticketId],
  );

  const captureSignature = useCallback(
    (dataUrl: string) =>
      run(async () => {
        if (!ticketId) throw new VerificationError('NO_TICKET', 'verification.error.generic');
        return uploadSignature(ticketId, dataUrl);
      }),
    [run, ticketId],
  );

  const overrideClosure = useCallback(
    async (reason: string): Promise<boolean> => {
      const result = await run(async () => {
        if (!ticketId) throw new VerificationError('NO_TICKET', 'verification.error.generic');
        await closeTicketWithOverride(ticketId, reason, actor);
        await refresh();
        return true;
      });
      return result === true;
    },
    [run, ticketId, actor, refresh],
  );

  const gate = useMemo(() => evaluateClosureGate(verification, policy), [verification, policy]);
  const canApprove = useMemo(
    () => canApproveVerification(actor, verification, policy),
    [actor, verification, policy],
  );

  const clearError = useCallback(() => setErrorKey(null), []);

  return {
    verification,
    events,
    policy,
    gate,
    canApprove,
    loading,
    busy,
    errorKey,
    clearError,
    refresh,
    start,
    save,
    submit,
    approve,
    reject,
    sendBack,
    cancel,
    addEvidence,
    captureSignature,
    overrideClosure,
  };
}

export default useVerification;
