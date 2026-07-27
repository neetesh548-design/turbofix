-- Seed demo users and inventory data for TurboFix demo company (TFDEMO)
-- These users are used for quick demo login without credentials

-- 1. Ensure TFDEMO company exists (use proper UUID format)
INSERT INTO public.companies (id, name, domain, status, created_at)
VALUES ('d1234567-0000-0000-0000-000000000001'::uuid, 'TurboFix Demo', 'TFDEMO', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- 2. Create demo users linked to TFDEMO company
INSERT INTO public.users (id, company_id, name, role, email, phone, created_at)
VALUES
  ('d2234567-0000-0000-0000-000000000001'::uuid, 'd1234567-0000-0000-0000-000000000001'::uuid, 'Rajesh Sharma', 'owner', 'rajesh@turbofix-demo', '+919876543210', now()),
  ('d2234567-0000-0000-0000-000000000002'::uuid, 'd1234567-0000-0000-0000-000000000001'::uuid, 'Vikram Patil', 'maintenance_head', 'vikram@turbofix-demo', '+919876543211', now()),
  ('d2234567-0000-0000-0000-000000000003'::uuid, 'd1234567-0000-0000-0000-000000000001'::uuid, 'Amit Kumar', 'technician', 'amit@turbofix-demo', '+919876543212', now())
ON CONFLICT (id) DO NOTHING;

-- 3. Create demo machines for TFDEMO
INSERT INTO public.machines (id, company_id, name, location, status, created_at)
VALUES
  ('d3234567-0000-0000-0000-000000000001'::uuid, 'd1234567-0000-0000-0000-000000000001'::uuid, 'Compressor Unit A', 'Shop Floor 1', 'healthy', now()),
  ('d3234567-0000-0000-0000-000000000002'::uuid, 'd1234567-0000-0000-0000-000000000001'::uuid, 'Hydraulic Press B', 'Shop Floor 2', 'healthy', now()),
  ('d3234567-0000-0000-0000-000000000003'::uuid, 'd1234567-0000-0000-0000-000000000001'::uuid, 'CNC Lathe C', 'Machine Shop', 'healthy', now())
ON CONFLICT (id) DO NOTHING;

-- 4. Seed parts for demo machines
INSERT INTO public.parts (id, machine_id, part_name, part_number, stock_qty, unit, reorder_level, supplier)
VALUES
  ('d4234567-0000-0000-0000-000000000001'::uuid, 'd3234567-0000-0000-0000-000000000001'::uuid, 'Air Filter Element', 'AFE-2000', 5, 'pcs', 2, 'Airflow Industries'),
  ('d4234567-0000-0000-0000-000000000002'::uuid, 'd3234567-0000-0000-0000-000000000001'::uuid, 'Compressor Oil', 'OIL-COMP-100', 12, 'litres', 5, 'Lubricants Ltd'),
  ('d4234567-0000-0000-0000-000000000003'::uuid, 'd3234567-0000-0000-0000-000000000002'::uuid, 'Hydraulic Pump Seal', 'SEAL-HP-220', 3, 'kits', 1, 'Hydro Seals'),
  ('d4234567-0000-0000-0000-000000000004'::uuid, 'd3234567-0000-0000-0000-000000000002'::uuid, 'Pressure Relief Valve', 'PRV-300', 2, 'pcs', 1, 'Hydro Components'),
  ('d4234567-0000-0000-0000-000000000005'::uuid, 'd3234567-0000-0000-0000-000000000003'::uuid, 'Spindle Bearing', 'BRG-6208', 4, 'pcs', 2, 'Precision Bearings')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed consumables for demo machines
INSERT INTO public.consumables (id, machine_id, name, stock_qty, unit, reorder_level)
VALUES
  ('d5234567-0000-0000-0000-000000000001'::uuid, 'd3234567-0000-0000-0000-000000000001'::uuid, 'Lubricating Grease', 8, 'kg', 3),
  ('d5234567-0000-0000-0000-000000000002'::uuid, 'd3234567-0000-0000-0000-000000000002'::uuid, 'Hydraulic Fluid ISO VG46', 50, 'litres', 15),
  ('d5234567-0000-0000-0000-000000000003'::uuid, 'd3234567-0000-0000-0000-000000000003'::uuid, 'Cutting Coolant Concentrate', 20, 'litres', 5)
ON CONFLICT (id) DO NOTHING;
