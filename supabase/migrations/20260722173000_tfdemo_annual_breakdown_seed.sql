-- TFDEMO annual breakdown/resolution demo history.
-- Idempotent: re-running replaces only rows marked with source=tfdemo_annual_seed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.factories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text,
  plan text DEFAULT 'pilot',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text,
  plan text DEFAULT 'pilot',
  domain text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'breakdown',
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ai_verification_status text DEFAULT 'pending',
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
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS raw_audio_bucket text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS raw_audio_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_output_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS final_submission_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS voice_language text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS repeat_failure_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS repeat_failure_count integer DEFAULT 0;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS factory_id uuid;

CREATE TABLE IF NOT EXISTS public.work_order_parts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY
);

ALTER TABLE public.work_order_parts
  ADD COLUMN IF NOT EXISTS factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE;

ALTER TABLE public.work_order_parts
  ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS part_name text,
  ADD COLUMN IF NOT EXISTS quantity numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$
DECLARE
  demo_company uuid := 'a1000000-0000-0000-0000-000000000099';
  demo_factory uuid := 'f1000000-0000-0000-0000-000000000099';
BEGIN
  INSERT INTO public.companies (id, name, domain, status, created_at)
  VALUES (demo_company, 'TFDEMO', 'TFDEMO', 'active', now() - interval '1 year')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, domain = EXCLUDED.domain, status = 'active';

  INSERT INTO public.factories (id, name, city, plan, created_at)
  VALUES (demo_factory, 'TFDEMO', 'Pune', 'pilot', now() - interval '1 year')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

  INSERT INTO public.organizations (id, name, city, plan, domain, status, created_at)
  VALUES (demo_factory, 'TFDEMO', 'Pune', 'pilot', 'TFDEMO', 'active', now() - interval '1 year')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, domain = EXCLUDED.domain, status = 'active';

  DELETE FROM public.events
  WHERE ticket_id IN (
    SELECT id FROM public.tickets WHERE ai_summary->>'source' = 'tfdemo_annual_seed'
  );

  DELETE FROM public.audit_log
  WHERE entity_id IN (
    SELECT id FROM public.tickets WHERE ai_summary->>'source' = 'tfdemo_annual_seed'
  );

  DELETE FROM public.work_order_parts
  WHERE ticket_id IN (
    SELECT id FROM public.tickets WHERE ai_summary->>'source' = 'tfdemo_annual_seed'
  );

  DELETE FROM public.tickets
  WHERE ai_summary->>'source' = 'tfdemo_annual_seed';

  INSERT INTO public.machines (
    id, company_id, factory_id, name, location, status, asset_code, category,
    manufacturer, model, department, production_line, criticality,
    hourly_downtime_cost, replacement_cost, maintenance_interval_days,
    last_maintenance_date, next_maintenance_due, assigned_technician_phone,
    informed_phone_1, created_at
  )
  VALUES
    ('bb100000-0000-0000-0000-000000000001', demo_company, demo_factory, 'CNC Lathe 1', 'Shop Floor A', 'healthy', 'CNC-01', 'CNC', 'Luzhong', 'CK6150', 'Production', 'Line A', 'high', 4500, 4200000, 60, current_date - 35, current_date + 25, '+919876543210', '+919876543200', now() - interval '1 year'),
    ('bb100000-0000-0000-0000-000000000002', demo_company, demo_factory, 'Hydraulic Press', 'Shop Floor B', 'down', 'HP-02', 'Press', 'Rajkot Hydraulics', 'HP-100T', 'Press Shop', 'Line B', 'critical', 6500, 5200000, 45, current_date - 80, current_date - 35, '+919876543211', '+919876543200', now() - interval '1 year'),
    ('bb100000-0000-0000-0000-000000000005', demo_company, demo_factory, 'Screw Air Compressor', 'Utility Block E', 'down', 'CMP-05', 'Utility', 'Elgi', 'EG-22', 'Utilities', 'Compressed Air', 'critical', 3800, 1800000, 30, current_date - 45, current_date - 15, '+919876543212', '+919876543200', now() - interval '1 year'),
    ('bb100000-0000-0000-0000-000000000006', demo_company, demo_factory, 'Injection Molding Press', 'Assembly Line C', 'down', 'IMP-06', 'Molding', 'Ferromatik', 'Milacron 250', 'Molding', 'Line C', 'high', 5200, 6100000, 50, current_date - 62, current_date - 12, '+919876543213', '+919876543200', now() - interval '1 year'),
    ('bb100000-0000-0000-0000-000000000007', demo_company, demo_factory, 'Laser Cutting Bed', 'Fabrication Bay D', 'down', 'LCB-07', 'Laser', 'Trumpf', 'TruLaser 3030', 'Fabrication', 'Bay D', 'high', 7000, 8500000, 45, current_date - 72, current_date - 27, '+919876543214', '+919876543200', now() - interval '1 year')
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    factory_id = EXCLUDED.factory_id,
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    status = EXCLUDED.status,
    asset_code = EXCLUDED.asset_code,
    category = EXCLUDED.category,
    manufacturer = EXCLUDED.manufacturer,
    model = EXCLUDED.model,
    department = EXCLUDED.department,
    production_line = EXCLUDED.production_line,
    criticality = EXCLUDED.criticality,
    hourly_downtime_cost = EXCLUDED.hourly_downtime_cost,
    replacement_cost = EXCLUDED.replacement_cost,
    maintenance_interval_days = EXCLUDED.maintenance_interval_days,
    last_maintenance_date = EXCLUDED.last_maintenance_date,
    next_maintenance_due = EXCLUDED.next_maintenance_due,
    assigned_technician_phone = EXCLUDED.assigned_technician_phone,
    informed_phone_1 = EXCLUDED.informed_phone_1;

  WITH machine_pool AS (
    SELECT *
    FROM (VALUES
      (1, 'bb100000-0000-0000-0000-000000000001'::uuid, 'CNC Lathe 1', 'spindle vibration above normal limit', 'Spindle bearing wear', 'Bearing inspection, lubrication flush and alignment check', 'Spindle bearing 6208ZZ', 1, 8200),
      (2, 'bb100000-0000-0000-0000-000000000002'::uuid, 'Hydraulic Press', 'pressure drop during final stroke', 'Hydraulic seal leakage', 'Seal kit replacement and pressure relief valve setting', 'Hydraulic seal kit', 1, 6400),
      (3, 'bb100000-0000-0000-0000-000000000005'::uuid, 'Screw Air Compressor', 'air pressure low with high temperature alarm', 'Intake filter choking', 'Filter replacement and oil separator cleaning', 'Air filter element', 2, 2100),
      (4, 'bb100000-0000-0000-0000-000000000006'::uuid, 'Injection Molding Press', 'barrel heater zone temperature unstable', 'Heater band failure', 'Heater band replacement and thermocouple check', 'Heater band', 2, 3600),
      (5, 'bb100000-0000-0000-0000-000000000007'::uuid, 'Laser Cutting Bed', 'chiller flow low and laser power fluctuation', 'Chiller flow restriction', 'Coolant flush, filter replacement and nozzle cleaning', 'Chiller filter', 1, 4900)
    ) AS m(slot, machine_id, machine_name, symptom, root_cause, repair_action, part_name, quantity, unit_price)
  ),
  generated AS (
    SELECT
      gen_random_uuid() AS id,
      demo_factory AS factory_id,
      m.*,
      gs AS n,
      (now() - interval '365 days' + (gs * interval '8 hours 45 minutes')) AS created_at,
      CASE WHEN gs % 10 IN (0, 7) THEN 'open' WHEN gs % 10 = 8 THEN 'closed' ELSE 'resolved' END AS status,
      CASE WHEN gs % 13 = 0 THEN 'critical' WHEN gs % 5 = 0 THEN 'high' WHEN gs % 3 = 0 THEN 'medium' ELSE 'low' END AS urgency,
      CASE WHEN gs % 10 IN (0, 7) THEN NULL ELSE (now() - interval '365 days' + (gs * interval '8 hours 45 minutes') + ((35 + (gs % 480)) * interval '1 minute')) END AS resolved_at,
      35 + (gs % 480) AS downtime_minutes,
      25 + (gs % 360) AS labour_minutes
    FROM generate_series(1, 1000) AS gs
    JOIN machine_pool m ON m.slot = ((gs - 1) % 5) + 1
  ),
  inserted_tickets AS (
    INSERT INTO public.tickets (
      id, factory_id, machine_id, reporter_phone, status, issue_text,
      ai_summary, created_at, type, urgency, started_at, resolved_at,
      ai_verification_status, lifecycle_stage, root_cause, repair_action, parts_used,
      labour_minutes, downtime_minutes, acknowledged_at, target_response_at,
      target_completion_at, verified_at, raw_audio_bucket, raw_audio_path,
      ai_output_snapshot, review_snapshot, final_submission_snapshot, voice_language,
      repeat_failure_flag, repeat_failure_count
    )
    SELECT
      id, factory_id, machine_id, '+91980000' || lpad((1000 + n)::text, 4, '0'), status,
      '[TFDEMO annual seed] ' || symptom,
      jsonb_build_object(
        'source', 'tfdemo_annual_seed',
        'summary', machine_name || ': ' || symptom,
        'urgency', urgency,
        'language', CASE WHEN n % 3 = 0 THEN 'hi' ELSE 'en' END,
        'issue_category', CASE WHEN n % 4 = 0 THEN 'electrical' ELSE 'mechanical' END
      ),
      created_at, 'breakdown', urgency, created_at + interval '12 minutes', resolved_at,
      CASE WHEN status = 'open' THEN 'pending' ELSE 'approved' END,
      CASE WHEN status = 'open' THEN 'work_started' ELSE 'closed' END,
      CASE WHEN status = 'open' THEN NULL ELSE root_cause END,
      CASE WHEN status = 'open' THEN NULL ELSE repair_action END,
      CASE WHEN status = 'open' THEN NULL ELSE part_name || ' x ' || quantity END,
      CASE WHEN status = 'open' THEN NULL ELSE labour_minutes END,
      downtime_minutes,
      created_at + interval '6 minutes',
      created_at + interval '30 minutes',
      created_at + interval '8 hours',
      CASE WHEN status = 'open' THEN NULL ELSE resolved_at + interval '10 minutes' END,
      'voice-notes',
      'TFDEMO/demo-ticket-' || lpad(n::text, 4, '0') || '.webm',
      jsonb_build_object('transcript', 'Operator reported ' || symptom, 'provider', 'gemini', 'machine_id', machine_id),
      jsonb_build_object('machine_condition', CASE WHEN status = 'open' THEN 'Running with issue' ELSE 'Resolved after repair' END, 'reviewed_by', 'TFDEMO operator'),
      jsonb_build_object('submitted', true, 'source', 'qr_gateway', 'work_order_expected', true),
      CASE WHEN n % 3 = 0 THEN 'hi-IN' ELSE 'en-IN' END,
      n % 6 = 0,
      CASE WHEN n % 6 = 0 THEN 3 + (n % 5) ELSE 0 END
    FROM generated
    RETURNING id, machine_id, factory_id, status, created_at, resolved_at
  ),
  inserted_parts AS (
    INSERT INTO public.work_order_parts (ticket_id, machine_id, factory_id, part_name, quantity, unit_price, total_cost, created_by, created_at)
    SELECT t.id, t.machine_id, t.factory_id, g.part_name, g.quantity, g.unit_price, g.quantity * g.unit_price, 'tfdemo_seed', coalesce(t.resolved_at, t.created_at + interval '30 minutes')
    FROM inserted_tickets t
    JOIN generated g ON g.id = t.id
    WHERE t.status <> 'open'
    RETURNING ticket_id
  ),
  inserted_events AS (
    INSERT INTO public.events (ticket_id, event_type, message, created_at)
    SELECT id, 'ticket_created', 'TFDEMO breakdown request recorded from QR Gateway', created_at FROM inserted_tickets
    UNION ALL
    SELECT id, 'technician_assigned', 'Assigned to TFDEMO technician based on machine owner mapping', created_at + interval '7 minutes' FROM inserted_tickets
    UNION ALL
    SELECT id, 'work_started', 'Technician started diagnosis and captured repair notes', created_at + interval '15 minutes' FROM inserted_tickets
    UNION ALL
    SELECT id, 'ticket_resolved', 'Repair completed, verified, and recorded in machine history', resolved_at FROM inserted_tickets WHERE status <> 'open'
    RETURNING ticket_id
  )
  INSERT INTO public.audit_log (entity_type, entity_id, machine_id, factory_id, action, actor, details, created_at)
  SELECT 'ticket', id, machine_id, factory_id, 'lifecycle_changed', 'tfdemo_seed',
         jsonb_build_object('from', 'reported', 'to', CASE WHEN status = 'open' THEN 'work_started' ELSE 'closed' END, 'seed', 'tfdemo_annual_seed'),
         coalesce(resolved_at, created_at + interval '20 minutes')
  FROM inserted_tickets;
END $$;
