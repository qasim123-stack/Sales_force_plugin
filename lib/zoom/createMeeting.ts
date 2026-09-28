import { getZoomAccessToken } from "@/lib/zoom/auth"

export interface ZoomMeeting {
  id: number
  join_url: string
  topic: string
}

export async function createZoomMeeting(topic: string, startTimeIso: string): Promise<ZoomMeeting> {
  const hostUserId = process.env.ZOOM_HOST_USER_ID
  if (!hostUserId) {
    throw new Error("ZOOM_HOST_USER_ID is not configured")
  }

  const token = await getZoomAccessToken()

  const res = await fetch(
    `https://api.zoom.us/v2/users/${encodeURIComponent(hostUserId)}/meetings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startTimeIso,
        timezone: "UTC",
        settings: {
          auto_recording: "cloud",
        },
      }),
    }
  )

  if (!res.ok) {
    throw new Error(`Zoom create meeting failed: ${res.status} ${await res.text()}`)
  }

  return res.json()
}
