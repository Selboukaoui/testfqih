import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

interface ErrorDetail {
  type: "incorrect" | "missing" | "extra"
  spoken?: string
  correct?: string
  missing?: string
  extra?: string
  similarity?: number
}

// Arabic text normalization function - Enhanced to ignore all diacritics
function normalizeArabicText(text: string): string {
  if (!text) return ""

  // Remove all Arabic diacritics (tashkeel) and pronunciation marks
  const normalized = text
    .replace(/[\u064B-\u0652]/g, "") // Remove all diacritics (fatha, damma, kasra, sukun, etc.)
    .replace(/[\u0653-\u0655]/g, "") // Remove additional diacritics
    .replace(/[\u0656-\u065F]/g, "") // Remove more diacritics
    .replace(/[\u0670]/g, "") // Remove superscript alif
    .replace(/[\u06D6-\u06ED]/g, "") // Remove Quranic annotation marks
    .replace(/[\u0640]/g, "") // Remove tatweel (kashida)
    .replace(/[أإآٱ]/g, "ا") // Normalize Alif variations
    .replace(/[ىئ]/g, "ي") // Normalize Ya variations
    .replace(/ة/g, "ه") // Normalize Ta Marbuta
    .replace(/$$\s*\d+\s*$$/g, "") // Remove verse numbers
    .replace(/\d+/g, "") // Remove standalone digits
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()

  return normalized
}

// Calculate text similarity
function calculateTextSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeArabicText(text1)
  const norm2 = normalizeArabicText(text2)

  if (norm1 === norm2) return 1.0

  const words1 = norm1.split(/\s+/)
  const words2 = norm2.split(/\s+/)

  const maxLength = Math.max(words1.length, words2.length)
  if (maxLength === 0) return 1.0

  let matches = 0
  const used = new Set<number>()

  for (const word1 of words1) {
    for (let j = 0; j < words2.length; j++) {
      if (!used.has(j) && word1 === words2[j]) {
        matches++
        used.add(j)
        break
      }
    }
  }

  return matches / maxLength
}

// Compare texts and find differences
function compareTexts(spoken: string, original: string): { differences: ErrorDetail[]; similarity: number } {
  const spokenNormalized = normalizeArabicText(spoken)
  const originalNormalized = normalizeArabicText(original)

  const similarity = calculateTextSimilarity(spokenNormalized, originalNormalized)

  const spokenWords = spokenNormalized.split(/\s+/).filter((w) => w.trim())
  const originalWords = originalNormalized.split(/\s+/).filter((w) => w.trim())

  const differences: ErrorDetail[] = []

  // Simple word-by-word comparison
  const maxLength = Math.max(spokenWords.length, originalWords.length)

  for (let i = 0; i < maxLength; i++) {
    const spokenWord = spokenWords[i]
    const originalWord = originalWords[i]

    if (spokenWord && originalWord) {
      if (spokenWord !== originalWord) {
        differences.push({
          type: "incorrect",
          spoken: spokenWord,
          correct: originalWord,
          similarity: Math.round(calculateTextSimilarity(spokenWord, originalWord) * 100),
        })
      }
    } else if (spokenWord && !originalWord) {
      differences.push({
        type: "extra",
        extra: spokenWord,
      })
    } else if (!spokenWord && originalWord) {
      differences.push({
        type: "missing",
        missing: originalWord,
      })
    }
  }

  return { differences, similarity }
}

// Generate AI-powered improvement suggestions using Gemini
async function generateImprovementSuggestions(differences: ErrorDetail[], accuracy: number): Promise<string[]> {
  try {
    const googleAI = createGoogleGenerativeAI({
      apiKey: "AIzaSyAEwAIlM77vnj7VroF_hRZZrisBW4Q5lXw",
    })

    const incorrectCount = differences.filter((d) => d.type === "incorrect").length
    const missingCount = differences.filter((d) => d.type === "missing").length
    const extraCount = differences.filter((d) => d.type === "extra").length

    const prompt = `As a Quran recitation teacher, provide 3-5 specific improvement suggestions for a student with the following performance:
    
    - Overall accuracy: ${accuracy}%
    - Incorrect words: ${incorrectCount}
    - Missing words: ${missingCount}
    - Extra words: ${extraCount}
    
    Focus on practical advice for improving Quran recitation, including Tajweed rules, pronunciation tips, and memorization techniques. Keep suggestions encouraging and specific to Arabic/Quranic recitation.
    
    Format your response as a numbered list with emojis, for example:
    1. 🎯 Focus on pronunciation accuracy
    2. 📚 Practice with Tajweed rules
    etc.`

    const { text } = await generateText({
      model: googleAI("gemini-1.5-flash"),
      prompt,
      system:
        "You are an experienced Quran teacher providing constructive feedback to help students improve their recitation.",
    })

    // Parse the response into individual suggestions
    const suggestions = text
      .split("\n")
      .filter((line) => line.trim() && (line.includes("•") || line.includes("-") || line.match(/^\d+\./)))
      .map((line) => line.replace(/^[•\-\d.]\s*/, "").trim())
      .filter((suggestion) => suggestion.length > 10)

    // Fallback suggestions if AI doesn't provide good ones
    if (suggestions.length === 0) {
      return [
        "🎯 Focus on pronunciation accuracy - review the correct pronunciation of challenging words",
        "📚 Practice with Tajweed rules for better recitation flow",
        "🔄 Try reciting slower to avoid missing or adding extra words",
        "🎧 Listen to professional recitations to improve your rhythm and pronunciation",
        "🕌 Consider practicing with a Quran teacher for personalized guidance",
      ]
    }

    return suggestions.slice(0, 5) // Limit to 5 suggestions
  } catch (error) {
    console.error("Error generating AI suggestions:", error)
    // Return fallback suggestions
    return [
      "🎯 Focus on pronunciation accuracy and take your time with each word",
      "📚 Review Tajweed rules to improve your recitation technique",
      "🔄 Practice regularly and recite slowly for better accuracy",
      "🎧 Listen to professional recitations for reference",
      "🌟 Keep practicing - improvement comes with consistent effort!",
    ]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, fullText, surahData, realtimeErrors } = await request.json()

    if (!transcript || !fullText) {
      return NextResponse.json({ error: "Missing transcript or surah text" }, { status: 400 })
    }

    // Comprehensive text comparison
    const { differences, similarity } = compareTexts(transcript, fullText)

    // Calculate metrics
    const totalWords = normalizeArabicText(fullText)
      .split(/\s+/)
      .filter((w) => w.trim()).length
    const spokenWords = normalizeArabicText(transcript)
      .split(/\s+/)
      .filter((w) => w.trim()).length

    // Categorize errors
    const errorsByType = {
      incorrect: differences.filter((d) => d.type === "incorrect"),
      missing: differences.filter((d) => d.type === "missing"),
      extra: differences.filter((d) => d.type === "extra"),
    }

    const errorCounts = {
      incorrect: errorsByType.incorrect.length,
      missing: errorsByType.missing.length,
      extra: errorsByType.extra.length,
    }

    // Calculate percentages
    const accuracyPercentage = similarity * 100
    const completionPercentage = Math.min((spokenWords / totalWords) * 100, 100)

    // Generate AI-powered suggestions using Gemini
    const suggestions = await generateImprovementSuggestions(differences, accuracyPercentage)

    // Create comprehensive analysis
    const analysis = {
      overall_accuracy: Math.round(accuracyPercentage * 10) / 10,
      completion_percentage: Math.round(completionPercentage * 10) / 10,
      total_words: totalWords,
      spoken_words: spokenWords,
      total_errors: differences.length,
      errors_by_type: errorsByType,
      error_counts: errorCounts,
      suggestions,
      timestamp: new Date().toLocaleString(),
      session_duration: "N/A", // Could be calculated if we track start time
      processing_info: {
        enhanced_arabic_processing: true,
        ai_suggestions: true,
        ai_provider: "Google Gemini",
        normalization_applied: true,
      },
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error in final-analysis:", error)
    return NextResponse.json({ error: "Failed to process final analysis" }, { status: 500 })
  }
}
