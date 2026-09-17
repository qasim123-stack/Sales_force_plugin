import { Badge } from "@/components/ui/badge"
import { STAGE_LABELS } from "@/lib/stage"
import type { Stage } from "@/lib/supabase/types"

const STAGE_PROBABILITY: Record<Stage, number> = {
  lead: 10,
  discovery: 25,
  scoping: 40,
  proposal: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
}

export interface DealSummaryContact {
  id: string
  name: string
  role: string | null
  is_champion: boolean
  is_economic_buyer: boolean
}

function formatCurrency(value: number | null) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function DealSummary({
  stage,
  daysInStage,
  value,
  repName,
  contacts,
  nextMeeting,
}: {
  stage: Stage
  daysInStage: number
  value: number | null
  repName: string
  contacts: DealSummaryContact[]
  nextMeeting: string | null
}) {
  const probability = STAGE_PROBABILITY[stage]
  const economicBuyer = contacts.find((c) => c.is_economic_buyer)

  const daysUntilMeeting = nextMeeting
    ? Math.ceil((new Date(nextMeeting).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="mb-3 rounded-lg border border-gray-100 p-4">
      <h2 className="mb-3 font-semibold text-gray-900">📊 Deal Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Stage</span>
          <span className="font-medium text-gray-900">
            {STAGE_LABELS[stage]} ({daysInStage} days)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Value</span>
          <span className="font-medium text-gray-900">{formatCurrency(value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Rep</span>
          <span className="font-medium text-gray-900">{repName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Probability</span>
          <span className="font-medium text-gray-900">{probability}%</span>
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          People Involved
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-400">No contacts on file.</p>
        ) : (
          <ul className="space-y-1">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between text-sm">
                <span>
                  {contact.is_champion && <span className="mr-1">★</span>}
                  {contact.name}
                  {contact.role ? <span className="text-gray-500"> {contact.role}</span> : null}
                </span>
                {contact.is_champion && (
                  <Badge variant="outline" className="text-xs">
                    Champion
                  </Badge>
                )}
                {contact.is_economic_buyer && (
                  <Badge variant="outline" className="text-xs">
                    Economic Buyer
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Pipeline Health
        </div>
        <ul className="space-y-1 text-sm">
          <li>
            {daysUntilMeeting != null && daysUntilMeeting <= 3 ? (
              <span className="text-red-600">
                🔴 Next meeting in {Math.max(daysUntilMeeting, 0)} day
                {daysUntilMeeting === 1 ? "" : "s"}
              </span>
            ) : daysUntilMeeting != null ? (
              <span className="text-green-600">🟢 Meeting scheduled</span>
            ) : (
              <span className="text-amber-600">🟡 No meeting scheduled</span>
            )}
          </li>
          <li>
            <span className={daysInStage > 14 ? "text-amber-600" : "text-green-600"}>
              {daysInStage > 14 ? "🟡" : "🟢"} {daysInStage} days in current stage
            </span>
          </li>
          <li>
            {economicBuyer ? (
              <span className="text-green-600">🟢 Economic buyer engaged</span>
            ) : (
              <span className="text-amber-600">🟡 No economic buyer identified</span>
            )}
          </li>
        </ul>
      </div>
    </div>
  )
}
