import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check if the learning tables exist
    const { data: timeCorrections, error: timeError } = await supabase
      .from("time_estimation_corrections")
      .select("id")
      .limit(1)

    const { data: fixedSchedules, error: fixedError } = await supabase
      .from("fixed_schedule_tasks")
      .select("id")
      .limit(1)

    const tablesExist = {
      time_estimation_corrections: !timeError,
      fixed_schedule_tasks: !fixedError,
      allTablesReady: !timeError && !fixedError,
    }

    return NextResponse.json({
      success: true,
      tables: tablesExist,
      message: tablesExist.allTablesReady
        ? "All learning tables are ready"
        : "Some learning tables are missing. Please run the database migration script.",
    })
  } catch (error) {
    console.error("Error checking tables:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check database tables",
        tables: {
          time_estimation_corrections: false,
          fixed_schedule_tasks: false,
          allTablesReady: false,
        },
      },
      { status: 500 },
    )
  }
}
