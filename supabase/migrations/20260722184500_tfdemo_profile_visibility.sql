-- Make the TFDEMO annual seed visible to the demo owner/team.
-- The dashboard is RLS-scoped by profiles.factory_id, so seeded rows only
-- appear after the logged-in TFDEMO people point at the seeded TFDEMO factory.

DO $$
DECLARE
  demo_company uuid := 'a1000000-0000-0000-0000-000000000099';
  demo_factory uuid := 'f1000000-0000-0000-0000-000000000099';
BEGIN
  INSERT INTO public.companies (id, name, domain, status, created_at)
  VALUES (demo_company, 'TFDEMO', 'TFDEMO', 'active', now())
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        status = EXCLUDED.status;

  INSERT INTO public.factories (id, name, city, plan, created_at)
  VALUES (demo_factory, 'TFDEMO', 'Pune', 'pilot', now())
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        city = EXCLUDED.city;

  IF to_regclass('public.organizations') IS NOT NULL THEN
    INSERT INTO public.organizations (id, name, city, plan, domain, status, created_at)
    VALUES (demo_factory, 'TFDEMO', 'Pune', 'pilot', 'TFDEMO', 'active', now())
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          city = EXCLUDED.city,
          domain = EXCLUDED.domain,
          status = EXCLUDED.status;
  END IF;

  UPDATE public.machines
  SET company_id = demo_company,
      factory_id = demo_factory
  WHERE id IN (
    'bb100000-0000-0000-0000-000000000001',
    'bb100000-0000-0000-0000-000000000002',
    'bb100000-0000-0000-0000-000000000005',
    'bb100000-0000-0000-0000-000000000006',
    'bb100000-0000-0000-0000-000000000007'
  );

  UPDATE public.tickets
  SET factory_id = demo_factory
  WHERE ai_summary->>'source' = 'tfdemo_annual_seed'
     OR machine_id IN (
       'bb100000-0000-0000-0000-000000000001',
       'bb100000-0000-0000-0000-000000000002',
       'bb100000-0000-0000-0000-000000000005',
       'bb100000-0000-0000-0000-000000000006',
       'bb100000-0000-0000-0000-000000000007'
     );

  UPDATE public.profiles
  SET factory_id = demo_factory
  WHERE lower(coalesce(full_name, '')) IN ('rajesh patel', 'nitesh kumar soni', 'nitesh soni')
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
    SET company_id = demo_company
    WHERE lower(coalesce(name, '')) IN ('rajesh patel', 'nitesh kumar soni', 'nitesh soni')
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
END $$;
