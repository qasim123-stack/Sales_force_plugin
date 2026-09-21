"use client"

import { useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"

export interface Brief {
  id: string
  deal_id: string
  summary: string
  suggestions: string[]
  context_tags: { label: string; category: string }[]
  risk_flags: string[]
  generated_at: string
}

export function useBrief(dealId: string) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase
      .from("briefs")
      .select("*")
      .eq("deal_id", dealId)
      .single()
      .then(({ data }) => {
        if (!active) return
        setBrief((data as unknown as Brief) ?? null)
        setLoading(false)
      })

    const channel = supabase
      .channel(`brief:${dealId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "briefs", filter: `deal_id=eq.${dealId}` },
        (payload) => {
          if (!active) return
          setBrief(payload.new as Brief)
          setLoading(false)
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [dealId])

  return { brief, loading }
}
