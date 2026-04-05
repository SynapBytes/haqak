-- Strict MP Profile Access Control
-- This migration ensures that MPs can ONLY view the profiles of citizens who have issues assigned to them.
-- It cleans up any previous permissive policies and implements a robust check.

-- 1. Clean up any potential conflicting policies
DROP POLICY IF EXISTS "MPs can view citizen profiles" ON public.profiles;
DROP POLICY IF EXISTS "MPs can view assigned citizen profiles" ON public.profiles;

-- 2. Create the new strict policy
DROP POLICY IF EXISTS "MPs can view assigned citizen profiles" ON public.profiles;
CREATE POLICY "MPs can view assigned citizen profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    -- Only active (approved) MPs can use this policy
    is_active_mp(auth.uid()) 
    AND EXISTS (
      -- Check if there is at least one issue assigned to this MP belonging to the profile owner
      SELECT 1 FROM public.issues
      WHERE issues.user_id = profiles.user_id
        AND issues.assigned_mp_id = auth.uid()
    )
  );

-- 3. Add a comment for security auditing
COMMENT ON POLICY "MPs can view assigned citizen profiles" ON public.profiles IS 'Restricts MPs to only view profiles of citizens who have issues assigned to them, protecting general citizen privacy.';
