import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createZoomMeeting } from "@/lib/zoom/createMeeting"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { dealId, scheduledAt } = await req.json()
    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 })
    }
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      return NextResponse.json({ error: "A valid scheduledAt time is required" }, { status: 400 })
    }
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "scheduledAt must be in the future" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: deal, error: dealError } = await admin
      .from("deals")
      .select("title")
      .eq("id", dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const topic = `${deal.title} — SalesIQ`
    const startTimeIso = new Date(scheduledAt).toISOString()
    const meeting = await createZoomMeeting(topic, startTimeIso)

    const { error: insertError } = await admin.from("scheduled_meetings").insert({
      deal_id: dealId,
      zoom_meeting_id: String(meeting.id),
      join_url: meeting.join_url,
      topic,
      scheduled_at: startTimeIso,
      created_by: user.id,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await admin.from("deals").update({ next_meeting: startTimeIso }).eq("id", dealId)

    return NextResponse.json({ joinUrl: meeting.join_url, topic, scheduledAt: startTimeIso })
  } catch (err) {
    console.error("schedule-zoom-meeting failed", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
