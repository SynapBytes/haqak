
-- Chat conversations table (MP initiates, MP can close)
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  mp_user_id uuid NOT NULL,
  citizen_user_id uuid NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one conversation per issue
ALTER TABLE public.chat_conversations ADD CONSTRAINT unique_issue_conversation UNIQUE (issue_id);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS for chat_conversations
CREATE POLICY "MPs can create conversations" ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'mp') AND mp_user_id = auth.uid());

CREATE POLICY "Participants can view their conversations" ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (mp_user_id = auth.uid() OR citizen_user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "MP can close conversation" ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (mp_user_id = auth.uid())
  WITH CHECK (mp_user_id = auth.uid());

-- RLS for chat_messages
CREATE POLICY "Participants can send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND c.is_closed = false
        AND (c.mp_user_id = auth.uid() OR c.citizen_user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.mp_user_id = auth.uid() OR c.citizen_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Participants can mark messages as read" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.mp_user_id = auth.uid() OR c.citizen_user_id = auth.uid())
    )
  );

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
