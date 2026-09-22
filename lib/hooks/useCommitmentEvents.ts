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

export interface CommitmentAttachment {
  id: string
  commitment_event_id: string | null
  file_name: string
  storage_path: string
  file_type: string | null
  file_size: number | null
}

export function useCommitmentEvents(commitmentId: string, enabled: boolean) {
  const [events, setEvents] = useState<CommitmentEvent[]>([])
  const [attachmentsByEvent, setAttachmentsByEvent] = useState<
    Record<string, CommitmentAttachment[]>
  >({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let active = true
    setLoading(true)

    const supabase = createClient()

    Promise.all([
      supabase
        .from("commitment_events")
        .select("*")
        .eq("commitment_id", commitmentId)
        .order("created_at", { ascending: true }),
      supabase
        .from("commitment_attachments")
        .select("id, commitment_event_id, file_name, storage_path, file_type, file_size")
        .eq("commitment_id", commitmentId),
    ]).then(([eventsRes, attachmentsRes]) => {
      if (!active) return

      setEvents((eventsRes.data as unknown as CommitmentEvent[]) ?? [])

      const grouped: Record<string, CommitmentAttachment[]> = {}
      for (const attachment of (attachmentsRes.data as unknown as CommitmentAttachment[]) ?? []) {
        if (!attachment.commitment_event_id) continue
        if (!grouped[attachment.commitment_event_id]) grouped[attachment.commitment_event_id] = []
        grouped[attachment.commitment_event_id].push(attachment)
      }
      setAttachmentsByEvent(grouped)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [commitmentId, enabled])

  return { events, attachmentsByEvent, loading }
}
