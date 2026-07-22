-- Phone-login RLS fix.
-- TurboFix lets users sign in with a phone by converting it to:
--   <phone>@phone.turbofix.co.in
-- Match that local-part against public.users.phone so dashboard reads do not
-- collapse to zero when the auth uid differs from the offline directory row.

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
     OR regexp_replace(coalesce(phone, ''), '\D', '', 'g') =
        regexp_replace(split_part(coalesce(auth.jwt()->>'email', ''), '@', 1), '\D', '', 'g')
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
