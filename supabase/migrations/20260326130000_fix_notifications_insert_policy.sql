-- Fix security vulnerability in notifications INSERT policy
-- The previous policy allowed any user with the 'mp' role to insert notifications,
-- even if they were not yet approved by an admin.
-- This update ensures only approved MPs and admins can send notifications to others.

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Users can still send notifications to themselves (e.g., system-triggered for their own actions)
    auth.uid() = user_id
    -- Only active (approved) MPs can send notifications to any user
    OR is_active_mp(auth.uid())
    -- Admins can send notifications to any user
    OR has_role(auth.uid(), 'admin')
  );

COMMENT ON POLICY "Authenticated users can insert notifications" ON public.notifications IS 'Restricts notification insertion to approved MPs, admins, or users sending to themselves.';
