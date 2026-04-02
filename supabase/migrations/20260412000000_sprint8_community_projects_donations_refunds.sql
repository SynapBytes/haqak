-- Sprint 8: community projects, founder governance, anonymous donations, refunds, and transfer controls

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_verified_citizen(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'citizen'::public.app_role
      AND p.verification_status = 'verified'
      AND p.center_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_verified_mp(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_mp(_user_id)
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'mp'::public.app_role
        AND p.verification_status = 'verified'
        AND p.center_id IS NOT NULL
    );
$$;

-- -----------------------------------------------------------------------------
-- Configurable settings for refunds
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_system_settings (
  key text PRIMARY KEY,
  value_numeric numeric(10,4),
  value_text text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.project_system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage project system settings" ON public.project_system_settings;
CREATE POLICY "Admins can manage project system settings"
ON public.project_system_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.project_system_settings (key, value_numeric, value_text)
VALUES ('refund_fee_percent', 2.5000, NULL)
ON CONFLICT (key) DO UPDATE
SET value_numeric = EXCLUDED.value_numeric,
    value_text = EXCLUDED.value_text,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.get_project_refund_fee_percent()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT value_numeric
      FROM public.project_system_settings
      WHERE key = 'refund_fee_percent'
      LIMIT 1
    ),
    2.5000
  );
$$;

REVOKE ALL ON FUNCTION public.get_project_refund_fee_percent() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_refund_fee_percent() TO authenticated;

-- -----------------------------------------------------------------------------
-- Community projects + governance + donations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL,
  target_amount numeric(18,2) NOT NULL CHECK (target_amount > 0),
  raised_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (raised_amount >= 0),
  status text NOT NULL DEFAULT 'funding_active' CHECK (
    status IN (
      'funding_active',
      'target_reached',
      'refund_pending',
      'cancelled',
      'transfer_pending',
      'transfer_approved',
      'transfer_completed'
    )
  ),
  refund_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_projects_center_status_created
  ON public.community_projects(center_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_founders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.community_projects(id) ON DELETE CASCADE,
  founder_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, founder_user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_founders_project ON public.project_founders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_founders_user ON public.project_founders(founder_user_id);

CREATE TABLE IF NOT EXISTS public.project_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.community_projects(id) ON DELETE CASCADE,
  donor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  payment_status text NOT NULL DEFAULT 'payment_soon' CHECK (payment_status IN ('payment_soon', 'verified', 'rejected', 'refunded')),
  reference_code text NOT NULL,
  admin_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reference_code)
);

CREATE INDEX IF NOT EXISTS idx_project_donations_project_status
  ON public.project_donations(project_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_donations_donor
  ON public.project_donations(donor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.community_projects(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, requester_user_id)
);

CREATE TABLE IF NOT EXISTS public.project_refund_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.community_projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_manual_processing' CHECK (status IN ('pending_manual_processing', 'processing', 'processed', 'failed')),
  fee_percent numeric(10,4) NOT NULL,
  notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE TABLE IF NOT EXISTS public.project_mp_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.community_projects(id) ON DELETE CASCADE,
  nominated_mp_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  nominated_by_founder_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending_founder_approvals' CHECK (
    status IN (
      'pending_founder_approvals',
      'approved_by_founders',
      'mp_accepted',
      'mp_rejected',
      'admin_approved',
      'admin_rejected',
      'transfer_completed'
    )
  ),
  legal_acknowledged boolean NOT NULL DEFAULT false,
  legal_acknowledged_at timestamptz,
  mp_decided_at timestamptz,
  admin_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_approved_at timestamptz,
  bank_snapshot jsonb,
  transfer_receipt_path text,
  transfer_receipt_uploaded_at timestamptz,
  transfer_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (bank_snapshot IS NULL OR jsonb_typeof(bank_snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_project_mp_nominations_project_status
  ON public.project_mp_nominations(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_mp_nominations_mp
  ON public.project_mp_nominations(nominated_mp_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_mp_nomination_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id uuid NOT NULL REFERENCES public.project_mp_nominations(id) ON DELETE CASCADE,
  founder_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nomination_id, founder_user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_nomination_approvals_nomination
  ON public.project_mp_nomination_approvals(nomination_id);

-- -----------------------------------------------------------------------------
-- Triggers and business logic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_project_center_on_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_center uuid;
BEGIN
  SELECT p.center_id INTO _profile_center
  FROM public.profiles p
  WHERE p.user_id = NEW.creator_user_id;

  IF _profile_center IS NULL OR NEW.center_id IS DISTINCT FROM _profile_center THEN
    RAISE EXCEPTION 'community_projects.center_id must equal creator center_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_founders_limit_and_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_center uuid;
  _founder_center uuid;
  _founder_count integer;
BEGIN
  SELECT center_id INTO _project_center
  FROM public.community_projects
  WHERE id = NEW.project_id;

  SELECT center_id INTO _founder_center
  FROM public.profiles
  WHERE user_id = NEW.founder_user_id;

  IF _project_center IS NULL OR _founder_center IS NULL OR _project_center IS DISTINCT FROM _founder_center THEN
    RAISE EXCEPTION 'Founders must belong to the same center as the project';
  END IF;

  SELECT COUNT(*)::integer INTO _founder_count
  FROM public.project_founders pf
  WHERE pf.project_id = NEW.project_id;

  IF _founder_count >= 5 THEN
    RAISE EXCEPTION 'Each project can have up to 5 founders';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_nomination_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_center uuid;
  _mp_center uuid;
  _project_status text;
BEGIN
  SELECT center_id, status INTO _project_center, _project_status
  FROM public.community_projects
  WHERE id = NEW.project_id;

  IF _project_status IS DISTINCT FROM 'target_reached' THEN
    RAISE EXCEPTION 'MP nomination is allowed only after target is reached';
  END IF;

  SELECT p.center_id INTO _mp_center
  FROM public.profiles p
  WHERE p.user_id = NEW.nominated_mp_user_id;

  IF _project_center IS NULL OR _mp_center IS NULL OR _project_center IS DISTINCT FROM _mp_center THEN
    RAISE EXCEPTION 'MP nomination must be within the same center';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_project_raised_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_id uuid := COALESCE(NEW.project_id, OLD.project_id);
  _verified_sum numeric(18,2);
  _target numeric(18,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)::numeric(18,2)
  INTO _verified_sum
  FROM public.project_donations
  WHERE project_id = _project_id
    AND payment_status = 'verified';

  SELECT target_amount INTO _target
  FROM public.community_projects
  WHERE id = _project_id;

  UPDATE public.community_projects p
  SET
    raised_amount = _verified_sum,
    status = CASE
      WHEN p.status IN ('funding_active', 'target_reached') AND _verified_sum >= _target THEN 'target_reached'
      WHEN p.status = 'target_reached' AND _verified_sum < _target THEN 'funding_active'
      ELSE p.status
    END,
    updated_at = now()
  WHERE p.id = _project_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_nomination_on_approvals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _approval_count integer;
  _founders_count integer;
  _project_id uuid;
  _project_status text;
BEGIN
  SELECT n.project_id INTO _project_id
  FROM public.project_mp_nominations n
  WHERE n.id = NEW.nomination_id;

  SELECT COUNT(*)::integer INTO _approval_count
  FROM public.project_mp_nomination_approvals a
  WHERE a.nomination_id = NEW.nomination_id;

  SELECT COUNT(*)::integer INTO _founders_count
  FROM public.project_founders f
  WHERE f.project_id = _project_id;

  SELECT status INTO _project_status
  FROM public.community_projects
  WHERE id = _project_id;

  IF _approval_count >= 3 AND _founders_count = 5 AND _project_status = 'target_reached' THEN
    UPDATE public.project_mp_nominations
    SET status = 'approved_by_founders', updated_at = now()
    WHERE id = NEW.nomination_id
      AND status = 'pending_founder_approvals';

    UPDATE public.community_projects
    SET status = 'transfer_pending', updated_at = now()
    WHERE id = _project_id
      AND status = 'target_reached';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_nomination_decisions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bank public.mp_bank_accounts%ROWTYPE;
BEGIN
  IF NEW.status = 'mp_accepted' AND OLD.status IS DISTINCT FROM 'mp_accepted' THEN
    IF OLD.status IS DISTINCT FROM 'approved_by_founders' THEN
      RAISE EXCEPTION 'MP can accept only after founders approval';
    END IF;
    NEW.mp_decided_at := COALESCE(NEW.mp_decided_at, now());
  END IF;

  IF NEW.status = 'admin_approved' AND OLD.status IS DISTINCT FROM 'admin_approved' THEN
    IF OLD.status IS DISTINCT FROM 'mp_accepted' THEN
      RAISE EXCEPTION 'Admin approval requires prior MP acceptance';
    END IF;

    SELECT * INTO _bank
    FROM public.mp_bank_accounts
    WHERE mp_user_id = NEW.nominated_mp_user_id
      AND status = 'verified'
    LIMIT 1;

    IF _bank.id IS NULL THEN
      RAISE EXCEPTION 'MP must have an admin-verified bank account before transfer approval';
    END IF;

    NEW.bank_snapshot := jsonb_build_object(
      'account_holder_name', _bank.account_holder_name,
      'bank_name', _bank.bank_name,
      'account_number', _bank.account_number,
      'iban', _bank.iban,
      'swift', _bank.swift,
      'branch_name', _bank.branch_name,
      'country', _bank.country,
      'captured_at', now()
    );
    NEW.admin_approved_by := COALESCE(NEW.admin_approved_by, auth.uid());
    NEW.admin_approved_at := COALESCE(NEW.admin_approved_at, now());

    UPDATE public.community_projects
    SET status = 'transfer_approved', updated_at = now()
    WHERE id = NEW.project_id
      AND status IN ('transfer_pending', 'target_reached');
  END IF;

  IF NEW.status = 'admin_rejected' AND OLD.status IS DISTINCT FROM 'admin_rejected' THEN
    NEW.admin_approved_by := COALESCE(NEW.admin_approved_by, auth.uid());
    NEW.admin_approved_at := COALESCE(NEW.admin_approved_at, now());
  END IF;

  IF NEW.status = 'transfer_completed' AND OLD.status IS DISTINCT FROM 'transfer_completed' THEN
    IF OLD.status IS DISTINCT FROM 'admin_approved' THEN
      RAISE EXCEPTION 'Transfer completion requires prior admin approval';
    END IF;
    IF NEW.transfer_receipt_path IS NULL OR NEW.transfer_receipt_uploaded_at IS NULL THEN
      RAISE EXCEPTION 'Transfer receipt must be uploaded before marking transfer completed';
    END IF;

    NEW.transfer_completed_at := COALESCE(NEW.transfer_completed_at, now());

    UPDATE public.community_projects
    SET status = 'transfer_completed', updated_at = now()
    WHERE id = NEW.project_id
      AND status = 'transfer_approved';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_refund_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  donor_total integer;
  requested_donors integer;
BEGIN
  SELECT COUNT(DISTINCT donor_user_id)::integer
  INTO donor_total
  FROM public.project_donations
  WHERE project_id = NEW.project_id
    AND payment_status IN ('payment_soon', 'verified');

  IF donor_total = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT requester_user_id)::integer
  INTO requested_donors
  FROM public.project_refund_requests
  WHERE project_id = NEW.project_id;

  IF requested_donors * 100 >= donor_total * 51 THEN
    UPDATE public.community_projects
    SET
      status = 'cancelled',
      refund_triggered_at = COALESCE(refund_triggered_at, now()),
      updated_at = now()
    WHERE id = NEW.project_id
      AND status IN ('funding_active', 'target_reached', 'transfer_pending', 'refund_pending');

    INSERT INTO public.project_refund_batches (project_id, fee_percent, status, notes)
    VALUES (
      NEW.project_id,
      public.get_project_refund_fee_percent(),
      'pending_manual_processing',
      'Auto-created after >=51% donor refund requests'
    )
    ON CONFLICT (project_id) DO NOTHING;

    INSERT INTO public.notifications (user_id, title, message, body, data_json)
    SELECT recipients.user_id,
           'إشعار إلغاء مشروع واسترداد',
           'تم إلغاء المشروع بعد بلوغ نسبة طلبات الاسترداد 51% أو أكثر، وسيتم تنفيذ الاسترداد يدوياً من الإدارة.',
           'تم إلغاء المشروع بعد بلوغ نسبة طلبات الاسترداد 51% أو أكثر، وسيتم تنفيذ الاسترداد يدوياً من الإدارة.',
           jsonb_build_object('project_id', NEW.project_id, 'event', 'project_refund_threshold_met')
    FROM (
      SELECT DISTINCT d.donor_user_id AS user_id
      FROM public.project_donations d
      WHERE d.project_id = NEW.project_id
        AND d.payment_status IN ('payment_soon', 'verified')
      UNION
      SELECT DISTINCT f.founder_user_id AS user_id
      FROM public.project_founders f
      WHERE f.project_id = NEW.project_id
    ) AS recipients;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_donation_pledge(_project_id uuid, _amount numeric)
RETURNS public.project_donations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _row public.project_donations;
  _reference text;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Donation amount must be greater than zero';
  END IF;

  _reference := 'PLG-' || upper(substr(md5(gen_random_uuid()::text), 1, 12));

  INSERT INTO public.project_donations (
    project_id,
    donor_user_id,
    amount,
    payment_status,
    reference_code
  )
  VALUES (
    _project_id,
    auth.uid(),
    _amount,
    'payment_soon',
    _reference
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_donation_pledge(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_project_donation_pledge(uuid, numeric) TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.community_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_refund_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_mp_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_mp_nomination_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens can read center community projects" ON public.community_projects;
DROP POLICY IF EXISTS "Verified citizens can create center-scoped community projects" ON public.community_projects;
DROP POLICY IF EXISTS "Admins can manage all community projects" ON public.community_projects;

CREATE POLICY "Citizens can read center community projects"
ON public.community_projects FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'citizen'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.center_id = community_projects.center_id
      AND me.verification_status = 'verified'
  )
);

CREATE POLICY "Verified citizens can create center-scoped community projects"
ON public.community_projects FOR INSERT TO authenticated
WITH CHECK (
  creator_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND me.center_id = community_projects.center_id
      AND me.verification_status = 'verified'
  )
  AND status = 'funding_active'
);

CREATE POLICY "Admins can manage all community projects"
ON public.community_projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Citizens can read own founder membership" ON public.project_founders;
DROP POLICY IF EXISTS "Verified citizens can join as founders in same center" ON public.project_founders;
DROP POLICY IF EXISTS "Admins can read all founders" ON public.project_founders;

CREATE POLICY "Citizens can read own founder membership"
ON public.project_founders FOR SELECT TO authenticated
USING (
  founder_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
);

CREATE POLICY "Verified citizens can join as founders in same center"
ON public.project_founders FOR INSERT TO authenticated
WITH CHECK (
  founder_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.community_projects p
    JOIN public.profiles me ON me.user_id = auth.uid()
    WHERE p.id = project_founders.project_id
      AND me.center_id = p.center_id
      AND me.verification_status = 'verified'
  )
);

CREATE POLICY "Admins can read all founders"
ON public.project_founders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Citizens can read own project donations" ON public.project_donations;
DROP POLICY IF EXISTS "Verified citizens can pledge donations in funding projects" ON public.project_donations;
DROP POLICY IF EXISTS "Admins can manage project donations" ON public.project_donations;

CREATE POLICY "Citizens can read own project donations"
ON public.project_donations FOR SELECT TO authenticated
USING (
  donor_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
);

CREATE POLICY "Verified citizens can pledge donations in funding projects"
ON public.project_donations FOR INSERT TO authenticated
WITH CHECK (
  donor_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
  AND payment_status = 'payment_soon'
  AND EXISTS (
    SELECT 1
    FROM public.community_projects p
    JOIN public.profiles me ON me.user_id = auth.uid()
    WHERE p.id = project_donations.project_id
      AND p.center_id = me.center_id
      AND p.status IN ('funding_active', 'target_reached')
      AND me.verification_status = 'verified'
  )
);

CREATE POLICY "Admins can manage project donations"
ON public.project_donations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Verified donor citizens can request refund vote once" ON public.project_refund_requests;
DROP POLICY IF EXISTS "Admins can read all refund requests" ON public.project_refund_requests;

CREATE POLICY "Verified donor citizens can request refund vote once"
ON public.project_refund_requests FOR INSERT TO authenticated
WITH CHECK (
  requester_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.project_donations d
    WHERE d.project_id = project_refund_requests.project_id
      AND d.donor_user_id = auth.uid()
      AND d.payment_status IN ('payment_soon', 'verified')
  )
);

CREATE POLICY "Admins can read all refund requests"
ON public.project_refund_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage refund batches" ON public.project_refund_batches;
CREATE POLICY "Admins can manage refund batches"
ON public.project_refund_batches FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Founders can read own project nominations" ON public.project_mp_nominations;
DROP POLICY IF EXISTS "Nominated verified MPs can read own nominations" ON public.project_mp_nominations;
DROP POLICY IF EXISTS "Founders can nominate center MPs after target reached" ON public.project_mp_nominations;
DROP POLICY IF EXISTS "Nominated verified MPs can accept or reject with legal acknowledgment" ON public.project_mp_nominations;
DROP POLICY IF EXISTS "Admins can approve transfers and manage nominations" ON public.project_mp_nominations;

CREATE POLICY "Founders can read own project nominations"
ON public.project_mp_nominations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_founders f
    WHERE f.project_id = project_mp_nominations.project_id
      AND f.founder_user_id = auth.uid()
  )
);

CREATE POLICY "Nominated verified MPs can read own nominations"
ON public.project_mp_nominations FOR SELECT TO authenticated
USING (
  nominated_mp_user_id = auth.uid()
  AND public.is_verified_mp(auth.uid())
);

CREATE POLICY "Founders can nominate center MPs after target reached"
ON public.project_mp_nominations FOR INSERT TO authenticated
WITH CHECK (
  nominated_by_founder_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.project_founders f
    JOIN public.community_projects p ON p.id = f.project_id
    JOIN public.profiles mp_prof ON mp_prof.user_id = project_mp_nominations.nominated_mp_user_id
    WHERE f.project_id = project_mp_nominations.project_id
      AND f.founder_user_id = auth.uid()
      AND p.status = 'target_reached'
      AND p.center_id = mp_prof.center_id
      AND public.is_verified_mp(project_mp_nominations.nominated_mp_user_id)
  )
  AND status = 'pending_founder_approvals'
);

CREATE POLICY "Nominated verified MPs can accept or reject with legal acknowledgment"
ON public.project_mp_nominations FOR UPDATE TO authenticated
USING (
  nominated_mp_user_id = auth.uid()
  AND public.is_verified_mp(auth.uid())
  AND status IN ('approved_by_founders', 'mp_accepted', 'mp_rejected')
)
WITH CHECK (
  nominated_mp_user_id = auth.uid()
  AND public.is_verified_mp(auth.uid())
  AND status IN ('mp_accepted', 'mp_rejected')
  AND (
    status <> 'mp_accepted'
    OR (
      legal_acknowledged = true
      AND legal_acknowledged_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.mp_bank_accounts mba
        WHERE mba.mp_user_id = auth.uid()
          AND mba.status = 'verified'
      )
    )
  )
);

CREATE POLICY "Admins can approve transfers and manage nominations"
ON public.project_mp_nominations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    status <> 'admin_approved'
    OR bank_snapshot IS NOT NULL
  )
);

CREATE POLICY "Admins can read all nominations"
ON public.project_mp_nominations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Founders can approve nominations" ON public.project_mp_nomination_approvals;
DROP POLICY IF EXISTS "Admins can read nomination approvals" ON public.project_mp_nomination_approvals;

CREATE POLICY "Founders can approve nominations"
ON public.project_mp_nomination_approvals FOR INSERT TO authenticated
WITH CHECK (
  founder_user_id = auth.uid()
  AND public.is_verified_citizen(auth.uid())
  AND NOT public.has_role(auth.uid(), 'mp'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.project_mp_nominations n
    JOIN public.project_founders f ON f.project_id = n.project_id
    WHERE n.id = project_mp_nomination_approvals.nomination_id
      AND n.status = 'pending_founder_approvals'
      AND f.founder_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read nomination approvals"
ON public.project_mp_nomination_approvals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- -----------------------------------------------------------------------------
-- Safe aggregate views/functions (anonymous only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.community_project_public_stats
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  p.center_id,
  p.title,
  p.description,
  p.target_amount,
  p.raised_amount,
  p.status,
  COALESCE(f.founders_verified_count, 0) AS founders_verified_count,
  COALESCE(d.distinct_donor_count, 0) AS distinct_donor_count,
  COALESCE(r.refund_request_count, 0) AS refund_request_count,
  CASE
    WHEN COALESCE(d.distinct_donor_count, 0) > 0
      THEN ROUND((COALESCE(r.refund_request_count, 0)::numeric * 100.0) / d.distinct_donor_count, 2)
    ELSE 0
  END AS refund_request_percentage,
  CONCAT(COALESCE(f.founders_verified_count, 0)::text, ' verified founders') AS founders_display
FROM public.community_projects p
LEFT JOIN LATERAL (
  SELECT COUNT(*)::integer AS founders_verified_count
  FROM public.project_founders pf
  JOIN public.profiles fp ON fp.user_id = pf.founder_user_id
  WHERE pf.project_id = p.id
    AND fp.verification_status = 'verified'
) f ON true
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT donor_user_id)::integer AS distinct_donor_count
  FROM public.project_donations pd
  WHERE pd.project_id = p.id
    AND pd.payment_status IN ('payment_soon', 'verified')
) d ON true
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT requester_user_id)::integer AS refund_request_count
  FROM public.project_refund_requests rr
  WHERE rr.project_id = p.id
) r ON true;

GRANT SELECT ON public.community_project_public_stats TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_public_aggregate(_project_id uuid)
RETURNS TABLE (
  project_id uuid,
  center_id uuid,
  target_amount numeric,
  raised_amount numeric,
  status text,
  founders_verified_count integer,
  distinct_donor_count integer,
  refund_request_count integer,
  refund_request_percentage numeric,
  founders_display text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.project_id,
    s.center_id,
    s.target_amount,
    s.raised_amount,
    s.status,
    s.founders_verified_count,
    s.distinct_donor_count,
    s.refund_request_count,
    s.refund_request_percentage,
    s.founders_display
  FROM public.community_project_public_stats s
  WHERE s.project_id = _project_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_public_aggregate(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Storage: private transfer receipts
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-transfer-receipts', 'project-transfer-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Admins upload project transfer receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins read project transfer receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete project transfer receipts" ON storage.objects;

CREATE POLICY "Admins upload project transfer receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-transfer-receipts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins read project transfer receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-transfer-receipts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins delete project transfer receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-transfer-receipts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_community_projects_center_scope ON public.community_projects;
CREATE TRIGGER trg_community_projects_center_scope
BEFORE INSERT ON public.community_projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_project_center_on_create();

DROP TRIGGER IF EXISTS trg_project_founders_scope_limit ON public.project_founders;
CREATE TRIGGER trg_project_founders_scope_limit
BEFORE INSERT ON public.project_founders
FOR EACH ROW EXECUTE FUNCTION public.enforce_founders_limit_and_scope();

DROP TRIGGER IF EXISTS trg_project_mp_nominations_scope ON public.project_mp_nominations;
CREATE TRIGGER trg_project_mp_nominations_scope
BEFORE INSERT ON public.project_mp_nominations
FOR EACH ROW EXECUTE FUNCTION public.enforce_nomination_scope();

DROP TRIGGER IF EXISTS trg_project_donations_raised ON public.project_donations;
CREATE TRIGGER trg_project_donations_raised
AFTER INSERT OR UPDATE ON public.project_donations
FOR EACH ROW EXECUTE FUNCTION public.refresh_project_raised_amount();

DROP TRIGGER IF EXISTS trg_nomination_approval_finalize ON public.project_mp_nomination_approvals;
CREATE TRIGGER trg_nomination_approval_finalize
AFTER INSERT ON public.project_mp_nomination_approvals
FOR EACH ROW EXECUTE FUNCTION public.finalize_nomination_on_approvals();

DROP TRIGGER IF EXISTS trg_capture_nomination_decisions ON public.project_mp_nominations;
CREATE TRIGGER trg_capture_nomination_decisions
BEFORE UPDATE ON public.project_mp_nominations
FOR EACH ROW EXECUTE FUNCTION public.capture_nomination_decisions();

DROP TRIGGER IF EXISTS trg_refund_threshold ON public.project_refund_requests;
CREATE TRIGGER trg_refund_threshold
AFTER INSERT ON public.project_refund_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_refund_threshold();

DROP TRIGGER IF EXISTS update_community_projects_updated_at ON public.community_projects;
CREATE TRIGGER update_community_projects_updated_at
BEFORE UPDATE ON public.community_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_donations_updated_at ON public.project_donations;
CREATE TRIGGER update_project_donations_updated_at
BEFORE UPDATE ON public.project_donations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_refund_batches_updated_at ON public.project_refund_batches;
CREATE TRIGGER update_project_refund_batches_updated_at
BEFORE UPDATE ON public.project_refund_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_mp_nominations_updated_at ON public.project_mp_nominations;
CREATE TRIGGER update_project_mp_nominations_updated_at
BEFORE UPDATE ON public.project_mp_nominations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
