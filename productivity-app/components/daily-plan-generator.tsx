"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Clock, Brain, CheckCircle, Sparkles, Settings } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import TaskDurationEditor from "./task-duration-editor"
import FixedScheduleManager from "./fixed-schedule-manager"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Task {
  id: string
  title: string
  description: string
  priority: string
  due_date: string
  estimated_duration: number
  status: string
}

interface TimeBlock {
  id: string
  task_id: string
  start_time: string
  end_time: string
  duration: number
  task_title: string
  is_fixed?: boolean
}

interface AISuggestion {
  type: "reorder" | "break" | "focus_time"
  title: string
  description: string
  accepted: boolean
}

interface FixedScheduleTask {
  id: string
  title: string
  fixed_start_time: string
  fixed_end_time: string
  days_of_week: number[]
}

export default function DailyPlanGenerator() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [fixedTasks, setFixedTasks] = useState<FixedScheduleTask[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<"select" | "optimize" | "schedule" | "review">("select")
  const [tasksWithUpdatedDurations, setTasksWithUpdatedDurations] = useState<Task[]>([])
  const [isFixedScheduleOpen, setIsFixedScheduleOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadTasks()
    loadFixedSchedules()
  }, [])

  const loadTasks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "in_progress"])
        .order("priority", { ascending: false })

      if (error) throw error
      const loadedTasks = data || []
      setTasks(loadedTasks)
      setTasksWithUpdatedDurations(loadedTasks)
    } catch (error) {
      console.error("Error loading tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFixedSchedules = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const planDateObj = new Date(planDate)
      const dayOfWeek = planDateObj.getDay()

      const { data, error } = await supabase
        .from("fixed_schedule_tasks")
        .select("*")
        .eq("user_id", user.id)
        .contains("days_of_week", [dayOfWeek])

      if (error) {
        if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
          console.log("Fixed schedule tables not yet created. Please run the database migration.")
          setFixedTasks([])
          return
        }
        throw error
      }
      setFixedTasks(data || [])
    } catch (error) {
      console.error("Error loading fixed schedules:", error)
      setFixedTasks([])
    }
  }

  useEffect(() => {
    if (planDate) {
      loadFixedSchedules()
    }
  }, [planDate])

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId])
    } else {
      setSelectedTasks(selectedTasks.filter((id) => id !== taskId))
    }
  }

  const handleDurationUpdate = async (updatedTasks: Task[]) => {
    setTasksWithUpdatedDurations(updatedTasks)

    for (const updatedTask of updatedTasks) {
      const originalTask = tasks.find((t) => t.id === updatedTask.id)
      if (originalTask && originalTask.estimated_duration !== updatedTask.estimated_duration) {
        try {
          const response = await fetch("/api/ai/learn-time-estimation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskTitle: updatedTask.title,
              taskDescription: updatedTask.description,
              aiEstimatedDuration: originalTask.estimated_duration,
              userCorrectedDuration: updatedTask.estimated_duration,
              correctionReason: "Manual adjustment during plan creation",
              taskCategory: getCategoryFromTask(updatedTask),
            }),
          })

          if (!response.ok) {
            console.log("Learning API not available yet. Time correction not saved.")
          }
        } catch (error) {
          console.log("Learning system not available yet:", error)
        }
      }
    }
  }

  const getCategoryFromTask = (task: Task): string => {
    const title = task.title.toLowerCase()
    const description = task.description?.toLowerCase() || ""

    if (title.includes("estudi") || title.includes("examen") || title.includes("tarea")) return "estudio"
    if (title.includes("ejercicio") || title.includes("gym") || title.includes("deporte")) return "ejercicio"
    if (title.includes("baño") || title.includes("ducha") || title.includes("personal")) return "personal"
    if (title.includes("trabajo") || title.includes("reunión") || title.includes("proyecto")) return "trabajo"
    if (title.includes("cocinar") || title.includes("comida") || title.includes("almuerzo")) return "alimentación"

    return "general"
  }

  const generateAISuggestions = async () => {
    if (selectedTasks.length === 0) return

    setIsGenerating(true)
    try {
      const selectedTasksData = tasksWithUpdatedDurations.filter((task) => selectedTasks.includes(task.id))

      const response = await fetch("/api/ai/plan-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: selectedTasksData,
          date: planDate,
        }),
      })

      if (!response.ok) throw new Error("Error generating suggestions")

      const { suggestions } = await response.json()
      setAiSuggestions(suggestions.map((s: any) => ({ ...s, accepted: false })))
      setCurrentStep("optimize")
    } catch (error) {
      console.error("Error generating AI suggestions:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateTimeBlocks = async () => {
    setIsGenerating(true)
    try {
      const selectedTasksData = tasksWithUpdatedDurations.filter((task) => selectedTasks.includes(task.id))
      const acceptedSuggestions = aiSuggestions.filter((s) => s.accepted)

      const response = await fetch("/api/ai/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: selectedTasksData,
          suggestions: acceptedSuggestions,
          date: planDate,
          fixedTasks: fixedTasks,
        }),
      })

      if (!response.ok) throw new Error("Error generating schedule")

      const { timeBlocks: blocks } = await response.json()

      const fixedBlocks: TimeBlock[] = fixedTasks.map((fixedTask) => ({
        id: `fixed-${fixedTask.id}`,
        task_id: fixedTask.id,
        start_time: fixedTask.fixed_start_time,
        end_time: fixedTask.fixed_end_time,
        duration: calculateDuration(fixedTask.fixed_start_time, fixedTask.fixed_end_time),
        task_title: `🔒 ${fixedTask.title}`,
        is_fixed: true,
      }))

      const allBlocks = [...fixedBlocks, ...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time))
      setTimeBlocks(allBlocks)
      setCurrentStep("schedule")
    } catch (error) {
      console.error("Error generating schedule:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveDailyPlan = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const totalDuration = timeBlocks.reduce((sum, block) => sum + block.duration, 0)

      const { data: plan, error: planError } = await supabase
        .from("daily_plans")
        .upsert({
          user_id: user.id,
          plan_date: planDate,
          title: `Plan del ${format(new Date(planDate), "dd/MM/yyyy", { locale: es })}`,
          total_tasks: selectedTasks.length,
          estimated_duration: totalDuration,
          ai_suggestions: aiSuggestions,
          time_blocks: timeBlocks,
          status: "active",
        })
        .select()
        .single()

      if (planError) throw planError

      const taskAssignments = timeBlocks.map((block) => ({
        daily_plan_id: plan.id,
        task_id: block.task_id,
        scheduled_start_time: block.start_time,
        scheduled_end_time: block.end_time,
        estimated_duration: block.duration,
        ai_optimized: true,
      }))

      const { error: tasksError } = await supabase.from("daily_plan_tasks").upsert(taskAssignments)

      if (tasksError) throw tasksError

      setCurrentStep("review")
    } catch (error) {
      console.error("Error saving daily plan:", error)
    }
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

  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tareas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Generador de Plan Diario Inteligente</h1>
        <p className="text-muted-foreground">Crea un horario optimizado con IA para maximizar tu productividad</p>
      </div>

      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          {[
            { key: "select", label: "Seleccionar", icon: CheckCircle },
            { key: "optimize", label: "Optimizar", icon: Brain },
            { key: "schedule", label: "Programar", icon: Calendar },
            { key: "review", label: "Revisar", icon: Sparkles },
          ].map(({ key, label, icon: Icon }, index) => (
            <div key={key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep === key
                    ? "bg-primary text-primary-foreground"
                    : ["select", "optimize", "schedule", "review"].indexOf(currentStep) > index
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="ml-2 text-sm font-medium">{label}</span>
              {index < 3 && <div className="w-8 h-px bg-border ml-4" />}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Fecha del Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="plan-date">Selecciona la fecha:</Label>
            <Input
              id="plan-date"
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {currentStep === "select" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Horarios Fijos para {format(new Date(planDate), "EEEE", { locale: es })}
                  </CardTitle>
                  <CardDescription>Tareas con horarios específicos que no pueden moverse</CardDescription>
                </div>
                <Dialog open={isFixedScheduleOpen} onOpenChange={setIsFixedScheduleOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Gestionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Gestión de Horarios Fijos</DialogTitle>
                      <DialogDescription>
                        Configura tareas con horarios específicos como exámenes, citas médicas, etc.
                      </DialogDescription>
                    </DialogHeader>
                    <FixedScheduleManager />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {fixedTasks.length > 0 ? (
                <div className="grid gap-2">
                  {fixedTasks.map((fixedTask) => (
                    <div
                      key={fixedTask.id}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {fixedTask.fixed_start_time} - {fixedTask.fixed_end_time}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">🔒 {fixedTask.title}</span>
                      </div>
                      <Badge variant="secondary">Fijo</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No hay horarios fijos para este día. Puedes agregar tareas con horarios específicos usando el botón
                  "Gestionar".
                </p>
              )}
            </CardContent>
          </Card>

          <TaskDurationEditor tasks={tasks} onDurationsUpdate={handleDurationUpdate} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Selecciona las Tareas</CardTitle>
                  <CardDescription>Elige las tareas que quieres incluir en tu plan diario</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {tasksWithUpdatedDurations.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50"
                        >
                          <Checkbox
                            id={task.id}
                            checked={selectedTasks.includes(task.id)}
                            onCheckedChange={(checked) => handleTaskSelection(task.id, checked as boolean)}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={task.id} className="font-medium cursor-pointer">
                                {task.title}
                              </Label>
                              <Badge className={getPriorityColor(task.priority)}>
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </div>
                            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {task.estimated_duration} min
                              </span>
                              {task.due_date && (
                                <span>Vence: {format(new Date(task.due_date), "dd/MM/yyyy", { locale: es })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Selección</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{selectedTasks.length}</div>
                    <div className="text-sm text-muted-foreground">tareas seleccionadas</div>
                  </div>

                  {selectedTasks.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Tiempo estimado total:</div>
                        <div className="text-lg font-bold">
                          {tasksWithUpdatedDurations
                            .filter((task) => selectedTasks.includes(task.id))
                            .reduce((sum, task) => sum + task.estimated_duration, 0)}{" "}
                          min
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={generateAISuggestions}
                    disabled={selectedTasks.length === 0 || isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generando sugerencias...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generar Sugerencias IA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {currentStep === "optimize" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Sugerencias de Optimización IA
            </CardTitle>
            <CardDescription>Revisa y acepta las sugerencias para optimizar tu plan diario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 rounded-lg border">
                <Checkbox
                  checked={suggestion.accepted}
                  onCheckedChange={(checked) => {
                    const updated = [...aiSuggestions]
                    updated[index].accepted = checked as boolean
                    setAiSuggestions(updated)
                  }}
                />
                <div className="flex-1">
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("select")}>
                Volver
              </Button>
              <Button onClick={generateTimeBlocks} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generando horario...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Generar Horario
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Tu Horario Optimizado
            </CardTitle>
            <CardDescription>Revisa tu plan diario generado con IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {timeBlocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    block.is_fixed ? "bg-blue-50 border-blue-200" : "bg-card"
                  }`}
                >
                  <div
                    className={`text-sm font-mono px-2 py-1 rounded ${
                      block.is_fixed ? "bg-blue-100 text-blue-800" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {block.start_time} - {block.end_time}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{block.task_title}</h4>
                    <p className="text-sm text-muted-foreground">{block.duration} minutos</p>
                  </div>
                  <Badge variant={block.is_fixed ? "outline" : "secondary"}>{block.duration} min</Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("optimize")}>
                Volver
              </Button>
              <Button onClick={saveDailyPlan}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Guardar Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              ¡Plan Creado Exitosamente!
            </CardTitle>
            <CardDescription>Tu plan diario ha sido guardado y está listo para usar</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <p className="text-lg">
              Tu plan para el {format(new Date(planDate), "dd/MM/yyyy", { locale: es })} está listo
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => {
                  setCurrentStep("select")
                  setSelectedTasks([])
                  setTimeBlocks([])
                  setAiSuggestions([])
                }}
              >
                Crear Nuevo Plan
              </Button>
              <Button variant="outline">Ver Mis Planes</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
