-- Migration: CSRF token tracking table
-- Stores short-lived CSRF tokens tied to authenticated sessions.

CREATE TABLE IF NOT EXISTS csrf_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT        NOT NULL UNIQUE,
  user_id     UUID        REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1 hour',
  used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token_hash
  ON csrf_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id
  ON csrf_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at
  ON csrf_tokens (expires_at);

ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE csrf_tokens IS
  'Short-lived CSRF tokens for stateful form-submission protection.';
