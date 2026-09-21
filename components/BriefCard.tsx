"use client"

import { useRouter } from "next/navigation"

import { useBrief } from "@/lib/hooks/useBrief"
import { BriefSkeleton } from "@/components/BriefSkeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function timeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return "just now"
  if (diffHours === 1) return "1 hour ago"
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.round(diffHours / 24)
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`
}

function hoursUntil(dateString: string) {
  return (new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60)
}

export function BriefCard({
  dealId,
  contactName,
  companyName,
  nextMeeting,
}: {
  dealId: string
  contactName: string | null
  companyName: string
  nextMeeting: string | null
}) {
  const router = useRouter()
  const { brief, loading } = useBrief(dealId)

  if (loading) {
    return <BriefSkeleton />
  }

  const hoursToMeeting = nextMeeting ? hoursUntil(nextMeeting) : null
  const showMeetingReminder =
    hoursToMeeting != null && hoursToMeeting > 0 && hoursToMeeting <= 24

  return (
    <div className="mb-3 rounded-lg border border-gray-100 border-l-4 border-l-blue-500 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">🧠 Pre-meeting Brief</h2>
        <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
          ↻ Refresh
        </Button>
      </div>

      {brief && (
        <p className="mb-3 text-xs text-gray-400">Updated {timeAgo(brief.generated_at)}</p>
      )}

      {!brief && <p className="text-sm text-gray-400">No brief generated yet.</p>}

      {brief && (
        <>
          {showMeetingReminder && (
            <div className="mb-3 rounded-md bg-blue-50 p-2 text-sm text-blue-900">
              📅 Meeting in {Math.round(hoursToMeeting!)} hours
              {contactName && (
                <div className="text-xs text-blue-700">
                  {contactName} · {companyName}
                </div>
              )}
            </div>
          )}

          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Summary
            </div>
            <p className="text-sm text-gray-700">{brief.summary}</p>
          </div>

          {brief.suggestions?.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                For This Meeting
              </div>
              <ul className="space-y-1">
                {brief.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-gray-400">→</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {brief.context_tags?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {brief.context_tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="font-normal">
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}

          {brief.risk_flags?.length > 0 && (
            <div className="space-y-1">
              {brief.risk_flags.map((risk, i) => (
                <div key={i} className="flex gap-2 text-sm text-red-600">
                  <span>⚠</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
