-- Storage hardening for media/uploads
-- Buckets: issue attachments (private), avatars (public), moderation evidence (private)

-- Ensure buckets exist with correct visibility
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('issue-attachments', 'issue-attachments', false),
  ('avatars', 'avatars', true),
  ('moderation-evidence', 'moderation-evidence', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Issue attachments policies
DROP POLICY IF EXISTS "Users can upload to own folder in issue-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload issue attachments" ON storage.objects;
DROP POLICY IF EXISTS "Restricted read access to issue attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view issue-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete issue attachments" ON storage.objects;

CREATE POLICY "Users can upload to own folder in issue-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'issue-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Restricted read access to issue attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'issue-attachments' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      public.is_active_mp(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.issues
        WHERE id = (storage.foldername(name))[2]::uuid
          AND assigned_mp_id = auth.uid()::uuid
      )
    )
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  )
);

CREATE POLICY "Users can delete issue attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'issue-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  )
);

-- Avatar policies (public read, owner writes)
DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Users can upload their avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Moderation evidence table
CREATE TABLE IF NOT EXISTS public.moderation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket text NOT NULL DEFAULT 'moderation-evidence',
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Moderators can insert evidence" ON public.moderation_evidence;
CREATE POLICY "Moderators can insert evidence" ON public.moderation_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Moderators can read evidence" ON public.moderation_evidence;
CREATE POLICY "Moderators can read evidence" ON public.moderation_evidence
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));

DROP POLICY IF EXISTS "Moderators can delete evidence" ON public.moderation_evidence;
CREATE POLICY "Moderators can delete evidence" ON public.moderation_evidence
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));

-- Moderation evidence bucket policies
DROP POLICY IF EXISTS "Moderation team can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Moderation team can read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Moderation team can delete evidence" ON storage.objects;

-- For the moderation-evidence bucket, storage.foldername(name) is 1-indexed: [1] = issueId, [2] = uploaderId for paths like {issueId}/{uploaderId}/file
CREATE POLICY "Moderation team can upload evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'moderation-evidence'
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  AND cardinality(storage.foldername(name)) >= 2
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Moderation team can read evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'moderation-evidence'
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
);

CREATE POLICY "Moderation team can delete evidence"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'moderation-evidence'
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
);

-- Add bucket column to issue_attachments for clarity (nullable first for safety)
ALTER TABLE public.issue_attachments
ADD COLUMN IF NOT EXISTS bucket text;

UPDATE public.issue_attachments
SET bucket = 'issue-attachments'
WHERE bucket IS NULL;

ALTER TABLE public.issue_attachments
ALTER COLUMN bucket SET DEFAULT 'issue-attachments';

ALTER TABLE public.issue_attachments
ALTER COLUMN bucket SET NOT NULL;
