
-- 1. Drop the dangerous INSERT policy on user_roles (trigger handles signup)
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;

-- 2. Create is_active_mp helper function
CREATE OR REPLACE FUNCTION public.is_active_mp(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'mp'
      AND p.is_approved = true
  )
$$;

-- 3. Update MP RLS policies on issues
DROP POLICY IF EXISTS "MPs can view all issues" ON public.issues;
CREATE POLICY "MPs can view all issues" ON public.issues
  FOR SELECT TO authenticated
  USING (is_active_mp(auth.uid()));

DROP POLICY IF EXISTS "MPs can update issues" ON public.issues;
CREATE POLICY "MPs can update issues" ON public.issues
  FOR UPDATE TO authenticated
  USING (is_active_mp(auth.uid()));

-- 4. Update MP RLS policies on profiles
DROP POLICY IF EXISTS "MPs can view citizen profiles" ON public.profiles;
CREATE POLICY "MPs can view citizen profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_active_mp(auth.uid()));

-- 5. Update MP RLS on chat_conversations
DROP POLICY IF EXISTS "MPs can create conversations" ON public.chat_conversations;
CREATE POLICY "MPs can create conversations" ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (is_active_mp(auth.uid()) AND mp_user_id = auth.uid());

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.chat_conversations;
CREATE POLICY "Participants can view their conversations" ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    mp_user_id = auth.uid()
    OR citizen_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- 6. Update MP RLS on chat_messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.chat_messages;
CREATE POLICY "Participants can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.mp_user_id = auth.uid() OR c.citizen_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- 7. Update MP RLS on issue_actions
DROP POLICY IF EXISTS "Users can view actions on their issues" ON public.issue_actions;
CREATE POLICY "Users can view actions on their issues" ON public.issue_actions
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM issues WHERE issues.id = issue_actions.issue_id AND issues.user_id = auth.uid()))
    OR is_active_mp(auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "MPs and admins can insert actions" ON public.issue_actions;
CREATE POLICY "MPs and admins can insert actions" ON public.issue_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active_mp(auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR auth.uid() = user_id
  );

-- 8. Update MP RLS on issue_attachments
DROP POLICY IF EXISTS "Users can view attachments on their issues" ON public.issue_attachments;
CREATE POLICY "Users can view attachments on their issues" ON public.issue_attachments
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM issues WHERE issues.id = issue_attachments.issue_id AND issues.user_id = auth.uid()))
    OR is_active_mp(auth.uid())
    OR has_role(auth.uid(), 'admin')
  );
