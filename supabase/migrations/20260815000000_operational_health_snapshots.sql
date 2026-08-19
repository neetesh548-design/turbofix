-- Operational Health Score — snapshot table for the month-over-month trend.
--
-- src/pages/Dashboard.jsx has computed a `healthScore` from live data for a
-- while, but its `healthTrend` field was hardcoded to 0 with the comment
-- "requires historical data; honest zero" — there was nowhere to persist a
-- prior score to compare against. This table is that missing history: one
-- row per company per day, upserted by the client after each score
-- computation (see src/utils/operationalHealth.js for the pure scoring
-- logic — this migration only adds storage, no business logic in SQL).

CREATE TABLE IF NOT EXISTS public.operational_health_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  drivers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (company_id, snapshot_date)
);

-- One index serves both "latest snapshot" and "snapshot ~30 days ago" reads.
CREATE INDEX IF NOT EXISTS operational_health_snapshots_company_date_idx
  ON public.operational_health_snapshots(company_id, snapshot_date DESC);

ALTER TABLE public.operational_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Same company_id-scoping pattern as every other per-company table (see
-- get_current_company_id() usage across pm_schedules, leads, etc.). A
-- company can read and write only its own history, and INSERT/UPDATE are
-- split (rather than one FOR ALL policy) only because the client upserts —
-- both need the same WITH CHECK, so this mirrors the tickets-policy style.
CREATE POLICY "Company members can view their own health snapshots"
  ON public.operational_health_snapshots FOR SELECT
  USING (company_id = public.get_current_company_id());

CREATE POLICY "Company members can insert their own health snapshots"
  ON public.operational_health_snapshots FOR INSERT
  WITH CHECK (company_id = public.get_current_company_id());

CREATE POLICY "Company members can update their own health snapshots"
  ON public.operational_health_snapshots FOR UPDATE
  USING (company_id = public.get_current_company_id())
  WITH CHECK (company_id = public.get_current_company_id());
