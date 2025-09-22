import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Error de autenticación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {params?.error ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Código de error: {params.error}</p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">Ha ocurrido un error no especificado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
