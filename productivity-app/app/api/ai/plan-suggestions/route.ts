import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "")

  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim()

  // If the response starts with something other than {, try to find the JSON part
  const jsonStart = cleaned.indexOf("{")
  const jsonEnd = cleaned.lastIndexOf("}")

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
  }

  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const { tasks, date } = await request.json()

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 })
    }

    // Prepare task information for AI analysis
    const taskInfo = tasks.map((task: any) => ({
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimated_duration: task.estimated_duration,
      due_date: task.due_date,
    }))

    const prompt = `
Eres un asistente de productividad experto. Analiza las siguientes tareas y genera sugerencias específicas para optimizar el plan diario del usuario.

Tareas para el ${date}:
${JSON.stringify(taskInfo, null, 2)}

Genera exactamente 3-5 sugerencias de optimización en español. Cada sugerencia debe tener:
- type: 'reorder' (reorganizar), 'break' (descanso), o 'focus_time' (tiempo de concentración)
- title: título breve de la sugerencia
- description: explicación detallada de por qué es beneficiosa

Considera:
1. Prioridades de las tareas
2. Duración estimada
3. Fechas de vencimiento
4. Patrones de productividad (tareas difíciles en la mañana)
5. Necesidad de descansos entre tareas largas

Responde SOLO con un JSON válido en este formato:
{
  "suggestions": [
    {
      "type": "reorder",
      "title": "Título de la sugerencia",
      "description": "Descripción detallada"
    }
  ]
}
`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 1000,
    })

    console.log("[v0] Raw AI response:", text)
    const cleanedText = cleanJsonResponse(text)
    console.log("[v0] Cleaned AI response:", cleanedText)

    // Parse the AI response
    let suggestions
    try {
      const parsed = JSON.parse(cleanedText)
      suggestions = parsed.suggestions || []
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      console.error("Cleaned text that failed to parse:", cleanedText)
      // Fallback suggestions if AI response is malformed
      suggestions = [
        {
          type: "reorder",
          title: "Priorizar tareas urgentes",
          description: "Reorganizar las tareas según su prioridad y fecha de vencimiento para maximizar la eficiencia.",
        },
        {
          type: "break",
          title: "Incluir descansos regulares",
          description: "Agregar descansos de 10-15 minutos entre tareas largas para mantener la concentración.",
        },
      ]
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json({ error: "Error generating suggestions" }, { status: 500 })
  }
}
