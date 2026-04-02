-- Drop the two overly broad SELECT policies on storage.objects
DROP POLICY IF EXISTS "Authenticated users can view issue-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view issue attachments" ON storage.objects;

-- Drop and recreate the scoped policy to use is_active_mp instead of has_role
DROP POLICY IF EXISTS "Users can view own or authorized attachments" ON storage.objects;

CREATE POLICY "Users can view own or authorized attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'issue-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_active_mp(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);