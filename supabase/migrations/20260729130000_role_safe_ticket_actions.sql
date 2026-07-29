CREATE OR REPLACE FUNCTION public.get_current_role_text()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    (
      SELECT role::text
      FROM public.users
      WHERE id = auth.uid()
         OR lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
         OR regexp_replace(coalesce(phone, ''), '\D', '', 'g') =
            regexp_replace(split_part(coalesce(auth.jwt()->>'email', ''), '@', 1), '\D', '', 'g')
      ORDER BY CASE WHEN id = auth.uid() THEN 0 ELSE 1 END
      LIMIT 1
    )
  );
$$;

DROP POLICY IF EXISTS "Technicians can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Supervisors/Owners can manage tickets" ON public.tickets;

CREATE POLICY "Authorized maintenance roles can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  factory_id = public.get_auth_factory_id()
  AND public.get_current_role_text() IN (
    'maintenance_technician', 'technician', 'maintenance_engineer', 'engineer',
    'supervisor', 'maintenance_head', 'quality_inspector', 'safety_officer', 'vendor'
  )
)
WITH CHECK (factory_id = public.get_auth_factory_id());

CREATE OR REPLACE FUNCTION public.enforce_ticket_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text := public.get_current_role_text();
  restricted_worker boolean := current_role IN (
    'maintenance_technician', 'technician', 'maintenance_engineer', 'engineer', 'vendor'
  );
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF current_role IN ('owner', 'operator') OR current_role IS NULL THEN
    RAISE EXCEPTION 'Your role cannot update work orders' USING ERRCODE = '42501';
  END IF;

  IF restricted_worker THEN
    IF NEW.machine_id IS DISTINCT FROM OLD.machine_id
       OR NEW.factory_id IS DISTINCT FROM OLD.factory_id
       OR NEW.reporter_phone IS DISTINCT FROM OLD.reporter_phone
       OR NEW.urgency IS DISTINCT FROM OLD.urgency
       OR lower(coalesce(NEW.status, '')) IN ('closed', 'resolved')
       OR lower(coalesce(NEW.lifecycle_stage, '')) = 'closed' THEN
      RAISE EXCEPTION 'Your role can update repair progress but cannot reassign, reprioritize, or close work'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF current_role IN ('quality_inspector', 'safety_officer') THEN
    IF NEW.machine_id IS DISTINCT FROM OLD.machine_id
       OR NEW.factory_id IS DISTINCT FROM OLD.factory_id
       OR NEW.reporter_phone IS DISTINCT FROM OLD.reporter_phone
       OR NEW.urgency IS DISTINCT FROM OLD.urgency THEN
      RAISE EXCEPTION 'Verification roles cannot change work-order identity or priority'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ticket_role_changes ON public.tickets;
CREATE TRIGGER trg_enforce_ticket_role_changes
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ticket_role_changes();

CREATE OR REPLACE FUNCTION public.enforce_machine_assignment_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.technician_user_id IS DISTINCT FROM OLD.technician_user_id
     AND public.get_current_role_text() NOT IN ('supervisor', 'maintenance_head') THEN
    RAISE EXCEPTION 'Only a supervisor or maintenance head can change technician ownership'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_machine_assignment_role ON public.machines;
CREATE TRIGGER trg_enforce_machine_assignment_role
  BEFORE UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_machine_assignment_role();
