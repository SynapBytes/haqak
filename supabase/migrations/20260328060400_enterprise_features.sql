-- Enterprise Grade Enhancements for "Haqak"

-- ============================================================================
-- 1. AI-Powered Triage & Sentiment Analysis
-- ============================================================================
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT, -- -1.0 to 1.0
ADD COLUMN IF NOT EXISTS sentiment_label TEXT, -- 'positive', 'neutral', 'negative', 'angry'
ADD COLUMN IF NOT EXISTS cluster_id UUID; -- For grouping duplicate/related issues

-- Table for Public Opinion Issues (Collective Issues)
CREATE TABLE IF NOT EXISTS public.collective_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    region TEXT,
    issue_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 2. Identity Verification & Digital Signature
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS national_id_hash TEXT,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reputation_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS citizen_rank TEXT DEFAULT 'مواطن جديد';

-- Table for Digital Signatures
CREATE TABLE IF NOT EXISTS public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    signature_hash TEXT NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    blockchain_tx_id TEXT -- Placeholder for future blockchain integration
);

-- ============================================================================
-- 3. MP Analytics & KPIs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mp_kpis (
    mp_id UUID PRIMARY KEY REFERENCES auth.users(id),
    response_time_avg INTERVAL,
    resolution_rate FLOAT,
    citizen_satisfaction_avg FLOAT,
    active_issues_count INTEGER DEFAULT 0,
    resolved_issues_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 4. Voice-to-Text Support
-- ============================================================================
ALTER TABLE public.issue_attachments
ADD COLUMN IF NOT EXISTS is_voice_note BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transcription TEXT;

-- ============================================================================
-- 5. Blockchain Audit Trail (Simulated with Immutable Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blockchain_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index BIGSERIAL,
    previous_hash TEXT,
    data_hash TEXT NOT NULL,
    payload JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Make blockchain_audit_trail "immutable" via RLS and Triggers
ALTER TABLE public.blockchain_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit trail is read-only" ON public.blockchain_audit_trail FOR SELECT TO authenticated USING (true);
-- No INSERT/UPDATE/DELETE policies for non-system roles

-- ============================================================================
-- 6. Reputation & Gamification Logic
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_citizen_reputation()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase reputation for resolved issues
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        UPDATE public.profiles 
        SET reputation_points = reputation_points + 50
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Update Rank based on points
    UPDATE public.profiles
    SET citizen_rank = CASE 
        WHEN reputation_points > 1000 THEN 'مواطن ذهبي'
        WHEN reputation_points > 500 THEN 'مواطن فضي'
        WHEN reputation_points > 100 THEN 'مواطن نشط'
        ELSE 'مواطن جديد'
    END
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_reputation
AFTER UPDATE ON public.issues
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_citizen_reputation();
