CREATE TABLE companies (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT
);

CREATE TABLE contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES companies(id),
  name              TEXT NOT NULL,
  role              TEXT,
  email             TEXT,
  is_champion       BOOLEAN DEFAULT FALSE,
  is_economic_buyer BOOLEAN DEFAULT FALSE
);

CREATE TABLE deals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  company_id    UUID REFERENCES companies(id),
  rep_id        UUID REFERENCES auth.users(id),
  stage         TEXT NOT NULL CHECK (stage IN (
                  'lead','discovery','scoping',
                  'proposal','negotiation',
                  'closed_won','closed_lost')),
  value         NUMERIC(12,2),
  next_meeting  TIMESTAMPTZ,
  days_in_stage INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meeting_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('teams','simulated','manual','seed')),
  meeting_date    TIMESTAMPTZ DEFAULT NOW(),
  processed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commitments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  agreed_text    TEXT NOT NULL,
  next_steps     TEXT,
  handoff_notes  TEXT,
  owner          TEXT CHECK (owner IN ('rep','client','presales','manager')),
  deadline       DATE,
  status         TEXT DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','done','overdue')),
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE briefs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  summary       TEXT NOT NULL,
  suggestions   JSONB DEFAULT '[]',
  context_tags  JSONB DEFAULT '[]',
  risk_flags    JSONB DEFAULT '[]',
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id)
);

CREATE TABLE embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  embedding       vector(1536),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_deal_id   UUID,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (content TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT e.content, 1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE e.deal_id = match_deal_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
