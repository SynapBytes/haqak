
-- Add issue_type column (individual/collective) to issues
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS issue_type text NOT NULL DEFAULT 'individual';

-- Add flagged column for inappropriate content
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;

-- Add citizen_confirmed column for citizen confirmation after resolution
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS citizen_confirmed boolean NOT NULL DEFAULT false;

-- Create issue_actions table for action log
CREATE TABLE IF NOT EXISTS public.issue_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.issue_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actions on their issues" ON public.issue_actions;
CREATE POLICY "Users can view actions on their issues" ON public.issue_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.issues WHERE issues.id = issue_actions.issue_id AND issues.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'mp')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "MPs and admins can insert actions" ON public.issue_actions;
CREATE POLICY "MPs and admins can insert actions" ON public.issue_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'mp') OR public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id
  );

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  issue_id uuid REFERENCES public.issues(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create issue_attachments table
CREATE TABLE IF NOT EXISTS public.issue_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.issue_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view attachments on their issues" ON public.issue_attachments;
CREATE POLICY "Users can view attachments on their issues" ON public.issue_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.issues WHERE issues.id = issue_attachments.issue_id AND issues.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'mp')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can insert attachments" ON public.issue_attachments;
CREATE POLICY "Users can insert attachments" ON public.issue_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.issues WHERE issues.id = issue_attachments.issue_id AND issues.user_id = auth.uid())
  );

-- Create storage bucket for issue attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-attachments', 'issue-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload issue attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload issue attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'issue-attachments');

DROP POLICY IF EXISTS "Anyone can view issue attachments" ON storage.objects;
CREATE POLICY "Anyone can view issue attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'issue-attachments');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
