-- Invitation lifecycle audit. Passwords and invitation tokens are never stored.
CREATE TABLE IF NOT EXISTS public.user_invitation_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_email text NOT NULL,
  target_role text NOT NULL,
  action text NOT NULL CHECK (action IN ('sent', 'accepted', 'resent', 'revoked', 'failed')),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS user_invitation_audit_company_idx
  ON public.user_invitation_audit(company_id, created_at DESC);

ALTER TABLE public.user_invitation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company managers can view invitation audit"
  ON public.user_invitation_audit FOR SELECT
  USING (
    company_id = public.get_current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND company_id = user_invitation_audit.company_id
        AND role IN ('owner', 'director', 'maintenance_head')
    )
  );
