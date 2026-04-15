-- Follow-up hardening: RLS coverage, least-privilege policies, and SECURITY DEFINER tightening

-- 1) Ensure RLS is enabled on tables previously missing explicit protection
ALTER TABLE IF EXISTS public.collective_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mp_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_knowledge_base ENABLE ROW LEVEL SECURITY;

-- 2) collective_cases policies
DROP POLICY IF EXISTS "Authenticated can view collective cases" ON public.collective_cases;
DROP POLICY IF EXISTS "Oversight can manage collective cases" ON public.collective_cases;

CREATE POLICY "Authenticated can view collective cases"
ON public.collective_cases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Oversight can manage collective cases"
ON public.collective_cases
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));

-- 3) digital_signatures policies
DROP POLICY IF EXISTS "Users can insert own digital signatures" ON public.digital_signatures;
DROP POLICY IF EXISTS "Users can view own digital signatures" ON public.digital_signatures;
DROP POLICY IF EXISTS "Oversight can view all digital signatures" ON public.digital_signatures;

CREATE POLICY "Users can insert own digital signatures"
ON public.digital_signatures
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own digital signatures"
ON public.digital_signatures
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Oversight can view all digital signatures"
ON public.digital_signatures
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));

-- 4) mp_kpis policies
DROP POLICY IF EXISTS "Users can view own mp_kpis" ON public.mp_kpis;
DROP POLICY IF EXISTS "Oversight can view all mp_kpis" ON public.mp_kpis;
DROP POLICY IF EXISTS "Admins can manage mp_kpis" ON public.mp_kpis;

CREATE POLICY "Users can view own mp_kpis"
ON public.mp_kpis
FOR SELECT
TO authenticated
USING (mp_id = auth.uid());

CREATE POLICY "Oversight can view all mp_kpis"
ON public.mp_kpis
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));

CREATE POLICY "Admins can manage mp_kpis"
ON public.mp_kpis
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) legal_knowledge_base policies
DROP POLICY IF EXISTS "Authenticated can read legal knowledge base" ON public.legal_knowledge_base;
DROP POLICY IF EXISTS "Oversight can manage legal knowledge base" ON public.legal_knowledge_base;

CREATE POLICY "Authenticated can read legal knowledge base"
ON public.legal_knowledge_base
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Oversight can manage legal knowledge base"
ON public.legal_knowledge_base
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));

-- 6) Add missing policies for RLS-enabled operational tables
DROP POLICY IF EXISTS "Service role can manage csrf tokens" ON public.csrf_tokens;
CREATE POLICY "Service role can manage csrf tokens"
ON public.csrf_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage file validation logs" ON public.file_validation_log;
DROP POLICY IF EXISTS "Oversight can read file validation logs" ON public.file_validation_log;

CREATE POLICY "Service role can manage file validation logs"
ON public.file_validation_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Oversight can read file validation logs"
ON public.file_validation_log
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));

-- 7) project_milestones had RLS enabled with no policies
DROP POLICY IF EXISTS "Participants can view project milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Admins and MPs can manage project milestones" ON public.project_milestones;

CREATE POLICY "Participants can view project milestones"
ON public.project_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_proposals p
    WHERE p.id = project_milestones.project_id
      AND (
        p.user_id = auth.uid()
        OR public.has_any_role(auth.uid(), ARRAY['admin','mp','moderator']::public.app_role[])
      )
  )
);

CREATE POLICY "Admins and MPs can manage project milestones"
ON public.project_milestones
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','mp','moderator']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','mp','moderator']::public.app_role[]));

-- 8) Tighten official_documents read scope
DROP POLICY IF EXISTS "Anyone authenticated can view official documents" ON public.official_documents;
DROP POLICY IF EXISTS "Participants and oversight can view official documents" ON public.official_documents;

CREATE POLICY "Participants and oversight can view official documents"
ON public.official_documents
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[])
  OR (
    entity_type = 'issue_report'
    AND EXISTS (
      SELECT 1
      FROM public.issues i
      WHERE i.id = official_documents.entity_id
        AND (i.user_id = auth.uid() OR i.assigned_mp_id = auth.uid())
    )
  )
  OR (
    entity_type = 'mp_response'
    AND EXISTS (
      SELECT 1
      FROM public.mp_responses r
      JOIN public.issues i ON i.id = r.issue_id
      WHERE r.id = official_documents.entity_id
        AND (i.user_id = auth.uid() OR i.assigned_mp_id = auth.uid())
    )
  )
);

-- 9) Fix broken feedback admin policy (profiles has no role column)
DROP POLICY IF EXISTS "Admins can view feedbacks" ON public.feedbacks;

CREATE POLICY "Admins can view feedbacks"
ON public.feedbacks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10) Harden SECURITY DEFINER functions lacking explicit search_path
ALTER FUNCTION public.update_citizen_reputation() SET search_path = public;
ALTER FUNCTION public.detect_issue_anomalies() SET search_path = public;
ALTER FUNCTION public.verify_geotagged_photo() SET search_path = public;
ALTER FUNCTION public.update_project_raised_amount() SET search_path = public;
ALTER FUNCTION public.notify_district_of_new_project() SET search_path = public;

-- 11) Restrict direct execution of SECURITY DEFINER trigger functions
REVOKE ALL ON FUNCTION public.update_citizen_reputation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_issue_anomalies() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_geotagged_photo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_project_raised_amount() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_district_of_new_project() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_citizen_reputation() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.detect_issue_anomalies() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.verify_geotagged_photo() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.update_project_raised_amount() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.notify_district_of_new_project() TO postgres, service_role;
