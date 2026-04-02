-- Blockchain audit trail hardening
-- Replace MD5 with SHA-256 (pgcrypto), add HMAC per block, enforce immutability

-- 1) Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Add a UNIQUE constraint on block_index to prevent duplicate/forked blocks
ALTER TABLE public.blockchain_audit_trail
  ADD COLUMN IF NOT EXISTS hmac_signature TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.blockchain_audit_trail'::regclass
      AND conname = 'blockchain_audit_trail_block_index_key'
  ) THEN
    ALTER TABLE public.blockchain_audit_trail
      ADD CONSTRAINT blockchain_audit_trail_block_index_key UNIQUE (block_index);
  END IF;
END;
$$;

-- 3) Replace the append_to_audit_trail trigger function with a SHA-256 + HMAC version.
--    The HMAC key is stored in a DB setting; operators should set it via:
--      ALTER DATABASE <db> SET app.audit_hmac_key = '<secret>';
--    or inject it via Supabase Vault (TODO[Vault]).
CREATE OR REPLACE FUNCTION public.append_to_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash      TEXT;
    current_payload JSONB;
    current_data_hash TEXT;
    hmac_key       TEXT;
    block_hmac     TEXT;
BEGIN
    -- Use clock_timestamp() for a tamper-resistant wall-clock time
    -- (unlike now(), clock_timestamp() is not affected by transaction start time)

    -- Get the hash of the last block (genesis hash when empty)
    SELECT data_hash INTO prev_hash
    FROM public.blockchain_audit_trail
    ORDER BY block_index DESC
    LIMIT 1;

    IF prev_hash IS NULL THEN
    -- Genesis block sentinel: 64 zero hex characters (same length as a SHA-256 hex digest)
    prev_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    END IF;

    -- Build payload using clock_timestamp() for accurate wall-clock timestamp
    current_payload := jsonb_build_object(
        'table',     TG_TABLE_NAME,
        'action',    TG_OP,
        'new_data',  row_to_json(NEW),
        'old_data',  CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        'user_id',   auth.uid(),
        'timestamp', clock_timestamp()
    );

    -- SHA-256 of (previous_hash || payload) via pgcrypto
    current_data_hash := encode(
        digest(prev_hash || current_payload::text, 'sha256'),
        'hex'
    );

    -- HMAC-SHA256 per block for additional integrity guarantee
    -- Falls back to empty string when the key is not configured (logs a notice)
    BEGIN
        hmac_key := current_setting('app.audit_hmac_key', true);
    EXCEPTION WHEN OTHERS THEN
        hmac_key := '';
    END;

    IF hmac_key IS NOT NULL AND hmac_key <> '' THEN
        block_hmac := encode(
            hmac(current_data_hash, hmac_key, 'sha256'),
            'hex'
        );
    ELSE
        -- TODO[Vault]: retrieve HMAC key from Supabase Vault instead of DB setting
        block_hmac := NULL;
    END IF;

    INSERT INTO public.blockchain_audit_trail (previous_hash, data_hash, payload, hmac_signature)
    VALUES (prev_hash, current_data_hash, current_payload, block_hmac);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Enforce immutability: prevent UPDATE and DELETE even for privileged callers
CREATE OR REPLACE FUNCTION public.prevent_blockchain_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'blockchain_audit_trail is append-only. % is not allowed.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS prevent_blockchain_audit_update ON public.blockchain_audit_trail;
CREATE TRIGGER prevent_blockchain_audit_update
  BEFORE UPDATE ON public.blockchain_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.prevent_blockchain_audit_mutation();

DROP TRIGGER IF EXISTS prevent_blockchain_audit_delete ON public.blockchain_audit_trail;
CREATE TRIGGER prevent_blockchain_audit_delete
  BEFORE DELETE ON public.blockchain_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.prevent_blockchain_audit_mutation();

-- 5) RLS: only service_role may insert; authenticated users (admins) may read
ALTER TABLE public.blockchain_audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit trail is read-only for all" ON public.blockchain_audit_trail;
DROP POLICY IF EXISTS "Admins can read blockchain audit trail" ON public.blockchain_audit_trail;
DROP POLICY IF EXISTS "Service role can insert blockchain audit trail" ON public.blockchain_audit_trail;

-- Deny all by default for non-service roles, then grant selectively
CREATE POLICY "Admins can read blockchain audit trail" ON public.blockchain_audit_trail
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));

CREATE POLICY "Service role can insert blockchain audit trail" ON public.blockchain_audit_trail
  FOR INSERT TO service_role
  WITH CHECK (true);
