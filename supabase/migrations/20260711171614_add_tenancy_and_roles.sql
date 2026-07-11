-- ==========================================
-- 1. TENANCY & ROLE LAYER
-- ==========================================

-- Enum for factory plans
CREATE TYPE factory_plan AS ENUM ('pilot', 'paid');

-- 1A. Factories Table
CREATE TABLE public.factories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text,
  whatsapp_group_hint text,
  plan factory_plan DEFAULT 'pilot',
  created_at timestamp with time zone DEFAULT now()
);

-- Enum for user roles
CREATE TYPE user_role AS ENUM ('owner', 'supervisor', 'technician');

-- 1B. Profiles Table
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'technician',
  full_name text,
  phone_e164 text UNIQUE NOT NULL
);

-- 1C. QR Provisioning Table
CREATE TABLE public.machine_qr_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 2. DOMAIN TABLE MODIFICATIONS
-- ==========================================

-- We create a default "Demo Factory" to backfill existing data
DO $$
DECLARE
  demo_factory_id uuid;
BEGIN
  -- Create demo factory
  INSERT INTO public.factories (name, city, plan)
  VALUES ('TurboFix Demo Factory', 'Pune', 'pilot')
  RETURNING id INTO demo_factory_id;

  -- Backfill existing tables
  ALTER TABLE public.machines ADD COLUMN factory_id uuid DEFAULT demo_factory_id REFERENCES public.factories(id) ON DELETE CASCADE;
  ALTER TABLE public.tickets ADD COLUMN factory_id uuid DEFAULT demo_factory_id REFERENCES public.factories(id) ON DELETE CASCADE;
  ALTER TABLE public.parts ADD COLUMN factory_id uuid DEFAULT demo_factory_id REFERENCES public.factories(id) ON DELETE CASCADE;
  ALTER TABLE public.consumables ADD COLUMN factory_id uuid DEFAULT demo_factory_id REFERENCES public.factories(id) ON DELETE CASCADE;
  ALTER TABLE public.suppliers ADD COLUMN factory_id uuid DEFAULT demo_factory_id REFERENCES public.factories(id) ON DELETE CASCADE;
  
  -- Make factory_id NOT NULL after backfilling
  ALTER TABLE public.machines ALTER COLUMN factory_id SET NOT NULL;
  ALTER TABLE public.tickets ALTER COLUMN factory_id SET NOT NULL;
  ALTER TABLE public.parts ALTER COLUMN factory_id SET NOT NULL;
  ALTER TABLE public.consumables ALTER COLUMN factory_id SET NOT NULL;
  ALTER TABLE public.suppliers ALTER COLUMN factory_id SET NOT NULL;
END $$;

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS everywhere
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's factory_id
CREATE OR REPLACE FUNCTION public.get_auth_factory_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT factory_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- A. Profiles & Factories
CREATE POLICY "Users can see their own factory" ON public.factories FOR SELECT USING (id = public.get_auth_factory_id());
CREATE POLICY "Users can see profiles in their factory" ON public.profiles FOR SELECT USING (factory_id = public.get_auth_factory_id());

-- B. Machines (Visible to all roles in the factory)
CREATE POLICY "Factory members can view machines" ON public.machines FOR SELECT USING (factory_id = public.get_auth_factory_id());
CREATE POLICY "Supervisors/Owners can insert/update machines" ON public.machines FOR ALL USING (
  factory_id = public.get_auth_factory_id() AND public.get_auth_role() IN ('owner', 'supervisor')
);

-- C. Tickets (Visible to all, writes restricted by role)
CREATE POLICY "Factory members can view tickets" ON public.tickets FOR SELECT USING (factory_id = public.get_auth_factory_id());
CREATE POLICY "Technicians can insert tickets" ON public.tickets FOR INSERT WITH CHECK (
  factory_id = public.get_auth_factory_id()
);
CREATE POLICY "Technicians can update tickets" ON public.tickets FOR UPDATE USING (
  factory_id = public.get_auth_factory_id()
);
CREATE POLICY "Supervisors/Owners can manage tickets" ON public.tickets FOR ALL USING (
  factory_id = public.get_auth_factory_id() AND public.get_auth_role() IN ('owner', 'supervisor')
);

-- D. Parts & Suppliers (Restricted visibility)
CREATE POLICY "Supervisors/Owners can view parts" ON public.parts FOR SELECT USING (
  factory_id = public.get_auth_factory_id() AND public.get_auth_role() IN ('owner', 'supervisor')
);
CREATE POLICY "Supervisors/Owners can view suppliers" ON public.suppliers FOR SELECT USING (
  factory_id = public.get_auth_factory_id() AND public.get_auth_role() IN ('owner', 'supervisor')
);
CREATE POLICY "Supervisors/Owners can view consumables" ON public.consumables FOR SELECT USING (
  factory_id = public.get_auth_factory_id() AND public.get_auth_role() IN ('owner', 'supervisor')
);

-- E. QR Codes (Visible to Supervisors/Owners)
CREATE POLICY "Supervisors/Owners can manage QR codes" ON public.machine_qr_codes FOR ALL USING (
  factory_id = public.get_auth_factory_id() AND public.get_auth_role() IN ('owner', 'supervisor')
);
