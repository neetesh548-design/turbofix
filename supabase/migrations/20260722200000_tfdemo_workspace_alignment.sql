-- Align TFDEMO demo owner/team identity rows with the workspace that contains
-- the real machines and tickets. The data was present, but profiles/users were
-- split across Acme/Beta demo tenants, causing RLS to show zero/old data.

DO $$
DECLARE
  target_company uuid := 'a1000000-0000-0000-0000-000000000002';
  target_factory uuid := 'aa100000-0000-0000-0000-000000000002';
BEGIN
  UPDATE public.users
  SET company_id = target_company
  WHERE id IN (
    '01b5edc7-bd3a-46e8-a2c5-1d47de3882bf',
    '1bd2ea71-49a2-469c-91ea-4602be4b5bc2',
    '234d4159-a85f-4c47-808c-cbb7afc2d0a2',
    '9182dc1a-8e3d-447b-b6cf-fdb9499f0a4a',
    '77d763a2-522c-48ef-b2ec-22ba0391a691'
  )
  OR lower(coalesce(email, '')) IN (
    'neetesh548@gmail.com',
    'anil@gmail.com',
    'mohan@yadav.com',
    'sharma@12345'
  )
  OR regexp_replace(coalesce(phone, ''), '\D', '', 'g') IN (
    '919637438044',
    '7987513258',
    '0987654321',
    '09876543210',
    '0897674543212'
  );

  UPDATE public.profiles
  SET factory_id = target_factory
  WHERE user_id IN (
    '01b5edc7-bd3a-46e8-a2c5-1d47de3882bf',
    '1bd2ea71-49a2-469c-91ea-4602be4b5bc2',
    '234d4159-a85f-4c47-808c-cbb7afc2d0a2',
    '9182dc1a-8e3d-447b-b6cf-fdb9499f0a4a',
    '77d763a2-522c-48ef-b2ec-22ba0391a691'
  )
  OR lower(coalesce(full_name, '')) IN (
    'neetesh kumar soni',
    'nitesh kumar soni',
    'neetesh owner',
    'anil',
    'sharma',
    'mohan'
  )
  OR regexp_replace(coalesce(phone_e164, ''), '\D', '', 'g') IN (
    '910000000000',
    '917987513258',
    '0987654321',
    '09876543210',
    '0897674543212'
  );

  UPDATE public.machines
  SET company_id = target_company,
      factory_id = target_factory
  WHERE id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000003',
    'bb100000-0000-0000-0000-000000000004',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );

  UPDATE public.tickets
  SET factory_id = target_factory
  WHERE machine_id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000003',
    'bb100000-0000-0000-0000-000000000004',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );

  UPDATE public.work_order_parts
  SET factory_id = target_factory
  WHERE machine_id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000003',
    'bb100000-0000-0000-0000-000000000004',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );

  UPDATE public.audit_log
  SET factory_id = target_factory
  WHERE machine_id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000003',
    'bb100000-0000-0000-0000-000000000004',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );
END $$;
