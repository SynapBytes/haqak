-- Fix security vulnerability in issue_actions INSERT policy
-- The previous policy allowed any authenticated user to insert an action as long as user_id = auth.uid(),
-- without checking if they actually own the issue they are attaching the action to.

DROP POLICY IF EXISTS "MPs and admins can insert actions" ON public.issue_actions;

CREATE POLICY "MPs and admins can insert actions" ON public.issue_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active_mp(auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR (
      auth.uid() = user_id 
      AND EXISTS (
        SELECT 1 FROM public.issues 
        WHERE issues.id = issue_actions.issue_id 
        AND issues.user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "MPs and admins can insert actions" ON public.issue_actions IS 'Restricts citizens to only insert actions on their own issues, while allowing MPs and admins full access.';
