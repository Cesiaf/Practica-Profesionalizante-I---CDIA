import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { AIAssistant } from "@/components/ai-assistant"
import { ProtectedLayout } from "@/components/protected-layout"

export default async function AIPage() {
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

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user's tasks and notes
  const [tasksResult, notesResult] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ])

  const tasks = tasksResult.data || []
  const notes = notesResult.data || []

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Asistente IA</h1>
          <p className="text-slate-600">
            Utiliza inteligencia artificial para resumir tus notas y obtener sugerencias de productividad personalizadas
          </p>
        </div>

        <AIAssistant tasks={tasks} notes={notes} />
      </div>
    </ProtectedLayout>
  )
}
