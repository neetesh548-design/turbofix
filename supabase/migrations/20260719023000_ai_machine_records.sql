-- Durable, tenant-scoped storage for the AI Records review workflow.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS storage_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.machine_records (
  record_id text PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN (
    'service_history', 'inspection', 'manual', 'wiring_diagram',
    'hydraulic_diagram', 'spare_parts_bom', 'consumables', 'pm_checklist',
    'warranty', 'other'
  )),
  source_kind text NOT NULL CHECK (source_kind IN ('handwritten', 'soft_copy')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'needs_review'
    CHECK (status IN ('needs_review', 'approved', 'rejected')),
  overall_confidence integer NOT NULL DEFAULT 0 CHECK (overall_confidence BETWEEN 0 AND 100),
  extracted_json text NOT NULL DEFAULT '{}',
  review_notes text NOT NULL DEFAULT '',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_by text NOT NULL DEFAULT '',
  approved_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  file_hash text NOT NULL,
  history_json text NOT NULL DEFAULT '[]',
  UNIQUE (company_id, machine_id, file_hash)
);

CREATE INDEX IF NOT EXISTS machine_records_company_status_idx
  ON public.machine_records(company_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS machine_records_machine_idx
  ON public.machine_records(machine_id, updated_at DESC);

ALTER TABLE public.machine_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view machine records" ON public.machine_records;
CREATE POLICY "Company members can view machine records"
  ON public.machine_records FOR SELECT TO authenticated
  USING (company_id = public.get_current_company_id());

-- All writes go through the authenticated TurboFix backend, which uses the
-- service role and performs role/company checks before reaching this table.

INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-records', 'machine-records', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Company members can read private machine records" ON storage.objects;
CREATE POLICY "Company members can read private machine records"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'machine-records'
    AND (storage.foldername(name))[1] = (
      SELECT domain FROM public.companies WHERE id = public.get_current_company_id()
    )
  );

DROP TRIGGER IF EXISTS mark_machine_records_knowledge_dirty ON public.machine_records;
CREATE TRIGGER mark_machine_records_knowledge_dirty
AFTER INSERT OR UPDATE OR DELETE ON public.machine_records
FOR EACH ROW EXECUTE FUNCTION public.mark_machine_knowledge_dirty();
