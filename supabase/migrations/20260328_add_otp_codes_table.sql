-- Create OTP codes table for tracking sent OTPs
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('login', 'signup-citizen', 'signup-mp', 'forgot-password')),
  attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (phone, mode, created_at)
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_otp_codes_phone ON public.otp_codes(phone);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);
CREATE INDEX idx_otp_codes_used ON public.otp_codes(used);

-- Allow service role to manage OTP codes
CREATE POLICY "Service role can manage OTP codes" ON public.otp_codes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_codes
  WHERE expires_at < now() AND used = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger to clean up expired OTPs periodically
-- Note: This would need to be called by a cron job or manually
-- For now, we'll rely on the application to clean up expired OTPs
