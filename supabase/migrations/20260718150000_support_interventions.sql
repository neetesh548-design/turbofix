-- Exception-based support and approvals. This records what the machine needs,
-- not employee productivity or individual performance.
CREATE TABLE IF NOT EXISTS public.maintenance_interventions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    intervention_type TEXT NOT NULL CHECK (intervention_type IN (
        'technical_help', 'closure_approval', 'root_cause', 'safety', 'parts', 'business_decision'
    )),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    title TEXT NOT NULL,
    reason TEXT DEFAULT '',
    recommended_action TEXT DEFAULT '',
    requested_by UUID,
    assigned_role TEXT NOT NULL,
    evidence JSONB DEFAULT '[]'::jsonb,
    decision TEXT DEFAULT '',
    root_cause TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS maintenance_interventions_factory_status_idx
    ON public.maintenance_interventions(factory_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_interventions_open_ticket_type_idx
    ON public.maintenance_interventions(ticket_id, intervention_type)
    WHERE status <> 'resolved';

ALTER TABLE public.maintenance_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Factory members can view maintenance interventions"
    ON public.maintenance_interventions FOR SELECT
    USING (factory_id = public.get_auth_factory_id());

CREATE POLICY "Factory members can request maintenance support"
    ON public.maintenance_interventions FOR INSERT
    WITH CHECK (factory_id = public.get_auth_factory_id());

CREATE POLICY "Authorized roles can update maintenance interventions"
    ON public.maintenance_interventions FOR UPDATE
    USING (
        factory_id = public.get_auth_factory_id()
        AND public.get_auth_role()::text IN ('technician','maintenance_technician','supervisor','maintenance_engineer','maintenance_head','owner')
    );
