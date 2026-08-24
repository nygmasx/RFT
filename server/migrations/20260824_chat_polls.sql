BEGIN;

CREATE TABLE IF NOT EXISTS message_polls (
  message_id uuid PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  allows_multiple boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS message_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES message_polls(message_id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT message_poll_options_position_unique UNIQUE (message_id, position)
);

CREATE INDEX IF NOT EXISTS message_poll_options_message_idx
  ON message_poll_options (message_id);

CREATE TABLE IF NOT EXISTS message_poll_votes (
  option_id uuid NOT NULL REFERENCES message_poll_options(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_poll_votes_user_idx
  ON message_poll_votes (user_id);

COMMIT;
