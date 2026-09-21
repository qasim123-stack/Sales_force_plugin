import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

const FIREFLIES_GRAPHQL_URL = "https://api.fireflies.ai/graphql"

interface FirefliesWebhookPayload {
  meetingId: string
  eventType: string
  clientReferenceId: string | null
}

interface FirefliesSentence {
  text: string
  speaker_name: string
}

interface FirefliesTranscript {
  title: string
  date: string | number
  sentences: FirefliesSentence[]
}

function isSignatureValid(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex")

  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function isTranscriptionCompletedEvent(eventType: string) {
  const normalized = eventType.toLowerCase()
  return normalized.includes("transcri") && normalized.includes("complet")
}

async function fetchTranscript(meetingId: string): Promise<FirefliesTranscript | null> {
  const apiKey = process.env.FIREFLIES_API_KEY
  if (!apiKey) {
    console.error("FIREFLIES_API_KEY is not set")
    return null
  }

  const res = await fetch(FIREFLIES_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `
        query Transcript($id: String!) {
          transcript(id: $id) {
            title
            date
            sentences {
              text
              speaker_name
            }
          }
        }
      `,
      variables: { id: meetingId },
    }),
  })

  if (!res.ok) {
    console.error("Fireflies GraphQL request failed", res.status, await res.text())
    return null
  }

  const json = await res.json()
  if (json.errors) {
    console.error("Fireflies GraphQL errors", json.errors)
    return null
  }

  return json.data?.transcript ?? null
}

function parseMeetingDate(date: string | number): string {
  const parsed = typeof date === "number" ? new Date(date) : new Date(date)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

async function findDealIdForTitle(title: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data: dealsRaw } = await admin
    .from("deals")
    .select("id, created_at, companies(name)")
    .order("created_at", { ascending: false })

  const deals = dealsRaw as unknown as { id: string; companies: { name: string } | null }[] | null

  if (!deals || deals.length === 0) return null

  const titleLower = title.toLowerCase()
  const matched = deals.find(
    (deal) => deal.companies?.name && titleLower.includes(deal.companies.name.toLowerCase())
  )

  return matched?.id ?? deals[0].id
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET

  if (secret) {
    const signature = req.headers.get("x-hub-signature")
    if (!isSignatureValid(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let payload: FirefliesWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  console.log("Fireflies webhook received:", payload)

  if (!isTranscriptionCompletedEvent(payload.eventType)) {
    return NextResponse.json({ status: "ignored", eventType: payload.eventType })
  }

  const transcript = await fetchTranscript(payload.meetingId)
  if (!transcript) {
    return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 502 })
  }

  const transcriptText = transcript.sentences
    .map((s) => `${s.speaker_name}: ${s.text}`)
    .join("\n")

  const dealId = await findDealIdForTitle(transcript.title)
  if (!dealId) {
    console.error("No deal found to attach transcript to")
    return NextResponse.json({ error: "No deal found" }, { status: 404 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("meeting_notes").insert({
    deal_id: dealId,
    transcript_text: transcriptText || "(empty transcript)",
    source: "teams",
    meeting_date: parseMeetingDate(transcript.date),
    processed: false,
  })

  if (error) {
    console.error("Failed to insert meeting_notes", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: "ok" })
}
