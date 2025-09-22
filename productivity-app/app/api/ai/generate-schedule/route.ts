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
    const { tasks, suggestions, date } = await request.json()

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 })
    }

    // Prepare task and suggestion information
    const taskInfo = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      estimated_duration: task.estimated_duration,
      due_date: task.due_date,
    }))

    const acceptedSuggestions = suggestions.filter((s: any) => s.accepted)

    const prompt = `
Eres un planificador de horarios experto. Crea un horario diario optimizado para las siguientes tareas.

Fecha: ${date}
Tareas:
${JSON.stringify(taskInfo, null, 2)}

Sugerencias aceptadas por el usuario:
${JSON.stringify(acceptedSuggestions, null, 2)}

Reglas para el horario:
1. Horario de trabajo: 9:00 AM a 6:00 PM
2. Incluir descansos de 15 min cada 2 horas
3. Almuerzo de 1 hora (12:00 PM - 1:00 PM)
4. Tareas de alta prioridad en la mañana
5. Respetar la duración estimada de cada tarea
6. Aplicar las sugerencias aceptadas

Genera un horario en bloques de tiempo. Responde SOLO con JSON válido:
{
  "timeBlocks": [
    {
      "id": "unique_id",
      "task_id": "task_id_from_input",
      "task_title": "título de la tarea",
      "start_time": "09:00",
      "end_time": "10:30",
      "duration": 90
    }
  ]
}

Incluye bloques para descansos y almuerzo con task_id: "break" o "lunch".
`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 1500,
    })

    console.log("[v0] Raw AI schedule response:", text)
    const cleanedText = cleanJsonResponse(text)
    console.log("[v0] Cleaned AI schedule response:", cleanedText)

    // Parse the AI response
    let timeBlocks
    try {
      const parsed = JSON.parse(cleanedText)
      timeBlocks = parsed.timeBlocks || []
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      console.error("Cleaned text that failed to parse:", cleanedText)

      // Fallback: create a simple schedule
      let currentTime = 9 * 60 // 9:00 AM in minutes
      timeBlocks = []

      // Sort tasks by priority
      const sortedTasks = [...tasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return (
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
          (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
        )
      })

      for (const task of sortedTasks) {
        const startHour = Math.floor(currentTime / 60)
        const startMin = currentTime % 60
        const endTime = currentTime + task.estimated_duration
        const endHour = Math.floor(endTime / 60)
        const endMinute = endTime % 60

        timeBlocks.push({
          id: `block_${task.id}`,
          task_id: task.id,
          task_title: task.title,
          start_time: `${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`,
          end_time: `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`,
          duration: task.estimated_duration,
        })

        currentTime = endTime + 15 // Add 15 min break

        // Add lunch break at 12:00 PM
        if (currentTime >= 12 * 60 && currentTime < 13 * 60) {
          timeBlocks.push({
            id: "lunch_break",
            task_id: "lunch",
            task_title: "Almuerzo",
            start_time: "12:00",
            end_time: "13:00",
            duration: 60,
          })
          currentTime = 13 * 60
        }
      }
    }

    return NextResponse.json({ timeBlocks })
  } catch (error) {
    console.error("Error generating schedule:", error)
    return NextResponse.json({ error: "Error generating schedule" }, { status: 500 })
  }
}
