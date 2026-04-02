-- Harden Realtime channel authorization for private chat and notification topics.
-- This policy set enforces identity-based access to realtime.messages topics.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow own notification topics" ON realtime.messages;
DROP POLICY IF EXISTS "Allow chat topics for participants" ON realtime.messages;

CREATE POLICY "Allow own notification topics" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'notifications-%'
    AND substring(realtime.topic() FROM 15) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND substring(realtime.topic() FROM 15)::uuid = auth.uid()
  );

CREATE POLICY "Allow chat topics for participants" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'chat-%'
    AND substring(realtime.topic() FROM 6) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = substring(realtime.topic() FROM 6)::uuid
        AND (
          c.mp_user_id = auth.uid()
          OR c.citizen_user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );
