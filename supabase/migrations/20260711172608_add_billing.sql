-- ==========================================
-- BILLING ENUMS & TABLES
-- ==========================================

CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled');
CREATE TYPE machine_band AS ENUM ('S', 'M', 'L');

-- 1. Subscriptions Table
CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  band machine_band NOT NULL,
  price numeric(10,2) NOT NULL,
  currency text DEFAULT 'INR',
  status subscription_status DEFAULT 'trialing',
  current_period_end timestamp with time zone,
  provider_subscription_id text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Invoices Table
CREATE TABLE public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  gst_breakup jsonb NOT NULL,
  pdf_path text,
  status text DEFAULT 'draft',
  issued_at timestamp with time zone DEFAULT now()
);

-- 3. Payment Events Table (Audit log for webhooks)
CREATE TABLE public.payment_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text UNIQUE NOT NULL, -- provider's event ID for idempotency
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Factory Owners can read their subscriptions and invoices
CREATE POLICY "Owners can view their subscriptions" ON public.subscriptions FOR SELECT USING (
  factory_id = public.get_auth_factory_id() AND public.get_auth_role() = 'owner'
);

CREATE POLICY "Owners can view their invoices" ON public.invoices FOR SELECT USING (
  subscription_id IN (SELECT id FROM public.subscriptions WHERE factory_id = public.get_auth_factory_id()) 
  AND public.get_auth_role() = 'owner'
);

-- Service Role (webhooks) has full access, so we don't need explicit policies for insert/update from the edge function

-- ==========================================
-- ENTITLEMENT ENFORCEMENT
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_entitlement(f_id uuid, feature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_status subscription_status;
BEGIN
  -- Get current subscription status
  SELECT status INTO sub_status FROM public.subscriptions WHERE factory_id = f_id LIMIT 1;
  
  -- If no subscription row yet (e.g. brand new pilot), default to trialing logic
  IF sub_status IS NULL THEN
    sub_status := 'trialing';
  END IF;
  
  -- Core feature: Outbound Notifications (e.g. WhatsApp alerts)
  -- Fails CLOSED if past due or cancelled
  IF feature = 'outbound_alerts' THEN
    IF sub_status IN ('past_due', 'cancelled') THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  -- Read-only or Fault Intake features fail OPEN (grace period)
  RETURN true;
END;
$$;

-- ==========================================
-- DATA EXPORT (ANTI-LOCK-IN)
-- ==========================================

CREATE OR REPLACE FUNCTION public.export_factory_data(f_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'factory', (SELECT to_json(f) FROM public.factories f WHERE id = f_id),
    'machines', (SELECT json_agg(m) FROM public.machines m WHERE factory_id = f_id),
    'tickets', (SELECT json_agg(t) FROM public.tickets t WHERE factory_id = f_id)
  );
$$;

