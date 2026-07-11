-- Add Accountability columns to Tickets
ALTER TABLE public.tickets
ADD COLUMN started_at timestamp with time zone,
ADD COLUMN resolved_at timestamp with time zone,
ADD COLUMN proof_image_url text,
ADD COLUMN ai_verification_status text default 'pending';

-- Create Storage Bucket for Proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('repair-proofs', 'repair-proofs', true);

-- Storage Policies
CREATE POLICY "Public Access to Repair Proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'repair-proofs');

CREATE POLICY "Staff can upload Repair Proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'repair-proofs');
