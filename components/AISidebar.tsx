import { BriefCard } from "@/components/BriefCard"
import { CommitmentTracker } from "@/components/CommitmentTracker"
import { DealSummary, type DealSummaryContact } from "@/components/DealSummary"
import type { Stage } from "@/lib/supabase/types"

export function AISidebar({
  dealId,
  role,
  companyName,
  nextMeeting,
  championName,
  stage,
  daysInStage,
  value,
  repName,
  contacts,
}: {
  dealId: string
  role: string
  companyName: string
  nextMeeting: string | null
  championName: string | null
  stage: Stage
  daysInStage: number
  value: number | null
  repName: string
  contacts: DealSummaryContact[]
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
        <DealSummary
          stage={stage}
          daysInStage={daysInStage}
          value={value}
          repName={repName}
          contacts={contacts}
          nextMeeting={nextMeeting}
        />
      )}
    </aside>
  )
}
