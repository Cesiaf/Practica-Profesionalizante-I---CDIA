import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NotesManager } from "@/components/notes-manager"
import { ProtectedLayout } from "@/components/protected-layout"

export default async function NotesPage() {
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
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        <NotesManager user={user} />
      </div>
    </ProtectedLayout>
  )
}
