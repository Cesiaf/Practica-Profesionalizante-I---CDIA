"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Copy, Check, Brain, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface AIResponseDisplayProps {
  content: string
  type: "summary" | "suggestions"
  isLoading?: boolean
}

export function AIResponseDisplay({ content, type, isLoading = false }: AIResponseDisplayProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const processText = (text: string) => {
    let processedText = text

    // Convert markdown headers (###, ##, #) to HTML headings
    processedText = processedText.replace(
      /^### (.*$)/gm,
      '<h3 class="text-lg font-bold text-gray-900 mb-2 mt-4">$1</h3>',
    )
    processedText = processedText.replace(
      /^## (.*$)/gm,
      '<h2 class="text-xl font-bold text-gray-900 mb-3 mt-5">$1</h2>',
    )
    processedText = processedText.replace(
      /^# (.*$)/gm,
      '<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-6">$1</h1>',
    )

    // Handle numbered lists with proper spacing
    processedText = processedText.replace(
      /(^\d+\.\s*[^:]*:)/gm,
      '<div class="mt-4 mb-2"><strong class="font-semibold text-gray-900">$1</strong></div>',
    )

    // Convert markdown bold (**text**) to HTML spans
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')

    // Convert line breaks to proper HTML breaks and paragraphs
    processedText = processedText.replace(/\n\n+/g, '</p><p class="mt-3">')
    processedText = processedText.replace(/\n/g, "<br>")

    // Wrap in paragraph tags if not already wrapped
    if (!processedText.includes("<p>") && !processedText.includes("<h")) {
      processedText = `<p>${processedText}</p>`
    }

    return processedText
  }

  if (isLoading) {
    return (
      <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4 text-gray-500">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent"></div>
                <Sparkles className="h-4 w-4 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-base font-medium">Generando respuesta inteligente...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!content) return null

  const processedContent = processText(content)

  return (
    <Card className="border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-0">
        <div
          className={`px-6 py-4 border-b ${
            type === "summary"
              ? "bg-gradient-to-r from-blue-500 to-indigo-600"
              : "bg-gradient-to-r from-green-500 to-emerald-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                {type === "summary" ? (
                  <Brain className="h-5 w-5 text-white" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  {type === "summary" ? "Resumen Inteligente" : "Sugerencias Personalizadas"}
                </h3>
                <p className="text-white/80 text-sm">
                  {type === "summary" ? "Análisis de tus notas" : "Recomendaciones para mejorar tu productividad"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div
            className="text-gray-800 leading-relaxed text-pretty prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
