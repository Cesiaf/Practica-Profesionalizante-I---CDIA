"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Download, FileText, Table } from "lucide-react"

interface ExportPlanDialogProps {
  planId: string
  planTitle: string
}

export default function ExportPlanDialog({ planId, planTitle }: ExportPlanDialogProps) {
  const [format, setFormat] = useState<"pdf" | "csv">("pdf")
  const [isExporting, setIsExporting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/export/daily-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          format,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al exportar el plan")
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get("Content-Disposition")
      const filename =
        contentDisposition?.match(/filename="(.+)"/)?.[1] || `plan-diario.${format === "pdf" ? "html" : "csv"}`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setIsOpen(false)
    } catch (error) {
      console.error("Export error:", error)
      alert("Error al exportar el plan. Por favor, inténtalo de nuevo.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Plan Diario</DialogTitle>
          <DialogDescription>Descarga tu plan "{planTitle}" en el formato que prefieras</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup value={format} onValueChange={(value) => setFormat(value as "pdf" | "csv")}>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="w-4 h-4 text-red-600" />
                <div>
                  <div className="font-medium">PDF (Recomendado)</div>
                  <div className="text-sm text-muted-foreground">Formato visual completo, ideal para imprimir</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                <Table className="w-4 h-4 text-green-600" />
                <div>
                  <div className="font-medium">CSV</div>
                  <div className="text-sm text-muted-foreground">Datos tabulares para Excel o Google Sheets</div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="flex-1">
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
