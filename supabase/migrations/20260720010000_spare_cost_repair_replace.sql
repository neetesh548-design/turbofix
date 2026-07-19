-- Tier 3 (spare-to-work-order linking + machine-wise cost) and
-- Tier 4 (repair-vs-replacement). Additive.

-- Part pricing so consumed spares can be costed.
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;

-- Replacement cost drives the repair-vs-replacement indicator (roadmap §6.3).
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS replacement_cost numeric;

-- Spare consumption linked to a work order — the basis of true machine cost.
CREATE TABLE IF NOT EXISTS public.work_order_parts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.tickets ON DELETE SET NULL,
  part_id uuid REFERENCES public.parts ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machines ON DELETE CASCADE NOT NULL,
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  part_name text,                          -- snapshot so cost survives part deletion
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS work_order_parts_machine_idx ON public.work_order_parts(machine_id);
CREATE INDEX IF NOT EXISTS work_order_parts_ticket_idx ON public.work_order_parts(ticket_id);

ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work-order parts for their machines"
  ON public.work_order_parts FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can insert work-order parts"
  ON public.work_order_parts FOR INSERT
  WITH CHECK (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
CREATE POLICY "Staff can delete work-order parts"
  ON public.work_order_parts FOR DELETE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
