
-- Create a public view exposing only safe MP profile fields
CREATE OR REPLACE VIEW public.mp_public_profiles AS
SELECT user_id, full_name, constituency, governorate, center, avatar_url, contact_phone, is_approved
FROM profiles
WHERE is_approved = true
  AND has_role(user_id, 'mp'::app_role);

-- Grant access to the view
GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;

-- Drop the overly broad anon/authenticated policy on the base profiles table
DROP POLICY IF EXISTS "Public can view approved MP profiles" ON public.profiles;
