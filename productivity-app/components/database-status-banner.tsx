"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"

interface DatabaseStatus {
  allTablesReady: boolean
  time_estimation_corrections: boolean
  fixed_schedule_tasks: boolean
}

export default function DatabaseStatusBanner() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkDatabaseStatus = async () => {
    setIsChecking(true)
    try {
      const response = await fetch("/api/database/check-tables")
      const data = await response.json()
      setStatus(data.tables)
    } catch (error) {
      console.error("Error checking database status:", error)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  if (!status) return null

  if (status.allTablesReady) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Sistema de aprendizaje y horarios fijos está completamente configurado.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium mb-1">Configuración de base de datos pendiente</p>
            <p className="text-sm">
              Para usar el sistema de aprendizaje y horarios fijos, ejecuta el script de migración:
              <code className="ml-1 px-1 py-0.5 bg-yellow-100 rounded text-xs">
                scripts/004_learning_and_fixed_schedules.sql
              </code>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={checkDatabaseStatus} disabled={isChecking}>
            {isChecking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
