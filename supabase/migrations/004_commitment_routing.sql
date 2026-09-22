ALTER TABLE commitments ADD COLUMN department TEXT;
ALTER TABLE commitments ADD COLUMN external_ticket_ref TEXT;

CREATE TABLE commitment_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id  UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL CHECK (event_type IN ('created', 'status_changed', 'routed')),
  from_value     TEXT,
  to_value       TEXT,
  actor_type     TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('ai', 'user')),
  actor_label    TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON commitment_events (commitment_id, created_at);
