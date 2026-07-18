CREATE TABLE IF NOT EXISTS public.machine_knowledge_graphs (
  machine_id uuid PRIMARY KEY REFERENCES public.machines(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  graph_hash text NOT NULL DEFAULT '',
  dirty boolean NOT NULL DEFAULT true,
  generated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS machine_knowledge_graphs_company_idx
  ON public.machine_knowledge_graphs(company_id, dirty, updated_at DESC);

ALTER TABLE public.machine_knowledge_graphs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view machine graph" ON public.machine_knowledge_graphs;
CREATE POLICY "Company members can view machine graph"
  ON public.machine_knowledge_graphs FOR SELECT
  USING (company_id = public.get_current_company_id());

CREATE OR REPLACE FUNCTION public.mark_machine_knowledge_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_machine_id uuid;
  target_company_id uuid;
  target_name text;
BEGIN
  IF TG_TABLE_NAME = 'machines' THEN
    target_machine_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'events' THEN
    SELECT machine_id INTO target_machine_id
    FROM public.tickets WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);
  ELSE
    target_machine_id := COALESCE(NEW.machine_id, OLD.machine_id);
  END IF;

  SELECT id, company_id, name INTO target_machine_id, target_company_id, target_name
  FROM public.machines WHERE id = target_machine_id;

  IF target_machine_id IS NOT NULL THEN
    INSERT INTO public.machine_knowledge_files(machine_id, company_id, file_name, dirty, updated_at)
    VALUES (target_machine_id, target_company_id,
      regexp_replace(COALESCE(target_name, 'Machine'), '[^A-Za-z0-9_-]+', '_', 'g') || '_MachineData.md', true, now())
    ON CONFLICT (machine_id) DO UPDATE SET dirty = true, updated_at = now();

    INSERT INTO public.machine_knowledge_graphs(machine_id, company_id, dirty, updated_at)
    VALUES (target_machine_id, target_company_id, true, now())
    ON CONFLICT (machine_id) DO UPDATE SET dirty = true, updated_at = now();
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_user_machine_knowledge_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.machine_knowledge_files(machine_id, company_id, file_name, dirty, updated_at)
  SELECT machine.id, machine.company_id,
    regexp_replace(COALESCE(machine.name, 'Machine'), '[^A-Za-z0-9_-]+', '_', 'g') || '_MachineData.md', true, now()
  FROM public.machines AS machine
  WHERE machine.technician_user_id = NEW.id OR machine.supervisor_id = NEW.id
     OR machine.engineer_user_id = NEW.id OR machine.maintenance_head_user_id = NEW.id
  ON CONFLICT (machine_id) DO UPDATE SET dirty = true, updated_at = now();

  INSERT INTO public.machine_knowledge_graphs(machine_id, company_id, dirty, updated_at)
  SELECT machine.id, machine.company_id, true, now()
  FROM public.machines AS machine
  WHERE machine.technician_user_id = NEW.id OR machine.supervisor_id = NEW.id
     OR machine.engineer_user_id = NEW.id OR machine.maintenance_head_user_id = NEW.id
  ON CONFLICT (machine_id) DO UPDATE SET dirty = true, updated_at = now();
  RETURN NEW;
END;
$$;

INSERT INTO public.machine_knowledge_graphs(machine_id, company_id, dirty)
SELECT id, company_id, true FROM public.machines
ON CONFLICT (machine_id) DO UPDATE SET dirty = true, updated_at = now();
