-- SQL Migration for Database Security Hardening
-- Migration created on 2026-03-25 09:32:34 UTC by SynapBytes

-- Add your security hardening SQL commands below

-- Example: Revoking access to all users
REVOKE ALL ON SCHEMA public FROM public;

-- Example: Restrict access to specific tables (defensive/idempotent)
DO $$
BEGIN
  IF to_regclass('public.sensitive_data') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sensitive_data FROM PUBLIC';

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
      EXECUTE 'GRANT SELECT ON TABLE public.sensitive_data TO admin_role';
    END IF;
  END IF;
END
$$;

-- NOTE:
-- ALTER SYSTEM requires elevated privileges and is not safe for hosted migration runs.
-- Configure SSL at the platform/database level instead of in SQL migrations.

-- Additional security hardening commands can be added here.
