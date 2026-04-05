
DROP POLICY IF EXISTS "MPs can view citizen profiles" ON public.profiles;
DROP POLICY IF EXISTS "MPs can view assigned citizen profiles" ON public.profiles;
CREATE POLICY "MPs can view assigned citizen profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    is_active_mp(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.assigned_mp_id = auth.uid()
        AND issues.user_id = profiles.user_id
    )
  );
