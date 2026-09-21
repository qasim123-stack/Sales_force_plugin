import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { extractCommitments } from "@/lib/ai/extractCommitments"
import { generateBrief } from "@/lib/ai/generateBrief"

const SAMPLE_TRANSCRIPT = `Rep: Thanks for joining today. Following up on where things stand.
Client: We reviewed the proposal internally. Pricing works. Main question is implementation timeline — need Q1.
Rep: For your setup it is 6 to 8 weeks. We can have you live well before Q1 if we sign by end of month.
Client: That is what we needed to hear. Ready to move forward.
Rep: I will send a revised proposal with the implementation schedule today. Sign by end of week and we kick off Monday.
Client: Perfect. Send it over.`

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.TEST_ENDPOINT_SECRET
  if (!secret) return false

  const provided = req.headers.get("x-test-secret")
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// TEMPORARY: the VERCEL_ENV === "production" guard is removed so this can be
// tested directly against production while Preview env vars get sorted out.
// Restore that check (or delete this whole route) before any real handoff —
// this endpoint can insert fake meeting_notes/commitments/briefs and spend
// Gemini API calls against the live database as long as it's reachable here.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { dealId, transcript } = await req.json()

    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 })
    }

    const transcriptText = transcript || SAMPLE_TRANSCRIPT

    const admin = createAdminClient()
    const { data: insertedNote, error } = await admin
      .from("meeting_notes")
      .insert({
        deal_id: dealId,
        transcript_text: transcriptText,
        source: "simulated",
        meeting_date: new Date().toISOString(),
        processed: false,
      })
      .select("id")
      .single()

    if (error || !insertedNote) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 })
    }

    await extractCommitments(dealId, transcriptText)
    await generateBrief(dealId)
    await admin.from("meeting_notes").update({ processed: true }).eq("id", insertedNote.id)

    return NextResponse.json({ status: "ok", meetingNoteId: insertedNote.id })
  } catch (err) {
    console.error("simulate-meeting failed", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
