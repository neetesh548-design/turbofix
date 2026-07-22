-- RLS identity hardening.
-- Some TurboFix team rows are offline directory records, so public.users.id is
-- not always auth.uid(). Dashboard reads must still resolve the signed-in user
-- by auth email/phone before applying company/factory scope.

CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.users
  WHERE id = auth.uid()
     OR lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
     OR regexp_replace(coalesce(phone, ''), '\D', '', 'g') =
        regexp_replace(coalesce(auth.jwt()->'user_metadata'->>'phone', ''), '\D', '', 'g')
  ORDER BY CASE WHEN id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_factory_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT factory_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    (
      SELECT machine.factory_id
      FROM public.machines machine
      WHERE machine.company_id = public.get_current_company_id()
        AND machine.factory_id IS NOT NULL
      GROUP BY machine.factory_id
      ORDER BY count(*) DESC
      LIMIT 1
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    CASE
      WHEN (SELECT role FROM public.users WHERE id = auth.uid()
              OR lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
            LIMIT 1) IN ('owner', 'supervisor')
      THEN (SELECT role::text FROM public.users WHERE id = auth.uid()
              OR lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
            LIMIT 1)::user_role
      ELSE 'technician'::user_role
    END
  );
$$;

DROP POLICY IF EXISTS "Users can view tickets for their company machines" ON public.tickets;
CREATE POLICY "Users can view tickets for their company machines"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  machine_id IN (
    SELECT id
    FROM public.machines
    WHERE company_id = public.get_current_company_id()
  )
);

DROP POLICY IF EXISTS "Users can view work order parts for their company machines" ON public.work_order_parts;
CREATE POLICY "Users can view work order parts for their company machines"
ON public.work_order_parts
FOR SELECT
TO authenticated
USING (
  machine_id IN (
    SELECT id
    FROM public.machines
    WHERE company_id = public.get_current_company_id()
  )
);
