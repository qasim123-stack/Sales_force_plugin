import { useCommitmentEvents } from "@/lib/hooks/useCommitmentEvents"
import { departmentLabel } from "@/lib/commitmentEvents"
import { getAttachmentUrl } from "@/lib/attachments"
import { Skeleton } from "@/components/ui/skeleton"
import type { CommitmentEvent } from "@/lib/hooks/useCommitmentEvents"

function formatRelative(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}

function eventLabel(event: CommitmentEvent): string {
  switch (event.event_type) {
    case "created":
      return "Created"
    case "status_changed":
      return `Status → ${event.to_value?.replace("_", " ")}`
    case "routed":
      return `Routed to ${departmentLabel(event.to_value ?? "")}`
    default:
      return event.event_type
  }
}

const EVENT_DOT_STYLES: Record<CommitmentEvent["event_type"], string> = {
  created: "bg-gray-400",
  status_changed: "bg-blue-500",
  routed: "bg-purple-500",
}

export function CommitmentTimeline({ commitmentId }: { commitmentId: string }) {
  const { events, attachmentsByEvent, loading } = useCommitmentEvents(commitmentId, true)

  if (loading) {
    return (
      <div className="space-y-2 pl-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (events.length === 0) {
    return <p className="pl-1 text-xs text-gray-400">No history yet.</p>
  }

  return (
    <ul className="space-y-3 py-1">
      {events.map((event, i) => {
        const attachments = attachmentsByEvent[event.id] ?? []
        return (
          <li key={event.id} className="relative flex gap-3 pl-1">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${EVENT_DOT_STYLES[event.event_type]}`}
              />
              {i < events.length - 1 && <span className="w-px flex-1 bg-gray-200" />}
            </div>
            <div className="pb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-gray-900">{eventLabel(event)}</span>
                <span className="text-xs text-gray-400">{formatRelative(event.created_at)}</span>
              </div>
              <div className="text-xs text-gray-500">
                by {event.actor_type === "ai" ? "AI" : event.actor_label ?? "Unknown"}
              </div>
              {event.note && <div className="mt-0.5 text-xs text-gray-600">{event.note}</div>}
              {attachments.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={getAttachmentUrl(attachment.storage_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      📎 {attachment.file_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
