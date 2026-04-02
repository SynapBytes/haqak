-- Sprint 1 follow-up: centers compatibility fields, onboarding/verification profile fields,
-- privacy RLS hardening, and MP-safe aggregates.

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.centers
SET
  code = COALESCE(code, md5(lower(governorate_en || '-' || district_en))),
  name_ar = COALESCE(name_ar, district_ar),
  name_en = COALESCE(name_en, district_en);

ALTER TABLE public.centers
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN name_ar SET NOT NULL,
  ALTER COLUMN name_en SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_centers_code_unique ON public.centers (code);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_verification_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END
$$;

UPDATE public.profiles p
SET
  email = COALESCE(p.email, u.email),
  email_verified = COALESCE(p.email_verified, false) OR (u.email_confirmed_at IS NOT NULL),
  phone_verified = COALESCE(p.phone_verified, false) OR (u.phone_confirmed_at IS NOT NULL),
  verification_status = CASE
    WHEN p.verification_status IS NOT NULL THEN p.verification_status
    WHEN p.is_approved THEN 'verified'
    ELSE 'unverified'
  END
FROM auth.users u
WHERE u.id = p.user_id;

CREATE OR REPLACE FUNCTION public.upsert_centers_from_json(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  WITH parsed AS (
    SELECT
      COALESCE(NULLIF(trim(value->>'code'), ''), md5(lower((value->>'governorate_en') || '-' || COALESCE(value->>'district_en', value->>'name_en')))) AS code,
      value->>'name_ar' AS name_ar,
      value->>'name_en' AS name_en,
      value->>'governorate_ar' AS governorate_ar,
      value->>'governorate_en' AS governorate_en
    FROM jsonb_array_elements(_rows) AS value
  ),
  upserted AS (
    INSERT INTO public.centers (
      code,
      name_ar,
      name_en,
      governorate_ar,
      governorate_en,
      district_ar,
      district_en
    )
    SELECT
      p.code,
      p.name_ar,
      p.name_en,
      p.governorate_ar,
      p.governorate_en,
      p.name_ar,
      p.name_en
    FROM parsed p
    ON CONFLICT (code) DO UPDATE
    SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      governorate_ar = EXCLUDED.governorate_ar,
      governorate_en = EXCLUDED.governorate_en,
      district_ar = EXCLUDED.district_ar,
      district_en = EXCLUDED.district_en
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM upserted;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_centers_from_json(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_centers_from_json(jsonb) TO service_role;

-- Enforce center immutability after onboarding for non-admin users.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (
        SELECT p.center_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
      ) IS NULL
      OR center_id IS NOT DISTINCT FROM (
        SELECT p.center_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
      )
    )
  )
  AND (
    is_approved IS NOT DISTINCT FROM (
      SELECT p.is_approved
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Privacy hardening: MPs and citizens cannot enumerate citizen profiles.
DROP POLICY IF EXISTS "MPs can view citizen profiles" ON public.profiles;
DROP POLICY IF EXISTS "MPs can view assigned citizen profiles" ON public.profiles;

DROP POLICY IF EXISTS "Authenticated can read approved MP profiles via view" ON public.profiles;
CREATE POLICY "Authenticated can read approved MP profiles via view" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_approved = true AND has_role(user_id, 'mp'::app_role));

CREATE OR REPLACE FUNCTION public.get_mp_center_citizens_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT p.center_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.center_id IS NOT NULL
      AND public.is_active_mp(auth.uid())
    LIMIT 1
  )
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  JOIN me ON me.center_id = p.center_id
  WHERE ur.role = 'citizen'::app_role;
$$;

REVOKE ALL ON FUNCTION public.get_mp_center_citizens_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mp_center_citizens_count() TO authenticated;
