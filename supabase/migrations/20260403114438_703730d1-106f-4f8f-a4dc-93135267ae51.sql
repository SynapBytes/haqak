
DROP POLICY IF EXISTS "Authenticated users can view issue-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view issue attachments" ON storage.objects;

CREATE POLICY "Owner can update own attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'issue-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
