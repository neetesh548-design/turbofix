-- Fix: get_current_company_id()'s email/phone fallback matches (added in
-- 20260722194500_phone_login_identity_scope.sql to cover accounts whose
-- auth.uid() doesn't match their public.users.id) compare
-- coalesce(x, '') on BOTH sides of each OR condition. When a users row has
-- a null/blank phone or email, that side collapses to '' — and if the
-- JWT-derived side also collapses to '' (e.g. a login email with no digits
-- before the '@', which is any ordinary human name), '' = '' is TRUE. The
-- function then returns whatever company that unrelated row belongs to,
-- silently misrouting an owner's account to a different tenant's data.
--
-- Reproduced live: a freshly self-registered company (correct
-- auth.uid() = public.users.id link, confirmed directly) still resolved
-- get_current_company_id() to a different, unrelated company's id purely
-- because its phone was blank and the login email's local part had no
-- digits.
--
-- Fix: every fallback comparison now requires the JWT-derived value to be
-- non-empty before it's allowed to match at all. The exact id = auth.uid()
-- path (the common, correct case) is unchanged.

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
     OR (
       auth.jwt()->>'email' IS NOT NULL AND auth.jwt()->>'email' <> ''
       AND lower(coalesce(email, '')) = lower(auth.jwt()->>'email')
     )
     OR (
       regexp_replace(coalesce(auth.jwt()->'user_metadata'->>'phone', ''), '\D', '', 'g') <> ''
       AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') =
           regexp_replace(auth.jwt()->'user_metadata'->>'phone', '\D', '', 'g')
     )
     OR (
       regexp_replace(split_part(coalesce(auth.jwt()->>'email', ''), '@', 1), '\D', '', 'g') <> ''
       AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') =
           regexp_replace(split_part(auth.jwt()->>'email', '@', 1), '\D', '', 'g')
     )
  ORDER BY CASE WHEN id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;
