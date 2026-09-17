import { BriefCard } from "@/components/BriefCard"
import { CommitmentTracker } from "@/components/CommitmentTracker"

export function AISidebar({
  dealId,
  role,
  companyName,
  nextMeeting,
  championName,
}: {
  dealId: string
  role: string
  companyName: string
  nextMeeting: string | null
  championName: string | null
}) {
  const isManager = role === "manager"

  return (
    <aside className="w-96 shrink-0 border-l border-gray-200 bg-white p-4">
      <BriefCard
        dealId={dealId}
        contactName={championName}
        companyName={companyName}
        nextMeeting={nextMeeting}
      />

      <CommitmentTracker dealId={dealId} readOnly={isManager} />

      {isManager && (
        <div className="mb-3 rounded-lg border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">📊 Deal Summary</h2>
          <p className="mt-2 text-sm text-gray-400">Coming soon</p>
        </div>
      )}
    </aside>
  )
}
