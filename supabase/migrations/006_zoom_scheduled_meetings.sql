ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_source_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_source_check
  CHECK (source IN ('teams', 'zoom', 'simulated', 'manual', 'seed'));

CREATE TABLE scheduled_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  zoom_meeting_id TEXT NOT NULL UNIQUE,
  join_url        TEXT NOT NULL,
  topic           TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON scheduled_meetings (deal_id);
CREATE INDEX ON scheduled_meetings (zoom_meeting_id);
