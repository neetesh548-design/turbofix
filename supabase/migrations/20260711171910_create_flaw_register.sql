-- ==========================================
-- Phase 0: Flaw Register (Dogfooding issue tracking)
-- ==========================================

CREATE TYPE bug_severity AS ENUM ('p0', 'p1', 'p2', 'p3');

CREATE TABLE public.bugs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flow text NOT NULL,
  severity bug_severity NOT NULL,
  reproduction text NOT NULL,
  root_cause text,
  regression_test text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone
);

ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- Only developers (or owners if we choose to expose this) can access. For now, restrict entirely to service role / dashboard users.
-- To allow testing, we can permit all authenticated users to read/write for dogfooding.
CREATE POLICY "Allow authenticated full access to bugs" ON public.bugs FOR ALL USING (auth.uid() IS NOT NULL);
