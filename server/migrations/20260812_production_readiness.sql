BEGIN;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at timestamp;

CREATE TABLE IF NOT EXISTS competition_bookmarks (
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data text,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

COMMIT;
