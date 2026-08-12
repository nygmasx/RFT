BEGIN;

CREATE TABLE IF NOT EXISTS announcement_reactions (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS announcement_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_coach boolean NOT NULL DEFAULT true,
  notify_messages boolean NOT NULL DEFAULT true,
  notify_competitions boolean NOT NULL DEFAULT true,
  notify_carpools boolean NOT NULL DEFAULT false,
  share_grade boolean NOT NULL DEFAULT true,
  share_palmares boolean NOT NULL DEFAULT true,
  profile_visibility text NOT NULL DEFAULT 'members',
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_profile_visibility_check
    CHECK (profile_visibility IN ('members', 'coaches', 'private'))
);

-- Keep the newest duplicate before enforcing idempotent registrations.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY user_id, competition_id
    ORDER BY created_at DESC, id DESC
  ) AS duplicate_rank
  FROM registrations
)
DELETE FROM registrations
WHERE id IN (SELECT id FROM ranked WHERE duplicate_rank > 1);

CREATE UNIQUE INDEX IF NOT EXISTS registrations_user_competition_unique
  ON registrations (user_id, competition_id);

-- A device token must belong to one account at a time.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY token
    ORDER BY created_at DESC, id DESC
  ) AS duplicate_rank
  FROM push_tokens
)
DELETE FROM push_tokens
WHERE id IN (SELECT id FROM ranked WHERE duplicate_rank > 1);

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_unique ON push_tokens (token);

-- Account deletion must also remove content directly owned by the account.
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_author_id_users_id_fk;
ALTER TABLE announcements
  ADD CONSTRAINT announcements_author_id_users_id_fk
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_users_id_fk;
ALTER TABLE messages
  ADD CONSTRAINT messages_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
