import type React from "react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Navigation } from "@/components/navigation"

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation user={user} />
      <main>{children}</main>
    </div>
  )
}
