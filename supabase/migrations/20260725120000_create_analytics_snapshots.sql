-- Analytics Engine — persistent KPI snapshot storage.
--
-- The dashboard computes KPIs live on every request, which is correct but
-- gives us no history: we cannot answer "was plant health better last month?"
-- or draw a trend line without re-deriving every metric from raw tickets.
-- This table stores one immutable row per (factory, period) so trends are a
-- cheap indexed read instead of a full recomputation.
--
-- Timestamp note: the previous attempt at this migration collided with an
-- existing 20260724010000_* file. This one is 20260725120000, verified unique
-- against every file in supabase/migrations/ (see analytics test suite, which
-- asserts prefix uniqueness so a collision can never silently reappear).
--
-- Fully additive: no existing table, column, policy, or function is altered.

CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE NOT NULL,

  -- Bucket this snapshot summarises. period_kind lets daily and monthly
  -- rollups share one table without a second migration later.
  period_kind text NOT NULL DEFAULT 'daily',   -- daily | weekly | monthly
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- The six headline KPIs, denormalised into columns so trend queries can be
  -- served by an index scan and never have to open the jsonb payload.
  plant_health_pct numeric NOT NULL DEFAULT 0,
  machines_down integer NOT NULL DEFAULT 0,
  urgent_tickets integer NOT NULL DEFAULT 0,
  avg_repair_hours numeric NOT NULL DEFAULT 0,
  cost_total numeric NOT NULL DEFAULT 0,
  pm_compliance_pct numeric NOT NULL DEFAULT 0,

  -- Supporting context: machine counts, cost-by-month series, per-metric
  -- coverage flags. Kept as jsonb because its shape evolves with the service.
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  captured_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  captured_by text,

  CONSTRAINT analytics_snapshots_period_valid CHECK (period_end >= period_start),
  CONSTRAINT analytics_snapshots_health_range CHECK (plant_health_pct BETWEEN 0 AND 100),
  CONSTRAINT analytics_snapshots_pm_range CHECK (pm_compliance_pct BETWEEN 0 AND 100)
);

-- Re-running the capture job for the same period must overwrite, not duplicate.
-- The repository's upsert relies on this constraint as its conflict target.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_snapshots_period_uniq
  ON public.analytics_snapshots(factory_id, period_kind, period_start);

-- Trend reads are always "latest N for this factory", newest first.
CREATE INDEX IF NOT EXISTS analytics_snapshots_factory_time_idx
  ON public.analytics_snapshots(factory_id, period_start DESC);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS mirrors pm_schedules/kaizen_opportunities: factory-scoped reads, and
-- writes restricted to the caller's own factory. Snapshots are an audit record,
-- so there is deliberately no UPDATE or DELETE policy for end users — the
-- capture job runs with the service role and bypasses RLS.
CREATE POLICY "Users can view analytics snapshots for their factory"
  ON public.analytics_snapshots FOR SELECT
  USING (factory_id = public.get_current_company_id());

CREATE POLICY "Staff can insert analytics snapshots for their factory"
  ON public.analytics_snapshots FOR INSERT
  WITH CHECK (factory_id = public.get_current_company_id());
