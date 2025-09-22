"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import type { Note, Task } from "@/lib/types"

interface NoteFormProps {
  note?: Note | null
  tasks: Task[]
  onClose: () => void
  onNoteCreated: (note: Note) => void
  onNoteUpdated: (note: Note) => void
}

export function NoteForm({ note, tasks, onClose, onNoteCreated, onNoteUpdated }: NoteFormProps) {
  const [title, setTitle] = useState(note?.title || "")
  const [content, setContent] = useState(note?.content || "")
  const [taskId, setTaskId] = useState(note?.task_id || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const noteData = {
        title,
        content,
        task_id: taskId,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }

      if (note) {
        // Update existing note
        const { data, error } = await supabase.from("notes").update(noteData).eq("id", note.id).select().single()

        if (error) throw error
        onNoteUpdated(data)
      } else {
        // Create new note
        const { data, error } = await supabase
          .from("notes")
          .insert({ ...noteData, created_at: new Date().toISOString() })
          .select()
          .single()

        if (error) throw error
        onNoteCreated(data)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al guardar la nota")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-sm border-0 shadow-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold text-gray-900">{note ? "Editar Nota" : "Nueva Nota"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                Título *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la nota"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskId" className="text-sm font-medium text-gray-700">
                Vincular con tarea (opcional)
              </Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tarea..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium text-gray-700">
                Contenido *
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe el contenido de tu nota aquí..."
                required
                rows={12}
                className="resize-none"
              />
            </div>

            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {isLoading ? "Guardando..." : note ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
