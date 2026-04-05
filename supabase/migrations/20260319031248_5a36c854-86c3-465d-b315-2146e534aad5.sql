
-- Add storage policy for authenticated upload with user folder isolation
DROP POLICY IF EXISTS "Users can only upload to their own folder" ON storage.objects;
CREATE POLICY "Users can only upload to their own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'issue-attachments' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Drop the overly permissive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload issue attachments" ON storage.objects;

-- Add delete policy for own files
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'issue-attachments' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
