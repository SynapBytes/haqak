
-- Allow MPs to read citizen profiles (for phone access in chat)
CREATE POLICY "MPs can view citizen profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'mp'::app_role));
