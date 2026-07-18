ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS manager_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plant_location text DEFAULT '',
  ADD COLUMN IF NOT EXISTS shift text DEFAULT '',
  ADD COLUMN IF NOT EXISTS portal_access boolean DEFAULT true;
