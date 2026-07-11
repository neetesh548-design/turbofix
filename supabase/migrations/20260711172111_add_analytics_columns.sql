-- ==========================================
-- 1. BASE TABLE UPDATES for Analytics
-- ==========================================

CREATE TYPE fault_category AS ENUM ('electrical', 'mechanical', 'hydraulic', 'operator', 'consumable', 'other');

ALTER TABLE public.tickets 
  ADD COLUMN fault_category fault_category,
  ADD COLUMN first_action_at timestamp with time zone;

-- ==========================================
-- 2. ANALYTICS SCHEMA & VIEWS (Security Invoker)
-- ==========================================

CREATE SCHEMA IF NOT EXISTS analytics;
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT USAGE ON SCHEMA analytics TO service_role;

-- 2A. MTTR (Median Time To Resolution per month)
-- Returns: month, factory_id, mttr_hours
CREATE OR REPLACE VIEW analytics.mttr_monthly 
WITH (security_invoker = true)
AS
SELECT 
  factory_id,
  date_trunc('month', resolved_at) as month,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at))/3600.0) as mttr_hours,
  count(*) as ticket_count
FROM public.tickets
WHERE status = 'resolved' AND resolved_at IS NOT NULL
GROUP BY factory_id, date_trunc('month', resolved_at);

-- 2B. MTBF per machine (Mean Time Between Failures)
-- Requires >= 3 breakdowns to be meaningful
CREATE OR REPLACE VIEW analytics.machine_mtbf 
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
  avg(days_between) as mtbf_days,
  count(*) + 1 as breakdown_count
FROM intervals i
JOIN public.machines m ON m.id = i.machine_id
GROUP BY i.factory_id, i.machine_id, m.name
HAVING count(*) + 1 >= 3;

-- 2C. Downtime Pareto (Machines ranked by open ticket hours in last 90 days)
CREATE OR REPLACE VIEW analytics.downtime_pareto 
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

-- 2D. Preventive Ratio (Preventive vs Total)
CREATE OR REPLACE VIEW analytics.preventive_ratio_monthly 
WITH (security_invoker = true)
AS
SELECT 
  factory_id,
  date_trunc('month', created_at) as month,
  count(*) FILTER (WHERE type = 'preventive') as preventive_tickets,
  count(*) as total_tickets,
  (count(*) FILTER (WHERE type = 'preventive')::float / NULLIF(count(*), 0)) * 100 as preventive_percent
FROM public.tickets
GROUP BY factory_id, date_trunc('month', created_at);

-- 2E. Response Time (Median first action per month)
CREATE OR REPLACE VIEW analytics.response_time_monthly 
WITH (security_invoker = true)
AS
SELECT 
  factory_id,
  date_trunc('month', created_at) as month,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_action_at - created_at))/3600.0) as response_time_hours
FROM public.tickets
WHERE first_action_at IS NOT NULL
GROUP BY factory_id, date_trunc('month', created_at);

-- 2F. Repeat-fault rate (Same category reopened within 30 days)
CREATE OR REPLACE VIEW analytics.repeat_fault_rate 
WITH (security_invoker = true)
AS
WITH faults AS (
  SELECT machine_id, factory_id, fault_category, created_at, resolved_at
  FROM public.tickets
  WHERE status = 'resolved' AND fault_category IS NOT NULL
)
SELECT 
  f1.factory_id,
  date_trunc('month', f1.resolved_at) as month,
  count(DISTINCT f1.machine_id) as machines_with_repeat_faults
FROM faults f1
JOIN faults f2 ON f1.machine_id = f2.machine_id 
  AND f1.fault_category = f2.fault_category
  AND f2.created_at > f1.resolved_at
  AND f2.created_at <= f1.resolved_at + interval '30 days'
GROUP BY f1.factory_id, date_trunc('month', f1.resolved_at);

-- Grant permissions to access these views
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO service_role;
