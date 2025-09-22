import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              ¡Cuenta creada exitosamente!
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Revisa tu correo para confirmar tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Te hemos enviado un enlace de confirmación a tu correo electrónico. Haz clic en el enlace para activar
                tu cuenta y comenzar a usar la aplicación.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Si no ves el correo, revisa tu carpeta de spam.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
