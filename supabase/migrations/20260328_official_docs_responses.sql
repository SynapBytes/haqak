-- Official Correspondence & Document Tracking System for Sutak

-- ============================================================================
-- 1. MP Responses Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mp_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
    mp_id UUID REFERENCES auth.users(id) NOT NULL,
    response_text TEXT NOT NULL,
    is_official BOOLEAN DEFAULT true,
    document_url TEXT, -- Link to generated PDF if any
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 2. Official Documents Registry (QR Code Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.official_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('issue_report', 'mp_response')),
    entity_id UUID NOT NULL,
    document_hash TEXT NOT NULL,
    qr_code_data TEXT,
    generated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 3. Attachment Audit Log
-- ============================================================================
-- Already handled in issue_attachments, but we add flags for verification
ALTER TABLE public.issue_attachments
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================
ALTER TABLE public.mp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses for their issues" ON public.mp_responses
    FOR SELECT TO authenticated
    USING (
        issue_id IN (SELECT id FROM public.issues WHERE user_id = auth.uid() OR assigned_mp_id = auth.uid())
    );

CREATE POLICY "MPs can insert responses for assigned issues" ON public.mp_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        issue_id IN (SELECT id FROM public.issues WHERE assigned_mp_id = auth.uid())
    );

CREATE POLICY "Anyone authenticated can view official documents" ON public.official_documents
    FOR SELECT TO authenticated
    USING (true);
