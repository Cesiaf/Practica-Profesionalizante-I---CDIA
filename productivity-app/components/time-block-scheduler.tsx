"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Clock, Play, Pause, CheckCircle, MoreHorizontal } from "lucide-react"
import { format, parseISO, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import ExportPlanDialog from "./export-plan-dialog"

interface DailyPlan {
  id: string
  plan_date: string
  title: string
  total_tasks: number
  estimated_duration: number
  status: string
  time_blocks: TimeBlock[]
  created_at: string
}

interface TimeBlock {
  id: string
  task_id: string
  task_title: string
  start_time: string
  end_time: string
  duration: number
}

interface DailyPlanTask {
  id: string
  task_id: string
  scheduled_start_time: string
  scheduled_end_time: string
  estimated_duration: number
  actual_duration?: number
  position: number
}

export default function TimeBlockScheduler() {
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<DailyPlan | null>(null)
  const [currentBlock, setCurrentBlock] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadDailyPlans()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && currentBlock) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, currentBlock])

  const loadDailyPlans = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("daily_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("plan_date", { ascending: false })
        .limit(10)

      if (error) throw error
      setDailyPlans(data || [])

      // Auto-select today's plan if available
      const todayPlan = data?.find((plan) => isToday(parseISO(plan.plan_date)))
      if (todayPlan) {
        setSelectedPlan(todayPlan)
      }
    } catch (error) {
      console.error("Error loading daily plans:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const startBlock = (blockId: string) => {
    setCurrentBlock(blockId)
    setIsRunning(true)
    setElapsedTime(0)
  }

  const pauseBlock = () => {
    setIsRunning(false)
  }

  const completeBlock = async (blockId: string) => {
    if (!selectedPlan) return

    try {
      // Update the task status and actual duration
      const { error } = await supabase
        .from("daily_plan_tasks")
        .update({
          actual_duration: elapsedTime / 60, // Convert seconds to minutes
        })
        .eq("daily_plan_id", selectedPlan.id)
        .eq("id", blockId)

      if (error) throw error

      setCurrentBlock(null)
      setIsRunning(false)
      setElapsedTime(0)

      // Reload plans to reflect changes
      loadDailyPlans()
    } catch (error) {
      console.error("Error completing block:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getBlockStatus = (block: TimeBlock) => {
    const now = new Date()
    const [startHour, startMin] = block.start_time.split(":").map(Number)
    const [endHour, endMin] = block.end_time.split(":").map(Number)

    const startTime = new Date()
    startTime.setHours(startHour, startMin, 0, 0)

    const endTime = new Date()
    endTime.setHours(endHour, endMin, 0, 0)

    if (now < startTime) return "upcoming"
    if (now >= startTime && now <= endTime) return "current"
    return "past"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "current":
        return "bg-green-100 text-green-800 border-green-200"
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "past":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "current":
        return "En curso"
      case "upcoming":
        return "Próximo"
      case "past":
        return "Completado"
      default:
        return "Pendiente"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando planes diarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Programador de Bloques de Tiempo</h1>
        <p className="text-muted-foreground">Gestiona y ejecuta tus planes diarios con seguimiento en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans List */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Mis Planes
              </CardTitle>
              <CardDescription>Selecciona un plan para ver el horario</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {dailyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlan?.id === plan.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {format(parseISO(plan.plan_date), "dd/MM/yyyy", { locale: es })}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {plan.total_tasks} tareas • {Math.round(plan.estimated_duration / 60)}h
                          </p>
                        </div>
                        <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                          {plan.status === "active"
                            ? "Activo"
                            : plan.status === "completed"
                              ? "Completado"
                              : "Borrador"}
                        </Badge>
                      </div>
                      {isToday(parseISO(plan.plan_date)) && (
                        <Badge className="mt-2 bg-green-100 text-green-800">Hoy</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Schedule View */}
        <div className="lg:col-span-2">
          {selectedPlan ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {format(parseISO(selectedPlan.plan_date), "EEEE, dd MMMM yyyy", { locale: es })}
                  </span>
                  <div className="flex items-center gap-2">
                    <ExportPlanDialog planId={selectedPlan.id} planTitle={selectedPlan.title} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Editar Plan</DropdownMenuItem>
                        <DropdownMenuItem>Duplicar Plan</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Eliminar Plan</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardTitle>
                <CardDescription>
                  {selectedPlan.total_tasks} tareas programadas • Duración estimada:{" "}
                  {Math.round(selectedPlan.estimated_duration / 60)}h {selectedPlan.estimated_duration % 60}min
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {selectedPlan.time_blocks?.map((block, index) => {
                      const status = getBlockStatus(block)
                      const isActive = currentBlock === block.id

                      return (
                        <div
                          key={block.id}
                          className={`p-4 rounded-lg border transition-all ${
                            isActive ? "ring-2 ring-primary" : ""
                          } ${getStatusColor(status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-mono bg-white/50 px-2 py-1 rounded">
                                {block.start_time} - {block.end_time}
                              </div>
                              <div>
                                <h4 className="font-medium">{block.task_title}</h4>
                                <p className="text-sm opacity-75">{block.duration} minutos</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{getStatusLabel(status)}</Badge>

                              {block.task_id !== "break" && block.task_id !== "lunch" && (
                                <div className="flex gap-1">
                                  {!isActive ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startBlock(block.id)}
                                      disabled={status === "past"}
                                    >
                                      <Play className="w-3 h-3" />
                                    </Button>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="outline" onClick={pauseBlock}>
                                        <Pause className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" onClick={() => completeBlock(block.id)}>
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {isActive && (
                            <div className="mt-3 pt-3 border-t border-white/20">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Tiempo transcurrido:</span>
                                <span className="text-lg font-mono font-bold">{formatTime(elapsedTime)}</span>
                              </div>
                              <div className="mt-2 bg-white/20 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all duration-1000"
                                  style={{
                                    width: `${Math.min((elapsedTime / 60 / block.duration) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium">Selecciona un Plan</h3>
                    <p className="text-muted-foreground">
                      Elige un plan diario de la lista para ver el horario detallado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
