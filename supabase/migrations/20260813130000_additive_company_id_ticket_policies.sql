-- Follow-up to 20260813120000_drop_remaining_stale_factory_policies.sql, whose
-- header explicitly deferred tickets' INSERT/UPDATE policies as too risky to
-- touch without staging access. This migration takes the safer, ADDITIVE-ONLY
-- path instead of dropping anything: it adds a company_id-scoped policy
-- alongside each existing factory_id-scoped one, rather than replacing it.
--
-- Why additive, not a replace-and-drop:
--   - tickets is the highest-traffic table in the product. This migration
--     cannot be run against a staging copy first, so "drop the only INSERT/
--     UPDATE policy and hope the replacement is exactly right" is not an
--     acceptable risk here — a mistake would block all ticket creation
--     platform-wide with no fallback.
--   - RLS ORs every permissive policy together, so adding a correct,
--     narrower-or-equal-scope policy can only ever WIDEN what's already
--     allowed (fixing the real correctness gap: get_auth_factory_id()'s
--     identity-fallback GROUP BY/majority-vote can mis-scope a user whose
--     machines span more than one legacy factory_id) — it cannot remove
--     access anyone currently has, so there is no regression risk here in
--     the way a drop-and-replace would carry.
--   - This does NOT solve the original performance/hygiene complaint (the
--     expensive get_auth_factory_id() policy still runs on every query,
--     since it isn't being dropped) — it only closes the correctness gap and
--     paves the way for a later migration to actually drop the legacy
--     policies once someone has verified in staging that the company_id
--     policies alone are sufficient.
--
-- The UPDATE policy intentionally mirrors the exact same role restriction as
-- "Authorized maintenance roles can update tickets" (20260729130000) — only
-- the scoping mechanism changes (company_id via machine_id join, instead of
-- the tickets.factory_id column) — so this cannot grant UPDATE access to any
-- role that couldn't already get it; it only fixes machine_id/company_id
-- scoping correctness for the roles that could already update tickets.

CREATE POLICY "Company members can insert tickets (company_id)"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  machine_id IN (
    SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()
  )
);

CREATE POLICY "Company members with maintenance roles can update tickets (company_id)"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  machine_id IN (
    SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()
  )
  AND public.get_current_role_text() IN (
    'maintenance_technician', 'technician', 'maintenance_engineer', 'engineer',
    'supervisor', 'maintenance_head', 'quality_inspector', 'safety_officer', 'vendor'
  )
)
WITH CHECK (
  machine_id IN (
    SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()
  )
);
