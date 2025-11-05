CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  "group" VARCHAR(32) NOT NULL CHECK ("group" IN ('general','workers')),
  user_id INTEGER NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created_at ON chat_messages ("group", created_at DESC);
