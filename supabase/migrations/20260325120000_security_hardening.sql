-- SQL Migration for Database Security Hardening
-- Migration created on 2026-03-25 09:32:34 UTC by SynapBytes

-- Add your security hardening SQL commands below

-- Example: Revoking access to all users
REVOKE ALL ON SCHEMA public FROM public;

-- Example: Restrict access to specific tables
REVOKE ALL ON TABLE sensitive_data FROM public;
GRANT SELECT ON TABLE sensitive_data TO admin_role;

-- Example: Ensure the use of secure connections
ALTER SYSTEM SET ssl = 'on';

-- Additional security hardening commands can be added here.
