-- Notification idempotency: dedup_key prevents duplicate external deliveries
-- within a configurable time window (default: 1 hour, enforced in edge function).

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- Partial unique index: only enforce uniqueness when dedup_key is set.
-- This is safe to add on an existing table because existing rows have NULL dedup_key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key
  ON public.notifications (dedup_key)
  WHERE dedup_key IS NOT NULL;
