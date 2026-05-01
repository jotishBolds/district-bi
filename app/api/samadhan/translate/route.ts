import { NextRequest, NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

const SUPPORTED_LANGUAGES = ["en-IN", "hi-IN", "ne-IN"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

interface TranslateRequest {
  text: string;
  targetLanguage: SupportedLanguage;
  sourceLanguage?: SupportedLanguage;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;

  try {
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Translation service not configured" },
        { status: 500 },
      );
    }

    const body: TranslateRequest = await request.json();
    const { text, targetLanguage, sourceLanguage } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return NextResponse.json(
        { success: false, message: "Unsupported target language" },
        { status: 400 },
      );
    }

    // Limit text length to prevent abuse
    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, message: "Text too long (max 5000 characters)" },
        { status: 400 },
      );
    }

    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

    // Detect the source language so we never send source == target
    let detectedSource: string = "auto";
    try {
      const lid = await client.text.identifyLanguage({
        input: text.slice(0, 500),
      });
      // lid returns e.g. { language_code: "hi-IN", ... }
      detectedSource =
        (lid as { language_code?: string }).language_code ?? "auto";
    } catch {
      // If LID fails, fall back to "auto" — the translate API supports it
    }

    // If source language is the same as target, return original text immediately
    if (detectedSource !== "auto" && detectedSource === targetLanguage) {
      return NextResponse.json({
        success: true,
        data: {
          translatedText: text,
          sourceLanguage: detectedSource,
          targetLanguage,
          alreadyInTargetLanguage: true,
        },
      });
    }

    const translateResponse = await client.text.translate({
      input: text,
      source_language_code: detectedSource as "auto",
      target_language_code: targetLanguage,
      model: "sarvam-translate:v1",
    });

    const translatedText = translateResponse.translated_text ?? "";

    if (!translatedText) {
      return NextResponse.json(
        { success: false, message: "Translation failed. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        translatedText,
        sourceLanguage: detectedSource,
        targetLanguage,
      },
    });
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { success: false, message: "Translation service error" },
      { status: 500 },
    );
  }
}
