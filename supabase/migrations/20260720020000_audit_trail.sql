-- Audit Trail (roadmap §10.4, Tier 0) — append-only record of ticket state
-- changes. Written automatically by a SECURITY DEFINER trigger (so it bypasses
-- RLS on insert); users get read-only access, no update/delete. Zero burden.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,           -- 'ticket'
  entity_id uuid,
  machine_id uuid,
  factory_id uuid,
  action text NOT NULL,                -- created | status_changed | closed | lifecycle_changed
  actor text,                          -- best-effort: closer/reporter, else 'system'
  details jsonb DEFAULT '{}'::jsonb,   -- { from, to, wo, ... }
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_log_machine_idx ON public.audit_log(machine_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_ticket_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details)
    VALUES ('ticket', NEW.id, NEW.machine_id, NEW.factory_id, 'created',
            coalesce(NEW.reporter_phone, 'system'),
            jsonb_build_object('wo', NEW.wo_number, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details)
      VALUES ('ticket', NEW.id, NEW.machine_id, NEW.factory_id,
              CASE WHEN lower(coalesce(NEW.status, '')) IN ('closed', 'resolved') THEN 'closed' ELSE 'status_changed' END,
              coalesce(NEW.closure_approved_by, 'system'),
              jsonb_build_object('from', OLD.status, 'to', NEW.status, 'wo', NEW.wo_number));
    END IF;
    IF NEW.lifecycle_stage IS DISTINCT FROM OLD.lifecycle_stage THEN
      INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details)
      VALUES ('ticket', NEW.id, NEW.machine_id, NEW.factory_id, 'lifecycle_changed',
              coalesce(NEW.closure_approved_by, 'system'),
              jsonb_build_object('from', OLD.lifecycle_stage, 'to', NEW.lifecycle_stage, 'wo', NEW.wo_number));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_audit ON public.tickets;
CREATE TRIGGER trg_ticket_audit
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_audit();

-- Read-only for the company; append-only (no UPDATE/DELETE policies). The
-- trigger inserts under SECURITY DEFINER, so no INSERT policy is needed.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit for their machines"
  ON public.audit_log FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
