-- Follow-up to 20260804030000_drop_stale_factory_policies.sql. That migration
-- fixed the exact dual-policy bug (a never-dropped factory_id/get_auth_factory_id()
-- policy left active alongside its company_id-based replacement, so Postgres ORs
-- both permissive policies together on every query) on `tickets` and `machines`
-- only. A full audit of every table found the same pattern on `parts` and
-- `consumables`, plus an unrelated role-enum bug on `maintenance_interventions`.
--
-- Scope of this migration (kept deliberately conservative — see notes below for
-- what is NOT included and why):
--   1. Drop the stale factory_id SELECT policies on parts/consumables. Verified
--      safe: the company_id-based SELECT policies from 20260711131850_init_schema.sql
--      (`machine_id IN (SELECT id FROM machines WHERE company_id = get_current_company_id())`)
--      already grant SELECT to every company member unconditionally — broader than
--      the factory policy's "owner/supervisor only" restriction, which RLS's OR
--      semantics already made a no-op. Dropping the narrower, expensive, legacy
--      policy changes nothing about who can read these tables today; it only
--      removes the redundant get_auth_factory_id() evaluation on every query.
--   2. Fix maintenance_interventions' UPDATE policy, which checks
--      get_auth_role()::text against role labels ('maintenance_technician',
--      'maintenance_engineer', 'maintenance_head') that the enum-typed
--      get_auth_role() (owner/supervisor/technician only) can never produce —
--      those branches are dead and real users with those roles are silently
--      locked out. Switched to get_current_role_text(), the free-text role
--      reader already used correctly elsewhere (20260729130000_role_safe_ticket_actions.sql).
--      This only ADDS access for roles that were wrongly excluded; it cannot
--      remove access anyone currently has.
--   3. Add a company_id-scoped policy for machine_qr_codes (via the machine_id
--      join, matching the pattern already used for tickets/parts/consumables)
--      ALONGSIDE the existing factory-based one, rather than replacing it. This
--      is purely additive — it cannot narrow access — and gives this table the
--      same correctness backstop the audit found missing, without the risk of
--      dropping the only working policy on a table this migration can't test
--      against live data.
--
-- Deliberately NOT included in this migration:
--   - tickets' INSERT/UPDATE policies are still factory_id-scoped
--     ("Technicians can insert tickets", "Authorized maintenance roles can
--     update tickets"). tickets is the highest-traffic table in the product;
--     dropping either policy without an already-verified-in-staging replacement
--     would risk breaking all ticket creation/updates platform-wide with no way
--     to test that first. This needs a dedicated follow-up migration, verified
--     against a staging project, before those two policies are touched.
--   - suppliers has no company_id column and no machine_id FK to join through
--     (it's a company-wide vendor directory, not scoped to a machine) — closing
--     this one requires an actual schema change (add + backfill a company_id
--     column), not just a policy swap, and is out of scope here.

-- ---------------------------------------------------------------------------
-- 1. Drop stale factory_id policies on parts/consumables (verified redundant)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Supervisors/Owners can view parts" ON public.parts;
DROP POLICY IF EXISTS "Supervisors/Owners can view consumables" ON public.consumables;

-- ---------------------------------------------------------------------------
-- 2. Fix maintenance_interventions role-enum mismatch
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authorized roles can update maintenance interventions" ON public.maintenance_interventions;
CREATE POLICY "Authorized roles can update maintenance interventions"
ON public.maintenance_interventions
FOR UPDATE
TO authenticated
USING (
  factory_id = public.get_auth_factory_id()
  AND public.get_current_role_text() IN (
    'technician', 'maintenance_technician', 'supervisor',
    'maintenance_engineer', 'maintenance_head', 'owner'
  )
);

-- ---------------------------------------------------------------------------
-- 3. Additive company_id-scoped policy for machine_qr_codes
-- ---------------------------------------------------------------------------

CREATE POLICY "Company members can manage QR codes for their machines"
ON public.machine_qr_codes
FOR ALL
TO authenticated
USING (
  machine_id IN (
    SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()
  )
)
WITH CHECK (
  machine_id IN (
    SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()
  )
);
