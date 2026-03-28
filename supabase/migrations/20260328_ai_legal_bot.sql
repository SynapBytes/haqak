-- AI Legal & Procedural Bot (Strategic Enhancement 4)

-- 1. Table for Legal Knowledge Base (Vector Store Placeholder)
CREATE TABLE IF NOT EXISTS public.legal_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT, -- e.g., 'electricity_law', 'citizen_rights', 'mp_procedures'
    law_reference TEXT, -- e.g., 'قانون رقم 10 لسنة 2020'
    embedding VECTOR(1536), -- For semantic search (if pgvector is enabled)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Table for AI Bot Conversations (Citizen Help)
CREATE TABLE IF NOT EXISTS public.ai_bot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Table for AI Bot Messages
CREATE TABLE IF NOT EXISTS public.ai_bot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_bot_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    legal_references JSONB, -- Array of relevant laws cited by the AI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. RLS Policies
ALTER TABLE public.ai_bot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bot conversations" ON public.ai_bot_conversations
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view their own bot messages" ON public.ai_bot_messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_bot_conversations c 
        WHERE c.id = conversation_id AND c.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own bot messages" ON public.ai_bot_messages
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.ai_bot_conversations c 
        WHERE c.id = conversation_id AND c.user_id = auth.uid()
    ));
