-- Reliability Improvement Loop — Repeat → RCA → CAPA → PM revision (roadmap §4.2/§4.3, plan P2)
-- Closes the loop that permanently reduces recurring breakdowns. Additive:
-- the repeat-failure trigger only populates columns that already exist but were
-- never wired; RCA/CAPA are new machine-scoped tables.

-- 1. Wire repeat-breakdown detection (columns exist since phase2 but nothing set them).
--    On a new breakdown ticket, count prior breakdowns for the same machine in a
--    90-day window; flag as repeat from the 2nd occurrence.
CREATE OR REPLACE FUNCTION public.detect_repeat_failure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prior_count int;
BEGIN
  IF coalesce(NEW.type, 'breakdown') = 'breakdown' THEN
    SELECT count(*) INTO prior_count
      FROM public.tickets
      WHERE machine_id = NEW.machine_id
        AND coalesce(type, 'breakdown') = 'breakdown'
        AND id <> NEW.id
        AND created_at >= (now() - interval '90 days');
    NEW.repeat_failure_count := prior_count;
    NEW.repeat_failure_flag := prior_count >= 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_repeat_failure ON public.tickets;
CREATE TRIGGER trg_detect_repeat_failure
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_repeat_failure();

-- 2. Root-Cause Analysis records.
CREATE TABLE IF NOT EXISTS public.rca_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.tickets ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machines ON DELETE CASCADE NOT NULL,
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  failure_mode text,
  immediate_cause text,
  root_cause text,
  five_whys jsonb DEFAULT '[]'::jsonb,           -- ordered array of "why" answers
  fishbone_category text,                         -- Man|Machine|Method|Material|Measurement|Environment
  status text DEFAULT 'open',                     -- open | closed
  created_by text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Corrective & Preventive Actions.
CREATE TABLE IF NOT EXISTS public.capa_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rca_id uuid REFERENCES public.rca_reports ON DELETE CASCADE NOT NULL,
  machine_id uuid REFERENCES public.machines ON DELETE CASCADE NOT NULL,
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  action_type text DEFAULT 'corrective',          -- corrective | preventive
  description text NOT NULL,
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  due_date date,
  status text DEFAULT 'open',                      -- open | done | verified
  effectiveness_verified boolean DEFAULT false,
  applied_to_pm boolean DEFAULT false,             -- preventive action folded into the PM checklist
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS rca_reports_machine_idx ON public.rca_reports(machine_id);
CREATE INDEX IF NOT EXISTS capa_actions_rca_idx ON public.capa_actions(rca_id);
CREATE INDEX IF NOT EXISTS capa_actions_machine_idx ON public.capa_actions(machine_id);
CREATE INDEX IF NOT EXISTS tickets_repeat_failure_idx ON public.tickets(machine_id) WHERE repeat_failure_flag;

-- RLS — machine-scoped to the user's company, mirroring parts/pm_schedules.
ALTER TABLE public.rca_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capa_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view RCA for their machines"
  ON public.rca_reports FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can insert RCA"
  ON public.rca_reports FOR INSERT
  WITH CHECK (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can update RCA"
  ON public.rca_reports FOR UPDATE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can delete RCA"
  ON public.rca_reports FOR DELETE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));

CREATE POLICY "Users can view CAPA for their machines"
  ON public.capa_actions FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can insert CAPA"
  ON public.capa_actions FOR INSERT
  WITH CHECK (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can update CAPA"
  ON public.capa_actions FOR UPDATE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can delete CAPA"
  ON public.capa_actions FOR DELETE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
