import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DailyPlanGenerator from "@/components/daily-plan-generator"
import DatabaseStatusBanner from "@/components/database-status-banner"

export default async function DailyPlanPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <DatabaseStatusBanner />
      </div>
      <DailyPlanGenerator />
    </div>
  )
}
