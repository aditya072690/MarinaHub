-- Add waiver URL to bookings
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS waiver_url TEXT;

-- Create waivers storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'waivers', 
  'waivers', 
  false, 
  5242880, -- 5MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS for storage.objects
-- Note: Supabase storage uses the storage.objects table

-- 1. Marina Owners/Staff can read waivers for their marina
CREATE POLICY "Marina owners and staff can view their waivers"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'waivers' AND
  EXISTS (
    SELECT 1 FROM marina_members tm
    WHERE tm.user_id = auth.uid()
    AND (storage.objects.name LIKE tm.marina_id || '/%')
  )
);

-- 2. Consumers can read their own waivers
CREATE POLICY "Consumers can view their own waivers"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'waivers' AND
  (storage.objects.name LIKE '%/' || auth.uid() || '/%')
);

-- 3. Authenticated users can insert their own waivers
CREATE POLICY "Authenticated users can upload waivers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'waivers' AND
  auth.role() = 'authenticated'
);
