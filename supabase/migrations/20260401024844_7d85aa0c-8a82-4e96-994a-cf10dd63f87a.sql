DROP POLICY IF EXISTS "MPs and admins can insert actions" ON public.issue_actions;
CREATE POLICY "MPs and admins can insert actions" ON public.issue_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active_mp(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM issues
        WHERE issues.id = issue_actions.issue_id
          AND issues.user_id = auth.uid()
      )
    )
  );