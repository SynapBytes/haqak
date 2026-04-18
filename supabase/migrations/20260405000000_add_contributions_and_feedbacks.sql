-- Create contributions table
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EGP' NOT NULL,
    name TEXT,
    email TEXT,
    show_name BOOLEAN DEFAULT false NOT NULL,
    payment_provider TEXT,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
    provider_reference TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    contribution_id UUID REFERENCES public.contributions(id),
    message TEXT NOT NULL,
    email TEXT,
    name TEXT
);

-- Enable RLS
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policies for contributions
-- Anyone can insert a contribution (public support)
CREATE POLICY "Anyone can insert a contribution" ON public.contributions
    FOR INSERT WITH CHECK (true);

-- Only admins can view all contributions (assuming there's an admin role or similar)
-- For now, let's allow public to see only names of those who opted in
CREATE POLICY "Public can view names of contributors who opted in" ON public.contributions
    FOR SELECT USING (show_name = true AND status = 'succeeded');

-- Policies for feedbacks
-- Anyone can insert a feedback
CREATE POLICY "Anyone can insert a feedback" ON public.feedbacks
    FOR INSERT WITH CHECK (true);

-- Only admins can view feedbacks
CREATE POLICY "Admins can view feedbacks" ON public.feedbacks
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Add to realtime if needed
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;
