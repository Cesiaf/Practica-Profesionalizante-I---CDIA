"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Edit, Trash2, LinkIcon } from "lucide-react"
import type { Note } from "@/lib/types"

interface NoteCardProps {
  note: Note
  taskTitle?: string | null
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
  onUpdate: (note: Note) => void
}

export function NoteCard({ note, taskTitle, onEdit, onDelete, onUpdate }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta nota?")) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("notes").delete().eq("id", note.id)
      if (error) throw error
      onDelete(note.id)
    } catch (error) {
      console.error("Error deleting note:", error)
      alert("Error al eliminar la nota")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const truncateContent = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
            {note.title}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(note)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {taskTitle && (
          <div className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3 text-blue-600" />
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {taskTitle}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {isExpanded ? note.content : truncateContent(note.content)}
          </p>
          {note.content.length > 150 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-700"
            >
              {isExpanded ? "Ver menos" : "Ver más"}
            </Button>
          )}
        </div>

        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Creada: {formatDate(note.created_at)}</span>
          </div>
          {note.updated_at !== note.created_at && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Actualizada: {formatDate(note.updated_at)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
