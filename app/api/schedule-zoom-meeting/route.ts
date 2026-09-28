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
    const { dealId } = await req.json()
    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 })
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
    const meeting = await createZoomMeeting(topic)

    const { error: insertError } = await admin.from("scheduled_meetings").insert({
      deal_id: dealId,
      zoom_meeting_id: String(meeting.id),
      join_url: meeting.join_url,
      topic,
      created_by: user.id,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ joinUrl: meeting.join_url, topic })
  } catch (err) {
    console.error("schedule-zoom-meeting failed", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
