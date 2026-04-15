-- Remove deprecated phone-based OTP authentication artifacts.

DROP POLICY IF EXISTS "Service role can manage OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Service role full access on otp_codes" ON public.otp_codes;
DROP TABLE IF EXISTS public.otp_codes;
