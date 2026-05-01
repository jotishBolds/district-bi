import { NextRequest, NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

// Language codes for translation
const TRANSLATE_LANGUAGES = ["en-IN", "hi-IN", "ne-IN"] as const;
type TranslateLanguage = (typeof TRANSLATE_LANGUAGES)[number];

interface AIAssistRequest {
  prompt: string;
  field: "subject" | "description";
  action: "write" | "summarize" | "improve";
  currentText?: string;
  languages?: TranslateLanguage[];
}

/**
 * Strip <think>...</think> blocks and any leftover reasoning from model output.
 * Returns only the final clean answer text.
 * Falls back to extracting text after the last </think> tag if everything was stripped.
 */
function cleanModelOutput(raw: string): string {
  // First, try to get text that comes AFTER the last </think> tag (most reliable)
  const afterThinkMatch = /^[\s\S]*<\/think>([\s\S]+)$/i.exec(raw);
  if (afterThinkMatch?.[1]?.trim()) {
    return afterThinkMatch[1].trim();
  }

  // Remove all complete <think>...</think> blocks
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Remove an unclosed <think> block that consumed the rest of the output
  cleaned = cleaned.replace(/<think>[\s\S]*/i, "");
  cleaned = cleaned.trim();

  // If nothing remained (model used all tokens on thinking), surface a fallback:
  // take the last coherent sentence from inside the think block as the answer
  if (!cleaned) {
    const innerThink = /<think>([\s\S]*?)(?:<\/think>|$)/i.exec(raw)?.[1] ?? "";
    // The last paragraph/sentence of reasoning is usually the actual answer
    const parts = innerThink
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    cleaned = parts[parts.length - 1] ?? "";
    // Strip any meta-commentary like "The subject line is:" prefix
    cleaned = cleaned
      .replace(/^(the subject(?: line)? is:?|answer:?|output:?)\s*/i, "")
      .trim();
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;

  try {
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "AI service not configured" },
        { status: 500 },
      );
    }

    const body: AIAssistRequest = await request.json();
    const { prompt, field, action, currentText, languages } = body;

    if (!prompt || !field || !action) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate prompt length
    if (prompt.length > 500) {
      return NextResponse.json(
        { success: false, message: "Prompt too long (max 500 characters)" },
        { status: 400 },
      );
    }

    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

    // Build system prompt based on field and action
    let systemPrompt = "";
    let userPrompt = "";

    if (field === "subject") {
      systemPrompt =
        "You are a helpful assistant for a citizen grievance portal called SAMADHAN. " +
        "Help citizens write clear, concise subject lines for their grievance or feedback submissions. " +
        "The subject should be under 120 characters, factual, and clearly describe the issue. " +
        "IMPORTANT: Respond ONLY with the final subject text. Do NOT include any thinking, reasoning, " +
        "XML tags, quotes, prefixes, or explanations. Output the subject line directly.";
    } else {
      systemPrompt =
        "You are a helpful assistant for a citizen grievance portal called SAMADHAN. " +
        "Help citizens write clear, detailed descriptions for their grievance or feedback submissions. " +
        "The description should be factual, respectful, and include relevant details like what happened, " +
        "when, where, and what resolution is expected. " +
        "IMPORTANT: Respond ONLY with the final description text. Do NOT include any thinking, reasoning, " +
        "XML tags, quotes, prefixes, or explanations. Output the description directly.";
    }

    if (action === "write") {
      userPrompt = `Write a ${field === "subject" ? "subject line (max 120 characters)" : "detailed description (150-500 words)"} for this citizen grievance/feedback: ${prompt}`;
    } else if (action === "summarize") {
      userPrompt = `Summarize and improve the following ${field === "subject" ? "subject line" : "description"} to make it clearer and more concise:\n\n${currentText || prompt}`;
    } else if (action === "improve") {
      userPrompt = `Improve the following ${field === "subject" ? "subject line" : "description"} to make it more clear, detailed, and professional while keeping the same meaning:\n\n${currentText || prompt}`;
    }

    // Get AI-generated text using Sarvam chat.
    // reasoning_effort:"low" minimises the token budget spent on <think> blocks
    // so the model has plenty of tokens left for the actual answer.
    const chatResponse = await client.chat.completions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "sarvam-m",
      temperature: 0.3,
      reasoning_effort: "low",
      max_tokens: field === "subject" ? 800 : 2000,
    });

    const rawText = chatResponse.choices?.[0]?.message?.content?.trim() ?? "";

    // Clean out any <think> blocks or reasoning artifacts
    const generatedText = cleanModelOutput(rawText);

    if (!generatedText) {
      console.error(
        "Sarvam AI returned empty content after cleaning. Raw:",
        rawText.slice(0, 300),
      );
      return NextResponse.json(
        { success: false, message: "AI could not generate text. Try again." },
        { status: 500 },
      );
    }

    // Translate to requested languages
    const translations: Record<string, string> = { "en-IN": generatedText };
    const targetLanguages = (languages || TRANSLATE_LANGUAGES).filter(
      (l) => l !== "en-IN",
    );

    // Use sarvam-translate:v1 which supports all 22 scheduled Indian languages
    // including Nepali (ne-IN), unlike mayura:v1 which may not handle it well
    const translatePromises = targetLanguages.map(async (lang) => {
      try {
        const translateResponse = await client.text.translate({
          input: generatedText,
          source_language_code: "en-IN",
          target_language_code: lang,
          model: "sarvam-translate:v1",
        });
        return {
          lang,
          text: translateResponse.translated_text ?? generatedText,
        };
      } catch {
        // If translation fails for a language, use the English text
        return { lang, text: generatedText };
      }
    });

    const translateResults = await Promise.all(translatePromises);
    for (const { lang, text } of translateResults) {
      translations[lang] = text;
    }

    return NextResponse.json({
      success: true,
      data: {
        text: generatedText,
        translations,
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

    console.error("Sarvam AI assist error:", status, msg);

    if (status === 403) {
      return NextResponse.json(
        { success: false, message: "AI service API key is invalid" },
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
        message: "AI assistance failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
