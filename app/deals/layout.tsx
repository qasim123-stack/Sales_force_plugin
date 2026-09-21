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
    <div className="min-h-screen bg-gray-50">
      <TopNav name={name} role={role} />
      {children}
    </div>
  )
}
