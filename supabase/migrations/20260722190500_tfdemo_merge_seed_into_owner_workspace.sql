-- Keep the owner in the real TFDEMO workspace and attach the annual seed there.
-- Previous seed visibility linked known demo profiles to a new seed factory.
-- That made manually-entered machines disappear for the owner. This migration
-- chooses the existing non-seed workspace when present and moves seed records
-- into it, instead of moving the user away from their own data.

DO $$
DECLARE
  demo_company uuid := 'a1000000-0000-0000-0000-000000000099';
  demo_factory uuid := 'f1000000-0000-0000-0000-000000000099';
  target_factory uuid;
  target_company uuid;
BEGIN
  SELECT machine.factory_id
  INTO target_factory
  FROM public.machines machine
  WHERE machine.factory_id IS NOT NULL
    AND machine.id NOT IN (
      'bb100000-0000-0000-0000-000000000001',
      'bb100000-0000-0000-0000-000000000002',
      'bb100000-0000-0000-0000-000000000005',
      'bb100000-0000-0000-0000-000000000006',
      'bb100000-0000-0000-0000-000000000007'
    )
  GROUP BY machine.factory_id
  ORDER BY count(*) DESC
  LIMIT 1;

  target_factory := coalesce(target_factory, demo_factory);

  SELECT machine.company_id
  INTO target_company
  FROM public.machines machine
  WHERE machine.factory_id = target_factory
    AND machine.company_id IS NOT NULL
  GROUP BY machine.company_id
  ORDER BY count(*) DESC
  LIMIT 1;

  target_company := coalesce(target_company, demo_company);

  UPDATE public.profiles
  SET factory_id = target_factory
  WHERE factory_id = demo_factory
     OR lower(coalesce(full_name, '')) IN ('rajesh patel', 'nitesh kumar soni', 'nitesh soni')
     OR phone_e164 IN (
       '+919876543200',
       '+919876543210',
       '+919876543211',
       '+919876543212',
       '+919876543213',
       '+919876543214'
     );

  IF to_regclass('public.users') IS NOT NULL THEN
    UPDATE public.users
    SET company_id = target_company
    WHERE company_id = demo_company
       OR lower(coalesce(name, '')) IN ('rajesh patel', 'nitesh kumar soni', 'nitesh soni')
       OR lower(coalesce(email, '')) IN ('rakesh@acmeforge.example', 'rajesh@tfdemo.example')
       OR phone IN (
         '+919876543200',
         '+919876543210',
         '+919876543211',
         '+919876543212',
         '+919876543213',
         '+919876543214'
       );
  END IF;

  UPDATE public.machines
  SET company_id = target_company,
      factory_id = target_factory
  WHERE id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );

  UPDATE public.tickets
  SET factory_id = target_factory
  WHERE ai_summary->>'source' = 'tfdemo_annual_seed'
     OR machine_id IN (
       'bb100000-0000-0000-0000-000000000001',
       'bb100000-0000-0000-0000-000000000002',
       'bb100000-0000-0000-0000-000000000005',
       'bb100000-0000-0000-0000-000000000006',
       'bb100000-0000-0000-0000-000000000007'
     );

  UPDATE public.work_order_parts
  SET factory_id = target_factory
  WHERE machine_id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );

  UPDATE public.audit_log
  SET factory_id = target_factory
  WHERE machine_id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );
END $$;
