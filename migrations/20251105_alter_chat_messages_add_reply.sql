-- Migration: add reply_to_id to chat_messages
-- Engine: PostgreSQL

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id INTEGER NULL REFERENCES chat_messages(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_id);
