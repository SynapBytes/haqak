-- Restrict Chat Initiation for MPs
-- This migration ensures that an MP can only start a conversation if:
-- 1. They are an active (approved) MP.
-- 2. The conversation is linked to an issue assigned to them.
-- 3. The citizen in the conversation is the owner of that issue.

DROP POLICY IF EXISTS "MPs can create conversations" ON public.chat_conversations;

CREATE POLICY "MPs can create conversations" ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be an active MP
    is_active_mp(auth.uid())
    -- Must be the MP initiating the chat
    AND mp_user_id = auth.uid()
    -- Must be linked to an issue assigned to this MP
    AND EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = chat_conversations.issue_id
        AND issues.assigned_mp_id = auth.uid()
        AND issues.user_id = chat_conversations.citizen_user_id
    )
  );

COMMENT ON POLICY "MPs can create conversations" ON public.chat_conversations IS 'Restricts MPs to only start chats for issues assigned to them with the correct citizen.';
