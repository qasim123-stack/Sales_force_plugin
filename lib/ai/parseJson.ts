export function extractJson<T>(text: string): T {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fencedMatch ? fencedMatch[1] : text

  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object found in model output: ${text}`)
  }

  const jsonSlice = candidate.slice(start, end + 1)
  return JSON.parse(jsonSlice) as T
}

export function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string" ? part : typeof part?.text === "string" ? part.text : ""
      )
      .join("\n")
  }
  return ""
}
