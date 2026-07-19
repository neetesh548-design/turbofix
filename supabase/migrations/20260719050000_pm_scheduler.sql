-- Preventive Maintenance Scheduler (roadmap §3.5)
-- First-class PM schedules per machine (the current cron only handled
-- consumable replacement, not machine PM tasks) plus a completion log that
-- drives PM-compliance. Fully additive; nothing existing is altered.

CREATE TABLE IF NOT EXISTS public.pm_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id uuid REFERENCES public.machines ON DELETE CASCADE NOT NULL,
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  title text NOT NULL,
  -- Trigger basis (roadmap §3.5): calendar | operating_hours | cycle_count |
  -- meter_reading | production_qty | condition. Kept free text (no CHECK) so
  -- more bases can be added without a migration.
  trigger_type text DEFAULT 'calendar',
  frequency_days integer,          -- for calendar triggers
  interval_value numeric,          -- for hours/cycles/meter/quantity triggers
  checklist jsonb DEFAULT '[]'::jsonb,   -- [{ label, mandatory }]
  required_tools text,
  required_spares text,
  estimated_minutes integer,
  assigned_technician_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_done_at timestamp with time zone,
  next_due_at timestamp with time zone,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pm_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pm_schedule_id uuid REFERENCES public.pm_schedules ON DELETE CASCADE NOT NULL,
  machine_id uuid REFERENCES public.machines ON DELETE CASCADE NOT NULL,
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  due_at timestamp with time zone,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  on_time boolean,
  completed_by text,
  notes text
);

-- Auto-compute next_due_at for calendar schedules from last completion (or
-- creation) + frequency_days. Non-calendar triggers are managed by the app.
CREATE OR REPLACE FUNCTION public.pm_calc_next_due()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trigger_type = 'calendar' AND NEW.frequency_days IS NOT NULL THEN
    NEW.next_due_at := coalesce(NEW.last_done_at, NEW.created_at, now())
      + (NEW.frequency_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_calc_next_due ON public.pm_schedules;
CREATE TRIGGER trg_pm_calc_next_due
  BEFORE INSERT OR UPDATE OF last_done_at, frequency_days, trigger_type
  ON public.pm_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.pm_calc_next_due();

CREATE INDEX IF NOT EXISTS pm_schedules_machine_idx ON public.pm_schedules(machine_id);
CREATE INDEX IF NOT EXISTS pm_schedules_next_due_idx ON public.pm_schedules(next_due_at) WHERE active;
CREATE INDEX IF NOT EXISTS pm_logs_schedule_idx ON public.pm_logs(pm_schedule_id);
CREATE INDEX IF NOT EXISTS pm_logs_machine_idx ON public.pm_logs(machine_id);

-- RLS — machine-scoped to the user's company, mirroring parts/consumables.
ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PM schedules for their machines"
  ON public.pm_schedules FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can insert PM schedules"
  ON public.pm_schedules FOR INSERT
  WITH CHECK (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can update PM schedules"
  ON public.pm_schedules FOR UPDATE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can delete PM schedules"
  ON public.pm_schedules FOR DELETE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));

CREATE POLICY "Users can view PM logs for their machines"
  ON public.pm_logs FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can insert PM logs"
  ON public.pm_logs FOR INSERT
  WITH CHECK (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
