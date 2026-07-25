-- KPI snapshots — append-only time series of computed plant KPIs.
--
-- WHY: every KPI in TurboFix is currently derived live from tickets/machines.
-- That answers "what is true now" but loses the past: edit or purge a ticket and
-- the history it implied disappears. Trends are therefore recomputed from
-- whatever rows survive, not from what was actually observed.
--
-- This table records the computed KPI set at a point in time so trend analysis
-- reads recorded history instead of re-deriving it. Rows are never updated —
-- a changed KPI definition must not rewrite the past.

CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code text NOT NULL,
  captured_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Flat {metric_name: numeric} map. jsonb (not columns) so adding a tracked
  -- metric needs no migration; TRACKED_METRICS in analytics_service.py is the
  -- authoritative list of keys.
  metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
  -- What triggered this capture: scheduled | manual | backfill
  source text DEFAULT 'scheduled' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- The dominant read is "series for one company over a recent window".
CREATE INDEX IF NOT EXISTS kpi_snapshots_company_time_idx
  ON public.kpi_snapshots(company_code, captured_at DESC);

-- Guards against a retried scheduler run double-recording the same instant,
-- which would bias any slope computed over the series.
CREATE UNIQUE INDEX IF NOT EXISTS kpi_snapshots_company_instant_idx
  ON public.kpi_snapshots(company_code, captured_at);

COMMENT ON TABLE public.kpi_snapshots IS
  'Append-only time series of computed KPIs. Never UPDATE; recompute means a new row.';
COMMENT ON COLUMN public.kpi_snapshots.metrics IS
  'Flat {metric_name: numeric} map; keys defined by TRACKED_METRICS in analytics_service.py.';

-- Read-only to clients; writes go through the service role (scheduler/backend).
-- Append-only is enforced by granting no UPDATE or DELETE policy at all.
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_snapshots_read ON public.kpi_snapshots;
CREATE POLICY kpi_snapshots_read
  ON public.kpi_snapshots
  FOR SELECT
  USING (true);
