DROP POLICY IF EXISTS "Citizens can create issues" ON public.issues;
CREATE POLICY "Citizens can create issues" ON public.issues
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.banned_until > now()
    )
  );