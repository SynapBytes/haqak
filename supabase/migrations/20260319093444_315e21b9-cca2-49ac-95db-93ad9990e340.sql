
-- Fix 1: Prevent privilege escalation - always assign 'citizen' on signup, allow 'mp' only with registration_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role := 'citizen';
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, registration_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'registration_number'
  );
  
  -- Only allow 'mp' role if registration_number is provided; never allow 'admin' from signup
  IF NEW.raw_user_meta_data->>'role' = 'mp' AND NEW.raw_user_meta_data->>'registration_number' IS NOT NULL AND NEW.raw_user_meta_data->>'registration_number' != '' THEN
    _role := 'mp';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$function$;

-- Fix 2: Drop anonymous access to issues (exposes citizen complaint data)
DROP POLICY IF EXISTS "Public can view issues for MP profiles" ON public.issues;

-- Fix 3: Make issue-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'issue-attachments';

-- Fix 4: Drop old permissive upload policy and create path-scoped one
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload issue attachments" ON storage.objects;

-- Recreate upload policy with path restriction
CREATE POLICY "Users can upload to own folder in issue-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'issue-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Recreate select policy for issue-attachments (authenticated only)
DROP POLICY IF EXISTS "Allow public read access on issue-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can view issue attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view issue-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'issue-attachments');
