import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { noteIds } = await request.json()

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

    // Fetch notes
    const { data: notes, error } = await supabase
      .from("notes")
      .select("title, content")
      .in("id", noteIds)
      .eq("user_id", user.id)

    if (error || !notes || notes.length === 0) {
      return NextResponse.json({ error: "No notes found" }, { status: 404 })
    }

    // Prepare content for AI
    const notesContent = notes.map((note) => `Título: ${note.title}\nContenido: ${note.content}`).join("\n\n---\n\n")

    // Generate summary using Groq
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Eres un asistente de productividad especializado en resumir notas académicas y profesionales. 

Analiza las siguientes notas y proporciona:
1. Un resumen conciso de los puntos clave
2. Conexiones importantes entre las ideas
3. 3 sugerencias específicas para mejorar la productividad basadas en el contenido

Notas a analizar:
${notesContent}

Responde en español de manera clara y estructurada.`,
    })

    return NextResponse.json({ summary: text })
  } catch (error) {
    console.error("Error generating summary:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}
