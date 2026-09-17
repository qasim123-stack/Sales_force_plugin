import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { STAGE_STYLES, STAGE_LABELS } from "@/lib/stage"
import type { Stage } from "@/lib/supabase/types"

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
    <Link href={`/deals/${id}`} className="block h-full">
      <div className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900" title={title}>
              {title}
            </h3>
            <p className="truncate text-sm text-gray-500" title={companyName}>
              {companyName}
            </p>
          </div>
          <Badge className={`shrink-0 whitespace-nowrap ${STAGE_STYLES[stage]}`}>
            {STAGE_LABELS[stage]}
          </Badge>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">
            {value != null
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
              : "—"}
          </span>
          <span className="shrink-0">{daysInStage} days in stage</span>
        </div>
      </div>
    </Link>
  )
}
