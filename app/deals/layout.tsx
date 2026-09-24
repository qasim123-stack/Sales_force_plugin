import { createClient } from "@/lib/supabase/server"
import { TopNav } from "@/components/TopNav"

export default async function DealsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const name = (user?.user_metadata?.name as string) ?? user?.email ?? "User"
  const role = (user?.user_metadata?.role as string) ?? "rep"

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#173d27_0%,_#0a1f13_55%,_#050f09_100%)]">
      <TopNav name={name} role={role} />
      <div className="px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/5">
          <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
