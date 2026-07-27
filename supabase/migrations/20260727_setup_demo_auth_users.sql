-- Create Supabase auth users for demo accounts so RLS policies work

-- Import pgcrypto for password hashing if not already imported
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ACME3 Demo Users (existing company with machines and inventory)
-- Create users in public.users first if they don't exist
INSERT INTO public.users (id, company_id, name, role, email, phone, created_at)
VALUES
  ('a9000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Demo Owner', 'owner', 'owner@turbofix.co.in', '+919876543210', now()),
  ('a9000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Demo Lead', 'maintenance_head', 'lead@turbofix.co.in', '+919876543211', now()),
  ('a9000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Demo Tech', 'technician', 'tech@turbofix.co.in', '+919876543212', now())
ON CONFLICT (id) DO NOTHING;

-- Now create auth users with matching IDs
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'a9000000-0000-0000-0000-000000000001'::uuid,
  'owner@turbofix.co.in',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Demo Owner","role":"owner","company_code":"ACME3"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'a9000000-0000-0000-0000-000000000002'::uuid,
  'lead@turbofix.co.in',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Demo Lead","role":"maintenance_head","company_code":"ACME3"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'a9000000-0000-0000-0000-000000000003'::uuid,
  'tech@turbofix.co.in',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Demo Tech","role":"technician","company_code":"ACME3"}'::jsonb
) ON CONFLICT (id) DO NOTHING;
