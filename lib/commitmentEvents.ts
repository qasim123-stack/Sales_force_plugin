export const DEPARTMENT_OPTIONS = [
  { value: "finance", label: "Finance" },
  { value: "engineering", label: "Engineering" },
  { value: "legal", label: "Legal" },
] as const

const DEPARTMENT_PREFIXES: Record<string, string> = {
  finance: "FIN",
  engineering: "ENG",
  legal: "LEGAL",
}

export function departmentLabel(department: string): string {
  const known = DEPARTMENT_OPTIONS.find((d) => d.value === department)
  if (known) return known.label
  return department.charAt(0).toUpperCase() + department.slice(1)
}

export function generateMockTicketRef(department: string): string {
  const normalized = department.toLowerCase().trim()
  const prefix =
    DEPARTMENT_PREFIXES[normalized] ??
    (normalized.replace(/[^a-z]/g, "").slice(0, 4).toUpperCase() || "DEPT")
  const number = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${number}`
}
