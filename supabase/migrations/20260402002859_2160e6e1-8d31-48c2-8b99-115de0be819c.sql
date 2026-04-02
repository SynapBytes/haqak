
-- Drop the existing permissive self-update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Re-create with a WITH CHECK that blocks non-admins from setting is_approved = true
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Either the user is not changing is_approved to true, or they are an admin
    is_approved IS NOT DISTINCT FROM (SELECT p.is_approved FROM public.profiles p WHERE p.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
