-- Intermediate migration to add type and urgency columns to tickets table

ALTER TABLE public.tickets 
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'breakdown',
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'low';
