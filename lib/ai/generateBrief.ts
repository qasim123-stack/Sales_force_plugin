import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { JsonOutputParser } from "@langchain/core/output_parsers"

import { createAdminClient } from "@/lib/supabase/admin"
import { getDealContext } from "@/lib/ai/context"
import { withRetry } from "@/lib/ai/retry"

interface BriefResult {
  summary: string
  suggestions: string[]
  context_tags: { label: string; category: string }[]
  risk_flags: string[]
}

const prompt = ChatPromptTemplate.fromTemplate(`
You are an AI sales assistant. Generate a pre-meeting brief.

DEAL: {company} | Stage: {stage} | Value: {value}
CONTACTS: {contacts}
OPEN COMMITMENTS: {commitments}
PAST MEETING CONTEXT: {pastMeetings}

Return ONLY valid JSON — no markdown, no extra text:
{{
  "summary": "3-4 sentence narrative of deal history and current status",
  "suggestions": ["specific thing to do in next meeting", "another", "another"],
  "context_tags": [{{"label": "Budget approved", "category": "budget"}}],
  "risk_flags": ["specific risk to watch out for"]
}}

Categories: budget / timeline / technical / stakeholder
Be specific. Use real names and numbers. Every suggestion must be actionable.
`)

export async function generateBrief(dealId: string): Promise<void> {
  const context = await getDealContext(dealId)

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_AI_API_KEY,
    model: "gemini-3.6-flash",
    maxOutputTokens: 1000,
  })

  const chain = prompt.pipe(llm).pipe(new JsonOutputParser<BriefResult>())

  const result = await withRetry(() =>
    chain.invoke({
      company: context.company,
      stage: context.stage,
      value: String(context.value),
      contacts: context.contacts,
      commitments: context.commitments,
      pastMeetings: context.pastMeetings,
    })
  )

  const admin = createAdminClient()
  const { error } = await admin.from("briefs").upsert(
    {
      deal_id: dealId,
      summary: result.summary,
      suggestions: result.suggestions ?? [],
      context_tags: result.context_tags ?? [],
      risk_flags: result.risk_flags ?? [],
      generated_at: new Date().toISOString(),
    },
    { onConflict: "deal_id" }
  )

  if (error) {
    throw new Error(`Failed to upsert brief: ${error.message}`)
  }
}
