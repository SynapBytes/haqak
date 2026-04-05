-- Update security vulnerability in issue-attachments SELECT policy
-- This policy ensures that:
-- 1. The user who uploaded the file can always access it.
-- 2. Active MPs can only access attachments for issues assigned to them.
-- 3. Admins have full access.

DROP POLICY IF EXISTS "Restricted read access to issue attachments" ON storage.objects;

CREATE POLICY "Restricted read access to issue attachments" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'issue-attachments' AND (
      -- User can access their own uploads
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Active MPs can access attachments for their assigned issues
      (
        is_active_mp(auth.uid()) AND
        EXISTS (
          SELECT 1 FROM public.issues
          WHERE id = (storage.foldername(name))[2]::uuid
          AND assigned_mp_id = auth.uid()
        )
      ) OR
      -- Admins can access all
      has_role(auth.uid(), 'admin')
    )
  );
