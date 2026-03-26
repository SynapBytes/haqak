-- Restrict notifications INSERT policy for MPs
-- This update ensures that an MP can only send notifications to citizens who have issues assigned to that specific MP.
-- This prevents MPs from spamming or sending unsolicited notifications to any user in the system.

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    -- 1. Users can always send notifications to themselves (e.g., system-triggered for their own actions)
    auth.uid() = user_id
    
    -- 2. Admins retain full access to send notifications to any user
    OR has_role(auth.uid(), 'admin')
    
    -- 3. MPs can only send notifications to users who have an issue assigned to them
    OR (
      is_active_mp(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.issues
        WHERE issues.user_id = notifications.user_id
        AND issues.assigned_mp_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "Authenticated users can insert notifications" ON public.notifications IS 'Restricts MPs to only send notifications to citizens with issues assigned to them, while allowing admins full access.';
