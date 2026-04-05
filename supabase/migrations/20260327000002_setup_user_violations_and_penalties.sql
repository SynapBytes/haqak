-- Setup User Violations and Penalties System

-- 1. Add banned_until to profiles if not exists (it seems it exists based on edge function code, but let's be sure)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_until') THEN
        ALTER TABLE public.profiles ADD COLUMN banned_until TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_permanently_banned') THEN
        ALTER TABLE public.profiles ADD COLUMN is_permanently_banned BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create user_violations table
CREATE TABLE IF NOT EXISTS public.user_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL, -- 'offensive_language', 'spam', etc.
    content_preview TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on user_violations
ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view violations
DROP POLICY IF EXISTS "Admins can view all violations" ON public.user_violations;
CREATE POLICY "Admins can view all violations" ON public.user_violations
    FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'));

-- 3. Create a function to handle violations and apply penalties
CREATE OR REPLACE FUNCTION public.handle_user_violation(_user_id UUID, _violation_type TEXT, _content_preview TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    violation_count INTEGER;
BEGIN
    -- Insert the violation
    INSERT INTO public.user_violations (user_id, violation_type, content_preview)
    VALUES (_user_id, _violation_type, _content_preview);

    -- Count total violations for this user
    SELECT COUNT(*) INTO violation_count FROM public.user_violations WHERE user_id = _user_id;

    IF violation_count = 1 THEN
        -- First violation: 1 week ban
        UPDATE public.profiles 
        SET banned_until = now() + interval '7 days'
        WHERE user_id = _user_id;
    ELSIF violation_count >= 2 THEN
        -- Second or more violations: Permanent ban
        UPDATE public.profiles 
        SET is_permanently_banned = TRUE,
            banned_until = '9999-12-31 23:59:59'::timestamp with time zone
        WHERE user_id = _user_id;
    END IF;
END;
$$;

-- 4. Update issues INSERT policy to check for ban status
DROP POLICY IF EXISTS "Users can insert their own issues" ON public.issues;
CREATE POLICY "Users can insert their own issues" ON public.issues
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        (
            SELECT (COALESCE(banned_until, '1900-01-01'::timestamp) < now() AND is_permanently_banned = FALSE)
            FROM public.profiles
            WHERE user_id = auth.uid()
        )
    );

COMMENT ON TABLE public.user_violations IS 'Tracks user content violations and triggers automated penalties.';
