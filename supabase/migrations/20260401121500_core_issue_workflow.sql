-- Core civic workflow tables for issues: comments, assignments, and status history

-- 1) Issue comments / updates
CREATE TABLE IF NOT EXISTS public.issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id_created_at
  ON public.issue_comments (issue_id, created_at);

ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_issue_comments_updated_at
  BEFORE UPDATE ON public.issue_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Visibility: issue owner, assigned MP, active MPs (oversight), admins, moderators
CREATE POLICY "Participants can view comments" ON public.issue_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_comments.issue_id
        AND (issues.user_id = auth.uid() OR issues.assigned_mp_id = auth.uid())
    )
    OR public.is_active_mp(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  );

-- Comment creation: author must match auth.uid and be a participant or privileged role
CREATE POLICY "Participants can add comments" ON public.issue_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.issues
        WHERE issues.id = issue_comments.issue_id
          AND (issues.user_id = auth.uid() OR issues.assigned_mp_id = auth.uid())
      )
      OR public.is_active_mp(auth.uid())
      OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
    )
  );

-- Allow authors to edit their own comments
CREATE POLICY "Authors can edit their comments" ON public.issue_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Admins and moderators can manage comments
CREATE POLICY "Admins can manage comments" ON public.issue_comments
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));

-- 2) Issue assignments (history of who is assigned)
CREATE TABLE IF NOT EXISTS public.issue_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  reason text
);

ALTER TABLE public.issue_assignments
  ADD CONSTRAINT issue_assignments_assigned_to_role_check
  CHECK (
    public.is_active_mp(assigned_to)
    OR public.has_any_role(assigned_to, ARRAY['admin']::public.app_role[])
  );

CREATE UNIQUE INDEX IF NOT EXISTS issue_assignments_one_active_per_issue
  ON public.issue_assignments(issue_id)
  WHERE unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_issue_assignments_issue_id_assigned_at
  ON public.issue_assignments(issue_id, assigned_at);

CREATE INDEX IF NOT EXISTS idx_issue_assignments_assigned_to
  ON public.issue_assignments(assigned_to);

ALTER TABLE public.issue_assignments ENABLE ROW LEVEL SECURITY;

-- Assignment visibility mirrors issue visibility for MPs/admins plus issue owner
CREATE POLICY "Participants can view assignments" ON public.issue_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_assignments.issue_id
        AND (issues.user_id = auth.uid() OR issues.assigned_mp_id = auth.uid())
    )
    OR public.is_active_mp(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  );

-- Only admins or active MPs can create assignments (MPs may self-assign)
CREATE POLICY "Admins or MPs can assign issues" ON public.issue_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    assigned_by = auth.uid()
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[])
      OR public.is_active_mp(auth.uid())
    )
  );

-- Allow closing/updating assignments by creator or admins
CREATE POLICY "Assignment owners or admins can update" ON public.issue_assignments
  FOR UPDATE TO authenticated
  USING (
    assigned_by = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[])
  )
  WITH CHECK (
    assigned_by = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[])
  );

-- Admins can clean up assignments if needed
CREATE POLICY "Admins can delete assignments" ON public.issue_assignments
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[]));

-- 3) Issue status history for auditability
CREATE TABLE IF NOT EXISTS public.issue_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_status_history_issue_id_changed_at
  ON public.issue_status_history(issue_id, changed_at);

ALTER TABLE public.issue_status_history ENABLE ROW LEVEL SECURITY;

-- Automatically log status transitions on the issues table
CREATE OR REPLACE FUNCTION public.log_issue_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.issue_status_history (
      issue_id,
      old_status,
      new_status,
      changed_by,
      note,
      changed_at
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(auth.uid(), NEW.assigned_mp_id, NEW.user_id),
      NULL,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_issue_status_change ON public.issues;
CREATE TRIGGER log_issue_status_change
  AFTER UPDATE ON public.issues
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_issue_status_change();

-- Status history visibility mirrors issue visibility
CREATE POLICY "Participants can view status history" ON public.issue_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_status_history.issue_id
        AND (issues.user_id = auth.uid() OR issues.assigned_mp_id = auth.uid())
    )
    OR public.is_active_mp(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  );

-- Inserts allowed for authenticated callers that are part of the issue (used by trigger) and service role
CREATE POLICY "Participants can log status history" ON public.issue_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_status_history.issue_id
        AND (issues.user_id = auth.uid() OR issues.assigned_mp_id = auth.uid())
    )
    OR public.is_active_mp(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[])
  );

CREATE POLICY "Service role can log status history" ON public.issue_status_history
  FOR INSERT TO service_role
  WITH CHECK (true);
