BEGIN;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_data text,
  ADD COLUMN IF NOT EXISTS media_mime_type text,
  ADD COLUMN IF NOT EXISTS media_file_name text,
  ADD COLUMN IF NOT EXISTS media_duration_ms integer,
  ADD COLUMN IF NOT EXISTS media_token uuid;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'audio'));

CREATE UNIQUE INDEX IF NOT EXISTS messages_media_token_unique
  ON messages (media_token);

CREATE TABLE IF NOT EXISTS channel_reads (
  channel_id text NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_mentions (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS registration_url text;

COMMIT;
