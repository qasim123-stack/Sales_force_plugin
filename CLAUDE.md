# SalesIQ — POC
**Stack:** Next.js 14 · Supabase · FastAPI · LangChain · Tailwind · shadcn/ui

---

## What You Are Building

A simple CRM with dummy data. When a rep or manager clicks any deal, a sidebar opens on the right with AI-powered features.

**For the Sales Rep (agent) — 2 things in sidebar:**
1. **Pre-meeting Brief** — AI summary of all past meetings for this deal + specific suggestions for the next meeting
2. **Commitment Tracker** — Rep fills in what was agreed + next steps after each meeting. Next person in pipeline sees this.

**For the Manager — 3 things in sidebar:**
1. **Pre-meeting Brief** (same as rep)
2. **Commitment Tracker** (same as rep, read-only)
3. **Deal Summary** — AI overview of where this deal stands, who is involved, pipeline stage, risk flags

**Meeting transcripts come from Microsoft Teams** via Graph API webhook. When a Teams meeting ends, the transcript is automatically pulled, processed by AI, and the sidebar updates live.

That is the entire product. Nothing else.

---

## App Structure — Keep It Simple

```
Two pages only:

/deals          → CRM list of all deals (dummy data)
/deals/[id]     → Deal detail page + sidebar
```

Layout on every page:
- Simple top nav bar with logo + user avatar + logout
- No complex left nav. Just a top bar.

Deal detail page layout:
```
┌─────────────────────────────────┬───────────────────────┐
│                                 │                       │
│   DEAL INFO (left, 60%)         │   AI SIDEBAR (right,  │
│                                 │   40%)                │
│   Company name                  │                       │
│   Stage · Value · Rep           │   [Rep sees:]         │
│   Contacts list                 │   1. Brief card       │
│   Meeting history               │   2. Commitments      │
│                                 │                       │
│   [Simulate Meeting button]     │   [Manager also sees:]│
│                                 │   3. Deal summary     │
│                                 │                       │
└─────────────────────────────────┴───────────────────────┘
```

---

## Tech Stack

| What | Technology |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind |
| UI | shadcn/ui components only |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth — role stored in user_metadata |
| Realtime | Supabase Realtime (sidebar updates live) |
| AI Service | FastAPI + LangChain (Python, separate folder) |
| LLM | Gemini 1.5 Flash (Google AI API — free tier) |
| Embeddings | Gemini text-embedding-004 (Google AI — free tier) |
| Teams | Microsoft Graph API webhook |

---

## File Structure

```
salesiq/
├── app/
│   ├── login/page.tsx
│   ├── deals/
│   │   ├── page.tsx              ← deals list
│   │   └── [id]/page.tsx         ← deal detail + sidebar
│   └── api/
│       ├── teams-webhook/route.ts     ← receives MS Teams transcript
│       ├── simulate-meeting/route.ts  ← demo button
│       └── generate-brief/route.ts    ← on-demand brief
│
├── components/
│   ├── TopNav.tsx
│   ├── DealCard.tsx              ← card on /deals list
│   ├── DealDetail.tsx            ← left panel on deal page
│   ├── AISidebar.tsx             ← right panel — all AI features
│   ├── BriefCard.tsx             ← pre-meeting brief
│   ├── CommitmentTracker.tsx     ← commitments list + form
│   ├── CommitmentForm.tsx        ← modal to add/edit commitment
│   ├── DealSummary.tsx           ← manager-only panel
│   └── SimulateMeetingBtn.tsx    ← demo trigger button
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   └── hooks/
│       ├── useBrief.ts           ← realtime brief subscription
│       └── useCommitments.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_extensions.sql
│   │   ├── 002_tables.sql
│   │   └── 003_seed.sql
│   └── functions/
│       └── on-meeting-insert/index.ts
│
├── ai-service/
│   ├── main.py
│   ├── brief_chain.py
│   ├── commitment_extractor.py
│   ├── db.py
│   └── requirements.txt
│
└── CLAUDE.md
```

---

## Database

### 001_extensions.sql
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 002_tables.sql
```sql
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
```

### 003_seed.sql
```sql
-- First create two users in Supabase Auth dashboard:
-- rep@salesiq.demo     password: Demo1234!   metadata: {"role":"rep","name":"James Carter"}
-- manager@salesiq.demo password: Demo1234!   metadata: {"role":"manager","name":"Sarah Mitchell"}
-- Then replace the two UUIDs below

DO $$
DECLARE
  rep_id  UUID := 'REPLACE_WITH_REP_UUID';
  c1 UUID := gen_random_uuid();
  c2 UUID := gen_random_uuid();
  c3 UUID := gen_random_uuid();
  d1 UUID := gen_random_uuid();
  d2 UUID := gen_random_uuid();
  d3 UUID := gen_random_uuid();
BEGIN

INSERT INTO companies (id, name, industry) VALUES
  (c1, 'Acme Corp',     'Manufacturing'),
  (c2, 'TechFlow Inc',  'SaaS'),
  (c3, 'Nexus Systems', 'Healthcare IT');

INSERT INTO contacts (company_id, name, role, email, is_champion, is_economic_buyer) VALUES
  (c1, 'Sarah Lin',    'CTO', 'sarah@acme.com',    TRUE,  FALSE),
  (c1, 'Michael Park', 'CFO', 'mike@acme.com',     FALSE, TRUE),
  (c2, 'Priya Shah',   'VP Engineering', 'priya@techflow.com', TRUE, TRUE),
  (c3, 'James Wu',     'IT Director', 'james@nexus.com', TRUE, FALSE),
  (c3, 'Linda Torres', 'CEO', 'linda@nexus.com',   FALSE, TRUE);

INSERT INTO deals (id, title, company_id, rep_id, stage, value, days_in_stage, next_meeting)
VALUES
  (d1, 'Acme Corp — Enterprise Plan', c1, rep_id, 'proposal',  85000, 12, NOW() + INTERVAL '2 days'),
  (d2, 'TechFlow Inc — Starter',      c2, rep_id, 'discovery', 24000,  5, NOW() + INTERVAL '4 days'),
  (d3, 'Nexus Systems — Full Suite',  c3, rep_id, 'scoping',  120000, 18, NOW() + INTERVAL '1 day');

INSERT INTO meeting_notes (deal_id, transcript_text, source, meeting_date, processed)
VALUES
(d1,
'Rep: Thanks for the time today Sarah. Can you walk me through your current setup?
Sarah: We run three separate ERP systems that do not talk to each other. Ops wastes 15 hours a week on manual data entry.
Rep: What would an ideal solution look like?
Sarah: Single source of truth. Real-time sync. Must plug into SAP.
Rep: We have a native SAP connector. I can demo that specifically. Also Michael your CFO should join the next call — he controls budget right?
Sarah: Yes. I will get him on the next one.',
'seed', NOW() - INTERVAL '14 days', TRUE),

(d1,
'Michael: What does enterprise actually include and is there flexibility on annual commitment?
Rep: Unlimited users, SAP connector, dedicated support, 99.9 percent uptime SLA. We can do quarterly billing for year one.
Michael: Budget is approved up to 90K. We need implementation included.
Rep: Implementation is included. I will send a formal proposal this week.
Sarah: We need this live before Q1 or it does not fit our planning cycle.
Rep: If we sign by end of month I can guarantee Q1 go-live. I will put that in the proposal.',
'seed', NOW() - INTERVAL '5 days', TRUE),

(d2,
'Rep: What is the main pain point you are trying to solve?
Priya: 60 engineers with no visibility into who is working on what. Notion, Jira, and spreadsheets — nothing connected.
Rep: On budget — is this your decision?
Priya: I have signing authority up to 30K. Above that needs board approval which takes 6 weeks.
Rep: Our starter is 24K so you can move without board. I will send comparison docs and case studies.',
'seed', NOW() - INTERVAL '6 days', TRUE),

(d3,
'Rep: What is driving the search right now James?
James: Compliance audit in March. Our current system has no audit trail — serious problem in healthcare IT.
Rep: We have HIPAA compliance built in, full audit logging. We passed three healthcare audits this year.
James: Our CEO Linda is very risk-averse. Anything we bring her needs a very strong compliance story. Keep it tight — no more than 10 slides.
Rep: I will have a 10-slide compliance deck ready by Thursday.',
'seed', NOW() - INTERVAL '8 days', TRUE);

INSERT INTO commitments
  (deal_id, agreed_text, next_steps, handoff_notes, owner, deadline, status, created_by)
VALUES
(d1,
  'Send formal proposal with Q1 go-live guarantee and quarterly billing',
  'Review with solutions team first. Confirm SAP connector timeline before sending.',
  'Michael confirmed $90K budget. Q1 go-live is a hard blocker — Sarah said deal falls through without it.',
  'rep', CURRENT_DATE + 2, 'open', rep_id),

(d2,
  'Send comparison doc and engineering case studies',
  'Use Stripe and Shopify case studies — Priya mentioned similar 60-person team size. Keep pricing below $30K.',
  'Priya has $30K signing authority. Above that = 6-week board process. Keep us under.',
  'rep', CURRENT_DATE - 1, 'overdue', rep_id),

(d3,
  'Prepare 10-slide compliance deck for CEO Linda Torres',
  'Lead with HIPAA cert. Include audit trail screenshot. Hard limit 10 slides — James was explicit.',
  'Linda is risk-averse and time-sensitive. Compliance first. No more than 10 slides or she disengages.',
  'rep', CURRENT_DATE + 1, 'in_progress', rep_id);

INSERT INTO briefs (deal_id, summary, suggestions, context_tags, risk_flags)
VALUES
(d1,
  'Acme Corp is in late proposal stage. CTO Sarah Lin is your champion and CFO Michael Park confirmed budget at up to $90K. The deal depends on two things: a formal proposal with quarterly billing and an explicit Q1 go-live commitment in writing. SAP connector is their primary technical requirement.',
  '["Lead with the Q1 go-live commitment — Sarah said this is a hard requirement","Confirm quarterly billing is in the proposal — Michael asked for this","Ask Michael if the proposal format works for their procurement process","Do not negotiate on price — $90K budget approved, our enterprise is $85K"]',
  '[{"label":"Budget $90K approved","category":"budget"},{"label":"Q1 deadline hard","category":"timeline"},{"label":"SAP connector required","category":"technical"},{"label":"CFO engaged","category":"stakeholder"}]',
  '["Proposal due in 2 days — do not miss this","Q1 deadline leaves no room to slip on signing"]'),

(d2,
  'TechFlow is in early discovery. Priya Shah is both champion and economic buyer with $30K signing authority — she can close without board approval. Pain is clear: fragmented tools across Notion, Jira, and spreadsheets for a 60-person engineering team. Comparison doc is overdue by one day.',
  '["Send the comparison doc today — it is overdue","Use Stripe and Shopify case studies — similar team size","Keep pricing at $24K so Priya can sign without board","Ask about their internal deadline or milestone driving this"]',
  '[{"label":"Signing authority $30K","category":"budget"},{"label":"60-person eng team","category":"stakeholder"},{"label":"Fragmented tooling","category":"technical"}]',
  '["Comparison doc 1 day overdue — fix immediately","Above $30K triggers 6-week board process"]'),

(d3,
  'Nexus Systems is in scoping with a March compliance audit as hard deadline. IT Director James Wu is champion but CEO Linda Torres is the economic buyer and has not been in a meeting yet. Deal has been in scoping 18 days — needs to move.',
  '["Open with HIPAA certification and three healthcare audit wins","Hard limit 10 slides — James was explicit about this","Confirm March audit date so you can show timeline fits","Ask how to get a decision after this call — 18 days in scoping is too long"]',
  '[{"label":"March compliance audit","category":"timeline"},{"label":"HIPAA required","category":"technical"},{"label":"CEO Linda risk-averse","category":"stakeholder"}]',
  '["CEO Linda not yet in a meeting — must happen next call","18 days in scoping — deal needs momentum now"]');

END $$;
```

---

## The AI Sidebar — Exact Spec

This is a fixed right panel (`w-96`) that appears when any deal is open.
It reads the user role and shows different content.

### For Rep (role === 'rep')

**Card 1 — Pre-meeting Brief**
```
┌──────────────────────────────────────┐
│ 🧠 Pre-meeting Brief      [↻ Refresh]│
│ Updated 2 hours ago                  │
├──────────────────────────────────────┤
│ 📅 Meeting in 6 hours                │  ← only if next_meeting within 24h
│    Sarah Lin · Acme Corp             │
├──────────────────────────────────────┤
│ SUMMARY                              │
│ [AI narrative — 3-4 sentences]       │
├──────────────────────────────────────┤
│ FOR THIS MEETING                     │
│ → [suggestion 1]                     │
│ → [suggestion 2]                     │
│ → [suggestion 3]                     │
├──────────────────────────────────────┤
│ [Budget $90K ✓] [Q1 deadline 🔴]    │  ← context tags as pills
├──────────────────────────────────────┤
│ ⚠ [risk flag 1]                     │
│ ⚠ [risk flag 2]                     │
└──────────────────────────────────────┘
```

**Card 2 — Commitment Tracker**
```
┌──────────────────────────────────────┐
│ ✓ Commitments         2 open  1 done │
├──────────────────────────────────────┤
│ 🔴 OVERDUE · Rep · Due Sep 14        │
│    Send comparison doc               │
│    ▸ Use Stripe/Shopify case studies │  ← next_steps
│    📝 Keep pricing below $30K        │  ← handoff_notes
│    [In Progress]  [Done]             │
│                                      │
│ 🟡 OPEN · Rep · Due Sep 17          │
│    Send formal proposal              │
│    ▸ Review with solutions team      │
│    📝 Q1 go-live is the blocker      │
│    [In Progress]  [Done]             │
├──────────────────────────────────────┤
│           [+ Add Commitment]         │
└──────────────────────────────────────┘
```

### For Manager (role === 'manager') — same two cards PLUS:

**Card 3 — Deal Summary**
```
┌──────────────────────────────────────┐
│ 📊 Deal Summary                      │
├──────────────────────────────────────┤
│ Stage      Proposal (12 days)        │
│ Value      $85,000                   │
│ Rep        James Carter              │
│ Probability  70%                     │
├──────────────────────────────────────┤
│ PEOPLE INVOLVED                      │
│ ★ Sarah Lin    CTO  · Champion       │
│   Michael Park CFO  · Economic Buyer │
├──────────────────────────────────────┤
│ PIPELINE HEALTH                      │
│ 🔴 Proposal due in 2 days           │
│ 🟡 12 days in current stage         │
│ 🟢 CFO engaged                      │
└──────────────────────────────────────┘
```

---

## Add Commitment Form (Dialog/Modal)

Opens when rep clicks "+ Add Commitment".

Fields:
- **What was agreed** (textarea, required) — `agreed_text`
- **Next steps for whoever picks this up** (textarea, required) — `next_steps`
  - Helper text: "This is what the next person in the pipeline sees first"
- **Handoff notes** (textarea, optional) — `handoff_notes`
- **Owner** (select: Rep / Client / PreSales / Manager)
- **Deadline** (date input)

On save: INSERT to commitments. Close modal. List refreshes.

---

## Microsoft Teams Integration

### How it works

1. Register a Microsoft Graph webhook subscription on `callTranscripts`
2. When a Teams meeting ends, Graph POSTs to `/api/teams-webhook`
3. Your route fetches the full transcript via Graph API
4. Inserts into `meeting_notes` with source `'teams'`
5. Supabase Edge Function fires → calls FastAPI → processes transcript
6. Brief card updates live in sidebar via Realtime

### /api/teams-webhook/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Graph sends a validation token on first setup — return it
  const validationToken = req.nextUrl.searchParams.get('validationToken')
  if (validationToken) {
    return new Response(validationToken, {
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // Process transcript notifications
  for (const notification of body.value ?? []) {
    const transcriptId = notification.resourceData?.id
    const meetingId = notification.resourceData?.callId

    if (!transcriptId) continue

    // Fetch transcript from Graph API
    const token = await getGraphToken()
    const transcriptRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const transcriptText = await transcriptRes.text()

    // Match to a deal — for POC use the meeting subject or first deal found
    const supabase = createClient()
    const { data: deals } = await supabase.from('deals')
      .select('id').eq('stage', 'proposal').limit(1)

    if (deals?.[0]) {
      await supabase.from('meeting_notes').insert({
        deal_id: deals[0].id,
        transcript_text: transcriptText,
        source: 'teams',
        meeting_date: new Date().toISOString(),
        processed: false
      })
    }
  }

  return NextResponse.json({ status: 'ok' })
}

async function getGraphToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    }
  )
  const data = await res.json()
  return data.access_token
}
```

### Register Graph Webhook (run once)

```typescript
// Run this once to register your webhook with Microsoft Graph
// POST https://graph.microsoft.com/v1.0/subscriptions

const subscription = {
  changeType: 'created',
  notificationUrl: 'https://YOUR_APP.vercel.app/api/teams-webhook',
  resource: '/communications/callTranscripts',
  expirationDateTime: new Date(Date.now() + 3600 * 24 * 2 * 1000).toISOString(),
  clientState: process.env.GRAPH_WEBHOOK_SECRET
}
```

Webhook expires every 2 days — add a cron job to renew it:
```typescript
// /app/api/renew-webhook/route.ts — call this daily via Vercel cron
// vercel.json: { "crons": [{ "path": "/api/renew-webhook", "schedule": "0 0 * * *" }] }
```

### Azure App Registration (one-time setup)

1. Go to portal.azure.com → Azure Active Directory → App Registrations → New
2. Name: SalesIQ
3. Add API permissions: `CallTranscripts.Read.All`, `OnlineMeetings.Read.All`
4. Grant admin consent
5. Create a client secret
6. Copy: Tenant ID, Client ID, Client Secret → add to .env

---

## Simulate Meeting Button (for demo)

For the demo, add a button on the deal page so the full pipeline can be triggered without a real Teams meeting.

```typescript
// /api/simulate-meeting/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const TRANSCRIPT = `Rep: Thanks for joining today. Following up on where things stand.
Client: We reviewed the proposal internally. Pricing works. Main question is implementation timeline — need Q1.
Rep: For your setup it is 6 to 8 weeks. We can have you live well before Q1 if we sign by end of month.
Client: That is what we needed to hear. Ready to move forward.
Rep: I will send a revised proposal with the implementation schedule today. Sign by end of week and we kick off Monday.
Client: Perfect. Send it over.`

export async function POST(req: NextRequest) {
  const { dealId } = await req.json()
  const supabase = createClient()
  await supabase.from('meeting_notes').insert({
    deal_id: dealId,
    transcript_text: TRANSCRIPT,
    source: 'simulated',
    meeting_date: new Date().toISOString(),
    processed: false
  })
  return NextResponse.json({ status: 'ok' })
}
```

Button on deal page — styled as a demo action, not a production feature:
```
border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-3
Text: "🎯 Simulate Teams Meeting — triggers full AI pipeline"
Button: "Run →"
```

---

## Supabase Edge Function

`supabase/functions/on-meeting-insert/index.ts`

Triggers on every INSERT to `meeting_notes` where `processed = false`.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { record } = await req.json()
  if (!record || record.processed) return new Response('skip', { status: 200 })

  await fetch(`${Deno.env.get('AI_SERVICE_URL')}/process-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meeting_note_id: record.id,
      deal_id: record.deal_id,
      transcript_text: record.transcript_text,
      meeting_date: record.meeting_date
    })
  })

  return new Response('ok', { status: 200 })
})
```

Set trigger: Supabase Dashboard → Database → Webhooks → Create
- Table: `meeting_notes` · Event: `INSERT`
- URL: `https://[project].supabase.co/functions/v1/on-meeting-insert`

---

## FastAPI AI Service

### main.py
```python
from fastapi import FastAPI
from pydantic import BaseModel
from brief_chain import generate_brief
from commitment_extractor import extract_commitments

app = FastAPI()

class TranscriptReq(BaseModel):
    meeting_note_id: str
    deal_id: str
    transcript_text: str
    meeting_date: str

class BriefReq(BaseModel):
    deal_id: str

@app.post('/process-transcript')
async def process(req: TranscriptReq):
    await extract_commitments(req.meeting_note_id, req.deal_id, req.transcript_text)
    await generate_brief(req.deal_id)
    return {'status': 'ok'}

@app.post('/generate-brief')
async def brief(req: BriefReq):
    await generate_brief(req.deal_id)
    return {'status': 'ok'}

@app.get('/health')
def health():
    return {'status': 'ok'}
```

### brief_chain.py
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from db import get_deal_context, store_embeddings, search_embeddings, upsert_brief

embeddings = GoogleGenerativeAIEmbeddings(model='models/text-embedding-004')
llm = ChatGoogleGenerativeAI(model='gemini-1.5-flash', max_output_tokens=1000)

async def generate_brief(deal_id: str):
    ctx = await get_deal_context(deal_id)
    query_vec = await embeddings.aembed_query('key discussion points pain points commitments')
    chunks = await search_embeddings(deal_id, query_vec)
    context = '\n\n'.join(chunks) if chunks else 'No transcript history yet.'

    prompt = ChatPromptTemplate.from_template("""
You are an AI sales assistant. Generate a pre-meeting brief.

DEAL: {company} | Stage: {stage} | Value: ${value}
CONTACTS: {contacts}
OPEN COMMITMENTS: {commitments}
PAST MEETING CONTEXT: {context}

Return ONLY valid JSON — no markdown, no extra text:
{{
  "summary": "3-4 sentence narrative of deal history and current status",
  "suggestions": ["specific thing to do in next meeting", "another", "another"],
  "context_tags": [{{"label": "Budget approved", "category": "budget"}}],
  "risk_flags": ["specific risk to watch out for"]
}}

Categories: budget / timeline / technical / stakeholder
Be specific. Use real names and numbers. Every suggestion must be actionable.
""")

    chain = prompt | llm | JsonOutputParser()
    result = await chain.ainvoke({
        'company': ctx['company'], 'stage': ctx['stage'],
        'value': ctx['value'], 'contacts': ctx['contacts'],
        'commitments': ctx['commitments'], 'context': context
    })
    await upsert_brief(deal_id, result)
```

### commitment_extractor.py
```python
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from db import save_commitments

llm = ChatGoogleGenerativeAI(model='gemini-1.5-flash', max_output_tokens=500)

async def extract_commitments(note_id: str, deal_id: str, transcript: str):
    prompt = ChatPromptTemplate.from_template("""
Extract all commitments from this sales meeting transcript.

TRANSCRIPT: {transcript}

Return ONLY valid JSON:
{{
  "commitments": [
    {{
      "agreed_text": "what was agreed",
      "next_steps": "what needs to happen next",
      "owner": "rep or client or presales or manager",
      "deadline": "YYYY-MM-DD or null"
    }}
  ]
}}
""")
    chain = prompt | llm | JsonOutputParser()
    result = await chain.ainvoke({'transcript': transcript})
    await save_commitments(note_id, deal_id, result.get('commitments', []))
```

### requirements.txt
```
fastapi==0.111.0
uvicorn==0.29.0
langchain==0.2.0
langchain-google-genai==1.0.6
supabase==2.4.0
asyncpg==0.29.0
python-dotenv==1.0.0
pydantic==2.7.0
```

---

## Realtime Hook

```typescript
// lib/hooks/useBrief.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useBrief(dealId: string) {
  const [brief, setBrief] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('briefs').select('*').eq('deal_id', dealId).single()
      .then(({ data }) => { setBrief(data); setLoading(false) })

    const ch = supabase.channel(`brief:${dealId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'briefs',
        filter: `deal_id=eq.${dealId}`
      }, (payload) => { setBrief(payload.new); setLoading(false) })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [dealId])

  return { brief, loading }
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_SERVICE_URL=                   # Railway FastAPI URL

# Teams integration
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
GRAPH_WEBHOOK_SECRET=             # any random string

# ai-service/.env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_AI_API_KEY=        # get free at aistudio.google.com
```

---

## Free Tier Limits — Know These

| Service | Free limit | What happens when exceeded |
|---|---|---|
| Google AI (Gemini 1.5 Flash) | 15 req/min, 1M tokens/day | 429 error — add retry with backoff |
| Google AI (text-embedding-004) | 1500 req/day | 429 error — embeddings queue |
| Supabase | 500MB DB, 2GB bandwidth/mo | Upgrade or trim old embeddings |
| Railway | 500 hours/mo free | Enough for POC — sleep after inactivity |
| Vercel | Unlimited hobby deploys | No limit for POC |

**For the POC these limits are more than enough.** 1M tokens/day on Gemini Flash = ~500 full brief generations per day.

**Add this retry wrapper in brief_chain.py and commitment_extractor.py:**
```python
import time

def gemini_with_retry(chain, inputs, retries=3):
    for attempt in range(retries):
        try:
            return chain.invoke(inputs)
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                time.sleep(2 ** attempt)  # 1s, 2s, 4s backoff
                continue
            raise
```

---

## UI Rules

- Top nav: `bg-gray-900 text-white h-14` — logo left, avatar+logout right
- Page bg: `bg-gray-50`
- Deal list cards: `bg-white rounded-lg border border-gray-200 shadow-sm p-4`
- Deal page: two columns — `flex-1` left, `w-96 bg-white border-l border-gray-200` right sidebar
- Sidebar cards: `bg-white rounded-lg border border-gray-100 p-4 mb-3`
- Stage badges: gray/blue/purple/amber/orange/green/red matching the stage
- Overdue: `text-red-600 bg-red-50`
- Open: `text-amber-600 bg-amber-50`
- Done: `text-green-600 bg-green-50`
- Brief card accent: `border-l-4 border-blue-500`
- All async sections: show shadcn `<Skeleton>` while loading — never blank space

---

## Build Order

```
1.  Run SQL migrations 001 and 002 in Supabase SQL editor
2.  Create users in Supabase Auth (rep + manager with role in metadata)
3.  Replace UUIDs in seed, run 003_seed.sql
4.  Scaffold Next.js 14 + Tailwind + shadcn/ui
5.  lib/supabase/client.ts and server.ts
6.  Login page — Supabase Auth, role-based redirect
7.  /deals page — list of deals from DB as cards
8.  /deals/[id] — two-column layout (left info, right sidebar shell)
9.  Left panel: deal header, contacts, meeting history timeline
10. AISidebar shell — reads role, shows correct sections
11. BriefCard — reads pre-seeded brief, renders all four sections
12. BriefSkeleton — loading state
13. useBrief Realtime hook — brief updates live
14. CommitmentTracker — reads commitments, shows status colours
15. CommitmentForm dialog — add commitment, saves to DB
16. DealSummary — manager-only card (stage, value, contacts, health)
17. SimulateMeetingBtn — calls /api/simulate-meeting, shows loading
18. FastAPI ai-service locally — test /health
19. brief_chain.py — test /generate-brief against real Supabase
20. commitment_extractor.py — test /process-transcript
21. Deploy ai-service to Railway
22. Supabase Edge Function + webhook trigger
23. End-to-end test: Simulate → transcript inserted → brief updates live
24. /api/teams-webhook route — receives Graph notifications
25. Azure App Registration — get credentials
26. Register Graph subscription for callTranscripts
27. Test with real Teams meeting (or validate webhook manually)
28. Polish: loading states, error states, empty states, toasts
29. Full demo run — fix anything that breaks
```

---

## Demo Script (8 min)

```
1. Login as rep
   → /deals loads — three deal cards (Acme, TechFlow, Nexus)

2. Click Acme Corp deal
   → deal page opens
   → RIGHT SIDEBAR shows: Brief card + Commitments
   → Read brief summary aloud — "This is what the rep sees before every meeting"
   → Show commitment with next steps highlighted

3. Add a commitment
   → Click "+ Add Commitment"
   → Fill in agreed_text + next_steps + handoff_notes → Save
   → Appears in sidebar immediately

4. Click "Simulate Teams Meeting"
   → Shows loading state
   → 20-30 seconds: brief card updates LIVE in sidebar
   → New commitment appears from AI extraction
   → "This is the full pipeline — transcript to brief, automatically"

5. Log out → Login as manager
   → Click same Acme Corp deal
   → Sidebar shows THREE cards: Brief + Commitments + Deal Summary
   → Point out Deal Summary: stage, value, contacts, health indicators
```

---

## Done When

- [ ] /deals shows dummy data as cards
- [ ] Clicking a deal opens two-column page with sidebar
- [ ] Rep sees Brief + Commitments in sidebar
- [ ] Manager sees Brief + Commitments + Deal Summary in sidebar
- [ ] Rep can add a commitment, it appears immediately
- [ ] Simulate Meeting button triggers AI pipeline, brief updates live
- [ ] Teams webhook receives real transcript and processes it
- [ ] No errors visible during demo
