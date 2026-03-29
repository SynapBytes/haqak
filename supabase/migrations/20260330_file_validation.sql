-- Migration: File validation audit log
-- Records every server-side file validation check for security auditing.

CREATE TABLE IF NOT EXISTS file_validation_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name        TEXT        NOT NULL,
  file_size        BIGINT      NOT NULL,
  declared_mime    TEXT,
  magic_bytes_ok   BOOLEAN     NOT NULL,
  is_valid         BOOLEAN     NOT NULL,
  rejection_reason TEXT,
  user_id          UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_validation_log_is_valid
  ON file_validation_log (is_valid);

CREATE INDEX IF NOT EXISTS idx_file_validation_log_created_at
  ON file_validation_log (created_at);

ALTER TABLE file_validation_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE file_validation_log IS
  'Audit log of server-side file validation results, including magic-byte checks.';
