
-- Fix permissive insert policy on notifications
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'mp')
    OR public.has_role(auth.uid(), 'admin')
  );
