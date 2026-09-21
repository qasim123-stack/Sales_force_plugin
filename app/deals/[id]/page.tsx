import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DealDetail, type DealDetailContact, type DealDetailDeal, type DealDetailMeetingNote } from "@/components/DealDetail"
import { AISidebar } from "@/components/AISidebar"

interface DealWithCompanyId extends DealDetailDeal {
  company_id: string | null
  rep_id: string | null
}

export default async function DealPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: userData } = await supabase.auth.getUser()

  const { data: dealRaw, error: dealError } = await supabase
    .from("deals")
    .select(
      "id, title, stage, value, next_meeting, days_in_stage, company_id, rep_id, companies(id, name, industry)"
    )
    .eq("id", params.id)
    .single()

  const deal = dealRaw as unknown as DealWithCompanyId | null

  if (dealError || !deal) {
    notFound()
  }

  const { data: contactsRaw } = deal.company_id
    ? await supabase
        .from("contacts")
        .select("id, name, role, email, is_champion, is_economic_buyer")
        .eq("company_id", deal.company_id)
    : { data: [] }
  const contacts = contactsRaw as unknown as DealDetailContact[]

  const { data: meetingNotesRaw } = await supabase
    .from("meeting_notes")
    .select("id, transcript_text, source, meeting_date")
    .eq("deal_id", deal.id)
    .order("meeting_date", { ascending: false })
  const meetingNotes = meetingNotesRaw as unknown as DealDetailMeetingNote[]

  const role = (userData.user?.user_metadata?.role as string) ?? "rep"
  const champion = (contacts ?? []).find((contact) => contact.is_champion)

  let repName = "Unassigned"
  if (deal.rep_id) {
    const adminClient = createAdminClient()
    const { data: repUser } = await adminClient.auth.admin.getUserById(deal.rep_id)
    repName = (repUser.user?.user_metadata?.name as string) ?? repUser.user?.email ?? "Unassigned"
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <DealDetail deal={deal} contacts={contacts ?? []} meetingNotes={meetingNotes ?? []} />
      <AISidebar
        dealId={deal.id}
        role={role}
        companyName={deal.companies?.name ?? "Unknown company"}
        nextMeeting={deal.next_meeting}
        championName={champion?.name ?? null}
        stage={deal.stage}
        daysInStage={deal.days_in_stage}
        value={deal.value}
        repName={repName}
        contacts={contacts ?? []}
      />
    </div>
  )
}
