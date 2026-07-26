-- Seed demo users for TurboFix demo company (TFDEMO)
-- These users are used for quick demo login without credentials

-- 1. Ensure TFDEMO company exists
INSERT INTO public.companies (id, name, domain, status, created_at)
VALUES ('tfdemo-company-001', 'TurboFix Demo', 'TFDEMO', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- 2. Create demo users linked to TFDEMO company
-- Note: These are placeholder users that get linked to real auth users during demo login
INSERT INTO public.users (id, company_id, name, role, email, phone, created_at)
VALUES
  ('demo-user-owner-001', 'tfdemo-company-001', 'Rajesh Sharma', 'owner', 'rajesh@turbofix-demo', '+919876543210', now()),
  ('demo-user-maint-001', 'tfdemo-company-001', 'Vikram Patil', 'maintenance_head', 'vikram@turbofix-demo', '+919876543211', now()),
  ('demo-user-tech-001', 'tfdemo-company-001', 'Amit Kumar', 'technician', 'amit@turbofix-demo', '+919876543212', now())
ON CONFLICT (id) DO NOTHING;

-- 3. Create demo machines for TFDEMO
INSERT INTO public.machines (id, company_id, name, location, status, created_at)
VALUES
  ('demo-machine-001', 'tfdemo-company-001', 'Compressor Unit A', 'Shop Floor 1', 'healthy', now()),
  ('demo-machine-002', 'tfdemo-company-001', 'Hydraulic Press B', 'Shop Floor 2', 'healthy', now()),
  ('demo-machine-003', 'tfdemo-company-001', 'CNC Lathe C', 'Machine Shop', 'healthy', now())
ON CONFLICT (id) DO NOTHING;

-- 4. Seed parts for demo machines
INSERT INTO public.parts (id, machine_id, part_name, part_number, qty_on_hand, unit, reorder_level, supplier)
VALUES
  ('demo-part-001', 'demo-machine-001', 'Air Filter Element', 'AFE-2000', 5, 'pcs', 2, 'Airflow Industries'),
  ('demo-part-002', 'demo-machine-001', 'Compressor Oil', 'OIL-COMP-100', 12, 'litres', 5, 'Lubricants Ltd'),
  ('demo-part-003', 'demo-machine-002', 'Hydraulic Pump Seal', 'SEAL-HP-220', 3, 'kits', 1, 'Hydro Seals'),
  ('demo-part-004', 'demo-machine-002', 'Pressure Relief Valve', 'PRV-300', 2, 'pcs', 1, 'Hydro Components'),
  ('demo-part-005', 'demo-machine-003', 'Spindle Bearing', 'BRG-6208', 4, 'pcs', 2, 'Precision Bearings')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed consumables for demo machines
INSERT INTO public.consumables (id, machine_id, name, qty_on_hand, unit, reorder_level)
VALUES
  ('demo-cons-001', 'demo-machine-001', 'Lubricating Grease', 8, 'kg', 3),
  ('demo-cons-002', 'demo-machine-002', 'Hydraulic Fluid ISO VG46', 50, 'litres', 15),
  ('demo-cons-003', 'demo-machine-003', 'Cutting Coolant Concentrate', 20, 'litres', 5)
ON CONFLICT (id) DO NOTHING;
