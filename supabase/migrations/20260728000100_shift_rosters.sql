-- Flexible shift coverage: factories can define rosters per plant, department,
-- or individual machine, then rotate technicians/supervisors/engineers by shift.

CREATE TABLE IF NOT EXISTS public.shift_rosters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  department text,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  active_days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.machine_shift_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  shift_roster_id uuid REFERENCES public.shift_rosters(id) ON DELETE CASCADE NOT NULL,
  technician_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  engineer_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT machine_shift_assignments_effective_window_chk
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS shift_rosters_company_idx ON public.shift_rosters(company_id);
CREATE INDEX IF NOT EXISTS shift_rosters_machine_idx ON public.shift_rosters(machine_id);
CREATE INDEX IF NOT EXISTS shift_rosters_factory_department_idx ON public.shift_rosters(factory_id, department);
CREATE INDEX IF NOT EXISTS machine_shift_assignments_machine_idx ON public.machine_shift_assignments(machine_id);
CREATE INDEX IF NOT EXISTS machine_shift_assignments_roster_idx ON public.machine_shift_assignments(shift_roster_id);
CREATE INDEX IF NOT EXISTS machine_shift_assignments_technician_idx ON public.machine_shift_assignments(technician_user_id);
CREATE INDEX IF NOT EXISTS machine_shift_assignments_supervisor_idx ON public.machine_shift_assignments(supervisor_id);
CREATE INDEX IF NOT EXISTS machine_shift_assignments_engineer_idx ON public.machine_shift_assignments(engineer_user_id);

ALTER TABLE public.shift_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view shift rosters" ON public.shift_rosters;
CREATE POLICY "Company members can view shift rosters"
ON public.shift_rosters
FOR SELECT
TO authenticated
USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Owners and heads can manage shift rosters" ON public.shift_rosters;
CREATE POLICY "Owners and heads can manage shift rosters"
ON public.shift_rosters
FOR ALL
TO authenticated
USING (
  company_id = public.get_current_company_id()
  AND public.get_auth_role() IN ('owner', 'maintenance_head', 'supervisor')
)
WITH CHECK (
  company_id = public.get_current_company_id()
  AND public.get_auth_role() IN ('owner', 'maintenance_head', 'supervisor')
);

DROP POLICY IF EXISTS "Company members can view shift assignments" ON public.machine_shift_assignments;
CREATE POLICY "Company members can view shift assignments"
ON public.machine_shift_assignments
FOR SELECT
TO authenticated
USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Owners and heads can manage shift assignments" ON public.machine_shift_assignments;
CREATE POLICY "Owners and heads can manage shift assignments"
ON public.machine_shift_assignments
FOR ALL
TO authenticated
USING (
  company_id = public.get_current_company_id()
  AND public.get_auth_role() IN ('owner', 'maintenance_head', 'supervisor')
)
WITH CHECK (
  company_id = public.get_current_company_id()
  AND public.get_auth_role() IN ('owner', 'maintenance_head', 'supervisor')
);
