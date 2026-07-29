CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.support_feedback_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  public_reference TEXT NOT NULL UNIQUE,
  submission_id UUID NOT NULL UNIQUE,
  legacy_contribution_id UUID,
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  language TEXT,
  source TEXT NOT NULL DEFAULT 'haqak_support_page',
  request_fingerprint TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  email_sent_at TIMESTAMPTZ,
  delivery_error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT support_feedback_reference_format CHECK (public_reference ~ '^HQK-SUP-[0-9]{8}-[A-F0-9]{12}$'),
  CONSTRAINT support_feedback_name_length CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT support_feedback_email_length CHECK (email IS NULL OR char_length(email) <= 255),
  CONSTRAINT support_feedback_message_length CHECK (char_length(message) BETWEEN 10 AND 4000),
  CONSTRAINT support_feedback_language_length CHECK (language IS NULL OR char_length(language) BETWEEN 2 AND 16),
  CONSTRAINT support_feedback_source_length CHECK (char_length(source) BETWEEN 1 AND 64),
  CONSTRAINT support_feedback_delivery_status CHECK (delivery_status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX support_feedback_created_at_idx
  ON public.support_feedback_messages (created_at DESC);
CREATE INDEX support_feedback_delivery_status_created_at_idx
  ON public.support_feedback_messages (delivery_status, created_at DESC);
CREATE INDEX support_feedback_fingerprint_created_at_idx
  ON public.support_feedback_messages (request_fingerprint, created_at DESC);

ALTER TABLE public.support_feedback_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_feedback_messages FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_feedback_messages FROM PUBLIC;
REVOKE ALL ON TABLE public.support_feedback_messages FROM anon;
REVOKE ALL ON TABLE public.support_feedback_messages FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.support_feedback_messages TO service_role;

CREATE TABLE public.support_feedback_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_feedback_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_feedback_rate_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_feedback_rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.support_feedback_rate_limits FROM anon;
REVOKE ALL ON TABLE public.support_feedback_rate_limits FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.support_feedback_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_support_feedback_rate_limit(
  p_bucket_key TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_seconds INTEGER,
  current_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_window INTERVAL;
  v_row public.support_feedback_rate_limits%ROWTYPE;
BEGIN
  IF p_bucket_key IS NULL OR char_length(p_bucket_key) < 16 THEN
    RAISE EXCEPTION 'invalid bucket key';
  END IF;
  IF p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid window';
  END IF;
  IF p_max_requests < 1 OR p_max_requests > 1000 THEN
    RAISE EXCEPTION 'invalid request limit';
  END IF;

  v_window := make_interval(secs => p_window_seconds);

  INSERT INTO public.support_feedback_rate_limits AS limits (
    bucket_key,
    window_started_at,
    hit_count,
    updated_at
  )
  VALUES (p_bucket_key, v_now, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at + v_window <= v_now THEN v_now
      ELSE limits.window_started_at
    END,
    hit_count = CASE
      WHEN limits.window_started_at + v_window <= v_now THEN 1
      ELSE limits.hit_count + 1
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  allowed := v_row.hit_count <= p_max_requests;
  current_count := v_row.hit_count;
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_row.window_started_at + v_window) - v_now)))::INTEGER
    )
  END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_support_feedback_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_support_feedback_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.consume_support_feedback_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_support_feedback_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.set_support_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_support_feedback_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_support_feedback_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_support_feedback_updated_at() FROM authenticated;

CREATE TRIGGER support_feedback_set_updated_at
BEFORE UPDATE ON public.support_feedback_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_support_feedback_updated_at();
