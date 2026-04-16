-- Migration: Rate limiting log table
-- Tracks per-identifier action attempts to enforce server-side rate limits.

CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   TEXT        NOT NULL,
  action       TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_lookup
  ON rate_limit_logs (identifier, action, attempted_at);

ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Automatically delete records older than 10 minutes to keep the table lean.
-- In production, use pg_cron or a scheduled job:
-- SELECT cron.schedule('cleanup-rate-limit-logs', '*/5 * * * *',
--   $$DELETE FROM rate_limit_logs WHERE attempted_at < now() - INTERVAL '10 minutes'$$);

COMMENT ON TABLE rate_limit_logs IS
  'Per-identifier action attempt log used to enforce server-side rate limits.';
