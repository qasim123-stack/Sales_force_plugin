import { createClient } from "@/lib/supabase/server"
import { DealCard } from "@/components/DealCard"
import type { Stage } from "@/lib/supabase/types"

interface DealRow {
  id: string
  title: string
  stage: Stage
  value: number | null
  days_in_stage: number
  companies: { name: string } | null
}

export default async function DealsPage() {
  const supabase = createClient()

  const { data: deals, error } = await supabase
    .from("deals")
    .select("id, title, stage, value, days_in_stage, companies(name)")
    .order("created_at", { ascending: false })
    .returns<DealRow[]>()

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-6xl">
        <h1 className="mb-8 text-3xl font-semibold text-gray-900">Deals</h1>

        {error && (
          <p className="text-sm text-red-600">Failed to load deals: {error.message}</p>
        )}

        {!error && deals?.length === 0 && (
          <p className="text-base text-gray-500">No deals yet.</p>
        )}

        <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {deals?.map((deal) => (
            <DealCard
              key={deal.id}
              id={deal.id}
              title={deal.title}
              companyName={deal.companies?.name ?? "Unknown company"}
              stage={deal.stage}
              value={deal.value}
              daysInStage={deal.days_in_stage}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
