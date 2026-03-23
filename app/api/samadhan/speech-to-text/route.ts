import { NextRequest, NextResponse } from "next/server";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

// Allowed language codes for STT
const ALLOWED_LANGUAGES = ["hi-IN", "ne-IN", "en-IN", "unknown"] as const;
type LanguageCode = (typeof ALLOWED_LANGUAGES)[number];

export async function POST(request: NextRequest) {
  try {
    if (!SARVAM_API_KEY) {
      return NextResponse.json(
        { success: false, message: "Speech-to-text service not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("file") as File | null;
    const languageCode = (formData.get("language_code") as string) || "unknown";

    if (!audioFile) {
      return NextResponse.json(
        { success: false, message: "No audio file provided" },
        { status: 400 },
      );
    }

    // Validate language code
    if (!ALLOWED_LANGUAGES.includes(languageCode as LanguageCode)) {
      return NextResponse.json(
        { success: false, message: "Unsupported language code" },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Audio file too large (max 10MB)" },
        { status: 400 },
      );
    }

    // Forward audio to Sarvam AI STT API
    const sarvamFormData = new FormData();
    sarvamFormData.append("file", audioFile);
    sarvamFormData.append("language_code", languageCode);
    sarvamFormData.append("model", "saarika:v2");
    sarvamFormData.append("with_timestamps", "false");

    const sarvamResponse = await fetch(SARVAM_STT_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: sarvamFormData,
    });

    if (!sarvamResponse.ok) {
      const errorData = await sarvamResponse.json().catch(() => null);
      console.error("Sarvam STT error:", sarvamResponse.status, errorData);

      if (sarvamResponse.status === 403) {
        return NextResponse.json(
          { success: false, message: "Speech-to-text API key is invalid" },
          { status: 500 },
        );
      }
      if (sarvamResponse.status === 429) {
        return NextResponse.json(
          { success: false, message: "Too many requests. Please try again." },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { success: false, message: "Speech-to-text conversion failed" },
        { status: 500 },
      );
    }

    const result = await sarvamResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        transcript: result.transcript || "",
        language_code: result.language_code || languageCode,
      },
    });
  } catch (error) {
    console.error("Speech-to-text error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
