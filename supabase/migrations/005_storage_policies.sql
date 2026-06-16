-- P2: Storage bucket + RLS for boat image uploads

INSERT INTO storage.buckets (id, name, public)
VALUES ('boats', 'boats', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read boat images" ON storage.objects;
DROP POLICY IF EXISTS "Members upload boat images" ON storage.objects;
DROP POLICY IF EXISTS "Members update boat images" ON storage.objects;
DROP POLICY IF EXISTS "Members delete boat images" ON storage.objects;

CREATE POLICY "Public read boat images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'boats');

CREATE POLICY "Members upload boat images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'boats'
    AND (storage.foldername(name))[1] IN (
      SELECT marina_id::text FROM marina_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members update boat images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'boats'
    AND (storage.foldername(name))[1] IN (
      SELECT marina_id::text FROM marina_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members delete boat images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'boats'
    AND (storage.foldername(name))[1] IN (
      SELECT marina_id::text FROM marina_members WHERE user_id = auth.uid()
    )
  );
