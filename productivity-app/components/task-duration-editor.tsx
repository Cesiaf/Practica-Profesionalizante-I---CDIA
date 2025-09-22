"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, Brain, Edit3, Check, X } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  priority: string
  estimated_duration: number
}

interface TaskAnalysis {
  task_id: string
  estimated_minutes: number
  reasoning: string
  variability_note: string
}

interface TaskDurationEditorProps {
  tasks: Task[]
  onDurationsUpdate: (updatedTasks: Task[]) => void
}

export default function TaskDurationEditor({ tasks, onDurationsUpdate }: TaskDurationEditorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [taskAnalyses, setTaskAnalyses] = useState<TaskAnalysis[]>([])
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [tempDuration, setTempDuration] = useState<number>(0)
  const [updatedTasks, setUpdatedTasks] = useState<Task[]>(tasks)

  const analyzeTaskDurations = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/ai/analyze-task-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updatedTasks }),
      })

      if (!response.ok) throw new Error("Error analyzing durations")

      const { task_analyses } = await response.json()
      setTaskAnalyses(task_analyses)

      // Update tasks with AI suggestions
      const tasksWithAIEstimates = updatedTasks.map((task) => {
        const analysis = task_analyses.find((a: TaskAnalysis) => a.task_id === task.id)
        return analysis ? { ...task, estimated_duration: analysis.estimated_minutes } : task
      })

      setUpdatedTasks(tasksWithAIEstimates)
      onDurationsUpdate(tasksWithAIEstimates)
    } catch (error) {
      console.error("Error analyzing task durations:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const startEditing = (taskId: string, currentDuration: number) => {
    setEditingTask(taskId)
    setTempDuration(currentDuration)
  }

  const saveEdit = () => {
    if (editingTask && tempDuration > 0) {
      const updated = updatedTasks.map((task) =>
        task.id === editingTask ? { ...task, estimated_duration: tempDuration } : task,
      )
      setUpdatedTasks(updated)
      onDurationsUpdate(updated)
    }
    setEditingTask(null)
  }

  const cancelEdit = () => {
    setEditingTask(null)
    setTempDuration(0)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta"
      case "medium":
        return "Media"
      case "low":
        return "Baja"
      default:
        return "Sin definir"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Estimación de Tiempo Inteligente
        </CardTitle>
        <CardDescription>
          La IA analizará cada tarea para estimar tiempos más precisos. Puedes editar cualquier estimación manualmente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Analysis Button */}
        <div className="flex justify-center">
          <Button onClick={analyzeTaskDurations} disabled={isAnalyzing} className="flex items-center gap-2">
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analizando tiempos...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Analizar Tiempos con IA
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Task Duration List */}
        <div className="space-y-3">
          {updatedTasks.map((task) => {
            const analysis = taskAnalyses.find((a) => a.task_id === task.id)
            const isEditing = editingTask === task.id

            return (
              <div key={task.id} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{task.title}</h4>
                      <Badge className={getPriorityColor(task.priority)}>{getPriorityLabel(task.priority)}</Badge>
                    </div>

                    {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

                    {analysis && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          <strong>Análisis IA:</strong> {analysis.reasoning}
                        </p>
                        <p className="text-xs text-blue-600">
                          <strong>Nota:</strong> {analysis.variability_note}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Duration Editor */}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Input
                          type="number"
                          value={tempDuration}
                          onChange={(e) => setTempDuration(Number.parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                          min="1"
                          max="480"
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                        <Button size="sm" variant="ghost" onClick={saveEdit}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{task.estimated_duration}</div>
                          <div className="text-xs text-muted-foreground">minutos</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(task.id, task.estimated_duration)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {updatedTasks.length > 0 && (
          <>
            <Separator />
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">Tiempo total estimado</div>
              <div className="text-2xl font-bold text-primary">
                {updatedTasks.reduce((sum, task) => sum + task.estimated_duration, 0)} minutos
              </div>
              <div className="text-sm text-muted-foreground">
                ({Math.round((updatedTasks.reduce((sum, task) => sum + task.estimated_duration, 0) / 60) * 10) / 10}{" "}
                horas)
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
