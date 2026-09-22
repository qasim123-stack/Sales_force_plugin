"use client"

import { useRef, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { DEPARTMENT_OPTIONS, generateMockTicketRef, departmentLabel } from "@/lib/commitmentEvents"
import { isAcceptedAttachmentType, uploadCommitmentAttachment } from "@/lib/attachments"
import type { CommitmentStatus } from "@/lib/supabase/types"

export function RouteCommitmentDialog({
  commitmentId,
  currentStatus,
  onRouted,
}: {
  commitmentId: string
  currentStatus: CommitmentStatus
  onRouted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [department, setDepartment] = useState<string>("finance")
  const [customDepartment, setCustomDepartment] = useState("")
  const [instructions, setInstructions] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFileError(null)
    if (selected && !isAcceptedAttachmentType(selected)) {
      setFileError("Only PDF and Word files are accepted")
      setFile(null)
      return
    }
    setFile(selected)
  }

  function reset() {
    setCustomDepartment("")
    setInstructions("")
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleRoute() {
    const resolvedDepartment =
      department === "custom" ? customDepartment.trim() : department
    if (!resolvedDepartment) return

    setSaving(true)

    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const actorLabel =
      (userData.user?.user_metadata?.name as string) ?? userData.user?.email ?? "Unknown user"

    const ticketRef = generateMockTicketRef(resolvedDepartment)

    await supabase
      .from("commitments")
      .update({
        department: resolvedDepartment,
        external_ticket_ref: ticketRef,
        routing_instructions: instructions || null,
        status: currentStatus === "open" ? "in_progress" : currentStatus,
      })
      .eq("id", commitmentId)

    const noteLine = instructions
      ? `Ticket ${ticketRef} — ${instructions}`
      : `Ticket ${ticketRef}`

    const { data: eventRow } = await supabase
      .from("commitment_events")
      .insert({
        commitment_id: commitmentId,
        event_type: "routed",
        to_value: resolvedDepartment,
        actor_type: "user",
        actor_label: actorLabel,
        note: noteLine,
      })
      .select("id")
      .single()

    if (file && eventRow) {
      const { error } = await uploadCommitmentAttachment({
        commitmentId,
        commitmentEventId: eventRow.id,
        file,
        uploadedBy: userData.user?.id ?? null,
      })
      if (error) {
        setFileError(error)
      }
    }

    setSaving(false)
    setOpen(false)
    reset()
    onRouted()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Route to...
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Route commitment</DialogTitle>
          <DialogDescription>
            Hand this off to another team. This simulates creating a ticket in your project
            management tool — no real ticket is created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger id="department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Other...</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {department === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-department">Department name</Label>
              <Input
                id="custom-department"
                value={customDepartment}
                onChange={(e) => setCustomDepartment(e.target.value)}
                placeholder="e.g. Security"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions for this team</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What do they need to know or do?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachment">Attach a file (optional)</Label>
            <Input
              id="attachment"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            {file && <p className="text-xs text-gray-500">{file.name}</p>}
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          </div>
          <Button
            className="w-full"
            onClick={handleRoute}
            disabled={saving || (department === "custom" && !customDepartment.trim())}
          >
            {saving
              ? "Routing..."
              : `Route to ${
                  department === "custom"
                    ? customDepartment.trim() || "..."
                    : departmentLabel(department)
                }`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
