/**
 * Sarvam AI Translation Utility
 *
 * - Translates text using the Sarvam Translate API
 * - Caches results in-memory to minimize API calls
 * - Falls back to original text on error
 * - Supports plain text and HTML content
 */

const SARVAM_API_URL = "https://api.sarvam.ai/translate";
const MAX_CHUNK = 800; // Sarvam limit per request (safe margin)
const INTER_REQUEST_DELAY_MS = 300; // delay between sequential API calls
const MAX_RETRIES = 4;

// In-memory translation cache: "lang:hash" → translated text
const cache = new Map<string, string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function getCacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${simpleHash(text)}`;
}

const langCodeMap: Record<string, string> = {
  hi: "hi-IN",
  en: "en-IN",
};

/** Strip HTML tags to get plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Call the Sarvam AI Translate API for a single chunk of plain text.
 *  Ref: https://docs.sarvam.ai/api-reference-docs/text/translate-text
 *  - mayura:v1  — max 1000 chars, supports auto source detection
 *  - sarvam-translate:v1 — max 2000 chars, formal mode only, 22 languages
 */
async function callSarvamApi(
  text: string,
  targetLang: string,
  apiKey: string,
): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(SARVAM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: "en-IN",
        target_language_code: langCodeMap[targetLang] || "hi-IN",
        mode: "formal",
        model: "mayura:v1",
      }),
    });

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        const backoff = Math.min(1000 * 2 ** attempt, 16000);
        console.warn(
          `[translate] Rate limited (429). Retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await sleep(backoff);
        continue;
      }
      console.error("[translate] API error:", res.status, await res.text());
      return text;
    }

    if (!res.ok) {
      console.error("[translate] API error:", res.status, await res.text());
      return text;
    }

    const data = await res.json();
    return data.translated_text || text;
  }
  return text;
}

/** Split text into chunks at sentence boundaries within MAX_CHUNK */
function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a sentence boundary
    let cutAt = -1;
    const searchRange = remaining.slice(0, MAX_CHUNK);
    for (const sep of [". ", "। ", ".\n", "\n\n", "\n", ", ", " "]) {
      const idx = searchRange.lastIndexOf(sep);
      if (idx > MAX_CHUNK * 0.3) {
        cutAt = idx + sep.length;
        break;
      }
    }
    if (cutAt === -1) cutAt = MAX_CHUNK;

    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Translate a single text string using Sarvam AI.
 * Automatically chunks long text.
 */
export async function translateText(
  text: string,
  targetLang: string,
): Promise<string> {
  if (!text || targetLang === "en") return text;

  const key = getCacheKey(text, targetLang);
  const cached = cache.get(key);
  if (cached) return cached;

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.warn("[translate] SARVAM_API_KEY not set, returning original text");
    return text;
  }

  try {
    const chunks = splitIntoChunks(text);
    const translatedChunks: string[] = [];
    for (const chunk of chunks) {
      // Check per-chunk cache
      const chunkKey = getCacheKey(chunk, targetLang);
      const cachedChunk = cache.get(chunkKey);
      if (cachedChunk) {
        translatedChunks.push(cachedChunk);
      } else {
        const result = await callSarvamApi(chunk, targetLang, apiKey);
        cache.set(chunkKey, result);
        translatedChunks.push(result);
        // Throttle sequential requests to stay within rate limits
        await sleep(INTER_REQUEST_DELAY_MS);
      }
    }

    const translated = translatedChunks.join(" ");
    cache.set(key, translated);
    return translated;
  } catch (err) {
    console.error("[translate] Error:", err);
    return text;
  }
}

/**
 * Translate HTML content: strips tags, translates the plain text,
 * then wraps in paragraph tags.
 */
export async function translateHtml(
  html: string,
  targetLang: string,
): Promise<string> {
  if (!html || targetLang === "en") return html;

  const key = getCacheKey(`html:${html}`, targetLang);
  const cached = cache.get(key);
  if (cached) return cached;

  // Split HTML by block elements to preserve some structure
  const blocks = html
    .split(/<\/(?:p|div|h[1-6]|li|blockquote|tr)>/gi)
    .map((block) => stripHtml(block))
    .filter((block) => block.length > 0);

  if (blocks.length === 0) return html;

  const translatedBlocks: string[] = [];
  for (const block of blocks) {
    const translated = await translateText(block, targetLang);
    translatedBlocks.push(translated);
  }

  const result = translatedBlocks.map((b) => `<p>${b}</p>`).join("\n");
  cache.set(key, result);
  return result;
}

/**
 * Translate multiple texts in batch (sequential to respect rate limits)
 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  if (targetLang === "en") return texts;
  const results: string[] = [];
  for (const t of texts) {
    results.push(await translateText(t, targetLang));
  }
  return results;
}

/**
 * Translate specific fields of an object
 */
export async function translateFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
  targetLang: string,
): Promise<T> {
  if (targetLang === "en") return obj;

  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value.trim()) {
      (result as Record<string, unknown>)[field] = await translateText(
        value,
        targetLang,
      );
    }
  }
  return result;
}

/** Get current cache size (for monitoring) */
export function getTranslationCacheSize(): number {
  return cache.size;
}

/**
 * Translate content at write-time for storage in the DB.
 * Translates specified text fields (plain) and HTML fields to Hindi,
 * returning a translations object: `{ hi: { field: "translated", ... } }`.
 * Returns null if nothing could be translated.
 */
export async function translateForStorage(
  data: Record<string, unknown>,
  textFields: string[],
  htmlFields: string[] = [],
): Promise<Record<string, Record<string, string>> | null> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.warn(
      "[translate] SARVAM_API_KEY not set, skipping storage translation",
    );
    return null;
  }

  try {
    const hi: Record<string, string> = {};

    for (const field of textFields) {
      const val = data[field];
      if (typeof val === "string" && val.trim()) {
        hi[field] = await translateText(val, "hi");
      }
    }

    for (const field of htmlFields) {
      const val = data[field];
      if (typeof val === "string" && val.trim()) {
        hi[field] = await translateHtml(val, "hi");
      }
    }

    if (Object.keys(hi).length === 0) return null;
    return { hi };
  } catch (err) {
    console.error("[translate] translateForStorage error:", err);
    return null;
  }
}
