import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { taskTitle, taskDescription, aiEstimatedDuration, userCorrectedDuration, correctionReason, taskCategory } =
      await request.json()

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
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Guardar la corrección del usuario
    const { error: insertError } = await supabase.from("time_estimation_corrections").insert([
      {
        user_id: user.id,
        task_title: taskTitle,
        task_description: taskDescription,
        ai_estimated_duration: aiEstimatedDuration,
        user_corrected_duration: userCorrectedDuration,
        correction_reason: correctionReason,
        task_category: taskCategory,
      },
    ])

    if (insertError) {
      console.error("Error saving time correction:", insertError)
      return NextResponse.json({ error: "Error al guardar la corrección" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Corrección guardada exitosamente",
    })
  } catch (error) {
    console.error("Error in learn-time-estimation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Obtener historial de correcciones para mejorar futuras estimaciones
export async function GET(request: NextRequest) {
  try {
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
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener correcciones del usuario para análisis
    const { data: corrections, error } = await supabase
      .from("time_estimation_corrections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching corrections:", error)
      return NextResponse.json({ error: "Error al obtener correcciones" }, { status: 500 })
    }

    // Analizar patrones de corrección
    const patterns = analyzeTimeEstimationPatterns(corrections || [])

    return NextResponse.json({
      corrections: corrections || [],
      patterns,
    })
  } catch (error) {
    console.error("Error in GET learn-time-estimation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function analyzeTimeEstimationPatterns(corrections: any[]) {
  if (corrections.length === 0) return null

  const categoryPatterns: { [key: string]: { avgMultiplier: number; count: number } } = {}

  corrections.forEach((correction) => {
    const category = correction.task_category || "general"
    const multiplier = correction.user_corrected_duration / correction.ai_estimated_duration

    if (!categoryPatterns[category]) {
      categoryPatterns[category] = { avgMultiplier: 0, count: 0 }
    }

    categoryPatterns[category].avgMultiplier =
      (categoryPatterns[category].avgMultiplier * categoryPatterns[category].count + multiplier) /
      (categoryPatterns[category].count + 1)
    categoryPatterns[category].count++
  })

  return {
    totalCorrections: corrections.length,
    categoryPatterns,
    recentTrend:
      corrections
        .slice(0, 10)
        .reduce((acc, curr) => acc + curr.user_corrected_duration / curr.ai_estimated_duration, 0) /
      Math.min(10, corrections.length),
  }
}
