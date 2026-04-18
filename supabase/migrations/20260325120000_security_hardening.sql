-- SQL Migration for Database Security Hardening
-- Migration created on 2026-03-25 09:32:34 UTC by SynapBytes

-- Add your security hardening SQL commands below

-- Example: Revoking access to all users
REVOKE ALL ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- Example: Restrict access to specific tables (safe if table may not exist)
DO $$
BEGIN
  IF to_regclass('public.sensitive_data') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sensitive_data FROM public';
    EXECUTE 'GRANT SELECT ON TABLE public.sensitive_data TO admin_role';
  END IF;
END $$;

-- NOTE:
-- Removed unsupported command:
-- ALTER SYSTEM SET ssl = 'on';
-- (server-level setting; not allowed in Supabase preview pipeline)

-- Additional security hardening commands can be added here.
