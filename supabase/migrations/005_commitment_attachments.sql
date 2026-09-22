ALTER TABLE commitments ADD COLUMN routing_instructions TEXT;

CREATE TABLE commitment_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id       UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  commitment_event_id UUID REFERENCES commitment_events(id) ON DELETE SET NULL,
  file_name           TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  file_type           TEXT,
  file_size           INT,
  uploaded_by         UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON commitment_attachments (commitment_id);
CREATE INDEX ON commitment_attachments (commitment_event_id);

-- Public bucket for commitment attachments, matching this POC's
-- permissive (RLS-disabled-equivalent) posture used elsewhere.
INSERT INTO storage.buckets (id, name, public)
VALUES ('commitment-attachments', 'commitment-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read commitment attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'commitment-attachments');

CREATE POLICY "Public upload commitment attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'commitment-attachments');
