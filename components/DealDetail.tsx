import { Badge } from "@/components/ui/badge"
import { ScheduleZoomMeetingButton } from "@/components/ScheduleZoomMeetingButton"
import { STAGE_STYLES, STAGE_LABELS } from "@/lib/stage"
import type { Stage, MeetingSource } from "@/lib/supabase/types"

export interface DealDetailDeal {
  id: string
  title: string
  stage: Stage
  value: number | null
  next_meeting: string | null
  days_in_stage: number
  companies: { id: string; name: string; industry: string | null } | null
}

export interface DealDetailContact {
  id: string
  name: string
  role: string | null
  email: string | null
  is_champion: boolean
  is_economic_buyer: boolean
}

export interface DealDetailMeetingNote {
  id: string
  transcript_text: string
  source: MeetingSource
  meeting_date: string
}

const SOURCE_LABELS: Record<MeetingSource, string> = {
  teams: "Teams",
  zoom: "Zoom",
  simulated: "Simulated",
  manual: "Manual",
  seed: "Past meeting",
}

function formatCurrency(value: number | null) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString))
}

export function DealDetail({
  deal,
  contacts,
  meetingNotes,
}: {
  deal: DealDetailDeal
  contacts: DealDetailContact[]
  meetingNotes: DealDetailMeetingNote[]
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{deal.title}</h1>
            <p className="text-sm text-gray-500">
              {deal.companies?.name ?? "Unknown company"}
              {deal.companies?.industry ? ` · ${deal.companies.industry}` : ""}
            </p>
          </div>
          <Badge className={STAGE_STYLES[deal.stage]}>{STAGE_LABELS[deal.stage]}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Value</div>
            <div className="font-medium text-gray-900">{formatCurrency(deal.value)}</div>
          </div>
          <div>
            <div className="text-gray-500">Days in stage</div>
            <div className="font-medium text-gray-900">{deal.days_in_stage}</div>
          </div>
          <div>
            <div className="text-gray-500">Next meeting</div>
            <div className="font-medium text-gray-900">
              {deal.next_meeting ? formatDate(deal.next_meeting) : "Not scheduled"}
            </div>
          </div>
        </div>

        <ScheduleZoomMeetingButton dealId={deal.id} />
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Contacts
        </h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-500">No contacts on file.</p>
        ) : (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-900">
                    {contact.is_champion && <span className="mr-1">★</span>}
                    {contact.name}
                  </div>
                  <div className="text-gray-500">
                    {contact.role}
                    {contact.email ? ` · ${contact.email}` : ""}
                  </div>
                </div>
                <div className="flex gap-1">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Meeting History
        </h2>
        {meetingNotes.length === 0 ? (
          <p className="text-sm text-gray-500">No meetings yet.</p>
        ) : (
          <ul className="space-y-4">
            {meetingNotes.map((note) => (
              <li key={note.id} className="border-l-2 border-gray-200 pl-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(note.meeting_date)}</span>
                  <span>·</span>
                  <span>{SOURCE_LABELS[note.source]}</span>
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-gray-700">
                  {note.transcript_text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
