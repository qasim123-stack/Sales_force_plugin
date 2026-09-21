import { createAdminClient } from "@/lib/supabase/admin"

export interface DealContext {
  company: string
  stage: string
  value: number
  contacts: string
  commitments: string
  pastMeetings: string
}

export async function getDealContext(dealId: string): Promise<DealContext> {
  const admin = createAdminClient()

  const { data: dealRaw, error: dealError } = await admin
    .from("deals")
    .select("stage, value, company_id, companies(name)")
    .eq("id", dealId)
    .single()

  if (dealError || !dealRaw) {
    throw new Error(`Deal not found: ${dealId}`)
  }

  const deal = dealRaw as unknown as {
    stage: string
    value: number | null
    company_id: string | null
    companies: { name: string } | null
  }

  const { data: contactsRaw } = deal.company_id
    ? await admin
        .from("contacts")
        .select("name, role, is_champion, is_economic_buyer")
        .eq("company_id", deal.company_id)
    : { data: [] }

  const contacts = (contactsRaw ?? []) as unknown as {
    name: string
    role: string | null
    is_champion: boolean
    is_economic_buyer: boolean
  }[]

  const { data: commitmentsRaw } = await admin
    .from("commitments")
    .select("agreed_text, next_steps, status")
    .eq("deal_id", dealId)
    .neq("status", "done")

  const openCommitments = (commitmentsRaw ?? []) as unknown as {
    agreed_text: string
    next_steps: string | null
    status: string
  }[]

  const { data: notesRaw } = await admin
    .from("meeting_notes")
    .select("transcript_text, meeting_date")
    .eq("deal_id", dealId)
    .order("meeting_date", { ascending: false })
    .limit(5)

  const notes = (notesRaw ?? []) as unknown as {
    transcript_text: string
    meeting_date: string
  }[]

  return {
    company: deal.companies?.name ?? "Unknown company",
    stage: deal.stage,
    value: deal.value ?? 0,
    contacts:
      contacts
        .map(
          (c) =>
            `${c.name} (${c.role ?? "unknown role"})${c.is_champion ? " - Champion" : ""}${
              c.is_economic_buyer ? " - Economic Buyer" : ""
            }`
        )
        .join(", ") || "No contacts on file",
    commitments:
      openCommitments.map((c) => `${c.agreed_text} [${c.status}]`).join("; ") || "None",
    pastMeetings:
      [...notes]
        .reverse()
        .map((n) => n.transcript_text)
        .join("\n\n---\n\n") || "No transcript history yet.",
  }
}
