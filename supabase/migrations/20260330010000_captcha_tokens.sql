-- Migration: CAPTCHA token single-use enforcement
-- Stores a hash of each verified CAPTCHA token so it cannot be reused.

CREATE TABLE IF NOT EXISTS captcha_verifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    TEXT        NOT NULL UNIQUE,
  ip_address    TEXT,
  verified_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_captcha_verifications_token_hash
  ON captcha_verifications (token_hash);

CREATE INDEX IF NOT EXISTS idx_captcha_verifications_verified_at
  ON captcha_verifications (verified_at);

-- Only the service role may read/write this table.
ALTER TABLE captcha_verifications ENABLE ROW LEVEL SECURITY;

-- Automatically purge records older than 10 minutes to keep the table small.
-- Recommended: schedule via pg_cron in production:
-- SELECT cron.schedule(
--   'cleanup-captcha-verifications',
--   '*/5 * * * *',
--   $$DELETE FROM captcha_verifications WHERE verified_at < now() - INTERVAL '10 minutes'$$
-- );
-- The application logic enforces the 5-minute TTL; this table merely prevents replay.

COMMENT ON TABLE captcha_verifications IS
  'Tracks consumed CAPTCHA tokens (by hash) to enforce single-use policy.';
