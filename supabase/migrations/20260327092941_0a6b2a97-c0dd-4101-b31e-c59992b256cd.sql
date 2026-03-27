DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_active_mp(auth.uid()) AND EXISTS (
        SELECT 1 FROM issues
        WHERE issues.assigned_mp_id = auth.uid()
          AND issues.user_id = notifications.user_id
      )
    )
  );