ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE carpools
  ADD COLUMN IF NOT EXISTS departure_latitude double precision,
  ADD COLUMN IF NOT EXISTS departure_longitude double precision;
