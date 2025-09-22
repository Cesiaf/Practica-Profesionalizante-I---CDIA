import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Target, FileText, Brain } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 text-balance">
            Tu Espacio de <span className="text-blue-600">Productividad</span> Personal
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 text-pretty">
            Organiza tus tareas, toma notas inteligentes y potencia tu productividad con la ayuda de inteligencia
            artificial
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
              <Link href="/auth/signup">Comenzar Gratis</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 py-3 bg-transparent">
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Gestión de Tareas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                Organiza tus tareas por prioridad, establece fechas límite y mantén el control de tu progreso diario.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Notas Inteligentes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                Toma notas vinculadas a tus tareas y accede a ellas de forma rápida y organizada cuando las necesites.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Asistente IA</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                Obtén resúmenes automáticos de tus notas y sugerencias inteligentes para mejorar tu productividad.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">
            ¿Por qué elegir nuestra plataforma?
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Interfaz Intuitiva</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Diseñada para estudiantes y profesionales que buscan simplicidad y eficiencia.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Sincronización en Tiempo Real</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Accede a tus datos desde cualquier dispositivo, siempre actualizados.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Seguridad Garantizada</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tus datos están protegidos con las mejores prácticas de seguridad.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Completamente Gratis</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Todas las funciones disponibles sin costo, para siempre.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
