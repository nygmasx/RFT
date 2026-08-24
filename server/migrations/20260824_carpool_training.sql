BEGIN;

ALTER TABLE carpools
  ADD COLUMN IF NOT EXISTS calendar_event_id uuid
  REFERENCES calendar_events(id) ON DELETE SET NULL;

ALTER TABLE carpools
  DROP CONSTRAINT IF EXISTS carpools_single_destination_check;

ALTER TABLE carpools
  ADD CONSTRAINT carpools_single_destination_check
  CHECK (competition_id IS NULL OR calendar_event_id IS NULL);

CREATE INDEX IF NOT EXISTS carpools_calendar_event_idx
  ON carpools(calendar_event_id);

COMMIT;
