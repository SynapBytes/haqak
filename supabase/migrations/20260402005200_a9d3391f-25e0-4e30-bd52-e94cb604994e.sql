-- Create otp_codes table for OTP verification
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  mode text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE IF EXISTS public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service_role can access OTP codes (edge functions use service role)
DROP POLICY IF EXISTS "Service role full access on otp_codes" ON public.otp_codes;
CREATE POLICY "Service role full access on otp_codes"
ON public.otp_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create rate_limit_logs table
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  request_path text NOT NULL,
  response_status integer,
  ip_address text NOT NULL,
  request_timestamp timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE IF EXISTS public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can access rate limit logs
DROP POLICY IF EXISTS "Service role full access on rate_limit_logs" ON public.rate_limit_logs;
CREATE POLICY "Service role full access on rate_limit_logs"
ON public.rate_limit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_mode ON public.otp_codes (phone, mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip ON public.rate_limit_logs (ip_address, request_path, request_timestamp DESC);
