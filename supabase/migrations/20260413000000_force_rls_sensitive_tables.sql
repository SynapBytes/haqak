-- Enforce RLS for sensitive operational and identity tables.
-- This keeps existing policies unchanged while preventing table-owner bypass.

ALTER TABLE IF EXISTS public.collective_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.digital_signatures FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mp_kpis FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_knowledge_base FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.otp_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.captcha_verifications FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.csrf_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_verification_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submission_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_validation_log FORCE ROW LEVEL SECURITY;
