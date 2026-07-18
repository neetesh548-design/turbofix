ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS technician_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS engineer_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS maintenance_head_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS machines_technician_user_id_idx ON public.machines(technician_user_id);
CREATE INDEX IF NOT EXISTS machines_supervisor_id_idx ON public.machines(supervisor_id);
CREATE INDEX IF NOT EXISTS machines_engineer_user_id_idx ON public.machines(engineer_user_id);
CREATE INDEX IF NOT EXISTS machines_maintenance_head_user_id_idx ON public.machines(maintenance_head_user_id);

UPDATE public.machines AS machine
SET technician_user_id = member.id
FROM public.users AS member
WHERE machine.technician_user_id IS NULL
  AND machine.company_id = member.company_id
  AND NULLIF(regexp_replace(machine.assigned_technician_phone, '\D', '', 'g'), '') = regexp_replace(member.phone, '\D', '', 'g');
