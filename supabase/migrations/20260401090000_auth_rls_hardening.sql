-- Strengthen Supabase auth model and RLS (production defaults)

-- 1) Add moderator role to enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'moderator'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator';
  END IF;
END;
$$;

-- 2) Helper functions for role checks
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = ANY (_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- 3) Profiles: allow moderators read-only visibility
DROP POLICY IF EXISTS "Moderators can view profiles" ON public.profiles;
CREATE POLICY "Moderators can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- 4) user_roles: allow moderators to audit roles (read-only)
DROP POLICY IF EXISTS "Moderators can view all roles" ON public.user_roles;
CREATE POLICY "Moderators can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- 5) Issues visibility for moderators (read-only)
DROP POLICY IF EXISTS "Moderators can view all issues" ON public.issues;
CREATE POLICY "Moderators can view all issues" ON public.issues
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- 6) Issue actions: moderators can read all actions
DROP POLICY IF EXISTS "Moderators can view issue actions" ON public.issue_actions;
CREATE POLICY "Moderators can view issue actions" ON public.issue_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- 7) Issue attachments table: allow moderators to read attachments
DROP POLICY IF EXISTS "Users can view attachments on their issues" ON public.issue_attachments;
CREATE POLICY "Users can view attachments on their issues" ON public.issue_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_attachments.issue_id
        AND issues.user_id = auth.uid()
    )
    OR public.is_active_mp(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  );

-- 8) Storage bucket read policy: add moderator allowance
DROP POLICY IF EXISTS "Restricted read access to issue attachments" ON storage.objects;
CREATE POLICY "Restricted read access to issue attachments" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'issue-attachments' AND (
      -- Owner of the upload
      auth.uid()::text = (storage.foldername(name))[1]
      OR (
        public.is_active_mp(auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.issues
          WHERE id = (storage.foldername(name))[2]::uuid
            AND assigned_mp_id = auth.uid()
        )
      )
      OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
    )
  );

-- 9) Audit logs: restrict writes to service role only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 10) Submission attempts: only service role can write, admins can review
DROP POLICY IF EXISTS "System can insert submission attempts" ON public.submission_attempts;
DROP POLICY IF EXISTS "Service role can insert submission attempts" ON public.submission_attempts;
CREATE POLICY "Service role can insert submission attempts" ON public.submission_attempts
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all submission attempts" ON public.submission_attempts;
CREATE POLICY "Admins can view all submission attempts" ON public.submission_attempts
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));

-- 11) Rate limit logs: service role manages, admins may inspect
DROP POLICY IF EXISTS "Service role can manage rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "Service role can manage rate limit logs" ON public.rate_limit_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "Admins can view rate limit logs" ON public.rate_limit_logs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));

-- 12) CAPTCHA verifications: only service role should access
DROP POLICY IF EXISTS "Service role can manage captcha verifications" ON public.captcha_verifications;
CREATE POLICY "Service role can manage captcha verifications" ON public.captcha_verifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 13) OTP codes: ensure service role only read/write
DROP POLICY IF EXISTS "Service role can manage OTP codes" ON public.otp_codes;
CREATE POLICY "Service role can manage OTP codes" ON public.otp_codes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
