import { type NextRequest, NextResponse } from "next/server"

interface RealtimeError {
  position: number
  spoken: string
  expected: string
  type: "incorrect" | "extra" | "missing"
  similarity: number
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

// Calculate similarity between two words
function calculateSimilarity(word1: string, word2: string): number {
  const norm1 = normalizeArabicText(word1)
  const norm2 = normalizeArabicText(word2)

  if (norm1 === norm2) return 1.0

  // Simple similarity calculation based on character overlap
  const chars1 = new Set(norm1.split(""))
  const chars2 = new Set(norm2.split(""))
  const intersection = new Set([...chars1].filter((x) => chars2.has(x)))
  const union = new Set([...chars1, ...chars2])

  return union.size > 0 ? intersection.size / union.size : 0
}

// Check current words against expected text
function checkCurrentWords(
  spoken: string,
  fullText: string,
  position: number,
): { errors: RealtimeError[]; newPosition: number } {
  if (!spoken || !fullText) {
    return { errors: [], newPosition: position }
  }

  const spokenNormalized = normalizeArabicText(spoken)
  const spokenWords = spokenNormalized.split(/\s+/).filter((w) => w.trim())

  const fullNormalized = normalizeArabicText(fullText)
  const allWords = fullNormalized.split(/\s+/).filter((w) => w.trim())

  if (position >= allWords.length) {
    return { errors: [], newPosition: position }
  }

  const errors: RealtimeError[] = []
  let processedWords = 0

  for (let i = 0; i < spokenWords.length; i++) {
    const expectedPosition = position + i

    if (expectedPosition < allWords.length) {
      const expectedWord = allWords[expectedPosition]
      const similarity = calculateSimilarity(spokenWords[i], expectedWord)

      if (similarity < 0.8) {
        // Threshold for considering words similar
        errors.push({
          position: expectedPosition,
          spoken: spokenWords[i],
          expected: expectedWord,
          type: "incorrect",
          similarity: Math.round(similarity * 100),
        })
      } else {
        processedWords++
      }
    } else {
      // Extra word
      errors.push({
        position: expectedPosition,
        spoken: spokenWords[i],
        expected: "",
        type: "extra",
        similarity: 0,
      })
    }
  }

  const newPosition = position + processedWords
  return { errors, newPosition }
}

export async function POST(request: NextRequest) {
  try {
    const { spokenText, fullText, currentPosition } = await request.json()

    const result = checkCurrentWords(spokenText, fullText, currentPosition)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in check-recitation:", error)
    return NextResponse.json({ error: "Failed to process recitation check" }, { status: 500 })
  }
}
