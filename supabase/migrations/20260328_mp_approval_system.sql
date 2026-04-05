-- Add approval tracking for MPs
-- Note: is_approved column already exists in profiles table, this migration adds supporting infrastructure

-- Create a table to track approval history
CREATE TABLE IF NOT EXISTS public.mp_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  approved_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.mp_approvals ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_mp_approvals_status ON public.mp_approvals(status);
CREATE INDEX idx_mp_approvals_created_at ON public.mp_approvals(created_at);

-- Policies
DROP POLICY IF EXISTS "Admins can view all MP approvals" ON public.mp_approvals;
CREATE POLICY "Admins can view all MP approvals" ON public.mp_approvals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update MP approvals" ON public.mp_approvals;
CREATE POLICY "Admins can update MP approvals" ON public.mp_approvals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "MPs can view their own approval status" ON public.mp_approvals;
CREATE POLICY "MPs can view their own approval status" ON public.mp_approvals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create a trigger to update profiles.is_approved when approval status changes
CREATE OR REPLACE FUNCTION public.sync_mp_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE public.profiles
    SET is_approved = true, updated_at = now()
    WHERE user_id = NEW.user_id;
    NEW.approved_at = now();
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.profiles
    SET is_approved = false, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_mp_approval_status_trigger
AFTER INSERT OR UPDATE ON public.mp_approvals
FOR EACH ROW EXECUTE FUNCTION public.sync_mp_approval_status();

-- Create a function to auto-create approval record when MP signs up
CREATE OR REPLACE FUNCTION public.create_mp_approval_record()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'mp' THEN
    INSERT INTO public.mp_approvals (user_id, status)
    VALUES (NEW.user_id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_mp_approval_record_trigger
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.create_mp_approval_record();

-- Update trigger for updated_at
CREATE TRIGGER update_mp_approvals_updated_at BEFORE UPDATE ON public.mp_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
