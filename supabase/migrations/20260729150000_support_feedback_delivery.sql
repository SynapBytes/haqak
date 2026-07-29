-- Forward-only delivery metadata for Haqak support feedback.
-- Existing rows are preserved and marked as legacy; no content is rewritten.
--
-- Deployment safety: the legacy anonymous INSERT policy is intentionally kept
-- during the staged rollout so the currently deployed browser form does not
-- break between migration, function deployment and frontend deployment. Remove
-- that policy only in a separate post-verification migration after the live UI
-- has been proven to use the Edge Function successfully.

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS public_reference TEXT,
  ADD COLUMN IF NOT EXISTS submission_id UUID,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_error_code TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.feedbacks
SET delivery_status = 'legacy'
WHERE delivery_status IS NULL;

UPDATE public.feedbacks
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.feedbacks
  ALTER COLUMN delivery_status SET DEFAULT 'pending',
  ALTER COLUMN delivery_status SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.feedbacks
    ADD CONSTRAINT feedbacks_delivery_status_check
    CHECK (delivery_status IN ('legacy', 'pending', 'sent', 'failed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS feedbacks_public_reference_unique
  ON public.feedbacks (public_reference)
  WHERE public_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS feedbacks_submission_id_unique
  ON public.feedbacks (submission_id)
  WHERE submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS feedbacks_delivery_status_created_at_idx
  ON public.feedbacks (delivery_status, created_at DESC);
