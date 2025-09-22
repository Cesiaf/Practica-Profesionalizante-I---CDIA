import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import TimeBlockScheduler from "@/components/time-block-scheduler"

export default async function SchedulesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <TimeBlockScheduler />
    </div>
  )
}
