-- Migration to move views to public schema

-- 2. Drop existing views from custom analytics schema
DROP VIEW IF EXISTS analytics.mttr_monthly CASCADE;
DROP VIEW IF EXISTS analytics.machine_mtbf CASCADE;
DROP VIEW IF EXISTS analytics.downtime_pareto CASCADE;
DROP VIEW IF EXISTS analytics.preventive_ratio_monthly CASCADE;
DROP VIEW IF EXISTS analytics.response_time_monthly CASCADE;
DROP VIEW IF EXISTS analytics.repeat_fault_rate CASCADE;

-- 3. Create views in public schema so they are exposed via PostgREST API
-- A. MTTR View
CREATE OR REPLACE VIEW public.analytics_mttr_monthly 
WITH (security_invoker = true)
AS
SELECT 
  factory_id,
  date_trunc('month', resolved_at) as month,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at))/3600.0) as avg_hours_to_resolve,
  count(*) as ticket_count
FROM public.tickets
WHERE status = 'resolved' AND resolved_at IS NOT NULL
GROUP BY factory_id, date_trunc('month', resolved_at);

-- B. MTBF View
CREATE OR REPLACE VIEW public.analytics_machine_mtbf 
WITH (security_invoker = true)
AS
WITH breakdown_tickets AS (
  SELECT machine_id, factory_id, created_at,
         lag(created_at) OVER (PARTITION BY machine_id ORDER BY created_at) as prev_breakdown
  FROM public.tickets
  WHERE type = 'breakdown'
),
intervals AS (
  SELECT machine_id, factory_id, 
         EXTRACT(EPOCH FROM (created_at - prev_breakdown))/86400.0 as days_between
  FROM breakdown_tickets
  WHERE prev_breakdown IS NOT NULL
)
SELECT 
  i.factory_id,
  i.machine_id,
  m.name as machine_name,
  avg(days_between) as avg_days_between_faults,
  count(*) + 1 as breakdown_count
FROM intervals i
JOIN public.machines m ON m.id = i.machine_id
GROUP BY i.factory_id, i.machine_id, m.name;

-- C. Downtime Pareto View
CREATE OR REPLACE VIEW public.analytics_downtime_pareto 
WITH (security_invoker = true)
AS
SELECT 
  t.factory_id,
  t.machine_id,
  m.name as machine_name,
  sum(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, now()) - t.created_at))/3600.0) as total_downtime_hours
FROM public.tickets t
JOIN public.machines m ON m.id = t.machine_id
WHERE t.type = 'breakdown' AND t.created_at > now() - interval '90 days'
GROUP BY t.factory_id, t.machine_id, m.name
ORDER BY total_downtime_hours DESC;

-- 4. Grant access to public roles
GRANT SELECT ON public.analytics_mttr_monthly TO authenticated;
GRANT SELECT ON public.analytics_machine_mtbf TO authenticated;
GRANT SELECT ON public.analytics_downtime_pareto TO authenticated;
