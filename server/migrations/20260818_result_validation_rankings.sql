BEGIN;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS importance text NOT NULL DEFAULT 'regional';

ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_importance_check;
ALTER TABLE competitions
  ADD CONSTRAINT competitions_importance_check
  CHECK (importance IN ('local', 'regional', 'national', 'international', 'major'));

ALTER TABLE palmares
  ADD COLUMN IF NOT EXISTS result_stage text,
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submission_source text NOT NULL DEFAULT 'coach',
  ADD COLUMN IF NOT EXISTS belt_color text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp;

UPDATE palmares
SET result_stage = CASE place
  WHEN 1 THEN 'champion'
  WHEN 2 THEN 'finalist'
  WHEN 3 THEN 'semifinal'
  WHEN 4 THEN 'quarterfinal'
  WHEN 8 THEN 'round_of_16'
  WHEN 16 THEN 'round_of_32'
  ELSE 'participant'
END
WHERE result_stage IS NULL;

ALTER TABLE palmares
  ALTER COLUMN result_stage SET DEFAULT 'participant',
  ALTER COLUMN result_stage SET NOT NULL;

ALTER TABLE palmares
  DROP CONSTRAINT IF EXISTS palmares_result_stage_check,
  DROP CONSTRAINT IF EXISTS palmares_validation_status_check,
  DROP CONSTRAINT IF EXISTS palmares_submission_source_check,
  DROP CONSTRAINT IF EXISTS palmares_belt_color_check;

ALTER TABLE palmares
  ADD CONSTRAINT palmares_result_stage_check CHECK (result_stage IN (
    'champion', 'finalist', 'semifinal', 'quarterfinal',
    'round_of_16', 'round_of_32', 'participant'
  )),
  ADD CONSTRAINT palmares_validation_status_check
    CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  ADD CONSTRAINT palmares_submission_source_check
    CHECK (submission_source IN ('athlete', 'coach')),
  ADD CONSTRAINT palmares_belt_color_check
    CHECK (belt_color IS NULL OR belt_color IN ('blanche', 'bleue', 'violette', 'marron', 'noire'));

CREATE TABLE IF NOT EXISTS result_reminders (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  sent_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, competition_id)
);

CREATE INDEX IF NOT EXISTS palmares_validation_status_idx
  ON palmares (validation_status, comp_date DESC);

COMMIT;
