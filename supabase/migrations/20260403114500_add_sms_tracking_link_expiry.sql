-- Add expiration for SMS tracking links and enforce a secure default TTL.
-- NOTE: Keep this interval in sync with TRACKING_LINK_TTL_DAYS in
-- supabase/functions/create-tracking-link/index.ts.
ALTER TABLE public.sms_tracking_links
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

UPDATE public.sms_tracking_links
SET expires_at = created_at + INTERVAL '14 days';

ALTER TABLE public.sms_tracking_links
ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_tracking_expires_at
ON public.sms_tracking_links(expires_at);
