-- Directory-only demo users (ACME3) — no matching auth.users rows.
--
-- This originally also hand-inserted rows into auth.users with a fixed
-- column list (id, email, encrypted_password, email_confirmed_at,
-- created_at, updated_at, raw_app_meta_data, raw_user_meta_data). GoTrue's
-- auth.users has several NOT NULL columns with no default (varies by
-- Postgres/GoTrue version — instance_id, aud, role, confirmation_token,
-- recovery_token, email_change, etc.), so that insert failed against the
-- current schema and blocked every migration queued after it. These
-- accounts were never wired to any login flow (none of
-- owner/lead/tech@turbofix.co.in appear anywhere outside this file), so
-- rather than chase the exact current auth.users column set, this now
-- only creates the public.users directory rows — matching the working
-- pattern in the sibling 20260727_seed_demo_users.sql migration, which
-- never touches auth.users either. A real login for a seeded account
-- should go through the backend's auth_admin_create_user (GoTrue Admin
-- API), the same path every real signup uses — not a raw SQL insert.

-- ACME3 Demo Users (existing company with machines and inventory)
INSERT INTO public.users (id, company_id, name, role, email, phone, created_at)
VALUES
  ('a9000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Demo Owner', 'owner', 'owner@turbofix.co.in', '+919876543210', now()),
  ('a9000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Demo Lead', 'maintenance_head', 'lead@turbofix.co.in', '+919876543211', now()),
  ('a9000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Demo Tech', 'technician', 'tech@turbofix.co.in', '+919876543212', now())
ON CONFLICT (id) DO NOTHING;
