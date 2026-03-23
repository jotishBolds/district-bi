import { NextRequest, NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

// Allowed language codes for STT
const ALLOWED_LANGUAGES = ["hi-IN", "ne-IN", "en-IN", "unknown"] as const;
type LanguageCode = (typeof ALLOWED_LANGUAGES)[number];

export async function POST(request: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;

  try {
    if (!apiKey) {
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

    // Validate file size (max 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Audio file too large (max 25MB)" },
        { status: 400 },
      );
    }

    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

    const audioBuffer = await audioFile.arrayBuffer();
    const ext = audioFile.name.split(".").pop() ?? "webm";
    const mimeMap: Record<string, string> = {
      webm: "audio/webm",
      wav: "audio/wav",
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
    };
    const mimeType = mimeMap[ext] ?? audioFile.type ?? "audio/webm";
    const file = new File([audioBuffer], audioFile.name, { type: mimeType });

    // Use saaras:v3 (best accuracy) for all requests.
    // ne-IN is only supported by saaras:v3, so this model is always appropriate.
    const result = await client.speechToText.transcribe({
      file,
      model: "saaras:v3",
      mode: "transcribe",
      language_code: languageCode as LanguageCode,
    });

    return NextResponse.json({
      success: true,
      data: {
        transcript: result.transcript ?? "",
        language_code: result.language_code ?? languageCode,
      },
    });
  } catch (error: unknown) {
    const err = error as {
      statusCode?: number;
      message?: string;
      body?: { error?: { message?: string } };
    };

    const status = err?.statusCode;
    const msg = err?.body?.error?.message ?? err?.message ?? "Unknown error";

    console.error("Sarvam STT error:", status, msg);

    if (status === 400 && msg.toLowerCase().includes("30 seconds")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Recording too long. Please keep recordings under 30 seconds.",
        },
        { status: 400 },
      );
    }
    if (status === 403) {
      return NextResponse.json(
        { success: false, message: "Speech-to-text API key is invalid" },
        { status: 500 },
      );
    }
    if (status === 429) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Speech-to-text conversion failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
