-- Project Proposals, Voting, and Crowdfunding System

-- 1. Project Proposals Table
CREATE TABLE public.project_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    ai_refined_title TEXT,
    ai_refined_description TEXT,
    ai_budget_estimate DECIMAL(18,2),
    ai_impact_analysis TEXT,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    target_amount DECIMAL(18,2) NOT NULL,
    raised_amount DECIMAL(18,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
        'pending_review', -- Initial submission
        'voting_active',  -- Approved for community voting
        'funding_active', -- Voting passed, now collecting funds
        'funding_completed', -- Target reached
        'in_progress',    -- Execution started
        'completed',      -- Project finished
        'rejected',       -- Rejected by admin/MP
        'voting_failed',  -- Did not get enough votes
        'funding_failed',  -- Did not reach target amount in time
        'cancelled'       -- Cancelled after funding (triggers refund)
    )),
    voting_deadline TIMESTAMP WITH TIME ZONE,
    funding_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Project Votes Table (Hyper-local Voting)
CREATE TABLE public.project_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.project_proposals(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (project_id, user_id)
);

-- 3. Project Contributions Table (Crowdfunding)
CREATE TABLE public.project_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.project_proposals(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
    payment_reference TEXT, -- Reference from Fawry/CIB/InstaPay
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Project Milestones Table
CREATE TABLE public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.project_proposals(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    percentage_of_total DECIMAL(5,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'verified')),
    evidence_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- 6. Policies for Project Proposals
CREATE POLICY "Anyone can view active projects" ON public.project_proposals
    FOR SELECT USING (status != 'pending_review' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mp'));

CREATE POLICY "Citizens can propose projects" ON public.project_proposals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and MPs can update projects" ON public.project_proposals
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mp'));

-- 7. Policies for Project Votes
CREATE POLICY "Users can view all votes" ON public.project_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can vote once per project" ON public.project_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Policies for Contributions
CREATE POLICY "Users can view their own contributions" ON public.project_contributions
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can contribute to active funding" ON public.project_contributions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM public.project_proposals WHERE id = project_id AND status = 'funding_active')
    );

-- 9. Functions & Triggers

-- Function to update project raised_amount when a contribution is completed
CREATE OR REPLACE FUNCTION public.update_project_raised_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND (OLD.payment_status IS DISTINCT FROM 'completed') THEN
        UPDATE public.project_proposals
        SET raised_amount = raised_amount + NEW.amount,
            updated_at = now()
        WHERE id = NEW.project_id;
    ELSIF NEW.payment_status = 'refunded' AND (OLD.payment_status IS DISTINCT FROM 'refunded') THEN
        UPDATE public.project_proposals
        SET raised_amount = raised_amount - NEW.amount,
            updated_at = now()
        WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_raised_amount
AFTER UPDATE ON public.project_contributions
FOR EACH ROW EXECUTE FUNCTION public.update_project_raised_amount();

-- Function to notify citizens in the same district (simulated by location for now)
CREATE OR REPLACE FUNCTION public.notify_district_of_new_project()
RETURNS TRIGGER AS $$
BEGIN
    -- In a real scenario, we would join with profiles to find users in the same district/location
    -- For now, we'll create a notification for all citizens as a placeholder for "hyper-local"
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT user_id, 'مقترح مشروع جديد في منطقتك', 'تم اقتراح مشروع جديد: ' || NEW.title || '. شارك برأيك عبر حقك الآن!', 'project_proposal'
    FROM public.user_roles
    WHERE role = 'citizen' AND user_id != NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_project
AFTER UPDATE ON public.project_proposals
FOR EACH ROW WHEN (OLD.status = 'pending_review' AND NEW.status = 'voting_active')
EXECUTE FUNCTION public.notify_district_of_new_project();

-- 10. Blockchain Integration
CREATE TRIGGER trigger_audit_project_proposals
AFTER INSERT OR UPDATE ON public.project_proposals
FOR EACH ROW EXECUTE FUNCTION public.append_to_audit_trail();

CREATE TRIGGER trigger_audit_project_contributions
AFTER INSERT OR UPDATE ON public.project_contributions
FOR EACH ROW EXECUTE FUNCTION public.append_to_audit_trail();
