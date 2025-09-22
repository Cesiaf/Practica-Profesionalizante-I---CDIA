import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "")
  cleaned = cleaned.trim()

  const jsonStart = cleaned.indexOf("{")
  const jsonEnd = cleaned.lastIndexOf("}")

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
  }

  return cleaned
}

function analyzeUserPatterns(corrections: any[]): string {
  if (corrections.length === 0) return ""

  const categoryPatterns: { [key: string]: { total: number; avgMultiplier: number; count: number } } = {}

  corrections.forEach((correction) => {
    const category = correction.task_category || "general"
    const multiplier = correction.user_corrected_duration / correction.ai_estimated_duration

    if (!categoryPatterns[category]) {
      categoryPatterns[category] = { total: 0, avgMultiplier: 0, count: 0 }
    }

    categoryPatterns[category].total += correction.user_corrected_duration
    categoryPatterns[category].avgMultiplier =
      (categoryPatterns[category].avgMultiplier * categoryPatterns[category].count + multiplier) /
      (categoryPatterns[category].count + 1)
    categoryPatterns[category].count++
  })

  let patterns = "Patrones de corrección del usuario:\n"
  for (const [category, data] of Object.entries(categoryPatterns)) {
    patterns += `- ${category}: Usuario típicamente ${data.avgMultiplier > 1.2 ? "necesita más tiempo" : data.avgMultiplier < 0.8 ? "es más rápido" : "está cerca"} (factor: ${data.avgMultiplier.toFixed(2)})\n`
  }

  return patterns
}

export async function POST(request: NextRequest) {
  try {
    const { tasks } = await request.json()

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 })
    }

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

    let learningContext = ""
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Get user's correction patterns
        const { data: corrections } = await supabase
          .from("time_estimation_corrections")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (corrections && corrections.length > 0) {
          const patterns = analyzeUserPatterns(corrections)
          learningContext = `\n\nCONTEXTO DE APRENDIZAJE DEL USUARIO:\n${patterns}`
        }

        // Get user's fixed schedule tasks to avoid conflicts
        const { data: fixedTasks } = await supabase
          .from("fixed_schedule_tasks")
          .select("title, fixed_start_time, fixed_end_time, days_of_week")
          .eq("user_id", user.id)

        if (fixedTasks && fixedTasks.length > 0) {
          learningContext += `\n\nTAREAS CON HORARIOS FIJOS:\n${JSON.stringify(fixedTasks, null, 2)}`
        }
      }
    } catch (error) {
      console.log("[v0] Could not fetch learning context:", error)
    }

    const taskInfo = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      current_duration: task.estimated_duration,
    }))

    const prompt = `
Eres un experto en análisis de tiempo y productividad. Analiza cada tarea y estima un tiempo más preciso basado en:

1. **Tipo de actividad**: Física, mental, creativa, administrativa, etc.
2. **Complejidad**: Simple, moderada, compleja
3. **Factores personales**: Experiencia típica, variabilidad individual
4. **Contexto**: Preparación necesaria, limpieza posterior, interrupciones
${learningContext}

Tareas a analizar:
${JSON.stringify(taskInfo, null, 2)}

Para cada tarea, proporciona:
- estimated_minutes: tiempo estimado en minutos (realista)
- reasoning: explicación breve del análisis
- variability_note: nota sobre factores que pueden afectar el tiempo
- category: categoría de la tarea (estudio, ejercicio, personal, trabajo, etc.)

Ejemplos de análisis:
- "Tomar un baño": 15-45 min (depende del tipo de cabello, rutina personal)
- "Estudiar matemáticas": 60-90 min (requiere concentración profunda)
- "Hacer ejercicio": 30-60 min (incluye calentamiento y enfriamiento)
- "Preparar desayuno": 10-30 min (depende de la complejidad del menú)

Responde SOLO con JSON válido:
{
  "task_analyses": [
    {
      "task_id": "id_de_tarea",
      "estimated_minutes": 30,
      "reasoning": "Explicación del análisis",
      "variability_note": "Factores que pueden cambiar el tiempo",
      "category": "categoría_de_tarea"
    }
  ]
}
`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 1500,
    })

    console.log("[v0] Raw AI duration analysis:", text)
    const cleanedText = cleanJsonResponse(text)
    console.log("[v0] Cleaned AI duration analysis:", cleanedText)

    let taskAnalyses
    try {
      const parsed = JSON.parse(cleanedText)
      taskAnalyses = parsed.task_analyses || []
    } catch (parseError) {
      console.error("Error parsing AI duration analysis:", parseError)
      // Fallback: return original durations
      taskAnalyses = tasks.map((task: any) => ({
        task_id: task.id,
        estimated_minutes: task.estimated_duration,
        reasoning: "Análisis automático no disponible",
        variability_note: "Puedes ajustar manualmente según tu experiencia",
        category: "general",
      }))
    }

    return NextResponse.json({ task_analyses: taskAnalyses })
  } catch (error) {
    console.error("Error analyzing task durations:", error)
    return NextResponse.json({ error: "Error analyzing durations" }, { status: 500 })
  }
}
