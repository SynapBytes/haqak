-- Audit trail hardening and append-only enforcement
-- Focus: normalize audit_logs structure, enforce append-only semantics, and
-- add write paths for key civic actions (roles, approvals, issue status)

-- 1) Ensure audit_logs has the columns needed for traceability
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL CHECK (status IN ('success', 'failure')) DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS context JSONB;

ALTER TABLE public.audit_logs
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.audit_logs
  ALTER COLUMN entity_type DROP DEFAULT,
  ALTER COLUMN status DROP DEFAULT;

-- 2) RLS: append-only writes from service role, restricted reads to admins/moderators
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Oversight can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- No UPDATE/DELETE policies are intentionally defined to enforce append-only semantics.

-- 3) Prevent UPDATE/DELETE at database level (even for privileged callers)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only. % not allowed.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_logs_update ON public.audit_logs;
DROP TRIGGER IF EXISTS prevent_audit_logs_delete ON public.audit_logs;
CREATE TRIGGER prevent_audit_logs_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

CREATE TRIGGER prevent_audit_logs_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Helper to consistently resolve the actor from JWT claims (avoids mis-attribution)
CREATE OR REPLACE FUNCTION public.resolve_audit_actor()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  actor UUID;
BEGIN
  BEGIN
    actor := auth.uid();
  EXCEPTION WHEN others THEN
    actor := NULL;
  END;

  IF actor IS NULL THEN
    BEGIN
      actor := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    EXCEPTION WHEN others THEN
      actor := NULL;
    END;
  END IF;

  RETURN actor;
END;
$$;

-- 4) Central helper to write audit entries (usable from triggers/edge functions)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_context JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    status,
    error_message,
    context
  ) VALUES (
    p_actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_status,
    p_error_message,
    p_context
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- 5) Audit role assignments
CREATE OR REPLACE FUNCTION public.log_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := public.resolve_audit_actor();
  meta JSONB := NULL;
BEGIN
  IF actor IS NULL THEN
    meta := jsonb_build_object('actor_resolved', false, 'source', 'auth.uid missing');
  END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      actor,
      'role_assigned',
      'user_roles',
      NEW.user_id,
      NULL,
      jsonb_build_object('role', NEW.role),
      'success',
      NULL,
      meta
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      PERFORM public.log_audit_event(
        actor,
        'role_changed',
        'user_roles',
        NEW.user_id,
        jsonb_build_object('role', OLD.role),
        jsonb_build_object('role', NEW.role),
        'success',
        NULL,
        meta
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      actor,
      'role_revoked',
      'user_roles',
      OLD.user_id,
      jsonb_build_object('role', OLD.role),
      NULL,
      'success',
      NULL,
      meta
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles_change ON public.user_roles;
CREATE TRIGGER audit_user_roles_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_user_role_change();

-- 6) Audit profile approvals/rejections (is_approved flag)
CREATE OR REPLACE FUNCTION public.log_profile_approval_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := public.resolve_audit_actor();
  meta JSONB := NULL;
BEGIN
  IF actor IS NULL THEN
    meta := jsonb_build_object('actor_resolved', false, 'source', 'auth.uid missing');
  END IF;
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    PERFORM public.log_audit_event(
      actor,
      CASE WHEN NEW.is_approved THEN 'profile_approved' ELSE 'profile_rejected' END,
      'profiles',
      NEW.user_id,
      jsonb_build_object('is_approved', OLD.is_approved),
      jsonb_build_object('is_approved', NEW.is_approved),
      'success',
      NULL,
      meta
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_approval_change ON public.profiles;
CREATE TRIGGER audit_profile_approval_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_approved IS DISTINCT FROM NEW.is_approved)
  EXECUTE FUNCTION public.log_profile_approval_change();

-- 7) Audit issue status transitions (in addition to issue_status_history)
CREATE OR REPLACE FUNCTION public.log_issue_status_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := public.resolve_audit_actor();
  meta JSONB := NULL;
BEGIN
  IF actor IS NULL THEN
    meta := jsonb_build_object('actor_resolved', false, 'source', 'auth.uid missing');
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_audit_event(
      actor,
      'issue_status_changed',
      'issues',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      'success',
      NULL,
      meta
    );
  END IF;

  IF NEW.assigned_mp_id IS DISTINCT FROM OLD.assigned_mp_id THEN
    PERFORM public.log_audit_event(
      actor,
      'issue_assignment_changed',
      'issues',
      NEW.id,
      jsonb_build_object('assigned_mp_id', OLD.assigned_mp_id),
      jsonb_build_object('assigned_mp_id', NEW.assigned_mp_id),
      'success',
      NULL,
      meta
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_issue_update_trigger ON public.issues;
DROP TRIGGER IF EXISTS audit_issue_status_change ON public.issues;
CREATE TRIGGER audit_issue_status_change
  AFTER UPDATE ON public.issues
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_mp_id IS DISTINCT FROM NEW.assigned_mp_id)
  EXECUTE FUNCTION public.log_issue_status_audit();

-- 8) Audit moderation actions on issue comments (visibility flip)
CREATE OR REPLACE FUNCTION public.log_comment_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := public.resolve_audit_actor();
  meta JSONB := NULL;
BEGIN
  IF actor IS NULL THEN
    meta := jsonb_build_object('actor_resolved', false, 'source', 'auth.uid missing');
  END IF;
  IF NEW.is_internal IS DISTINCT FROM OLD.is_internal THEN
    PERFORM public.log_audit_event(
      actor,
      'comment_visibility_changed',
      'issue_comments',
      NEW.id,
      jsonb_build_object('is_internal', OLD.is_internal),
      jsonb_build_object('is_internal', NEW.is_internal),
      'success',
      NULL,
      meta
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_comment_moderation ON public.issue_comments;
CREATE TRIGGER audit_comment_moderation
  AFTER UPDATE ON public.issue_comments
  FOR EACH ROW
  WHEN (OLD.is_internal IS DISTINCT FROM NEW.is_internal)
  EXECUTE FUNCTION public.log_comment_moderation();
