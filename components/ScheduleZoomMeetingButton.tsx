"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ScheduleZoomMeetingButton({ dealId }: { dealId: string }) {
  const [scheduledAt, setScheduledAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (!scheduledAt) {
      setError("Pick a date and time first")
      return
    }

    setLoading(true)
    setError(null)
    setJoinUrl(null)

    try {
      const res = await fetch("/api/schedule-zoom-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, scheduledAt: new Date(scheduledAt).toISOString() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to schedule meeting")
        return
      }

      setJoinUrl(data.joinUrl)
    } catch {
      setError("Failed to schedule meeting")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-3">
      <p className="text-sm text-blue-900">
        📹 Schedule a Zoom meeting for this deal — transcript syncs automatically when it ends
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="max-w-[220px] bg-white text-sm"
        />
        <Button size="sm" onClick={handleClick} disabled={loading}>
          {loading ? "Scheduling..." : "Schedule →"}
        </Button>
      </div>
      {joinUrl && (
        <div className="mt-2 text-sm text-blue-900">
          Join link:{" "}
          <a href={joinUrl} target="_blank" rel="noreferrer" className="underline">
            {joinUrl}
          </a>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
