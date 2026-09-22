"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { CommitmentOwner, CommitmentStatus } from "@/lib/supabase/types"

export interface Commitment {
  id: string
  deal_id: string
  agreed_text: string
  next_steps: string | null
  handoff_notes: string | null
  owner: CommitmentOwner | null
  deadline: string | null
  status: CommitmentStatus
  created_by: string | null
  created_at: string
  department: string | null
  external_ticket_ref: string | null
}

export function useCommitments(dealId: string) {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCommitments = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("commitments")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
    setCommitments((data as unknown as Commitment[]) ?? [])
    setLoading(false)
  }, [dealId])

  useEffect(() => {
    let active = true
    fetchCommitments()

    const supabase = createClient()
    const channel = supabase
      .channel(`commitments:${dealId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commitments", filter: `deal_id=eq.${dealId}` },
        () => {
          if (active) fetchCommitments()
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [dealId, fetchCommitments])

  return { commitments, loading, refetch: fetchCommitments }
}
