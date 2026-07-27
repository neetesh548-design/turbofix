-- Create Supabase auth users for demo accounts so RLS policies work

-- Import pgcrypto for password hashing if not already imported
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert demo users into auth.users table
-- Note: In a real Supabase instance, you'd use the Auth API, but for migrations we can use SQL
-- The user IDs must match those in public.users table

-- Rajesh Sharma (Plant Owner)
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
  'd2234567-0000-0000-0000-000000000001'::uuid,
  'rajesh@turbofix-demo',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Rajesh Sharma","role":"owner","company_code":"TFDEMO"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Vikram Patil (Maintenance Lead)
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
  'd2234567-0000-0000-0000-000000000002'::uuid,
  'vikram@turbofix-demo',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Vikram Patil","role":"maintenance_head","company_code":"TFDEMO"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Amit Kumar (Technician)
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
  'd2234567-0000-0000-0000-000000000003'::uuid,
  'amit@turbofix-demo',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Amit Kumar","role":"technician","company_code":"TFDEMO"}'::jsonb
) ON CONFLICT (id) DO NOTHING;
