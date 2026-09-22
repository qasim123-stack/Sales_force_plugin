import { createClient } from "@/lib/supabase/client"

export const ATTACHMENTS_BUCKET = "commitment-attachments"
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10MB
export const ACCEPTED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function isAcceptedAttachmentType(file: File): boolean {
  return ACCEPTED_ATTACHMENT_TYPES.includes(file.type)
}

export async function uploadCommitmentAttachment({
  commitmentId,
  commitmentEventId,
  file,
  uploadedBy,
}: {
  commitmentId: string
  commitmentEventId: string
  file: File
  uploadedBy: string | null
}): Promise<{ error: string | null }> {
  if (!isAcceptedAttachmentType(file)) {
    return { error: "Only PDF and Word files are accepted" }
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: "File is larger than 10MB" }
  }

  const supabase = createClient()
  const storagePath = `${commitmentId}/${commitmentEventId}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, file, { upsert: false })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { error: insertError } = await supabase.from("commitment_attachments").insert({
    commitment_id: commitmentId,
    commitment_event_id: commitmentEventId,
    file_name: file.name,
    storage_path: storagePath,
    file_type: file.type,
    file_size: file.size,
    uploaded_by: uploadedBy,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  return { error: null }
}

export function getAttachmentUrl(storagePath: string): string {
  const supabase = createClient()
  return supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(storagePath).data.publicUrl
}
