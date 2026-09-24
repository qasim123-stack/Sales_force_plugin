"use client"

import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function TopNav({ name, role }: { name: string; role: string }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <nav className="flex h-14 items-center justify-between bg-[#0b2016]/90 px-6 text-white backdrop-blur">
      <span className="text-lg font-semibold tracking-tight">
        Sales<span className="text-emerald-400">IQ</span>
      </span>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-xs font-medium text-emerald-100">
          {initials}
        </div>
        <div className="text-sm">
          <div className="leading-tight">{name}</div>
          <div className="text-xs capitalize leading-tight text-emerald-300/70">{role}</div>
        </div>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </nav>
  )
}
