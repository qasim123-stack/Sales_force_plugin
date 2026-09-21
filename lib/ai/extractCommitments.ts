import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { JsonOutputParser } from "@langchain/core/output_parsers"

import { createAdminClient } from "@/lib/supabase/admin"
import { withRetry } from "@/lib/ai/retry"
import type { CommitmentOwner } from "@/lib/supabase/types"

interface ExtractedCommitment {
  agreed_text: string
  next_steps: string
  owner: CommitmentOwner
  deadline: string | null
}

const prompt = ChatPromptTemplate.fromTemplate(`
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

If there are no clear commitments in the transcript, return {{ "commitments": [] }}.
`)

export async function extractCommitments(dealId: string, transcript: string): Promise<void> {
  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_AI_API_KEY,
    model: "gemini-3.6-flash",
    maxOutputTokens: 500,
  })

  const chain = prompt.pipe(llm).pipe(
    new JsonOutputParser<{ commitments: ExtractedCommitment[] }>()
  )

  const result = await withRetry(() => chain.invoke({ transcript }))
  const commitments = result.commitments ?? []

  if (commitments.length === 0) return

  const admin = createAdminClient()
  const { error } = await admin.from("commitments").insert(
    commitments.map((c) => ({
      deal_id: dealId,
      agreed_text: c.agreed_text,
      next_steps: c.next_steps ?? null,
      owner: c.owner,
      deadline: c.deadline ?? null,
      status: "open" as const,
    }))
  )

  if (error) {
    throw new Error(`Failed to insert commitments: ${error.message}`)
  }
}
