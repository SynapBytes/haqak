-- GIS Integration & Blockchain Audit Trail (Strategic Enhancements 2 & 3)

-- 1. GIS Integration: Spatial Data Support
-- Prefer earthdistance GIST index when available, otherwise fall back to a portable composite index.
DO $$
BEGIN
    IF to_regprocedure('extensions.ll_to_earth(double precision,double precision)') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_issues_location_point ON public.issues USING GIST (extensions.ll_to_earth(latitude, longitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
    ELSIF to_regprocedure('public.ll_to_earth(double precision,double precision)') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_issues_location_point ON public.issues USING GIST (public.ll_to_earth(latitude, longitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
    ELSE
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_issues_location_point ON public.issues (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
    END IF;
END
$$;

-- 2. Blockchain Audit Trail: Immutable Record of Actions
-- We'll use a specialized table with a cryptographic hash chain to ensure immutability
CREATE TABLE IF NOT EXISTS public.blockchain_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index BIGSERIAL,
    previous_hash TEXT, -- Hash of the previous block
    data_hash TEXT NOT NULL, -- Hash of the current payload
    payload JSONB NOT NULL, -- { action: 'submit_issue', user_id: '...', timestamp: '...', data: '...' }
    signature TEXT, -- Digital signature of the actor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Function to generate the next block in the chain
CREATE OR REPLACE FUNCTION public.append_to_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
    current_payload JSONB;
    current_data_hash TEXT;
BEGIN
    -- Get the hash of the last block
    SELECT data_hash INTO prev_hash FROM public.blockchain_audit_trail ORDER BY block_index DESC LIMIT 1;
    IF prev_hash IS NULL THEN prev_hash := '0000000000000000000000000000000000000000000000000000000000000000'; END IF;

    -- Prepare payload based on the table being audited
    current_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'new_data', row_to_json(NEW),
        'old_data', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        'user_id', auth.uid(),
        'timestamp', now()
    );

    -- Calculate hash (Simulated with MD5 for the prototype, in production use SHA-256)
    current_data_hash := md5(prev_hash || current_payload::text);

    -- Insert into audit trail
    INSERT INTO public.blockchain_audit_trail (previous_hash, data_hash, payload)
    VALUES (prev_hash, current_data_hash, current_payload);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach Audit Triggers to critical tables
CREATE TRIGGER trigger_audit_issues
AFTER INSERT OR UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.append_to_audit_trail();

CREATE TRIGGER trigger_audit_issue_actions
AFTER INSERT ON public.issue_actions
FOR EACH ROW EXECUTE FUNCTION public.append_to_audit_trail();

-- 5. Immutable RLS: No one can UPDATE or DELETE from the audit trail
ALTER TABLE public.blockchain_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit trail is read-only for all" ON public.blockchain_audit_trail FOR SELECT TO authenticated USING (true);
-- No INSERT/UPDATE/DELETE policies means only the SECURITY DEFINER function can insert.
