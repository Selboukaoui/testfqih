"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Mic, Volume2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Surah {
  number: number
  name: string
  englishName: string
  numberOfAyahs: number
  revelationType: string
}

export default function HomePage() {
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [selectedSurah, setSelectedSurah] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchSurahs()
  }, [])

  const fetchSurahs = async () => {
    try {
      const response = await fetch("https://api.alquran.cloud/v1/surah")
      const data = await response.json()
      if (data.code === 200) {
        setSurahs(data.data)
      }
    } catch (error) {
      console.error("Error fetching surahs:", error)
    } finally {
      setLoading(false)
    }
  }

  const startRecitation = () => {
    if (selectedSurah) {
      router.push(`/recite/${selectedSurah}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-emerald-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">AI Quran Recitation Checker</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Practice your Quran recitation with AI-powered feedback. Get real-time corrections and detailed analysis to
            improve your pronunciation and accuracy.
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mic className="h-6 w-6 mr-2 text-emerald-600" />
              Select a Surah to Begin
            </CardTitle>
            <CardDescription>
              Choose the surah you want to practice. The AI will listen to your recitation and provide instant feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Choose Surah</label>
              <Select value={selectedSurah} onValueChange={setSelectedSurah}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? "Loading surahs..." : "Select a surah"} />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="w-full">
                  {surahs.map((surah) => (
                    <SelectItem key={surah.number} value={surah.number.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>
                          {surah.number}. {surah.name}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">({surah.englishName})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 text-center">
                  <Mic className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-emerald-800">Real-time Feedback</h3>
                  <p className="text-sm text-emerald-600">Get instant corrections as you recite</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Volume2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-800">Arabic Processing</h3>
                  <p className="text-sm text-blue-600">Advanced Arabic text normalization</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-purple-800">Detailed Analysis</h3>
                  <p className="text-sm text-purple-600">Comprehensive recitation report</p>
                </CardContent>
              </Card>
            </div>

            <Button
              onClick={startRecitation}
              disabled={!selectedSurah || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Recitation Practice
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Make sure your microphone is enabled for the best experience</p>
        </div>
      </div>
    </div>
  )
}
