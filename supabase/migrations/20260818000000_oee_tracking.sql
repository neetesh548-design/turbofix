-- OEE (Overall Equipment Effectiveness) tracking — Availability x Performance x
-- Quality. Availability is already derivable from existing ticket downtime data
-- (see src/utils/oee.js), but Performance and Quality genuinely need new input
-- TurboFix never collected before: production count per shift. This migration
-- adds the two machine-level config fields (how fast the machine should run,
-- how long a shift is) and the append-only log operators write counts into.

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS ideal_cycle_time_seconds numeric,
  ADD COLUMN IF NOT EXISTS planned_minutes_per_shift numeric;

-- Append-only by design (not one row per machine per day): a plant running
-- multiple shifts logs one row per shift, and src/utils/oee.js sums whatever
-- rows fall inside the period being measured rather than assuming exactly one
-- entry per day.
CREATE TABLE IF NOT EXISTS public.production_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id uuid REFERENCES public.machines ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  good_count integer NOT NULL DEFAULT 0 CHECK (good_count >= 0),
  reject_count integer NOT NULL DEFAULT 0 CHECK (reject_count >= 0),
  logged_by text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS production_logs_machine_date_idx
  ON public.production_logs(machine_id, log_date DESC);

ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- Same machine-scoped-to-company pattern as pm_schedules/pm_logs.
CREATE POLICY "Users can view production logs for their machines"
  ON public.production_logs FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can insert production logs"
  ON public.production_logs FOR INSERT
  WITH CHECK (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
