import { NextRequest, NextResponse } from "next/server";
import { translateBatch } from "@/lib/translate";

/**
 * POST /api/samadhan/translate-batch
 * Body: { texts: string[], targetLang: "hi" | "ne" }
 * Returns: { success: true, data: { translations: string[] } }
 *
 * Translates an array of dynamic content strings (service names,
 * section names, categories, etc.) to the requested locale.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts, targetLang } = body as {
      texts: string[];
      targetLang: string;
    };

    if (!texts || !Array.isArray(texts) || !targetLang) {
      return NextResponse.json(
        { success: false, message: "Missing texts or targetLang" },
        { status: 400 },
      );
    }

    if (!["hi", "ne"].includes(targetLang)) {
      // For English, just return as-is
      return NextResponse.json({
        success: true,
        data: { translations: texts },
      });
    }

    // Cap at 50 strings per request to prevent abuse
    if (texts.length > 50) {
      return NextResponse.json(
        { success: false, message: "Too many texts (max 50)" },
        { status: 400 },
      );
    }

    const translations = await translateBatch(texts, targetLang);

    return NextResponse.json({
      success: true,
      data: { translations },
    });
  } catch (error) {
    console.error("Batch translate error:", error);
    return NextResponse.json(
      { success: false, message: "Translation service error" },
      { status: 500 },
    );
  }
}
