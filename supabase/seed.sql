-- =============================================
-- TurboFix Seed Data — migrated from Google Sheets / Excel
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================

-- 1. Companies
INSERT INTO public.companies (id, name, domain, status, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Acme Forge Pvt Ltd', 'ACME3', 'active', '2026-01-15T00:00:00Z'),
  ('a1000000-0000-0000-0000-000000000002', 'Beta Precision Works', 'BETA1', 'active', '2026-03-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 2. Machines
-- ACME3 machines
INSERT INTO public.machines (id, company_id, name, location, assigned_technician_phone, informed_phone_1, status, created_at) VALUES
  ('m1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'CNC Lathe 1', 'Shop Floor A', '+919812340001', '+919812340010', 'healthy', '2026-01-15T00:00:00Z'),
  ('m1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Hydraulic Press', 'Shop Floor B', '+919812340002', '+919812340010', 'healthy', '2026-01-15T00:00:00Z'),
-- BETA1 machines
  ('m1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Grinding Machine', 'Unit 2', '+919812340003', '+919812340020', 'healthy', '2026-03-01T00:00:00Z'),
  ('m1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Compressor', 'Utility Room', '+919812340004', '+919812340020', 'healthy', '2026-03-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 3. Tickets
INSERT INTO public.tickets (id, machine_id, reporter_phone, status, issue_text, ai_summary, created_at) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000001', '+919900011111', 'open',
   'Loud grinding noise from spindle',
   '{"summary": "Spindle bearing wear suspected; medium urgency; inspect and lubricate/replace bearing", "urgency": "medium", "language": "hi"}'::jsonb,
   '2026-07-01T09:00:00Z'),

  ('t1000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000002', '+919900011112', 'closed',
   'Press not building full pressure',
   '{"summary": "Hydraulic seal leak likely; high urgency; check seals and fluid level", "urgency": "medium", "language": "en"}'::jsonb,
   '2026-07-05T10:00:00Z'),

  ('t1000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000003', '+919900011113', 'closed',
   'Grinding wheel wobble',
   '{"summary": "Wheel balance/mounting issue; medium urgency; re-mount and balance wheel", "urgency": "medium", "language": "en"}'::jsonb,
   '2026-07-07T08:00:00Z'),

  ('t1000000-0000-0000-0000-000000000004', 'm1000000-0000-0000-0000-000000000004', '+919900011114', 'open',
   'Compressor tripping breaker repeatedly',
   '{"summary": "Possible motor overload or short; high urgency; electrician to inspect", "urgency": "high", "language": "en"}'::jsonb,
   '2026-07-02T07:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- 4. Events
INSERT INTO public.events (id, ticket_id, event_type, message, created_at) VALUES
  ('e1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001', 'ticket_created', 'Ticket opened via WhatsApp by +919900011111', '2026-07-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 5. Documents
INSERT INTO public.documents (id, machine_id, title, category, file_url, created_at) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000001', 'CNC Lathe 1 - Operation & Maintenance Manual', 'manual', 'documents/ACME3/cnc-lathe-1-manual.txt', '2026-07-07T00:00:00Z'),
  ('d1000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000001', 'CNC Lathe 1 - Electrical Circuit Diagram', 'circuit_diagram', 'documents/ACME3/cnc-lathe-1-circuit.txt', '2026-07-07T00:00:00Z'),
  ('d1000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000002', 'Hydraulic Press - Hydraulic Circuit Diagram', 'hydraulic_diagram', 'documents/ACME3/hyd-press-hydraulic.txt', '2026-07-07T00:00:00Z'),
  ('d1000000-0000-0000-0000-000000000004', 'm1000000-0000-0000-0000-000000000002', 'Hydraulic Press - Spare Parts Catalog', 'spare_parts_catalog', 'documents/ACME3/hyd-press-spares.txt', '2026-07-07T00:00:00Z'),
  ('d1000000-0000-0000-0000-000000000005', 'm1000000-0000-0000-0000-000000000003', 'Grinding Machine - Operation Manual', 'manual', 'documents/BETA1/grinder-manual.txt', '2026-07-07T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 6. Spare Parts
INSERT INTO public.parts (id, machine_id, part_name, part_number, qty_on_hand, unit, reorder_level, supplier) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000001', 'Spindle Bearing 6208ZZ', 'BRG-6208ZZ', 4, 'pcs', 2, 'Pune Bearings Co.'),
  ('p1000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000002', 'Hydraulic Seal Kit', 'SEAL-HP-220', 3, 'kits', 1, 'Hydro Seals Pvt Ltd'),
  ('p1000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000003', 'Grinding Wheel 8in', 'GW-8-A46', 6, 'pcs', 3, 'Abrasives India')
ON CONFLICT (id) DO NOTHING;

-- 7. Consumables
INSERT INTO public.consumables (id, machine_id, name, qty_on_hand, unit, reorder_level) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000001', 'Way Lubricant Oil (ISO VG68)', 20, 'litres', 5),
  ('c1000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000002', 'Hydraulic Fluid (ISO VG46)', 40, 'litres', 10),
  ('c1000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000003', 'Coolant Concentrate', 15, 'litres', 5)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Now link your existing user to ACME3 company (as demo owner)
-- Run this AFTER the inserts above:
-- =============================================
-- UPDATE public.users SET company_id = 'a1000000-0000-0000-0000-000000000001' WHERE email = 'neetesh548@gmail.com';
