-- Fix storage RLS policies to prevent unauthorized access
-- This migration tightens the storage bucket policies for issue-attachments

-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read issue attachments" ON storage.objects;

-- Create new restrictive SELECT policy
-- Only allow:
-- 1. The user who uploaded the file
-- 2. The assigned MP for the issue
-- 3. Admins
CREATE POLICY "Restricted read access to issue attachments" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'issue-attachments' AND (
      -- User can access their own uploads
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- MPs can access attachments for their assigned issues
      EXISTS (
        SELECT 1 FROM public.issues
        WHERE id = (storage.foldername(name))[2]::uuid
        AND assigned_mp_id = auth.uid()::text
      ) OR
      -- Admins can access all
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
      )
    )
  );

-- Ensure INSERT policy is restrictive
DROP POLICY IF EXISTS "Authenticated users can upload issue attachments" ON storage.objects;

CREATE POLICY "Users can only upload to their own folder" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'issue-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Ensure DELETE policy is restrictive
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

CREATE POLICY "Users can only delete their own attachments" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'issue-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
