-- Work Order lifecycle (roadmap §3.4)
-- Turns a ticket into a durable, complete work-order record: a human-friendly
-- work-order number, a formal 10-state lifecycle, and the closure fields that
-- were previously kept only in the technician's browser (localStorage).
--
-- All additive. The coarse `status` column (open/resolved/closed) is left
-- untouched so existing filters, views and dashboards keep working; the richer
-- lifecycle lives in the new `lifecycle_stage` column.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS wo_number text,
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'reported',
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS repair_action text,
  ADD COLUMN IF NOT EXISTS parts_used text,
  ADD COLUMN IF NOT EXISTS labour_minutes integer,
  ADD COLUMN IF NOT EXISTS downtime_minutes integer,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS target_response_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS target_completion_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Canonical 10-state lifecycle. Kept as free text (no hard CHECK) so future
-- states can be added without a migration; the UI advances these values.
COMMENT ON COLUMN public.tickets.lifecycle_stage IS
  'reported | acknowledged | assigned | work_started | waiting_spare | waiting_approval | waiting_vendor | repair_completed | verification_pending | closed';

-- Human-friendly work-order number: WO-000001, assigned on insert.
CREATE SEQUENCE IF NOT EXISTS public.work_order_seq;

CREATE OR REPLACE FUNCTION public.assign_wo_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.wo_number IS NULL OR NEW.wo_number = '' THEN
    NEW.wo_number := 'WO-' || lpad(nextval('public.work_order_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_wo_number ON public.tickets;
CREATE TRIGGER trg_assign_wo_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_wo_number();

-- Backfill existing rows in creation order so older tickets also carry a WO number.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT id FROM public.tickets WHERE wo_number IS NULL OR wo_number = '' ORDER BY created_at LOOP
    UPDATE public.tickets
      SET wo_number = 'WO-' || lpad(nextval('public.work_order_seq')::text, 6, '0')
      WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Seed lifecycle_stage for existing rows from the coarse status they already have.
UPDATE public.tickets
  SET lifecycle_stage = CASE
    WHEN lower(coalesce(status, 'open')) IN ('closed', 'resolved') THEN 'closed'
    WHEN started_at IS NOT NULL THEN 'work_started'
    ELSE 'reported'
  END
  WHERE lifecycle_stage IS NULL OR lifecycle_stage = 'reported';

CREATE INDEX IF NOT EXISTS tickets_lifecycle_stage_idx ON public.tickets(lifecycle_stage);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_wo_number_idx ON public.tickets(wo_number) WHERE wo_number IS NOT NULL;
