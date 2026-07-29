CREATE TABLE IF NOT EXISTS public.qr_gateway_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  phone text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  reporter_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT qr_gateway_sessions_phone_format CHECK (phone ~ '^[0-9]{10}$')
);

CREATE INDEX IF NOT EXISTS qr_gateway_sessions_phone_idx
  ON public.qr_gateway_sessions(phone);
CREATE INDEX IF NOT EXISTS qr_gateway_sessions_expiry_idx
  ON public.qr_gateway_sessions(expires_at);

ALTER TABLE public.qr_gateway_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qr_gateway_sessions FROM anon, authenticated;
GRANT ALL ON public.qr_gateway_sessions TO service_role;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS reporter_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qr_session_id uuid REFERENCES public.qr_gateway_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS tickets_reporter_user_idx ON public.tickets(reporter_user_id);
CREATE INDEX IF NOT EXISTS tickets_qr_session_idx ON public.tickets(qr_session_id);

CREATE OR REPLACE FUNCTION public.log_ticket_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_value text;
  session_value uuid;
BEGIN
  actor_value := coalesce(NEW.reporter_user_id::text, NEW.reporter_phone, 'system');
  session_value := NEW.qr_session_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details)
    VALUES ('ticket', NEW.id, NEW.machine_id, NEW.factory_id, 'created', actor_value,
      jsonb_build_object(
        'wo', NEW.wo_number,
        'status', NEW.status,
        'source', coalesce(NEW.source, 'unknown'),
        'qr_session_id', session_value,
        'reporter_user_id', NEW.reporter_user_id,
        'reporter_phone', NEW.reporter_phone
      ));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.issue_text IS DISTINCT FROM OLD.issue_text AND NEW.source = 'qr_gateway' THEN
      INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details)
      VALUES ('ticket', NEW.id, NEW.machine_id, NEW.factory_id, 'qr_details_appended', actor_value,
        jsonb_build_object('wo', NEW.wo_number, 'source', NEW.source, 'qr_session_id', session_value));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details)
      VALUES ('ticket', NEW.id, NEW.machine_id, NEW.factory_id,
        CASE WHEN lower(coalesce(NEW.status, '')) IN ('closed', 'resolved') THEN 'closed' ELSE 'status_changed' END,
        coalesce(NEW.closure_approved_by, actor_value),
        jsonb_build_object('from', OLD.status, 'to', NEW.status, 'wo', NEW.wo_number, 'qr_session_id', session_value));
    END IF;
    IF NEW.lifecycle_stage IS DISTINCT FROM OLD.lifecycle_stage THEN
      INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details)
      VALUES ('ticket', NEW.id, NEW.machine_id, NEW.factory_id, 'lifecycle_changed',
        coalesce(NEW.closure_approved_by, actor_value),
        jsonb_build_object('from', OLD.lifecycle_stage, 'to', NEW.lifecycle_stage, 'wo', NEW.wo_number, 'qr_session_id', session_value));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
