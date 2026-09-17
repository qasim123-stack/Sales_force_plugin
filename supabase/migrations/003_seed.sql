-- First create two users in Supabase Auth dashboard:
-- rep@salesiq.demo     password: Demo1234!   metadata: {"role":"rep","name":"James Carter"}
-- manager@salesiq.demo password: Demo1234!   metadata: {"role":"manager","name":"Sarah Mitchell"}
-- Then replace the UUID below with the rep user's UUID

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
