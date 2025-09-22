import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export async function POST(request: NextRequest) {
  try {
    const { planId, format: exportFormat } = await request.json()

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the daily plan with tasks
    const { data: plan, error: planError } = await supabase
      .from("daily_plans")
      .select(`
        *,
        daily_plan_tasks (
          *,
          tasks (title, description, priority)
        )
      `)
      .eq("id", planId)
      .eq("user_id", user.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (exportFormat === "csv") {
      return exportAsCSV(plan)
    } else if (exportFormat === "pdf") {
      return exportAsPDF(plan)
    } else {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}

function exportAsCSV(plan: any) {
  const csvHeaders = ["Hora Inicio", "Hora Fin", "Tarea", "Descripción", "Prioridad", "Duración (min)", "Estado"]

  const csvRows =
    plan.time_blocks?.map((block: any) => {
      const task = plan.daily_plan_tasks?.find((t: any) => t.task_id === block.task_id)
      return [
        block.start_time,
        block.end_time,
        block.task_title,
        task?.tasks?.description || "",
        task?.tasks?.priority || "",
        block.duration.toString(),
        "Programado",
      ]
    }) || []

  const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join(
    "\n",
  )

  const fileName = `plan-diario-${format(parseISO(plan.plan_date), "yyyy-MM-dd")}.csv`

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

function exportAsPDF(plan: any) {
  // Simple HTML to PDF conversion
  const htmlContent = generatePDFHTML(plan)

  // For a real implementation, you would use a library like puppeteer or jsPDF
  // For now, we'll return HTML that can be printed as PDF
  const fileName = `plan-diario-${format(parseISO(plan.plan_date), "yyyy-MM-dd")}.html`

  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

function generatePDFHTML(plan: any) {
  const formattedDate = format(parseISO(plan.plan_date), "EEEE, dd MMMM yyyy", { locale: es })

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Plan Diario - ${formattedDate}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #dc2626;
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #dc2626; 
            margin: 0;
        }
        .summary { 
            background: #fef2f2; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 30px;
        }
        .schedule { 
            width: 100%; 
            border-collapse: collapse;
        }
        .schedule th, .schedule td { 
            border: 1px solid #e5e7eb; 
            padding: 12px; 
            text-align: left;
        }
        .schedule th { 
            background: #dc2626; 
            color: white;
        }
        .schedule tr:nth-child(even) { 
            background: #f8fafc;
        }
        .priority-high { color: #dc2626; font-weight: bold; }
        .priority-medium { color: #f59e0b; font-weight: bold; }
        .priority-low { color: #10b981; font-weight: bold; }
        .break-row { background: #e0f2fe !important; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Plan Diario Inteligente</h1>
        <h2>${formattedDate}</h2>
    </div>
    
    <div class="summary">
        <h3>Resumen del Plan</h3>
        <p><strong>Total de tareas:</strong> ${plan.total_tasks}</p>
        <p><strong>Duración estimada:</strong> ${Math.round(plan.estimated_duration / 60)}h ${plan.estimated_duration % 60}min</p>
        <p><strong>Estado:</strong> ${plan.status === "active" ? "Activo" : plan.status === "completed" ? "Completado" : "Borrador"}</p>
    </div>

    <table class="schedule">
        <thead>
            <tr>
                <th>Hora</th>
                <th>Tarea</th>
                <th>Descripción</th>
                <th>Prioridad</th>
                <th>Duración</th>
            </tr>
        </thead>
        <tbody>
            ${
              plan.time_blocks
                ?.map((block: any) => {
                  const task = plan.daily_plan_tasks?.find((t: any) => t.task_id === block.task_id)
                  const isBreak = block.task_id === "break" || block.task_id === "lunch"
                  const priorityClass = task?.tasks?.priority ? `priority-${task.tasks.priority}` : ""

                  return `
                <tr class="${isBreak ? "break-row" : ""}">
                    <td>${block.start_time} - ${block.end_time}</td>
                    <td>${block.task_title}</td>
                    <td>${task?.tasks?.description || (isBreak ? "Tiempo de descanso" : "")}</td>
                    <td class="${priorityClass}">
                        ${
                          task?.tasks?.priority
                            ? task.tasks.priority === "high"
                              ? "Alta"
                              : task.tasks.priority === "medium"
                                ? "Media"
                                : "Baja"
                            : isBreak
                              ? "-"
                              : "Sin definir"
                        }
                    </td>
                    <td>${block.duration} min</td>
                </tr>
              `
                })
                .join("") || ""
            }
        </tbody>
    </table>

    <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        <p>Generado por Plan Diario Inteligente - ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
    </div>

    <script>
        // Auto-print when opened
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        }
    </script>
</body>
</html>
  `
}
