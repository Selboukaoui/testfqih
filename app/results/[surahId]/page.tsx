"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, XCircle, Home, RotateCcw, TrendingUp, Clock, Target, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"

interface AnalysisData {
  overall_accuracy: number
  completion_percentage: number
  total_words: number
  spoken_words: number
  total_errors: number
  errors_by_type: {
    incorrect: Array<{
      spoken: string
      correct: string
      similarity: number
    }>
    missing: Array<{
      missing: string
    }>
    extra: Array<{
      extra: string
    }>
  }
  error_counts: {
    incorrect: number
    missing: number
    extra: number
  }
  suggestions: string[]
  timestamp: string
  session_duration: string
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const surahId = params.surahId as string

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get analysis from sessionStorage
    const storedAnalysis = sessionStorage.getItem("recitationAnalysis")
    if (storedAnalysis) {
      try {
        const parsedAnalysis = JSON.parse(storedAnalysis)
        setAnalysis(parsedAnalysis)
      } catch (error) {
        console.error("Error parsing analysis:", error)
      }
    }
    setLoading(false)
  }, [])

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600"
    if (accuracy >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getAccuracyBadgeVariant = (accuracy: number) => {
    if (accuracy >= 90) return "default"
    if (accuracy >= 70) return "secondary"
    return "destructive"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Analysis Found</h2>
            <p className="text-gray-600 mb-4">Please complete a recitation session first.</p>
            <Button onClick={() => router.push("/")} className="bg-emerald-600 hover:bg-emerald-700">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Button onClick={() => router.push("/")} variant="outline" className="bg-white text-gray-700 border-gray-300">
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <Button onClick={() => router.push(`/recite/${surahId}`)} className="bg-emerald-600 hover:bg-emerald-700">
            <RotateCcw className="h-4 w-4 mr-2" />
            Practice Again
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Recitation Analysis</h1>
          <p className="text-gray-600">Detailed feedback on your Quran recitation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Score */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <Target className="h-6 w-6 mr-2 text-emerald-600" />
                Overall Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getAccuracyColor(analysis.overall_accuracy)}`}>
                {analysis.overall_accuracy}%
              </div>
              <Progress value={analysis.overall_accuracy} className="mb-4" />
              <Badge variant={getAccuracyBadgeVariant(analysis.overall_accuracy)}>
                {analysis.overall_accuracy >= 90
                  ? "Excellent"
                  : analysis.overall_accuracy >= 70
                    ? "Good"
                    : "Needs Improvement"}
              </Badge>
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
                Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-bold mb-2 text-blue-600">{analysis.completion_percentage}%</div>
              <Progress value={analysis.completion_percentage} className="mb-4" />
              <div className="text-sm text-gray-600">
                {analysis.spoken_words} / {analysis.total_words} words
              </div>
            </CardContent>
          </Card>

          {/* Session Info */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <Clock className="h-6 w-6 mr-2 text-purple-600" />
                Session Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-sm">
                <span className="font-medium">Duration:</span> {analysis.session_duration}
              </div>
              <div className="text-sm">
                <span className="font-medium">Total Errors:</span> {analysis.total_errors}
              </div>
              <div className="text-sm">
                <span className="font-medium">Completed:</span> {analysis.timestamp}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Error Breakdown */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-orange-600" />
                Error Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="font-medium">Incorrect Words</span>
                  </div>
                  <Badge variant="destructive">{analysis.error_counts.incorrect}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-medium">Missing Words</span>
                  </div>
                  <Badge variant="secondary">{analysis.error_counts.missing}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium">Extra Words</span>
                  </div>
                  <Badge variant="outline">{analysis.error_counts.extra}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Improvement Suggestions */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
                Improvement Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.suggestions.map((suggestion, index) => (
                  <Alert key={index} className="border-green-200 bg-green-50">
                    <AlertDescription className="text-sm">{suggestion}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Errors */}
        {analysis.total_errors > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle>Detailed Error Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Incorrect Words */}
                {analysis.errors_by_type.incorrect.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-600 mb-3 flex items-center">
                      <XCircle className="h-5 w-5 mr-2" />
                      Incorrect Words ({analysis.errors_by_type.incorrect.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.errors_by_type.incorrect.map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-right mb-2" dir="rtl">
                            <div className="text-sm text-red-600">
                              You said: <span className="font-semibold">{error.spoken}</span>
                            </div>
                            <div className="text-sm text-green-600">
                              Correct: <span className="font-semibold">{error.correct}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {error.similarity}% similar
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Words */}
                {analysis.errors_by_type.missing.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-yellow-600 mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Missing Words ({analysis.errors_by_type.missing.length})
                    </h3>
                    <div className="p-3 bg-yellow-50 rounded border border-yellow-200" dir="rtl">
                      <p className="text-yellow-800 leading-relaxed">
                        {analysis.errors_by_type.missing.map((error, index) => (
                          <span key={index} className="font-semibold">
                            {error.missing}
                            {index < analysis.errors_by_type.missing.length - 1 ? " • " : ""}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                )}

                {/* Extra Words */}
                {analysis.errors_by_type.extra.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-blue-600 mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Extra Words ({analysis.errors_by_type.extra.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {analysis.errors_by_type.extra.map((error, index) => (
                        <div
                          key={index}
                          className="p-2 bg-blue-50 rounded border border-blue-200 text-center"
                          dir="rtl"
                        >
                          <span className="font-semibold text-blue-800">{error.extra}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Perfect Recitation Message */}
        {analysis.total_errors === 0 && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-xl">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Perfect Recitation! 🎉</h2>
              <p className="text-green-600 text-lg">
                Excellent work! Your recitation was accurate and complete. Keep up the great work!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
