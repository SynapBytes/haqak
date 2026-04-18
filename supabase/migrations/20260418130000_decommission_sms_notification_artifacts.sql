-- Decommission SMS notification artifacts and enforce non-phone channels.

-- 1) Remove obsolete SMS tracking/history tables.
DROP TABLE IF EXISTS public.sms_notifications;
DROP TABLE IF EXISTS public.sms_tracking_links;

-- 2) Normalize historical delivery rows so channel constraints can be tightened safely.
UPDATE public.notification_deliveries
SET
  channel = 'inapp',
  status = CASE WHEN status = 'sent' THEN 'skipped' ELSE status END,
  error = COALESCE(error, 'sms channel retired')
WHERE channel = 'sms';

-- 3) Restrict delivery channels to approved non-phone channels only.
ALTER TABLE public.notification_deliveries
  DROP CONSTRAINT IF EXISTS notification_deliveries_channel_check;

ALTER TABLE public.notification_deliveries
  ADD CONSTRAINT notification_deliveries_channel_check
  CHECK (channel IN ('inapp', 'email'));

-- 4) Remove legacy SMS preference toggle.
ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS sms_opt_in;
