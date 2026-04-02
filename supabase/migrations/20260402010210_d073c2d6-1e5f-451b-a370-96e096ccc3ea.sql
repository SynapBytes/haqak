
-- Fix 1: Restrict MP issue updates to assigned issues only
DROP POLICY IF EXISTS "MPs can update issues" ON public.issues;

CREATE POLICY "MPs can update assigned issues"
ON public.issues
FOR UPDATE
TO authenticated
USING (
  is_active_mp(auth.uid()) AND assigned_mp_id = auth.uid()
)
WITH CHECK (
  is_active_mp(auth.uid()) AND assigned_mp_id = auth.uid()
);

-- Fix 2: Remove overly permissive storage policies
DROP POLICY IF EXISTS "Authenticated users can view issue-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view issue attachments" ON storage.objects;
