"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Clock, Calendar, Plus, Trash2, Edit } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface FixedScheduleTask {
  id: string
  title: string
  description: string
  fixed_start_time: string
  fixed_end_time: string
  days_of_week: number[]
  is_recurring: boolean
  priority_level: number
  is_movable: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
]

const PRIORITY_LEVELS = [
  { value: 1, label: "Alta", color: "bg-red-100 text-red-800" },
  { value: 2, label: "Media", color: "bg-yellow-100 text-yellow-800" },
  { value: 3, label: "Baja", color: "bg-green-100 text-green-800" },
]

export default function FixedScheduleManager() {
  const [fixedTasks, setFixedTasks] = useState<FixedScheduleTask[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<FixedScheduleTask | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fixed_start_time: "",
    fixed_end_time: "",
    days_of_week: [] as number[],
    is_recurring: true,
    priority_level: 2,
    is_movable: false,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadFixedTasks()
  }, [])

  const loadFixedTasks = async () => {
    try {
      const { data, error } = await supabase.from("fixed_schedule_tasks").select("*").order("fixed_start_time")

      if (error) throw error
      setFixedTasks(data || [])
    } catch (error) {
      console.error("Error loading fixed tasks:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      const taskData = {
        ...formData,
        user_id: user.id,
      }

      if (editingTask) {
        const { error } = await supabase.from("fixed_schedule_tasks").update(taskData).eq("id", editingTask.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("fixed_schedule_tasks").insert([taskData])

        if (error) throw error
      }

      await loadFixedTasks()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving fixed task:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("fixed_schedule_tasks").delete().eq("id", id)

      if (error) throw error
      await loadFixedTasks()
    } catch (error) {
      console.error("Error deleting fixed task:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      fixed_start_time: "",
      fixed_end_time: "",
      days_of_week: [],
      is_recurring: true,
      priority_level: 2,
      is_movable: false,
    })
    setEditingTask(null)
  }

  const handleEdit = (task: FixedScheduleTask) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      fixed_start_time: task.fixed_start_time,
      fixed_end_time: task.fixed_end_time,
      days_of_week: task.days_of_week,
      is_recurring: task.is_recurring,
      priority_level: task.priority_level,
      is_movable: task.is_movable,
    })
    setIsDialogOpen(true)
  }

  const toggleDay = (dayValue: number) => {
    setFormData((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayValue)
        ? prev.days_of_week.filter((d) => d !== dayValue)
        : [...prev.days_of_week, dayValue].sort(),
    }))
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getDayNames = (days: number[]) => {
    return days.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label).join(", ")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Horarios Fijos</h2>
          <p className="text-gray-600">Gestiona tareas con horarios inamovibles como exámenes, citas médicas, etc.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Horario Fijo
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Editar Horario Fijo" : "Nuevo Horario Fijo"}</DialogTitle>
              <DialogDescription>Define una tarea con horario específico que no puede moverse</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="ej. Examen de Matemáticas"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Detalles adicionales..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="start_time">Hora de Inicio *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.fixed_start_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fixed_start_time: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_time">Hora de Fin *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.fixed_end_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fixed_end_time: e.target.value }))}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label>Días de la Semana *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={formData.days_of_week.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select
                    value={formData.priority_level.toString()}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, priority_level: Number.parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value.toString()}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_recurring: checked }))}
                    />
                    <Label htmlFor="recurring">Recurrente</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="movable"
                      checked={formData.is_movable}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_movable: checked }))}
                    />
                    <Label htmlFor="movable">Movible</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : editingTask ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {fixedTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay horarios fijos</h3>
              <p className="text-gray-500 text-center mb-4">
                Agrega tareas con horarios específicos como exámenes, citas médicas o reuniones importantes.
              </p>
            </CardContent>
          </Card>
        ) : (
          fixedTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    {task.description && <CardDescription className="mt-1">{task.description}</CardDescription>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={PRIORITY_LEVELS.find((p) => p.value === task.priority_level)?.color}>
                      {PRIORITY_LEVELS.find((p) => p.value === task.priority_level)?.label}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(task.fixed_start_time)} - {formatTime(task.fixed_end_time)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{getDayNames(task.days_of_week)}</span>
                  </div>

                  {task.is_recurring && (
                    <Badge variant="secondary" className="text-xs">
                      Recurrente
                    </Badge>
                  )}

                  {task.is_movable && (
                    <Badge variant="outline" className="text-xs">
                      Movible
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
