ALTER TABLE public.support_feedback_runtime_config
  ADD COLUMN IF NOT EXISTS rate_limit_salt text,
  ADD COLUMN IF NOT EXISTS worker_token text;

UPDATE public.support_feedback_runtime_config
SET
  rate_limit_salt = COALESCE(rate_limit_salt, encode(extensions.gen_random_bytes(32), 'hex')),
  worker_token = COALESCE(worker_token, encode(extensions.gen_random_bytes(32), 'hex')),
  updated_at = now()
WHERE singleton = true;

ALTER TABLE public.support_feedback_runtime_config
  ALTER COLUMN rate_limit_salt SET NOT NULL,
  ALTER COLUMN worker_token SET NOT NULL;

DROP FUNCTION IF EXISTS public.get_support_feedback_runtime_config();

CREATE FUNCTION public.get_support_feedback_runtime_config()
RETURNS TABLE (
  delivery_enabled boolean,
  sender_email text,
  recipient_email text,
  rate_limit_salt text,
  worker_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.delivery_enabled,
    c.sender_email,
    c.recipient_email,
    c.rate_limit_salt,
    c.worker_token
  FROM public.support_feedback_runtime_config c
  WHERE c.singleton = true;
$$;

REVOKE ALL ON FUNCTION public.get_support_feedback_runtime_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_feedback_runtime_config() TO service_role;
