-- Database migration to support Kaizen Opportunities (roadmap §4.2, P2/P3 plan)
-- Adds a closed-loop Kaizen table linked to operational machines, tickets, and owners.

CREATE TABLE IF NOT EXISTS public.kaizen_opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id uuid REFERENCES public.machines ON DELETE CASCADE NOT NULL,
  ticket_id uuid REFERENCES public.tickets ON DELETE SET NULL, -- optional originating breakdown ticket
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  title text NOT NULL,
  proposal text NOT NULL,
  category text DEFAULT 'productivity', -- safety | quality | productivity | cost_reduction | energy_saving | material_saving | breakdown_prevention | ergonomics | 5s | simplification
  estimated_impact text DEFAULT 'medium', -- high | medium | low
  estimated_cost numeric DEFAULT 0,
  actual_saving numeric DEFAULT 0,
  waste_category text DEFAULT 'motion', -- transportation | inventory | motion | waiting | overproduction | overprocessing | defects | talent
  status text DEFAULT 'submitted', -- draft | submitted | need_information | approved | rejected | planned | in_progress | on_hold | implemented | under_observation | verified | standardisation_pending | closed | reopened
  status_reason text, -- recorded for rejections, holds, overdue, reopening
  before_photo_url text,
  after_photo_url text,
  standardisation_status text DEFAULT 'no_update_required', -- sop | work_instruction | checklist | pm_checklist | drawing | tooling | 5s | no_update_required
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  due_date date,
  verified_by_name text,
  verified_at timestamp with time zone,
  trial_duration_shifts int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS kaizen_opportunities_machine_idx ON public.kaizen_opportunities(machine_id);
CREATE INDEX IF NOT EXISTS kaizen_opportunities_factory_idx ON public.kaizen_opportunities(factory_id);

ALTER TABLE public.kaizen_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view Kaizen for their machines"
  ON public.kaizen_opportunities FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));

CREATE POLICY "Staff can insert Kaizen"
  ON public.kaizen_opportunities FOR INSERT
  WITH CHECK (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));

CREATE POLICY "Staff can update Kaizen"
  ON public.kaizen_opportunities FOR UPDATE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));

CREATE POLICY "Staff can delete Kaizen"
  ON public.kaizen_opportunities FOR DELETE
  USING (machine_id IN (SELECT id FROM public.machines WHERE company_id = public.get_current_company_id()));
