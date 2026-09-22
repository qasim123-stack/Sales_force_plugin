"use client"

import { useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { CommitmentEventActorType, CommitmentEventType } from "@/lib/supabase/types"

export interface CommitmentEvent {
  id: string
  commitment_id: string
  event_type: CommitmentEventType
  from_value: string | null
  to_value: string | null
  actor_type: CommitmentEventActorType
  actor_label: string | null
  note: string | null
  created_at: string
}

export function useCommitmentEvents(commitmentId: string, enabled: boolean) {
  const [events, setEvents] = useState<CommitmentEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let active = true
    setLoading(true)

    const supabase = createClient()
    supabase
      .from("commitment_events")
      .select("*")
      .eq("commitment_id", commitmentId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return
        setEvents((data as unknown as CommitmentEvent[]) ?? [])
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [commitmentId, enabled])

  return { events, loading }
}
