-- Machine Digital Profile (roadmap §3.1)
-- Adds identity, asset, warranty/AMC and vendor fields to the machines table.
-- All columns are additive and nullable so existing rows and flows are unaffected.

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS asset_code text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS installation_date date,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS production_line text,
  ADD COLUMN IF NOT EXISTS criticality text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS warranty_expiry date,
  ADD COLUMN IF NOT EXISTS warranty_notes text,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS vendor_contact text,
  ADD COLUMN IF NOT EXISTS amc_provider text,
  ADD COLUMN IF NOT EXISTS amc_expiry date,
  ADD COLUMN IF NOT EXISTS operating_hours numeric DEFAULT 0;

-- Criticality drives escalation priority and the owner's loss-ranking.
-- Kept as free text (no hard CHECK) so a company can extend it, but the UI
-- offers: low | medium | high | critical.
COMMENT ON COLUMN public.machines.criticality IS 'low | medium | high | critical';

-- Roadmap §3.1 machine status set. The existing `status` column stays free text
-- to avoid breaking legacy values (healthy/maintenance/down); the UI now also
-- offers: running | under_maintenance | breakdown | waiting_spare |
-- waiting_vendor | shutdown | decommissioned.
COMMENT ON COLUMN public.machines.status IS 'healthy | running | under_maintenance | maintenance | breakdown | down | waiting_spare | waiting_vendor | shutdown | decommissioned';

-- Asset code is a human-friendly plant tag (e.g. "CNC-04"); keep it unique per
-- company when provided, but allow blanks/duplicates-as-null for older rows.
CREATE UNIQUE INDEX IF NOT EXISTS machines_company_asset_code_idx
  ON public.machines(company_id, asset_code)
  WHERE asset_code IS NOT NULL AND asset_code <> '';

CREATE INDEX IF NOT EXISTS machines_department_idx ON public.machines(department);
CREATE INDEX IF NOT EXISTS machines_criticality_idx ON public.machines(criticality);
