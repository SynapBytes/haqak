CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

ALTER TABLE public.support_feedback_messages
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS support_feedback_retry_queue_idx
  ON public.support_feedback_messages (next_attempt_at, created_at)
  WHERE delivery_status IN ('pending', 'failed');

CREATE TABLE IF NOT EXISTS public.support_feedback_runtime_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  delivery_enabled boolean NOT NULL DEFAULT false,
  sender_email text NOT NULL DEFAULT 'Haqak Support <support@mail.haqak.org>',
  recipient_email text NOT NULL DEFAULT 'support@haqak.org',
  resend_secret_name text NOT NULL DEFAULT 'haqak_support_resend_api_key',
  worker_secret_name text NOT NULL DEFAULT 'haqak_support_worker_token',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_feedback_runtime_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_feedback_runtime_config FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_feedback_runtime_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.support_feedback_runtime_config TO service_role;

INSERT INTO public.support_feedback_runtime_config (
  singleton,
  delivery_enabled,
  sender_email,
  recipient_email,
  resend_secret_name,
  worker_secret_name
)
VALUES (
  true,
  false,
  'Haqak Support <support@mail.haqak.org>',
  'support@haqak.org',
  'haqak_support_resend_api_key',
  'haqak_support_worker_token'
)
ON CONFLICT (singleton) DO UPDATE SET
  sender_email = EXCLUDED.sender_email,
  recipient_email = EXCLUDED.recipient_email,
  resend_secret_name = EXCLUDED.resend_secret_name,
  worker_secret_name = EXCLUDED.worker_secret_name,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.get_support_feedback_runtime_config()
RETURNS TABLE (
  delivery_enabled boolean,
  sender_email text,
  recipient_email text,
  resend_api_key text,
  worker_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, pg_catalog
AS $$
  SELECT
    c.delivery_enabled,
    c.sender_email,
    c.recipient_email,
    r.decrypted_secret,
    w.decrypted_secret
  FROM public.support_feedback_runtime_config c
  LEFT JOIN vault.decrypted_secrets r ON r.name = c.resend_secret_name
  LEFT JOIN vault.decrypted_secrets w ON w.name = c.worker_secret_name
  WHERE c.singleton = true;
$$;

REVOKE ALL ON FUNCTION public.get_support_feedback_runtime_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_feedback_runtime_config() TO service_role;

CREATE OR REPLACE FUNCTION public.claim_support_feedback_batch(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  public_reference text,
  submission_id uuid,
  legacy_contribution_id uuid,
  name text,
  email text,
  message text,
  language text,
  attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT m.id
    FROM public.support_feedback_messages m
    WHERE m.delivery_status IN ('pending', 'failed')
      AND m.next_attempt_at <= now()
      AND m.attempt_count < 20
    ORDER BY m.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ), claimed AS (
    UPDATE public.support_feedback_messages m
    SET
      delivery_status = 'pending',
      attempt_count = m.attempt_count + 1,
      last_attempt_at = now(),
      next_attempt_at = now() + interval '15 minutes',
      updated_at = now()
    FROM candidates c
    WHERE m.id = c.id
    RETURNING m.*
  )
  SELECT
    claimed.id,
    claimed.public_reference,
    claimed.submission_id,
    claimed.legacy_contribution_id,
    claimed.name,
    claimed.email,
    claimed.message,
    claimed.language,
    claimed.attempt_count
  FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_support_feedback_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_support_feedback_batch(integer) TO service_role;
