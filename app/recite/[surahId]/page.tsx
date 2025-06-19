"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, Square, Play, AlertTriangle, CheckCircle, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"

interface SurahData {
  number: number
  name: string
  englishName: string
  ayahs: Array<{
    number: number
    text: string
  }>
}

interface RealtimeError {
  position: number
  spoken: string
  expected: string
  type: "incorrect" | "extra" | "missing"
  similarity: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export default function RecitePage() {
  const params = useParams()
  const router = useRouter()
  const surahId = params.surahId as string

  const [surahData, setSurahData] = useState<SurahData | null>(null)
  const [fullText, setFullText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [fullTranscript, setFullTranscript] = useState("")
  const [realtimeErrors, setRealtimeErrors] = useState<RealtimeError[]>([])
  const [currentPosition, setCurrentPosition] = useState(0)
  const [progress, setProgress] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef("")

  useEffect(() => {
    if (surahId) {
      fetchSurahData()
    }
  }, [surahId])

  useEffect(() => {
    initializeSpeechRecognition()
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const fetchSurahData = async () => {
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}`)
      const data = await response.json()

      if (data.code === 200) {
        const surah = data.data
        setSurahData(surah)

        // Build full text
        let text = ""
        surah.ayahs.forEach((ayah: any, index: number) => {
          text += ayah.text + ` (${index + 1}) `
        })

        setFullText(text.trim())

        // Count words for progress tracking
        const normalizedText = normalizeArabicText(text)
        const words = normalizedText.split(/\s+/).filter((w) => w.trim())
        setTotalWords(words.length)
      } else {
        setError("Failed to load surah data")
      }
    } catch (err) {
      setError("Error fetching surah data")
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const initializeSpeechRecognition = () => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "ar-SA" // Arabic (Saudi Arabia)

        recognition.onstart = () => {
          console.log("Speech recognition started")
          setError("") // Clear any previous errors
        }

        recognition.onresult = (event) => {
          let interimTranscript = ""
          let finalTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            transcriptRef.current += finalTranscript
            setFullTranscript(transcriptRef.current)
            processRealtimeText(finalTranscript)
          }

          setCurrentTranscript(interimTranscript)
        }

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error)

          // Handle different types of errors
          switch (event.error) {
            case "network":
              setError("Network connection issue. Please check your internet connection and try again.")
              // Attempt to restart recognition after a delay
              setTimeout(() => {
                if (isRecording && recognitionRef.current) {
                  try {
                    recognitionRef.current.start()
                    setError("Reconnecting...")
                  } catch (e) {
                    console.error("Failed to restart recognition:", e)
                  }
                }
              }, 3000)
              break
            case "not-allowed":
              setError("Microphone access denied. Please allow microphone access and refresh the page.")
              setIsRecording(false)
              break
            case "no-speech":
              setError("No speech detected. Please speak clearly into your microphone.")
              break
            case "audio-capture":
              setError("Microphone not found. Please check your microphone connection.")
              setIsRecording(false)
              break
            case "service-not-allowed":
              setError("Speech recognition service not available. Please try again later.")
              setIsRecording(false)
              break
            default:
              setError(`Speech recognition error: ${event.error}. Please try again.`)
          }
        }

        recognition.onend = () => {
          console.log("Speech recognition ended")
          if (isRecording && !error) {
            // Only restart if we're still supposed to be recording and there's no error
            setTimeout(() => {
              if (isRecording && recognitionRef.current && !error) {
                try {
                  recognitionRef.current.start()
                } catch (e) {
                  console.error("Failed to restart recognition:", e)
                  setError("Failed to restart speech recognition. Please try stopping and starting again.")
                }
              }
            }, 100)
          }
        }

        recognitionRef.current = recognition
      } else {
        setError("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.")
      }
    }
  }

  const normalizeArabicText = (text: string): string => {
    if (!text) return ""

    // Remove diacritics and normalize Arabic characters
    const normalized = text
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // Remove diacritics and tatweel
      .replace(/[أإآٱ]/g, "ا") // Normalize Alif variations
      .replace(/[ىئ]/g, "ي") // Normalize Ya variations
      .replace(/ة/g, "ه") // Normalize Ta Marbuta
      .replace(/$$\s*\d+\s*$$/g, "") // Remove verse numbers
      .replace(/\d+/g, "") // Remove standalone digits
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()

    return normalized
  }

  const processRealtimeText = async (spokenText: string) => {
    if (!fullText || !spokenText.trim()) return

    try {
      const response = await fetch("/api/check-recitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spokenText: spokenText.trim(),
          fullText,
          currentPosition,
        }),
      })

      const result = await response.json()

      if (result.errors && result.errors.length > 0) {
        setRealtimeErrors((prev) => [...prev, ...result.errors])
      }

      if (result.newPosition !== undefined) {
        setCurrentPosition(result.newPosition)
        const progressPercent = totalWords > 0 ? (result.newPosition / totalWords) * 100 : 0
        setProgress(Math.min(progressPercent, 100))
      }
    } catch (error) {
      console.error("Error processing realtime text:", error)
    }
  }

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        setIsRecording(true)
        setSessionStarted(true)
        setRealtimeErrors([])
        setCurrentPosition(0)
        setProgress(0)
        setError("") // Clear any previous errors
        transcriptRef.current = ""
        setFullTranscript("")
        setCurrentTranscript("")

        recognitionRef.current.start()
      } catch (e) {
        console.error("Failed to start recognition:", e)
        setError("Failed to start speech recognition. Please check your microphone permissions.")
        setIsRecording(false)
      }
    }
  }

  const stopRecording = async () => {
    if (recognitionRef.current && isRecording) {
      setIsRecording(false)
      recognitionRef.current.stop()

      // Process final analysis
      if (transcriptRef.current.trim()) {
        await processFinalAnalysis()
      }
    }
  }

  const processFinalAnalysis = async () => {
    try {
      const response = await fetch("/api/final-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptRef.current,
          fullText,
          surahData,
          realtimeErrors,
        }),
      })

      const analysis = await response.json()

      // Store analysis in sessionStorage and navigate to results
      sessionStorage.setItem("recitationAnalysis", JSON.stringify(analysis))
      router.push(`/results/${surahId}`)
    } catch (error) {
      console.error("Error processing final analysis:", error)
      setError("Failed to process final analysis")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading surah data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push("/")} variant="outline" className="bg-white text-gray-700 border-gray-300">
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Surah Text Display */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-right" dir="rtl">
                  {surahData?.name} - {surahData?.englishName}
                </CardTitle>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{surahData?.ayahs.length} Ayahs</Badge>
                  <Progress value={progress} className="w-1/2" />
                  <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="text-right text-xl leading-relaxed font-arabic p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto"
                  dir="rtl"
                  style={{ fontFamily: "Amiri, serif" }}
                >
                  {fullText}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls and Feedback */}
          <div className="space-y-6">
            {/* Recording Controls */}
            <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mic className="h-5 w-5 mr-2" />
                  Recording Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!sessionStarted ? (
                  <Button
                    onClick={startRecording}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Recitation
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {isRecording ? (
                      <Button onClick={stopRecording} className="w-full bg-red-600 hover:bg-red-700 text-white py-3">
                        <Square className="h-5 w-5 mr-2" />
                        Stop & Analyze
                      </Button>
                    ) : (
                      <Button
                        onClick={startRecording}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
                      >
                        <Mic className="h-5 w-5 mr-2" />
                        Resume Recording
                      </Button>
                    )}

                    {isRecording && (
                      <div className="flex items-center justify-center text-red-600">
                        <div className="animate-pulse flex items-center">
                          <div className="h-3 w-3 bg-red-600 rounded-full mr-2"></div>
                          Recording...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-time Feedback */}
            {sessionStarted && (
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Real-time Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Position:</span> {currentPosition} / {totalWords} words
                    </div>

                    {currentTranscript && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-800 mb-1">Current:</div>
                        <div className="text-right" dir="rtl">
                          {currentTranscript}
                        </div>
                      </div>
                    )}

                    {realtimeErrors.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        <div className="text-sm font-medium text-red-800">Recent Errors:</div>
                        {realtimeErrors.slice(-3).map((error, index) => (
                          <Alert key={index} className="border-red-200 bg-red-50">
                            <AlertDescription className="text-sm">
                              <div className="flex justify-between items-center">
                                <Badge variant="destructive" className="text-xs">
                                  {error.type}
                                </Badge>
                                <div className="text-right" dir="rtl">
                                  <div>Said: {error.spoken}</div>
                                  <div>Expected: {error.expected}</div>
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}

                    {realtimeErrors.length === 0 && sessionStarted && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm">No errors detected so far!</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 text-sm">{error}</p>
                {error.includes("Network") && (
                  <Button
                    onClick={() => {
                      setError("")
                      if (isRecording) {
                        startRecording()
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-white text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Retry Connection
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
