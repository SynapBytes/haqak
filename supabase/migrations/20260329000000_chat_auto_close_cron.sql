-- Function to close inactive conversations
CREATE OR REPLACE FUNCTION close_inactive_conversations() RETURNS VOID AS $$
BEGIN
    UPDATE chat_conversations
    SET is_closed = true,
        closed_at = NOW()
    WHERE is_closed = false
      AND (
        -- No messages at all and created more than 30 days ago
        (NOT EXISTS (SELECT 1 FROM chat_messages WHERE conversation_id = chat_conversations.id) 
         AND created_at < NOW() - INTERVAL '30 days')
        OR
        -- Last message was more than 30 days ago
        (EXISTS (SELECT 1 FROM chat_messages WHERE conversation_id = chat_conversations.id)
         AND (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = chat_conversations.id) < NOW() - INTERVAL '30 days')
      );
END;
$$ LANGUAGE plpgsql;

-- Schedule the cron job to run daily at midnight
SELECT cron.schedule('0 0 * * *', 'SELECT close_inactive_conversations()');
