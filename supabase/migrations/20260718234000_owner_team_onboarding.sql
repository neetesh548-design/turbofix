-- Owners may add non-owner members only to their own company.
-- Offline staff do not need an auth identity, so directory IDs are independent.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey;

CREATE OR REPLACE FUNCTION public.is_current_user_company_owner(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND company_id = target_company_id
      AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_company_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_company_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "Owners can onboard users in their company" ON public.users;
CREATE POLICY "Owners can onboard users in their company"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_current_company_id()
  AND public.is_current_user_company_owner(company_id)
  AND role <> 'owner'
);
