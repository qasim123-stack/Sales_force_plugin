"use client"

import { useCommitments } from "@/lib/hooks/useCommitments"
import { CommitmentForm } from "@/components/CommitmentForm"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
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

  async function updateStatus(id: string, status: CommitmentStatus) {
    const supabase = createClient()
    await supabase.from("commitments").update({ status }).eq("id", id)
    refetch()
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
          commitments.map((commitment) => (
            <div
              key={commitment.id}
              className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`rounded px-2 py-0.5 font-medium ${STATUS_STYLES[commitment.status]}`}
                >
                  {STATUS_LABELS[commitment.status]}
                </span>
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
              {!readOnly && commitment.status !== "done" && (
                <div className="mt-2 flex gap-2">
                  {commitment.status !== "in_progress" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(commitment.id, "in_progress")}
                    >
                      In Progress
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => updateStatus(commitment.id, "done")}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          ))}
      </div>

      {!readOnly && (
        <div className="mt-4">
          <CommitmentForm dealId={dealId} onSaved={refetch} />
        </div>
      )}
    </div>
  )
}
