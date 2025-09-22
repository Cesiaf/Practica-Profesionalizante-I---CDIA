"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Edit, Trash2, Clock, FileText } from "lucide-react"
import Link from "next/link"
import type { Task } from "@/lib/types"

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onUpdate: (task: Task) => void
}

export function TaskCard({ task, onEdit, onDelete, onUpdate }: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [notesCount, setNotesCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchNotesCount()
  }, [task.id])

  const fetchNotesCount = async () => {
    try {
      const { count, error } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("task_id", task.id)

      if (error) throw error
      setNotesCount(count || 0)
    } catch (error) {
      console.error("Error fetching notes count:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "pending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Urgente"
      case "high":
        return "Alta"
      case "medium":
        return "Media"
      case "low":
        return "Baja"
      default:
        return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completada"
      case "in_progress":
        return "En Progreso"
      case "pending":
        return "Pendiente"
      default:
        return status
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id)
      if (error) throw error
      onDelete(task.id)
    } catch (error) {
      console.error("Error deleting task:", error)
      alert("Error al eliminar la tarea")
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleStatus = async () => {
    const newStatus = task.status === "completed" ? "pending" : "completed"
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", task.id)
        .select()
        .single()

      if (error) throw error
      onUpdate(data)
    } catch (error) {
      console.error("Error updating task status:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed"

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
            {task.title}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={getPriorityColor(task.priority)}>{getPriorityLabel(task.priority)}</Badge>
          <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
          {notesCount > 0 && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <FileText className="w-3 h-3 mr-1" />
              {notesCount} nota{notesCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{task.description}</p>
        )}

        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400" : ""}`}>
              <Calendar className="w-3 h-3" />
              <span>Vence: {formatDate(task.due_date)}</span>
              {isOverdue && <span className="text-red-600 dark:text-red-400 font-medium">(Vencida)</span>}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Creada: {formatDate(task.created_at)}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStatus}
            className={`w-full ${
              task.status === "completed"
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            }`}
          >
            {task.status === "completed" ? "Marcar como Pendiente" : "Marcar como Completada"}
          </Button>
          <Button variant="ghost" size="sm" asChild className="w-full text-purple-600 hover:text-purple-700">
            <Link href={`/notes?task=${task.id}`}>
              <FileText className="w-4 h-4 mr-2" />
              Ver Notas ({notesCount})
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
