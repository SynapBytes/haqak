-- Harden issue attachment read access by removing broad/redundant SELECT policies.
-- Keep visibility scoped to: attachment owner, assigned active MP, and admin/moderator.

-- public.issue_attachments table policy
DROP POLICY IF EXISTS "Users can view attachments on their issues" ON public.issue_attachments;

CREATE POLICY "Users can view attachments on their issues"
ON public.issue_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.issues i
    WHERE i.id = issue_attachments.issue_id
      AND i.user_id = auth.uid()
  )
  OR (
    public.is_active_mp(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.issues i
      WHERE i.id = issue_attachments.issue_id
        AND i.assigned_mp_id = auth.uid()
    )
  )
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
);

-- storage.objects issue-attachments policies
DROP POLICY IF EXISTS "Users can view own or authorized attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view issue-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view issue attachments" ON storage.objects;
DROP POLICY IF EXISTS "Restricted read access to issue attachments" ON storage.objects;

CREATE POLICY "Restricted read access to issue attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'issue-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
    OR (
      public.is_active_mp(auth.uid())
      AND cardinality(storage.foldername(name)) >= 2
      AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1
        FROM public.issues i
        WHERE i.id = ((storage.foldername(name))[2])::uuid
          AND i.assigned_mp_id = auth.uid()
      )
    )
  )
);
