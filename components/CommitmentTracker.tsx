"use client"

import { useState } from "react"

import { useCommitments } from "@/lib/hooks/useCommitments"
import { CommitmentForm } from "@/components/CommitmentForm"
import { RouteCommitmentDialog } from "@/components/RouteCommitmentDialog"
import { CommitmentTimeline } from "@/components/CommitmentTimeline"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { departmentLabel } from "@/lib/commitmentEvents"
import type { CommitmentStatus } from "@/lib/supabase/types"

const STATUS_STYLES: Record<CommitmentStatus, string> = {
  overdue: "text-red-600 bg-red-50",
  open: "text-amber-600 bg-amber-50",
  in_progress: "text-blue-600 bg-blue-50",
  done: "text-green-600 bg-green-50",
}

const STATUS_LABELS: Record<CommitmentStatus, string> = {
  overdue: "🔴 Overdue",
  open: "🟡 Open",
  in_progress: "In Progress",
  done: "🟢 Done",
}

function formatDate(dateString: string | null) {
  if (!dateString) return "No deadline"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(dateString)
  )
}

export function CommitmentTracker({ dealId, readOnly }: { dealId: string; readOnly: boolean }) {
  const { commitments, loading, refetch } = useCommitments(dealId)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  async function updateStatus(id: string, fromStatus: CommitmentStatus, toStatus: CommitmentStatus) {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const actorLabel =
      (userData.user?.user_metadata?.name as string) ?? userData.user?.email ?? "Unknown user"

    await supabase.from("commitments").update({ status: toStatus }).eq("id", id)
    await supabase.from("commitment_events").insert({
      commitment_id: id,
      event_type: "status_changed",
      from_value: fromStatus,
      to_value: toStatus,
      actor_type: "user",
      actor_label: actorLabel,
    })
    refetch()
  }

  function toggleTimeline(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openCount = commitments.filter((c) => c.status !== "done").length
  const doneCount = commitments.filter((c) => c.status === "done").length

  return (
    <div className="mb-3 rounded-lg border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">✓ Commitments</h2>
        <span className="text-xs text-gray-500">
          {openCount} open · {doneCount} done
        </span>
      </div>

      <div className="mt-3 space-y-4">
        {loading && (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        )}

        {!loading && commitments.length === 0 && (
          <p className="text-sm text-gray-400">No commitments yet.</p>
        )}

        {!loading &&
          commitments.map((commitment) => {
            const isExpanded = expandedIds.has(commitment.id)
            return (
              <div
                key={commitment.id}
                className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={`rounded px-2 py-0.5 font-medium ${STATUS_STYLES[commitment.status]}`}
                    >
                      {STATUS_LABELS[commitment.status]}
                    </span>
                    {commitment.department && (
                      <span className="rounded bg-purple-50 px-2 py-0.5 font-medium text-purple-700">
                        📤 {departmentLabel(commitment.department)}
                        {commitment.external_ticket_ref && ` · #${commitment.external_ticket_ref}`}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400">
                    {commitment.owner ? `${commitment.owner} · ` : ""}
                    Due {formatDate(commitment.deadline)}
                  </span>
                </div>

                <p className="mt-1 text-sm font-medium text-gray-900">{commitment.agreed_text}</p>
                {commitment.next_steps && (
                  <p className="mt-1 text-sm text-gray-600">▸ {commitment.next_steps}</p>
                )}
                {commitment.handoff_notes && (
                  <p className="mt-1 text-sm text-gray-500">📝 {commitment.handoff_notes}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {!readOnly && commitment.status !== "done" && (
                    <>
                      {commitment.status !== "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(commitment.id, commitment.status, "in_progress")}
                        >
                          In Progress
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(commitment.id, commitment.status, "done")}
                      >
                        Done
                      </Button>
                    </>
                  )}
                  {commitment.status !== "done" && (
                    <RouteCommitmentDialog
                      commitmentId={commitment.id}
                      currentStatus={commitment.status}
                      onRouted={refetch}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleTimeline(commitment.id)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? "▾ Hide timeline" : "▸ View timeline"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-2 rounded-md bg-gray-50 px-3 py-2">
                    <CommitmentTimeline commitmentId={commitment.id} />
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {!readOnly && (
        <div className="mt-4">
          <CommitmentForm dealId={dealId} onSaved={refetch} />
        </div>
      )}
    </div>
  )
}
