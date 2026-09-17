import type { Stage } from "@/lib/supabase/types"

export const STAGE_STYLES: Record<Stage, string> = {
  lead: "bg-gray-100 text-gray-700",
  discovery: "bg-blue-100 text-blue-700",
  scoping: "bg-purple-100 text-purple-700",
  proposal: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
}

export const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  discovery: "Discovery",
  scoping: "Scoping",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
}
