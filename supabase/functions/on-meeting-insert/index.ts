import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { record } = await req.json()
  if (!record || record.processed) return new Response('skip', { status: 200 })

  await fetch(`${Deno.env.get('AI_SERVICE_URL')}/process-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meeting_note_id: record.id,
      deal_id: record.deal_id,
      transcript_text: record.transcript_text,
      meeting_date: record.meeting_date
    })
  })

  return new Response('ok', { status: 200 })
})
