-- Enforce user ban at the database level (Server-side)
-- This migration adds a helper function to check if a user is currently banned
-- and updates the INSERT policy on the issues table to prevent banned users from submitting new issues.

-- 1. Create a helper function to check if a user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND banned_until IS NOT NULL
      AND banned_until > now()
  )
$$;

-- 2. Update the INSERT policy on the issues table
DROP POLICY IF EXISTS "Citizens can create issues" ON public.issues;

CREATE POLICY "Citizens can create issues" ON public.issues
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must be the owner of the issue
    auth.uid() = user_id
    -- User must NOT be banned
    AND NOT is_user_banned(auth.uid())
  );

COMMENT ON FUNCTION public.is_user_banned(uuid) IS 'Checks if a user is currently banned based on the banned_until column in their profile.';
COMMENT ON POLICY "Citizens can create issues" ON public.issues IS 'Allows authenticated users to create issues only if they are the owner and are not currently banned.';
