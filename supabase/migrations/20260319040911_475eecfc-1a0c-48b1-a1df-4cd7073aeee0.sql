
-- Allow public access to MP profiles for the public profile page
-- Only expose profiles of users with 'mp' role and approved status
CREATE POLICY "Public can view approved MP profiles" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (
    is_approved = true 
    AND has_role(user_id, 'mp'::app_role)
  );

-- Allow public read of issues (for MP stats on public profile)
CREATE POLICY "Public can view issues for MP profiles" ON public.issues
  FOR SELECT TO anon
  USING (assigned_mp_id IS NOT NULL);
