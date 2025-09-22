"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NoteForm } from "@/components/note-form"
import { NoteCard } from "@/components/note-card"
import { Plus, Search, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Note, Task } from "@/lib/types"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface NotesManagerProps {
  user: SupabaseUser
}

export function NotesManager({ user }: NotesManagerProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [taskFilter, setTaskFilter] = useState<string>("all")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterNotes()
  }, [notes, searchTerm, taskFilter])

  const fetchData = async () => {
    try {
      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false })

      if (notesError) throw notesError

      // Fetch tasks for filtering
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .order("title", { ascending: true })

      if (tasksError) throw tasksError

      setNotes(notesData || [])
      setTasks(tasksData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterNotes = () => {
    let filtered = notes

    if (searchTerm) {
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (taskFilter !== "all") {
      if (taskFilter === "unlinked") {
        filtered = filtered.filter((note) => !note.task_id)
      } else {
        filtered = filtered.filter((note) => note.task_id === taskFilter)
      }
    }

    setFilteredNotes(filtered)
  }

  const handleNoteCreated = (newNote: Note) => {
    setNotes([newNote, ...notes])
    setShowNoteForm(false)
  }

  const handleNoteUpdated = (updatedNote: Note) => {
    setNotes(notes.map((note) => (note.id === updatedNote.id ? updatedNote : note)))
    setEditingNote(null)
  }

  const handleNoteDeleted = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId))
  }

  const getTaskTitle = (taskId: string | null) => {
    if (!taskId) return null
    const task = tasks.find((t) => t.id === taskId)
    return task?.title || "Tarea eliminada"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando notas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="p-2">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis Notas</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tus notas y vincúlalas con tus tareas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{notes.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Notas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{notes.filter((n) => n.task_id).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Vinculadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{notes.filter((n) => !n.task_id).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sin Vincular</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-0 shadow-lg"
          />
        </div>
        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger className="w-full sm:w-64 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <SelectValue placeholder="Filtrar por tarea" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las notas</SelectItem>
            <SelectItem value="unlinked">Sin vincular</SelectItem>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowNoteForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Nueva Nota
        </Button>
      </div>

      {/* Notes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            taskTitle={getTaskTitle(note.task_id)}
            onEdit={setEditingNote}
            onDelete={handleNoteDeleted}
            onUpdate={handleNoteUpdated}
          />
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {notes.length === 0
              ? "No tienes notas aún. ¡Crea tu primera nota!"
              : "No se encontraron notas con los filtros aplicados."}
          </p>
        </div>
      )}

      {/* Note Form Modal */}
      {(showNoteForm || editingNote) && (
        <NoteForm
          note={editingNote}
          tasks={tasks}
          onClose={() => {
            setShowNoteForm(false)
            setEditingNote(null)
          }}
          onNoteCreated={handleNoteCreated}
          onNoteUpdated={handleNoteUpdated}
        />
      )}
    </div>
  )
}
