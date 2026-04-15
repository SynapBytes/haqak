-- Migration: Reconcile rate_limit_logs schema
--
-- Context: Two earlier migrations created conflicting schemas for rate_limit_logs:
--   • 20260325120100_create_rate_limit_logs_table.sql — schema expected by Edge Functions
--     (user_id, request_timestamp, request_path, response_status, ip_address)
--   • 20260330010300_rate_limits.sql — conflicting schema (identifier, action, attempted_at)
--
-- Edge Functions (auth/rate-limited endpoints) query/insert using the 20260325120100 column set.
-- This migration ensures the table always has the columns those functions need,
-- regardless of which migration was applied first, and removes any conflicting index.

-- Drop the conflicting index added by 20260330010300_rate_limits.sql if it was applied.
-- That index references (identifier, action, attempted_at) which do not exist in
-- the Edge-Function-compatible schema.
DROP INDEX IF EXISTS public.idx_rate_limit_logs_lookup;

-- Add columns required by Edge Functions in case this table was created by the
-- 20260330 schema (identifier/action/attempted_at) rather than 20260325120100.
-- ADD COLUMN IF NOT EXISTS is a no-op when the column already exists.
ALTER TABLE public.rate_limit_logs
  ADD COLUMN IF NOT EXISTS user_id         UUID        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN IF NOT EXISTS request_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS request_path    TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS response_status INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ip_address      INET;

-- Ensure the index used by auth rate-limit queries exists.
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_path_time
  ON public.rate_limit_logs (ip_address, request_path, request_timestamp);

-- Keep the existing indexes from 20260325120100 (no-op if already present).
CREATE INDEX IF NOT EXISTS idx_user_id
  ON public.rate_limit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_request_timestamp
  ON public.rate_limit_logs (request_timestamp);

COMMENT ON TABLE public.rate_limit_logs IS
  'Per-IP/per-path request log used by Edge Functions to enforce server-side rate limits.';
