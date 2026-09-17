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
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Deals</h1>

      {error && (
        <p className="text-sm text-red-600">Failed to load deals: {error.message}</p>
      )}

      {!error && deals?.length === 0 && (
        <p className="text-sm text-gray-500">No deals yet.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </main>
  )
}
