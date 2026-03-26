-- Update security vulnerability in issue_actions INSERT policy
-- This policy ensures that:
-- 1. Admins have full access.
-- 2. Active MPs can only insert actions on issues assigned to them.
-- 3. Citizens can only insert actions on their own issues.

DROP POLICY IF EXISTS "MPs and admins can insert actions" ON public.issue_actions;

CREATE POLICY "MPs and admins can insert actions" ON public.issue_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR (
      is_active_mp(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.issues
        WHERE issues.id = issue_actions.issue_id
        AND issues.assigned_mp_id = auth.uid()
      )
    )
    OR (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.issues
        WHERE issues.id = issue_actions.issue_id
        AND issues.user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "MPs and admins can insert actions" ON public.issue_actions IS 'Restricts citizens to only insert actions on their own issues, MPs to issues assigned to them, while allowing admins full access.';
