export function vttToPlainText(vtt: string): string {
  const lines = vtt.split(/\r?\n/)
  const output: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === "WEBVTT") continue
    if (/^\d+$/.test(trimmed)) continue
    if (trimmed.includes("-->")) continue

    const speakerMatch = trimmed.match(/^<v\s+([^>]+)>(.*)$/)
    output.push(speakerMatch ? `${speakerMatch[1]}: ${speakerMatch[2]}` : trimmed)
  }

  return output.join("\n")
}
