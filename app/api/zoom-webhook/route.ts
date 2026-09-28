import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { extractCommitments } from "@/lib/ai/extractCommitments"
import { generateBrief } from "@/lib/ai/generateBrief"
import { vttToPlainText } from "@/lib/zoom/parseVtt"

interface ZoomRecordingFile {
  file_type: string
  download_url: string
}

function verifySignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string
): boolean {
  if (!timestamp || !signature) return false
  const message = `v0:${timestamp}:${rawBody}`
  const expected = "v0=" + crypto.createHmac("sha256", secret).update(message).digest("hex")

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN

  let payload: {
    event?: string
    payload?: { plainToken?: string; object?: Record<string, unknown> }
    download_token?: string
  }
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // One-time URL validation handshake Zoom requires before it will send real events.
  if (payload.event === "endpoint.url_validation") {
    if (!secret) {
      return NextResponse.json({ error: "ZOOM_WEBHOOK_SECRET_TOKEN not set" }, { status: 500 })
    }
    const plainToken = payload.payload?.plainToken ?? ""
    const encryptedToken = crypto.createHmac("sha256", secret).update(plainToken).digest("hex")
    return NextResponse.json({ plainToken, encryptedToken })
  }

  if (secret) {
    const signature = req.headers.get("x-zm-signature")
    const timestamp = req.headers.get("x-zm-request-timestamp")
    if (!verifySignature(rawBody, timestamp, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  if (payload.event !== "recording.completed" && payload.event !== "recording.transcript_completed") {
    return NextResponse.json({ status: "ignored", event: payload.event ?? null })
  }

  const meetingObject = payload.payload?.object as
    | { id?: number | string; recording_files?: ZoomRecordingFile[] }
    | undefined
  const zoomMeetingId = meetingObject?.id != null ? String(meetingObject.id) : null
  const downloadToken = payload.download_token

  if (!zoomMeetingId) {
    return NextResponse.json({ error: "Missing meeting id" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: scheduled } = await admin
    .from("scheduled_meetings")
    .select("deal_id")
    .eq("zoom_meeting_id", zoomMeetingId)
    .single()

  if (!scheduled) {
    console.error("No scheduled_meetings match for Zoom meeting", zoomMeetingId)
    return NextResponse.json({ error: "No matching deal for this meeting" }, { status: 404 })
  }

  const files = meetingObject?.recording_files ?? []
  const transcriptFile = files.find((f) => f.file_type === "TRANSCRIPT")

  if (!transcriptFile) {
    return NextResponse.json({ status: "ignored", reason: "No transcript file yet" })
  }

  const transcriptRes = await fetch(
    downloadToken
      ? `${transcriptFile.download_url}?access_token=${downloadToken}`
      : transcriptFile.download_url
  )

  if (!transcriptRes.ok) {
    return NextResponse.json({ error: "Failed to download transcript" }, { status: 502 })
  }

  const vttText = await transcriptRes.text()
  const transcriptText = vttToPlainText(vttText) || "(empty transcript)"
  const dealId = scheduled.deal_id

  const { data: insertedNote, error } = await admin
    .from("meeting_notes")
    .insert({
      deal_id: dealId,
      transcript_text: transcriptText,
      source: "zoom",
      meeting_date: new Date().toISOString(),
      processed: false,
    })
    .select("id")
    .single()

  if (error || !insertedNote) {
    console.error("Failed to insert meeting_notes", error)
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 })
  }

  try {
    await extractCommitments(dealId, transcriptText)
    await generateBrief(dealId)
    await admin.from("meeting_notes").update({ processed: true }).eq("id", insertedNote.id)
  } catch (aiError) {
    console.error("AI processing failed for meeting_notes", insertedNote.id, aiError)
  }

  return NextResponse.json({ status: "ok" })
}
