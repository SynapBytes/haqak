
DROP POLICY "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    NOT (is_approved IS DISTINCT FROM (SELECT p.is_approved FROM profiles p WHERE p.user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  AND (
    banned_until IS NOT DISTINCT FROM (SELECT p.banned_until FROM profiles p WHERE p.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
