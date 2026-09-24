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
    <Link href={`/deals/${id}`} className="group block h-full">
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl">
        <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-emerald-500 transition-transform duration-200 group-hover:scale-x-100" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-gray-900" title={title}>
              {title}
            </h3>
            <p className="mt-1 truncate text-base text-gray-500" title={companyName}>
              {companyName}
            </p>
          </div>
          <Badge className={`shrink-0 whitespace-nowrap px-3 py-1 text-sm ${STAGE_STYLES[stage]}`}>
            {STAGE_LABELS[stage]}
          </Badge>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-base text-gray-600">
          <span className="text-xl font-semibold text-gray-900">
            {value != null
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
              : "—"}
          </span>
          <span className="shrink-0 text-sm text-gray-500">{daysInStage} days in stage</span>
        </div>
      </div>
    </Link>
  )
}
