-- RLS deny-by-default for tables that were missing explicit deny policies.
-- Tables covered: notifications, otp_codes (hardening), rate_limit_logs (hardening).
-- All tables use the existing has_any_role() / has_role() helpers.

-- ── notifications ─────────────────────────────────────────────────────────────
-- Users may only read/delete their own notifications; service role manages writes.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark their own notifications read" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;

-- Service role has full access (system inserts notifications)
CREATE POLICY "Service role can manage notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users see only their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users may update (mark read) their own notifications
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users may delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admins/moderators can read all notifications for moderation purposes
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));

-- ── otp_codes ─────────────────────────────────────────────────────────────────
-- Only service_role should ever touch this table.  Authenticated users must NOT
-- be able to query OTP codes directly (even their own) — the edge function
-- handles verification via service role.

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage OTP codes" ON public.otp_codes;

CREATE POLICY "Service role can manage OTP codes" ON public.otp_codes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ── rate_limit_logs ───────────────────────────────────────────────────────────
-- Only service_role may insert/read for enforcement; admins may inspect.

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage rate limit logs" ON public.rate_limit_logs;
DROP POLICY IF EXISTS "Admins can view rate limit logs" ON public.rate_limit_logs;

CREATE POLICY "Service role can manage rate limit logs" ON public.rate_limit_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view rate limit logs" ON public.rate_limit_logs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'moderator']::public.app_role[]));
