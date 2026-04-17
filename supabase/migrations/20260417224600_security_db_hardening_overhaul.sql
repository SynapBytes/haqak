-- Security and architecture hardening for signup roles, MP approval state,
-- assignment validation, status-history auditing, and rate-limit schema.

-- 1) Signup hardening: always default to citizen and ignore metadata role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role := 'citizen';
  _membership_number text := COALESCE(NEW.raw_user_meta_data->>'membership_number', NEW.raw_user_meta_data->>'registration_number');
  _governorate text := NEW.raw_user_meta_data->>'governorate';
  _district text := NEW.raw_user_meta_data->>'district';
  _electoral_district text := NEW.raw_user_meta_data->>'electoral_district';
  _center_id uuid := NULL;
BEGIN
  IF _governorate IS NOT NULL AND _district IS NOT NULL THEN
    _center_id := public.resolve_center_id(_governorate, _district);
  END IF;

  INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    membership_number,
    governorate,
    district,
    center,
    constituency,
    electoral_district,
    center_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    _membership_number,
    _governorate,
    _district,
    _district,
    _electoral_district,
    _electoral_district,
    _center_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2) Single source of truth for MP approval: profiles.is_approved.
-- Remove old fragile sync trigger that pushed mp_approvals -> profiles.
DROP TRIGGER IF EXISTS sync_mp_approval_status_trigger ON public.mp_approvals;
DROP FUNCTION IF EXISTS public.sync_mp_approval_status();

-- Keep mp_approvals as a derived/admin-tracking record synced from profile approvals.
CREATE OR REPLACE FUNCTION public.sync_mp_approvals_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = NEW.user_id
         AND ur.role = 'mp'::public.app_role
     ) THEN
    INSERT INTO public.mp_approvals (
      user_id,
      approved_by_admin_id,
      status,
      rejection_reason,
      approved_at,
      created_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      auth.uid(),
      CASE WHEN NEW.is_approved THEN 'approved' ELSE 'rejected' END,
      CASE WHEN NEW.is_approved THEN NULL ELSE 'Rejected via profile approval state' END,
      CASE WHEN NEW.is_approved THEN now() ELSE NULL END,
      now(),
      now()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      approved_by_admin_id = EXCLUDED.approved_by_admin_id,
      status = EXCLUDED.status,
      rejection_reason = EXCLUDED.rejection_reason,
      approved_at = CASE
        WHEN EXCLUDED.status = 'approved' THEN COALESCE(public.mp_approvals.approved_at, now())
        ELSE NULL
      END,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_mp_approvals_from_profile_trigger ON public.profiles;
CREATE TRIGGER sync_mp_approvals_from_profile_trigger
AFTER UPDATE OF is_approved ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_mp_approvals_from_profile();

-- Backfill/realign mp_approvals with current profile source-of-truth for MP users.
INSERT INTO public.mp_approvals (
  user_id,
  status,
  approved_at,
  created_at,
  updated_at
)
SELECT
  p.user_id,
  CASE WHEN p.is_approved THEN 'approved' ELSE 'pending' END,
  CASE WHEN p.is_approved THEN now() ELSE NULL END,
  now(),
  now()
FROM public.profiles p
JOIN public.user_roles ur
  ON ur.user_id = p.user_id
 AND ur.role = 'mp'::public.app_role
ON CONFLICT (user_id)
DO UPDATE SET
  status = EXCLUDED.status,
  approved_at = CASE
    WHEN EXCLUDED.status = 'approved' THEN COALESCE(public.mp_approvals.approved_at, now())
    ELSE NULL
  END,
  updated_at = now();

-- 3) Replace CHECK constraint role validation with trigger-based validation.
ALTER TABLE public.issue_assignments
  DROP CONSTRAINT IF EXISTS issue_assignments_assigned_to_role_check;

CREATE OR REPLACE FUNCTION public.validate_issue_assignment_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = NEW.assigned_to
      AND (
        ur.role = 'admin'::public.app_role
        OR (ur.role = 'mp'::public.app_role AND COALESCE(p.is_approved, false) = true)
      )
  ) THEN
    RAISE EXCEPTION 'assigned_to must be an approved MP or admin role'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_issue_assignment_assignee_trigger ON public.issue_assignments;
CREATE TRIGGER validate_issue_assignment_assignee_trigger
BEFORE INSERT OR UPDATE OF assigned_to ON public.issue_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_issue_assignment_assignee();

-- 4) Harden status-change logging when auth.uid() is NULL (service/system contexts).
CREATE OR REPLACE FUNCTION public.log_issue_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid;
  _claim_sub text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _actor_id := auth.uid();

    IF _actor_id IS NULL THEN
      _claim_sub := nullif(current_setting('request.jwt.claim.sub', true), '');
      IF _claim_sub IS NOT NULL THEN
        BEGIN
          _actor_id := _claim_sub::uuid;
        EXCEPTION WHEN others THEN
          _actor_id := NULL;
        END;
      END IF;
    END IF;

    INSERT INTO public.issue_status_history (
      issue_id,
      old_status,
      new_status,
      changed_by,
      note,
      changed_at
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      _actor_id,
      CASE WHEN _actor_id IS NULL THEN 'system_or_service_context' ELSE NULL END,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5) Reconcile rate_limit_logs schema to match shared/rate-limiter.ts expectations.
ALTER TABLE public.rate_limit_logs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS request_path text,
  ADD COLUMN IF NOT EXISTS response_status integer,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS request_timestamp timestamptz NOT NULL DEFAULT now();

-- Remove legacy conflicting columns when present.
ALTER TABLE public.rate_limit_logs
  DROP COLUMN IF EXISTS identifier,
  DROP COLUMN IF EXISTS action,
  DROP COLUMN IF EXISTS attempted_at;

-- Ensure user_id can be null for unauthenticated rate-limited endpoints.
ALTER TABLE public.rate_limit_logs
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

-- Defensive defaults for required columns expected by edge functions.
ALTER TABLE public.rate_limit_logs
  ALTER COLUMN request_path SET DEFAULT '',
  ALTER COLUMN request_path SET NOT NULL,
  ALTER COLUMN response_status SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_path_time
  ON public.rate_limit_logs (user_id, request_path, request_timestamp);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_path_time
  ON public.rate_limit_logs (ip_address, request_path, request_timestamp);
