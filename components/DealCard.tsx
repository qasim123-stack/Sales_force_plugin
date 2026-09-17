import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import type { Stage } from "@/lib/supabase/types"

const STAGE_STYLES: Record<Stage, string> = {
  lead: "bg-gray-100 text-gray-700",
  discovery: "bg-blue-100 text-blue-700",
  scoping: "bg-purple-100 text-purple-700",
  proposal: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
}

const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  discovery: "Discovery",
  scoping: "Scoping",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
}

export interface DealCardProps {
  id: string
  title: string
  companyName: string
  stage: Stage
  value: number | null
  daysInStage: number
}

export function DealCard({ id, title, companyName, stage, value, daysInStage }: DealCardProps) {
  return (
    <Link href={`/deals/${id}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{companyName}</p>
          </div>
          <Badge className={STAGE_STYLES[stage]}>{STAGE_LABELS[stage]}</Badge>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">
            {value != null
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
              : "—"}
          </span>
          <span>{daysInStage} days in stage</span>
        </div>
      </div>
    </Link>
  )
}
