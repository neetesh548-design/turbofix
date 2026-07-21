-- ==========================================
-- ENTERPRISE SCHEMA PHASE 1 (Auth, Teams, RBAC, Core Tables)
-- ==========================================

-- 1. EXTENDED ROLES & PERMISSIONS
-- Replacing simple enum with a proper granular RBAC model.
CREATE TABLE public.permissions (
  id text PRIMARY KEY,
  description text
);

INSERT INTO public.permissions (id, description) VALUES
  ('tickets.read', 'Read tickets'),
  ('tickets.write', 'Create and update tickets'),
  ('tickets.delete', 'Delete tickets'),
  ('assets.read', 'Read assets and machines'),
  ('assets.write', 'Manage assets and machines'),
  ('users.manage', 'Manage users and roles in organization');

CREATE TABLE public.roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text
);

INSERT INTO public.roles (id, name, description) VALUES
  ('admin', 'Admin', 'Full organization access'),
  ('manager', 'Manager', 'Manage assets and tickets'),
  ('technician', 'Technician', 'Execute work orders and tickets'),
  ('operator', 'Operator', 'Report issues only');

CREATE TABLE public.role_permissions (
  role_id text REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id text REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('admin', 'tickets.read'), ('admin', 'tickets.write'), ('admin', 'tickets.delete'), ('admin', 'assets.read'), ('admin', 'assets.write'), ('admin', 'users.manage'),
  ('manager', 'tickets.read'), ('manager', 'tickets.write'), ('manager', 'assets.read'), ('manager', 'assets.write'),
  ('technician', 'tickets.read'), ('technician', 'tickets.write'), ('technician', 'assets.read'),
  ('operator', 'tickets.read'), ('operator', 'tickets.write');

-- 2. ORGANIZATIONS (Renaming/Expanding factories)
-- We will keep factories for backwards compatibility but expand it as organizations.
ALTER TABLE public.factories RENAME TO organizations;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.machines ALTER COLUMN factory_id DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN factory_id DROP NOT NULL;
ALTER TABLE public.parts ALTER COLUMN factory_id DROP NOT NULL;
ALTER TABLE public.consumables ALTER COLUMN factory_id DROP NOT NULL;

-- 3. TEAMS
CREATE TABLE public.teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.team_members (
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

-- 4. MAINTENANCE PLANS & CHECKLISTS
CREATE TABLE public.maintenance_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  title text NOT NULL,
  frequency_interval interval NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.checklists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_plan_id uuid REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. KNOWLEDGE BASE & LOGS
CREATE TABLE public.knowledge_base (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  tags text[],
  created_at timestamp with time zone DEFAULT now()
);

-- 6. TICKET COMMENTS & STATUS HISTORY
CREATE TABLE public.ticket_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.status_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. SETTINGS, API KEYS & WEBHOOK LOGS
CREATE TABLE public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  status int,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. STORAGE BUCKETS (Simulated in SQL for documentation purposes, but applied via dashboard usually)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('assets', 'assets', true);
-- insert into storage.buckets (id, name, public) values ('tickets', 'tickets', true);
-- insert into storage.buckets (id, name, public) values ('manuals', 'manuals', false);
-- insert into storage.buckets (id, name, public) values ('reports', 'reports', false);
-- insert into storage.buckets (id, name, public) values ('voice', 'voice', false);
-- insert into storage.buckets (id, name, public) values ('ocr', 'ocr', false);

-- 9. RLS POLICIES FOR NEW TABLES
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see teams in org" ON public.teams FOR SELECT USING (organization_id = (SELECT factory_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see plans in org" ON public.maintenance_plans FOR SELECT USING (organization_id = (SELECT factory_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see checklists" ON public.checklists FOR SELECT USING (true); -- simplified for now

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see knowledge base in org" ON public.knowledge_base FOR SELECT USING (organization_id = (SELECT factory_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see comments" ON public.ticket_comments FOR SELECT USING (
  ticket_id IN (SELECT id FROM public.tickets WHERE factory_id = (SELECT factory_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see status history" ON public.status_history FOR SELECT USING (
  ticket_id IN (SELECT id FROM public.tickets WHERE factory_id = (SELECT factory_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
);
