-- Add machine_quota and admin_contact_phone columns to companies table
-- These were previously missing, causing quota changes from admin panel to be silently lost

ALTER TABLE companies ADD COLUMN IF NOT EXISTS machine_quota integer DEFAULT 5;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS admin_contact_phone text DEFAULT '';

-- Backfill machine_quota from current machine counts + 5 headroom
UPDATE companies c
SET machine_quota = COALESCE(
  (SELECT COUNT(*) FROM machines m WHERE m.company_id = c.id), 0
) + 5
WHERE c.machine_quota IS NULL OR c.machine_quota = 5;

COMMENT ON COLUMN companies.machine_quota IS 'Maximum number of machines this company is allowed to register';
COMMENT ON COLUMN companies.admin_contact_phone IS 'Primary contact phone number for the company admin/owner';
