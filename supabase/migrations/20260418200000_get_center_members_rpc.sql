-- RPC: get_center_members
-- Returns a public-safe list of members registered in the same center as the
-- calling user.  The center_id is resolved server-side from auth.uid() so the
-- client can never request data for a different center (IDOR prevention).
-- Only non-sensitive fields are exposed: a display name, the role, and whether
-- the member's identity has been verified.
--
-- Parameters
--   p_limit  – rows per page (default 20, hard-capped at 50)
--   p_offset – pagination offset (default 0)

CREATE OR REPLACE FUNCTION public.get_center_members(
  p_limit  integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  display_name text,
  role         app_role,
  is_verified  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  _my_center_id uuid;
BEGIN
  -- Resolve the calling user's center from their profile.
  SELECT p.center_id INTO _my_center_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  -- User has not completed center onboarding – return empty result set.
  IF _my_center_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(trim(pr.full_name), ''), '—') AS display_name,
    ur.role,
    (pr.verification_status = 'verified')         AS is_verified
  FROM public.profiles     pr
  JOIN public.user_roles   ur ON ur.user_id = pr.user_id
  WHERE pr.center_id  = _my_center_id
    AND pr.user_id   <> auth.uid()          -- exclude the caller
    AND ur.role      IN ('citizen', 'mp')
  ORDER BY
    -- MPs listed first, then citizens; alphabetical within each group
    CASE ur.role WHEN 'mp' THEN 0 ELSE 1 END,
    pr.full_name ASC NULLS LAST
  LIMIT  LEAST(p_limit, 50)
  OFFSET p_offset;
END;
$$;

-- Restrict access: only authenticated users can call this function.
REVOKE ALL ON FUNCTION public.get_center_members(integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_center_members(integer, integer) TO authenticated;
