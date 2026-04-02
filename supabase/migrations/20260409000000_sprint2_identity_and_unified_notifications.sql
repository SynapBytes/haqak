-- Sprint 2: identity verification + unified notifications

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage buckets (private)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('id_verifications', 'id_verifications', false),
  ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- id_verifications bucket policies
DROP POLICY IF EXISTS "Users upload own ID verification images" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can read ID verification images" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can delete ID verification images" ON storage.objects;

CREATE POLICY "Users upload own ID verification images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'id_verifications'
  AND cardinality(storage.foldername(name)) >= 2
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner or admin can read ID verification images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'id_verifications'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Owner or admin can delete ID verification images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'id_verifications'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- receipts bucket policies (private, owner+admin)
DROP POLICY IF EXISTS "Users upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can delete receipts" ON storage.objects;

CREATE POLICY "Users upload own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  -- receipts paths are expected as {userId}/file (single owner folder),
  -- unlike id_verifications which uses {userId}/{verificationId}/file.
  AND cardinality(storage.foldername(name)) >= 1
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner or admin can read receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Owner or admin can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Identity verifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  center_id_snapshot uuid REFERENCES public.centers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  id_front_path text NOT NULL,
  id_back_path text NOT NULL,
  ocr_provider text,
  ocr_raw_json jsonb,
  extracted_fields_json jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_user_id ON public.identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_status ON public.identity_verifications(status, submitted_at DESC);

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own identity verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can view own identity verifications or admins" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can update pending own verification or admins" ON public.identity_verifications;

CREATE POLICY "Users can insert own identity verifications"
ON public.identity_verifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own identity verifications or admins"
ON public.identity_verifications FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Users can update pending own verification or admins"
ON public.identity_verifications FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (
    auth.uid() = user_id
    AND status = 'pending'
    AND decided_at IS NULL
    AND decided_by IS NULL
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_email text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Unified notifications
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

UPDATE public.notifications
SET
  target_user_id = COALESCE(target_user_id, user_id),
  body = COALESCE(body, message),
  read_at = CASE
    WHEN read_at IS NOT NULL THEN read_at
    WHEN is_read THEN created_at
    ELSE NULL
  END
WHERE target_user_id IS NULL
   OR body IS NULL
   OR (is_read = true AND read_at IS NULL);

ALTER TABLE public.notifications
  ALTER COLUMN target_user_id SET NOT NULL,
  ALTER COLUMN body SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id_created_at
  ON public.notifications(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at
  ON public.notifications(target_user_id, read_at);

CREATE OR REPLACE FUNCTION public.sync_legacy_notification_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, NEW.target_user_id);
  NEW.target_user_id := COALESCE(NEW.target_user_id, NEW.user_id);
  NEW.message := COALESCE(NEW.message, NEW.body);
  NEW.body := COALESCE(NEW.body, NEW.message);
  NEW.is_read := COALESCE(NEW.is_read, NEW.read_at IS NOT NULL, false);
  IF NEW.read_at IS NULL AND NEW.is_read THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_legacy_notification_columns ON public.notifications;
CREATE TRIGGER trg_sync_legacy_notification_columns
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_notification_columns();

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_opt_in boolean NOT NULL DEFAULT true,
  email_opt_in boolean NOT NULL DEFAULT true,
  inapp_opt_in boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Admins can view all notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view own notification preferences"
ON public.notification_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
ON public.notification_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification preferences"
ON public.notification_preferences FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('inapp', 'sms', 'email')),
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id
  ON public.notification_deliveries(notification_id, created_at DESC);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification deliveries" ON public.notification_deliveries;
DROP POLICY IF EXISTS "Service role can insert notification deliveries" ON public.notification_deliveries;
DROP POLICY IF EXISTS "Admins can view all notification deliveries" ON public.notification_deliveries;

CREATE POLICY "Users can view own notification deliveries"
ON public.notification_deliveries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.id = notification_deliveries.notification_id
      AND n.target_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all notification deliveries"
ON public.notification_deliveries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role can insert notification deliveries"
ON public.notification_deliveries FOR INSERT TO service_role
WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Email verification code storage (OTP)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_email_created
  ON public.email_verification_codes(user_id, email, created_at DESC);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage email verification codes" ON public.email_verification_codes;
CREATE POLICY "Service role can manage email verification codes"
ON public.email_verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
