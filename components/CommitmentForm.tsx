"use client"

import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import type { CommitmentOwner } from "@/lib/supabase/types"

export function CommitmentForm({ dealId, onSaved }: { dealId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [agreedText, setAgreedText] = useState("")
  const [nextSteps, setNextSteps] = useState("")
  const [handoffNotes, setHandoffNotes] = useState("")
  const [owner, setOwner] = useState<CommitmentOwner>("rep")
  const [deadline, setDeadline] = useState("")
  const [saving, setSaving] = useState(false)

  function reset() {
    setAgreedText("")
    setNextSteps("")
    setHandoffNotes("")
    setOwner("rep")
    setDeadline("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()

    await supabase.from("commitments").insert({
      deal_id: dealId,
      agreed_text: agreedText,
      next_steps: nextSteps || null,
      handoff_notes: handoffNotes || null,
      owner,
      deadline: deadline || null,
      created_by: userData.user?.id ?? null,
    })

    setSaving(false)
    reset()
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          + Add Commitment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Commitment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agreed-text">What was agreed</Label>
            <Textarea
              id="agreed-text"
              required
              value={agreedText}
              onChange={(e) => setAgreedText(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-steps">Next steps for whoever picks this up</Label>
            <Textarea
              id="next-steps"
              required
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              This is what the next person in the pipeline sees first
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="handoff-notes">Handoff notes</Label>
            <Textarea
              id="handoff-notes"
              value={handoffNotes}
              onChange={(e) => setHandoffNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Select value={owner} onValueChange={(value) => setOwner(value as CommitmentOwner)}>
              <SelectTrigger id="owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rep">Rep</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="presales">PreSales</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
