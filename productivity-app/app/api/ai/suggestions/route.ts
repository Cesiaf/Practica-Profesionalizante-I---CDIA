import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { tasks, notes } = await request.json()

    // Create Supabase client
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

    // Get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prepare context for AI
    const tasksContext =
      tasks
        ?.map(
          (task: any) =>
            `- ${task.title} (Prioridad: ${task.priority}, Estado: ${task.status}, Vence: ${task.due_date || "Sin fecha"})`,
        )
        .join("\n") || "No hay tareas disponibles"

    const notesContext =
      notes?.map((note: any) => `- ${note.title}: ${note.content.substring(0, 100)}...`).join("\n") ||
      "No hay notas disponibles"

    // Generate suggestions using Groq
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Eres un coach de productividad especializado en ayudar a estudiantes y profesionales.

Analiza la siguiente información del usuario y proporciona 5 sugerencias específicas y accionables para mejorar su productividad:

TAREAS ACTUALES:
${tasksContext}

NOTAS RECIENTES:
${notesContext}

Proporciona sugerencias que sean:
1. Específicas y accionables
2. Basadas en la información proporcionada
3. Orientadas a mejorar la organización y productividad
4. Apropiadas para estudiantes y profesionales

Responde en español con una lista numerada de 5 sugerencias claras y concisas.`,
    })

    return NextResponse.json({ suggestions: text })
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
