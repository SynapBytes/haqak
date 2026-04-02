-- Sprint 3-5: MP engagement (polls, announcements, re-nomination)

-- -----------------------------------------------------------------------------
-- Sprint 3: Polls
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_polls_center_created ON public.polls(center_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_mp_created ON public.polls(mp_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_value text NOT NULL CHECK (vote_value IN ('yes', 'no')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poll_votes_unique_vote UNIQUE (poll_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voter_user_id ON public.poll_votes(voter_user_id, created_at DESC);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens can read center polls" ON public.polls;
DROP POLICY IF EXISTS "MPs can read own polls" ON public.polls;
DROP POLICY IF EXISTS "Verified MPs can insert own center polls" ON public.polls;
DROP POLICY IF EXISTS "Verified MPs can update own center polls" ON public.polls;

CREATE POLICY "Citizens can read center polls"
ON public.polls FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'citizen'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.center_id = polls.center_id
      AND me.verification_status = 'verified'
  )
);

CREATE POLICY "MPs can read own polls"
ON public.polls FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'mp'::public.app_role)
  AND mp_user_id = auth.uid()
);

CREATE POLICY "Verified MPs can insert own center polls"
ON public.polls FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = polls.center_id
  )
);

CREATE POLICY "Verified MPs can update own center polls"
ON public.polls FOR UPDATE TO authenticated
USING (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
)
WITH CHECK (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = polls.center_id
  )
);

DROP POLICY IF EXISTS "Citizens can read own poll votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Verified citizens can vote once in open center polls" ON public.poll_votes;

CREATE POLICY "Citizens can read own poll votes"
ON public.poll_votes FOR SELECT TO authenticated
USING (
  voter_user_id = auth.uid()
  AND public.has_role(auth.uid(), 'citizen'::public.app_role)
);

CREATE POLICY "Verified citizens can vote once in open center polls"
ON public.poll_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_user_id = auth.uid()
  AND public.has_role(auth.uid(), 'citizen'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.polls p ON p.id = poll_votes.poll_id
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND p.status = 'open'
      AND p.center_id = me.center_id
  )
);

CREATE OR REPLACE FUNCTION public.get_poll_vote_counts(_poll_id uuid)
RETURNS TABLE (yes_count integer, no_count integer, total integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE vote_value = 'yes')::integer AS yes_count,
    COUNT(*) FILTER (WHERE vote_value = 'no')::integer AS no_count,
    COUNT(*)::integer AS total
  FROM public.poll_votes
  WHERE poll_id = _poll_id;
$$;

REVOKE ALL ON FUNCTION public.get_poll_vote_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_poll_vote_counts(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.poll_results
WITH (security_invoker = true)
AS
SELECT
  p.id AS poll_id,
  p.center_id,
  p.mp_user_id,
  p.status,
  COALESCE(c.yes_count, 0) AS yes_count,
  COALESCE(c.no_count, 0) AS no_count,
  COALESCE(c.total, 0) AS total,
  CASE WHEN COALESCE(c.total, 0) > 0 THEN ROUND((COALESCE(c.yes_count, 0)::numeric * 100.0) / c.total, 2) ELSE 0 END AS yes_percentage,
  CASE WHEN COALESCE(c.total, 0) > 0 THEN ROUND((COALESCE(c.no_count, 0)::numeric * 100.0) / c.total, 2) ELSE 0 END AS no_percentage
FROM public.polls p
LEFT JOIN LATERAL public.get_poll_vote_counts(p.id) c ON true;

GRANT SELECT ON public.poll_results TO authenticated;

-- -----------------------------------------------------------------------------
-- Sprint 4: Announcements / Events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('event', 'conference', 'opening', 'general')),
  title text NOT NULL,
  body text NOT NULL,
  event_datetime timestamptz,
  address_text text,
  lat double precision,
  lng double precision,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(images) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_announcements_center_status_created
  ON public.announcements(center_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_mp_created
  ON public.announcements(mp_user_id, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens can read published center announcements" ON public.announcements;
DROP POLICY IF EXISTS "Verified MPs can read own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Verified MPs can insert own center announcements" ON public.announcements;
DROP POLICY IF EXISTS "Verified MPs can update own center announcements" ON public.announcements;
DROP POLICY IF EXISTS "Verified MPs can delete own center announcements" ON public.announcements;

CREATE POLICY "Citizens can read published center announcements"
ON public.announcements FOR SELECT TO authenticated
USING (
  status = 'published'
  AND public.has_role(auth.uid(), 'citizen'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.center_id = announcements.center_id
  )
);

CREATE POLICY "Verified MPs can read own announcements"
ON public.announcements FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'mp'::public.app_role)
  AND mp_user_id = auth.uid()
);

CREATE POLICY "Verified MPs can insert own center announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = announcements.center_id
  )
);

CREATE POLICY "Verified MPs can update own center announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
)
WITH CHECK (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = announcements.center_id
  )
);

CREATE POLICY "Verified MPs can delete own center announcements"
ON public.announcements FOR DELETE TO authenticated
USING (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = announcements.center_id
  )
);

-- -----------------------------------------------------------------------------
-- Sprint 5: MP -> Admin re-nomination requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mp_admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE RESTRICT,
  type text NOT NULL DEFAULT 'renomination' CHECK (type IN ('renomination')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note text
);

CREATE INDEX IF NOT EXISTS idx_mp_admin_requests_status_created
  ON public.mp_admin_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_admin_requests_mp_created
  ON public.mp_admin_requests(mp_user_id, created_at DESC);

ALTER TABLE public.mp_admin_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "MPs can read own admin requests" ON public.mp_admin_requests;
DROP POLICY IF EXISTS "Verified MPs can insert own admin requests" ON public.mp_admin_requests;
DROP POLICY IF EXISTS "Admins can read all mp admin requests" ON public.mp_admin_requests;
DROP POLICY IF EXISTS "Admins can update all mp admin requests" ON public.mp_admin_requests;

CREATE POLICY "MPs can read own admin requests"
ON public.mp_admin_requests FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'mp'::public.app_role)
  AND mp_user_id = auth.uid()
);

CREATE POLICY "Verified MPs can insert own admin requests"
ON public.mp_admin_requests FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_mp(auth.uid())
  AND mp_user_id = auth.uid()
  AND status = 'pending'
  AND decided_at IS NULL
  AND decided_by IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
      AND me.center_id = mp_admin_requests.center_id
  )
);

CREATE POLICY "Admins can read all mp admin requests"
ON public.mp_admin_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all mp admin requests"
ON public.mp_admin_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Fallback email queue if direct email dispatch is unavailable.
CREATE TABLE IF NOT EXISTS public.outbound_email_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS idx_outbound_email_tasks_status_created
  ON public.outbound_email_tasks(status, created_at DESC);

ALTER TABLE public.outbound_email_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verified MPs can queue admin email tasks" ON public.outbound_email_tasks;
DROP POLICY IF EXISTS "Admins can read email tasks" ON public.outbound_email_tasks;
DROP POLICY IF EXISTS "Admins can update email tasks" ON public.outbound_email_tasks;

CREATE POLICY "Verified MPs can queue admin email tasks"
ON public.outbound_email_tasks FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND to_email = 'admin@haqak.org'
  AND public.is_active_mp(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.verification_status = 'verified'
  )
);

CREATE POLICY "Admins can read email tasks"
ON public.outbound_email_tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update email tasks"
ON public.outbound_email_tasks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- -----------------------------------------------------------------------------
-- Audit logs for MP engagement flows
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_mp_engagement_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := public.resolve_audit_actor();
  action_name text;
  entity_name text := TG_TABLE_NAME;
  entity_uuid uuid;
  ctx jsonb := jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP);
BEGIN
  IF TG_TABLE_NAME = 'polls' THEN
    entity_uuid := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' THEN
      action_name := 'poll_created';
    ELSIF TG_OP = 'UPDATE' THEN
      action_name := CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'poll_status_changed' ELSE 'poll_updated' END;
    ELSE
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    entity_uuid := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' THEN
      action_name := 'announcement_created';
    ELSIF TG_OP = 'UPDATE' THEN
      action_name := CASE
        WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'published' THEN 'announcement_published'
        ELSE 'announcement_updated'
      END;
    ELSE
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSIF TG_TABLE_NAME = 'mp_admin_requests' THEN
    entity_uuid := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' THEN
      action_name := 'mp_renomination_requested';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        action_name := 'mp_renomination_decided';
      ELSE
        action_name := 'mp_admin_request_updated';
      END IF;
    ELSE
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM public.log_audit_event(
    actor,
    action_name,
    entity_name,
    entity_uuid,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    'success',
    NULL,
    ctx
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_polls_audit ON public.polls;
CREATE TRIGGER trg_log_polls_audit
AFTER INSERT OR UPDATE ON public.polls
FOR EACH ROW EXECUTE FUNCTION public.log_mp_engagement_audit();

DROP TRIGGER IF EXISTS trg_log_announcements_audit ON public.announcements;
CREATE TRIGGER trg_log_announcements_audit
AFTER INSERT OR UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.log_mp_engagement_audit();

DROP TRIGGER IF EXISTS trg_log_mp_admin_requests_audit ON public.mp_admin_requests;
CREATE TRIGGER trg_log_mp_admin_requests_audit
AFTER INSERT OR UPDATE ON public.mp_admin_requests
FOR EACH ROW EXECUTE FUNCTION public.log_mp_engagement_audit();
