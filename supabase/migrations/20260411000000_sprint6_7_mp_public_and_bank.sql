-- Sprint 6-7: MP public profile/posts + MP bank settings + admin verification

-- -----------------------------------------------------------------------------
-- Public MP profile view (safe fields only)
-- -----------------------------------------------------------------------------
-- Recreate view to enforce a stable safe-field projection for Sprint 6-7.
DROP VIEW IF EXISTS public.mp_public_profiles;
CREATE VIEW public.mp_public_profiles
WITH (security_invoker = true)
AS
SELECT
  user_id,
  full_name,
  constituency,
  governorate,
  center,
  district,
  electoral_district,
  center_id,
  avatar_url,
  is_approved
FROM public.profiles
WHERE is_approved = true
  AND has_role(user_id, 'mp'::app_role);

GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Authenticated can read approved MP profiles via view" ON public.profiles;
CREATE POLICY "Authenticated can read approved MP profiles via view" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    is_approved = true
    AND has_role(user_id, 'mp'::app_role)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'mp'::app_role)
      OR (
        has_role(auth.uid(), 'citizen'::app_role)
        AND center_id IS NOT NULL
        AND center_id = (
          SELECT me.center_id
          FROM public.profiles me
          WHERE me.user_id = auth.uid()
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Sprint 6: MP public posts/projects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mp_public_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE RESTRICT,
  title text,
  body text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public')),
  ai_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(images) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_mp_public_posts_mp_created
  ON public.mp_public_posts (mp_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_public_posts_center_created
  ON public.mp_public_posts (center_id, created_at DESC);

ALTER TABLE public.mp_public_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read public MP posts" ON public.mp_public_posts;
DROP POLICY IF EXISTS "Verified MPs can insert own public posts" ON public.mp_public_posts;
DROP POLICY IF EXISTS "Verified MPs can update own public posts" ON public.mp_public_posts;
DROP POLICY IF EXISTS "Verified MPs can delete own public posts" ON public.mp_public_posts;

CREATE POLICY "Authenticated can read public MP posts"
ON public.mp_public_posts FOR SELECT TO authenticated
USING (visibility = 'public');

CREATE POLICY "Verified MPs can insert own public posts"
ON public.mp_public_posts FOR INSERT TO authenticated
WITH CHECK (
  mp_user_id = auth.uid()
  AND visibility = 'public'
  AND public.is_active_mp(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = mp_public_posts.center_id
  )
);

CREATE POLICY "Verified MPs can update own public posts"
ON public.mp_public_posts FOR UPDATE TO authenticated
USING (
  mp_user_id = auth.uid()
  AND public.is_active_mp(auth.uid())
)
WITH CHECK (
  mp_user_id = auth.uid()
  AND visibility = 'public'
  AND public.is_active_mp(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = mp_public_posts.center_id
  )
);

CREATE POLICY "Verified MPs can delete own public posts"
ON public.mp_public_posts FOR DELETE TO authenticated
USING (
  mp_user_id = auth.uid()
  AND public.is_active_mp(auth.uid())
);

DROP TRIGGER IF EXISTS update_mp_public_posts_updated_at ON public.mp_public_posts;
CREATE TRIGGER update_mp_public_posts_updated_at
BEFORE UPDATE ON public.mp_public_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public images bucket for MP public posts/projects
-- Intentionally updates only "public" on conflict; other mutable bucket settings
-- are managed in dedicated storage migrations when needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('mp-public-images', 'mp-public-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Verified MPs upload own public post images" ON storage.objects;
DROP POLICY IF EXISTS "Verified MPs delete own public post images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view MP public post images" ON storage.objects;

CREATE POLICY "Verified MPs upload own public post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mp-public-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_mp(auth.uid())
);

CREATE POLICY "Verified MPs delete own public post images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'mp-public-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_mp(auth.uid())
);

CREATE POLICY "Public can view MP public post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'mp-public-images');

-- -----------------------------------------------------------------------------
-- Sprint 7: MP bank account settings + admin verification
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mp_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  iban text NOT NULL,
  swift text NOT NULL,
  branch_name text,
  country text NOT NULL DEFAULT 'Egypt',
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text
);

CREATE INDEX IF NOT EXISTS idx_mp_bank_accounts_status_created
  ON public.mp_bank_accounts (status, created_at DESC);

ALTER TABLE public.mp_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verified MPs can read own bank details" ON public.mp_bank_accounts;
DROP POLICY IF EXISTS "Verified MPs can insert own bank details" ON public.mp_bank_accounts;
DROP POLICY IF EXISTS "Verified MPs can update own bank details" ON public.mp_bank_accounts;
DROP POLICY IF EXISTS "Admins can read all mp bank accounts" ON public.mp_bank_accounts;
DROP POLICY IF EXISTS "Admins can verify all mp bank accounts" ON public.mp_bank_accounts;

CREATE POLICY "Verified MPs can read own bank details"
ON public.mp_bank_accounts FOR SELECT TO authenticated
USING (mp_user_id = auth.uid());

CREATE POLICY "Verified MPs can insert own bank details"
ON public.mp_bank_accounts FOR INSERT TO authenticated
WITH CHECK (
  mp_user_id = auth.uid()
  AND public.is_active_mp(auth.uid())
  AND status = 'pending_verification'
  AND verified_by IS NULL
  AND verified_at IS NULL
  AND rejection_reason IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
  )
);

CREATE POLICY "Verified MPs can update own bank details"
ON public.mp_bank_accounts FOR UPDATE TO authenticated
USING (
  mp_user_id = auth.uid()
  AND public.is_active_mp(auth.uid())
)
WITH CHECK (
  mp_user_id = auth.uid()
  AND public.is_active_mp(auth.uid())
  AND status = 'pending_verification'
  AND verified_by IS NULL
  AND verified_at IS NULL
  AND rejection_reason IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
  )
);

CREATE POLICY "Admins can read all mp bank accounts"
ON public.mp_bank_accounts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can verify all mp bank accounts"
ON public.mp_bank_accounts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS update_mp_bank_accounts_updated_at ON public.mp_bank_accounts;
CREATE TRIGGER update_mp_bank_accounts_updated_at
BEFORE UPDATE ON public.mp_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit bank detail changes and admin decisions
CREATE OR REPLACE FUNCTION public.mask_bank_value(_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _value IS NULL OR length(_value) <= 4 THEN
    RETURN _value;
  END IF;
  RETURN repeat('*', greatest(length(_value) - 4, 0)) || right(_value, 4);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_mp_bank_account_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := public.resolve_audit_actor();
  action_name text;
  old_payload jsonb;
  new_payload jsonb;
BEGIN
  old_payload := CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
    'status', OLD.status,
    'bank_name', OLD.bank_name,
    'account_number_masked', public.mask_bank_value(OLD.account_number),
    'iban_masked', public.mask_bank_value(OLD.iban),
    'swift_masked', public.mask_bank_value(OLD.swift)
  ) ELSE NULL END;

  new_payload := jsonb_build_object(
    'status', NEW.status,
    'bank_name', NEW.bank_name,
    'account_number_masked', public.mask_bank_value(NEW.account_number),
    'iban_masked', public.mask_bank_value(NEW.iban),
    'swift_masked', public.mask_bank_value(NEW.swift),
    'verified_by', NEW.verified_by,
    'verified_at', NEW.verified_at,
    'rejection_reason', NEW.rejection_reason
  );

  IF TG_OP = 'INSERT' THEN
    action_name := 'mp_bank_account_submitted';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_name := CASE
        WHEN NEW.status = 'verified' THEN 'mp_bank_account_verified'
        WHEN NEW.status = 'rejected' THEN 'mp_bank_account_rejected'
        ELSE 'mp_bank_account_status_changed'
      END;
    ELSE
      action_name := 'mp_bank_account_updated';
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM public.log_audit_event(
    actor,
    action_name,
    'mp_bank_accounts',
    COALESCE(NEW.id, OLD.id),
    old_payload,
    new_payload,
    'success',
    NULL,
    jsonb_build_object('mp_user_id', COALESCE(NEW.mp_user_id, OLD.mp_user_id), 'operation', TG_OP)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_mp_bank_accounts_change ON public.mp_bank_accounts;
CREATE TRIGGER audit_mp_bank_accounts_change
AFTER INSERT OR UPDATE ON public.mp_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.log_mp_bank_account_audit();
