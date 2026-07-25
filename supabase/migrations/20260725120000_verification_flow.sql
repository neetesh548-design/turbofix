-- =============================================================================
-- Verification Flow (closed-loop gap #1)
-- =============================================================================
-- Closes the maintenance loop: a work order can no longer jump from
-- "repair_completed" straight to "closed". A verification record must be
-- raised, evidenced (photos / notes / signature), submitted, and approved by
-- someone other than the technician who did the work.
--
-- Objects created:
--   * public.ticket_verifications      -- one row per verification attempt
--   * public.verification_events       -- append-only audit trail
--   * public.verification_settings     -- per-company enforcement switch
--   * storage bucket "verification-evidence"
--   * triggers that (a) gate ticket closure, (b) mirror approval onto the
--     ticket, (c) write the audit trail, (d) enforce segregation of duties.
--
-- Everything is additive and idempotent. Existing `status` / `lifecycle_stage`
-- columns keep their meaning; the gate only refuses *transitions into* a
-- closed state, so historical closed rows are untouched.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Per-company enforcement switch (lets a company roll the gate back without
--    a migration; defaults to ON so the loop is closed by default).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  enforce_verification_on_close boolean NOT NULL DEFAULT true,
  require_photo_evidence boolean NOT NULL DEFAULT true,
  require_signature boolean NOT NULL DEFAULT false,
  min_evidence_count integer NOT NULL DEFAULT 1,
  allow_self_approval boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.verification_settings IS
  'Per-company verification policy. A company with no row here uses the defaults (gate ON).';

-- -----------------------------------------------------------------------------
-- 2. Verification records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,

  -- draft | pending_review | approved | rejected | changes_requested | cancelled
  status text NOT NULL DEFAULT 'draft',
  attempt integer NOT NULL DEFAULT 1,
  requires_supervisor boolean NOT NULL DEFAULT true,

  -- Evidence captured by the technician
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{ key, label, checked }]
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{ id, path, url, caption, kind, uploaded_at }]
  signature_url text,
  signed_by_name text,
  technician_notes text,

  -- Submission
  submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_by_name text,
  submitted_at timestamp with time zone,

  -- Review
  reviewer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_name text,
  reviewed_at timestamp with time zone,
  review_notes text,
  rejection_reason text,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT ticket_verifications_status_chk CHECK (
    status IN ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested', 'cancelled')
  )
);

COMMENT ON COLUMN public.ticket_verifications.status IS
  'draft -> pending_review -> approved | rejected | changes_requested. cancelled is terminal.';

CREATE INDEX IF NOT EXISTS ticket_verifications_ticket_idx
  ON public.ticket_verifications(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ticket_verifications_status_idx
  ON public.ticket_verifications(status);
CREATE INDEX IF NOT EXISTS ticket_verifications_reviewer_idx
  ON public.ticket_verifications(reviewer_id) WHERE status = 'pending_review';

-- At most one *live* verification per ticket. Terminal rows (approved /
-- rejected / cancelled) stay for history and do not block a re-submission.
CREATE UNIQUE INDEX IF NOT EXISTS ticket_verifications_one_active_idx
  ON public.ticket_verifications(ticket_id)
  WHERE status IN ('draft', 'pending_review', 'changes_requested');

-- -----------------------------------------------------------------------------
-- 3. Append-only audit trail for every verification decision
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id uuid REFERENCES public.ticket_verifications(id) ON DELETE CASCADE,
  ticket_id uuid,
  machine_id uuid,
  company_id uuid,
  action text NOT NULL,          -- created | submitted | approved | rejected | changes_requested | cancelled | evidence_added | closure_blocked
  actor_id uuid,
  actor_name text,
  from_status text,
  to_status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS verification_events_verification_idx
  ON public.verification_events(verification_id, created_at DESC);
CREATE INDEX IF NOT EXISTS verification_events_ticket_idx
  ON public.verification_events(ticket_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Ticket columns that record the verification outcome / emergency override
-- -----------------------------------------------------------------------------
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS verification_id uuid,
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS closure_approved_by text,
  ADD COLUMN IF NOT EXISTS closure_override_reason text,
  ADD COLUMN IF NOT EXISTS closure_override_by text;

COMMENT ON COLUMN public.tickets.closure_override_reason IS
  'Set to bypass the verification gate for a single closure (emergency / owner decision). Always audited.';

-- -----------------------------------------------------------------------------
-- 5. Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verification_policy_for_company(p_company_id uuid)
RETURNS public.verification_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.verification_settings;
BEGIN
  SELECT * INTO result FROM public.verification_settings WHERE company_id = p_company_id;
  IF NOT FOUND THEN
    result.company_id := p_company_id;
    result.enforce_verification_on_close := true;
    result.require_photo_evidence := true;
    result.require_signature := false;
    result.min_evidence_count := 1;
    result.allow_self_approval := false;
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_closed_state(p_status text, p_stage text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_status, '')) IN ('closed', 'resolved')
      OR lower(coalesce(p_stage, '')) = 'closed';
$$;

-- Keep company_id / machine_id denormalised so RLS and history stay cheap.
CREATE OR REPLACE FUNCTION public.fill_verification_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.machine_id IS NULL OR NEW.company_id IS NULL THEN
    SELECT t.machine_id, m.company_id
      INTO NEW.machine_id, NEW.company_id
      FROM public.tickets t
      LEFT JOIN public.machines m ON m.id = t.machine_id
     WHERE t.id = NEW.ticket_id;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_verification_scope ON public.ticket_verifications;
CREATE TRIGGER trg_fill_verification_scope
  BEFORE INSERT OR UPDATE ON public.ticket_verifications
  FOR EACH ROW EXECUTE FUNCTION public.fill_verification_scope();

-- -----------------------------------------------------------------------------
-- 6. Segregation of duties + evidence completeness, enforced in the database
--    so a rogue client cannot approve its own work or approve an empty record.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_verification_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy public.verification_settings;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  policy := public.verification_policy_for_company(NEW.company_id);

  IF NEW.status = 'pending_review' THEN
    IF policy.require_photo_evidence
       AND jsonb_array_length(coalesce(NEW.evidence, '[]'::jsonb)) < greatest(policy.min_evidence_count, 1) THEN
      RAISE EXCEPTION 'VERIFICATION_EVIDENCE_REQUIRED: at least % evidence item(s) must be attached before submission',
        greatest(policy.min_evidence_count, 1)
        USING ERRCODE = 'check_violation';
    END IF;

    IF policy.require_signature AND coalesce(NEW.signature_url, '') = '' THEN
      RAISE EXCEPTION 'VERIFICATION_SIGNATURE_REQUIRED: a signature is required before submission'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.submitted_at IS NULL THEN
      NEW.submitted_at := timezone('utc'::text, now());
    END IF;
  END IF;

  IF NEW.status IN ('approved', 'rejected', 'changes_requested') THEN
    IF TG_OP = 'UPDATE' AND OLD.status NOT IN ('pending_review', 'changes_requested') THEN
      RAISE EXCEPTION 'VERIFICATION_INVALID_TRANSITION: cannot move a % verification to %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.reviewer_id IS NULL AND coalesce(NEW.reviewer_name, '') = '' THEN
      RAISE EXCEPTION 'VERIFICATION_REVIEWER_REQUIRED: a reviewer must be recorded for a % decision', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.reviewed_at IS NULL THEN
      NEW.reviewed_at := timezone('utc'::text, now());
    END IF;
  END IF;

  -- Segregation of duties: the person who did the work cannot sign it off.
  IF NEW.status = 'approved'
     AND NEW.requires_supervisor
     AND NOT policy.allow_self_approval
     AND NEW.reviewer_id IS NOT NULL
     AND NEW.reviewer_id = NEW.submitted_by THEN
    RAISE EXCEPTION 'VERIFICATION_SELF_APPROVAL_BLOCKED: the submitter cannot approve their own verification'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'rejected' AND coalesce(NEW.rejection_reason, NEW.review_notes, '') = '' THEN
    RAISE EXCEPTION 'VERIFICATION_REASON_REQUIRED: a rejection must carry a reason'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_verification_rules ON public.ticket_verifications;
CREATE TRIGGER trg_enforce_verification_rules
  BEFORE INSERT OR UPDATE ON public.ticket_verifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_verification_rules();

-- -----------------------------------------------------------------------------
-- 7. Audit trail writer (append-only; SECURITY DEFINER so it bypasses RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_verification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor_id uuid;
  v_actor_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_actor_id := NEW.submitted_by;
    v_actor_name := coalesce(NEW.submitted_by_name, 'system');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_action := CASE NEW.status
      WHEN 'pending_review' THEN 'submitted'
      WHEN 'approved' THEN 'approved'
      WHEN 'rejected' THEN 'rejected'
      WHEN 'changes_requested' THEN 'changes_requested'
      WHEN 'cancelled' THEN 'cancelled'
      ELSE 'updated'
    END;
    v_actor_id := coalesce(NEW.reviewer_id, NEW.submitted_by);
    v_actor_name := coalesce(NEW.reviewer_name, NEW.submitted_by_name, 'system');
  ELSIF jsonb_array_length(coalesce(NEW.evidence, '[]'::jsonb))
        <> jsonb_array_length(coalesce(OLD.evidence, '[]'::jsonb)) THEN
    v_action := 'evidence_added';
    v_actor_id := NEW.submitted_by;
    v_actor_name := coalesce(NEW.submitted_by_name, 'system');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.verification_events (
    verification_id, ticket_id, machine_id, company_id,
    action, actor_id, actor_name, from_status, to_status, details
  ) VALUES (
    NEW.id, NEW.ticket_id, NEW.machine_id, NEW.company_id,
    v_action, v_actor_id, v_actor_name,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    jsonb_build_object(
      'attempt', NEW.attempt,
      'evidence_count', jsonb_array_length(coalesce(NEW.evidence, '[]'::jsonb)),
      'has_signature', coalesce(NEW.signature_url, '') <> '',
      'notes', left(coalesce(NEW.review_notes, NEW.technician_notes, ''), 500),
      'rejection_reason', NEW.rejection_reason
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_verification_event ON public.ticket_verifications;
CREATE TRIGGER trg_log_verification_event
  AFTER INSERT OR UPDATE ON public.ticket_verifications
  FOR EACH ROW EXECUTE FUNCTION public.log_verification_event();

-- -----------------------------------------------------------------------------
-- 8. Mirror the verification outcome onto the ticket
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_verification_to_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending_review' THEN
    UPDATE public.tickets
       SET lifecycle_stage = 'verification_pending',
           verification_id = NEW.id,
           verification_status = NEW.status
     WHERE id = NEW.ticket_id
       AND NOT public.is_closed_state(status, lifecycle_stage);

  ELSIF NEW.status = 'approved' THEN
    UPDATE public.tickets
       SET status = 'resolved',
           lifecycle_stage = 'closed',
           verified_at = coalesce(NEW.reviewed_at, timezone('utc'::text, now())),
           closure_approved_by = coalesce(NEW.reviewer_name, 'supervisor'),
           verification_id = NEW.id,
           verification_status = NEW.status
     WHERE id = NEW.ticket_id;

  ELSIF NEW.status IN ('rejected', 'changes_requested') THEN
    UPDATE public.tickets
       SET lifecycle_stage = 'work_started',
           status = 'open',
           verification_id = NEW.id,
           verification_status = NEW.status
     WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_verification_to_ticket ON public.ticket_verifications;
CREATE TRIGGER trg_apply_verification_to_ticket
  AFTER INSERT OR UPDATE ON public.ticket_verifications
  FOR EACH ROW EXECUTE FUNCTION public.apply_verification_to_ticket();

-- -----------------------------------------------------------------------------
-- 9. THE GATE — refuse a transition into a closed state without an approved
--    verification (unless the caller supplies an audited override reason).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_verification_before_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  policy public.verification_settings;
  v_approved_id uuid;
BEGIN
  -- Only interested in transitions *into* a closed state.
  IF NOT public.is_closed_state(NEW.status, NEW.lifecycle_stage) THEN
    RETURN NEW;
  END IF;
  IF public.is_closed_state(OLD.status, OLD.lifecycle_stage) THEN
    RETURN NEW;  -- already closed; nothing to gate
  END IF;

  SELECT m.company_id INTO v_company_id FROM public.machines m WHERE m.id = NEW.machine_id;
  policy := public.verification_policy_for_company(v_company_id);

  IF NOT policy.enforce_verification_on_close THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_approved_id
    FROM public.ticket_verifications
   WHERE ticket_id = NEW.id AND status = 'approved'
   ORDER BY reviewed_at DESC NULLS LAST
   LIMIT 1;

  IF v_approved_id IS NOT NULL THEN
    NEW.verification_id := coalesce(NEW.verification_id, v_approved_id);
    NEW.verification_status := 'approved';
    RETURN NEW;
  END IF;

  -- Audited emergency override.
  IF coalesce(NEW.closure_override_reason, '') <> ''
     AND NEW.closure_override_reason IS DISTINCT FROM OLD.closure_override_reason THEN
    INSERT INTO public.verification_events (
      verification_id, ticket_id, machine_id, company_id,
      action, actor_id, actor_name, from_status, to_status, details
    ) VALUES (
      NULL, NEW.id, NEW.machine_id, v_company_id,
      'closure_override', NULL, coalesce(NEW.closure_override_by, 'system'),
      OLD.status, NEW.status,
      jsonb_build_object('reason', NEW.closure_override_reason, 'wo', NEW.wo_number)
    );
    NEW.verification_status := 'overridden';
    RETURN NEW;
  END IF;

  INSERT INTO public.verification_events (
    verification_id, ticket_id, machine_id, company_id,
    action, actor_name, from_status, to_status, details
  ) VALUES (
    NULL, NEW.id, NEW.machine_id, v_company_id,
    'closure_blocked', 'system', OLD.status, NEW.status,
    jsonb_build_object('wo', NEW.wo_number, 'reason', 'no approved verification')
  );

  RAISE EXCEPTION 'VERIFICATION_REQUIRED: work order % cannot be closed without an approved verification', coalesce(NEW.wo_number, NEW.id::text)
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_verification_before_closure ON public.tickets;
CREATE TRIGGER trg_enforce_verification_before_closure
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_verification_before_closure();

-- -----------------------------------------------------------------------------
-- 10. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.ticket_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view verifications in their company" ON public.ticket_verifications;
CREATE POLICY "Users can view verifications in their company"
  ON public.ticket_verifications FOR SELECT
  USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Users can raise verifications in their company" ON public.ticket_verifications;
CREATE POLICY "Users can raise verifications in their company"
  ON public.ticket_verifications FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.machines m ON m.id = t.machine_id
      WHERE m.company_id = public.get_current_company_id()
    )
  );

DROP POLICY IF EXISTS "Users can update verifications in their company" ON public.ticket_verifications;
CREATE POLICY "Users can update verifications in their company"
  ON public.ticket_verifications FOR UPDATE
  USING (company_id = public.get_current_company_id())
  WITH CHECK (company_id = public.get_current_company_id());

-- Audit trail is read-only to clients; only SECURITY DEFINER triggers write.
DROP POLICY IF EXISTS "Users can view verification events in their company" ON public.verification_events;
CREATE POLICY "Users can view verification events in their company"
  ON public.verification_events FOR SELECT
  USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Users can view their verification settings" ON public.verification_settings;
CREATE POLICY "Users can view their verification settings"
  ON public.verification_settings FOR SELECT
  USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Users can upsert their verification settings" ON public.verification_settings;
CREATE POLICY "Users can upsert their verification settings"
  ON public.verification_settings FOR ALL
  USING (company_id = public.get_current_company_id())
  WITH CHECK (company_id = public.get_current_company_id());

-- -----------------------------------------------------------------------------
-- 11. Evidence storage bucket (private; signed URLs are issued by the client)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-evidence', 'verification-evidence', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Company members can read verification evidence" ON storage.objects;
CREATE POLICY "Company members can read verification evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-evidence' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Company members can upload verification evidence" ON storage.objects;
CREATE POLICY "Company members can upload verification evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-evidence' AND auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 12. Convenience view: the verification queue a supervisor actually works
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.verification_queue AS
SELECT
  v.id                AS verification_id,
  v.ticket_id,
  v.machine_id,
  v.company_id,
  v.status,
  v.attempt,
  v.submitted_by,
  v.submitted_by_name,
  v.submitted_at,
  v.technician_notes,
  jsonb_array_length(coalesce(v.evidence, '[]'::jsonb)) AS evidence_count,
  coalesce(v.signature_url, '') <> ''                   AS has_signature,
  t.wo_number,
  t.issue_text,
  t.urgency,
  m.name              AS machine_name
FROM public.ticket_verifications v
JOIN public.tickets t ON t.id = v.ticket_id
LEFT JOIN public.machines m ON m.id = v.machine_id
WHERE v.status IN ('pending_review', 'changes_requested');
