
-- Tighten storage SELECT policy on issue-attachments
DROP POLICY IF EXISTS "Authenticated users can view issue-attachments" ON storage.objects;

CREATE POLICY "Users can view own or authorized attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'issue-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'mp'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
