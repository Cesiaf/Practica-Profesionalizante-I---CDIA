"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Brain, Lightbulb } from "lucide-react"
import type { Task, Note } from "@/lib/types"
import { AIResponseDisplay } from "./ai-response-display"

interface AIAssistantProps {
  tasks: Task[]
  notes: Note[]
}

export function AIAssistant({ tasks, notes }: AIAssistantProps) {
  const [summary, setSummary] = useState("")
  const [suggestions, setSuggestions] = useState("")
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])

  const generateSummary = async () => {
    if (selectedNotes.length === 0) return

    setIsGeneratingSummary(true)
    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds: selectedNotes }),
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Error generating summary:", error)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const generateSuggestions = async () => {
    setIsGeneratingSuggestions(true)
    try {
      const response = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, notes }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error("Error generating suggestions:", error)
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) => (prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]))
  }

  return (
    <div className="space-y-6">
      {/* Note Summarization */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Brain className="h-5 w-5" />
            Resumen Inteligente de Notas
          </CardTitle>
          <CardDescription className="text-blue-700">
            Selecciona notas para generar un resumen con conexiones clave y sugerencias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes.length > 0 ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900">Seleccionar notas:</p>
                <div className="flex flex-wrap gap-2">
                  {notes.map((note) => (
                    <Badge
                      key={note.id}
                      variant={selectedNotes.includes(note.id) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
                        selectedNotes.includes(note.id) ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-blue-100"
                      }`}
                      onClick={() => toggleNoteSelection(note.id)}
                    >
                      {note.title}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateSummary}
                disabled={selectedNotes.length === 0 || isGeneratingSummary}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando resumen...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generar Resumen
                  </>
                )}
              </Button>

              {(summary || isGeneratingSummary) && (
                <div className="mt-4">
                  <AIResponseDisplay content={summary} type="summary" isLoading={isGeneratingSummary} />
                </div>
              )}
            </>
          ) : (
            <p className="text-blue-600">No hay notas disponibles para resumir.</p>
          )}
        </CardContent>
      </Card>

      {/* Productivity Suggestions */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Lightbulb className="h-5 w-5" />
            Sugerencias de Productividad
          </CardTitle>
          <CardDescription className="text-green-700">
            Obtén recomendaciones personalizadas basadas en tus tareas y notas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={generateSuggestions}
            disabled={isGeneratingSuggestions}
            className="bg-green-600 hover:bg-green-700"
          >
            {isGeneratingSuggestions ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando sugerencias...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Obtener Sugerencias
              </>
            )}
          </Button>

          {(suggestions || isGeneratingSuggestions) && (
            <div className="mt-4">
              <AIResponseDisplay content={suggestions} type="suggestions" isLoading={isGeneratingSuggestions} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
