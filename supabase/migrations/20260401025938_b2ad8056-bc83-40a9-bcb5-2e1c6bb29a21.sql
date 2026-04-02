
-- Fix security definer view by recreating with security_invoker
DROP VIEW IF EXISTS public.mp_public_profiles;

CREATE VIEW public.mp_public_profiles
WITH (security_invoker = true)
AS
SELECT user_id, full_name, constituency, governorate, center, avatar_url, contact_phone, is_approved
FROM profiles
WHERE is_approved = true
  AND has_role(user_id, 'mp'::app_role);

GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;

-- We need a permissive SELECT policy on profiles for anon to read via the view
-- but scoped to only approved MP rows
CREATE POLICY "Anon can read approved MP profiles via view" ON public.profiles
  FOR SELECT TO anon
  USING (is_approved = true AND has_role(user_id, 'mp'::app_role));
