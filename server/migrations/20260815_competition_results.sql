BEGIN;

ALTER TABLE palmares
  ADD COLUMN IF NOT EXISTS competition_id uuid;

ALTER TABLE palmares
  DROP CONSTRAINT IF EXISTS palmares_competition_id_competitions_id_fk;

ALTER TABLE palmares
  ADD CONSTRAINT palmares_competition_id_competitions_id_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS palmares_user_competition_unique
  ON palmares (user_id, competition_id);

COMMIT;
