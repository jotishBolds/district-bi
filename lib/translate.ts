/**
 * Sarvam AI Translation Utility (Server-side)
 *
 * Uses the Sarvam AI SDK with sarvam-translate:v1 which supports:
 * - Hindi (hi-IN), Nepali (ne-IN), and all other Indic languages
 * - In-memory caching to minimise API calls
 * - Chunking for long text
 * - Rate-limit aware with exponential backoff
 */

import { SarvamAIClient, SarvamAI } from "sarvamai";

const MAX_CHUNK = 800;
const INTER_REQUEST_DELAY_MS = 300;
const MAX_RETRIES = 4;

// Lazy singleton client
let _client: SarvamAIClient | null = null;
function getSarvamClient(): SarvamAIClient | null {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
  }
  return _client;
}

// In-memory cache: "lang:hash" → translated text
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
  ne: "ne-IN",
  en: "en-IN",
};

/** Call Sarvam Translate API for a single chunk via SDK */
async function callSarvamApi(
  text: string,
  targetLang: string,
): Promise<string> {
  const client = getSarvamClient();
  if (!client) return text;

  const targetCode = (langCodeMap[targetLang] ||
    targetLang) as SarvamAI.TranslateTargetLanguage;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await client.text.translate({
        input: text,
        source_language_code: "en-IN",
        target_language_code: targetCode,
        model: "sarvam-translate:v1",
      });
      return result.translated_text || text;
    } catch (err: unknown) {
      const status =
        (err as { status?: number })?.status ??
        (err as { statusCode?: number })?.statusCode;
      if (status === 429 && attempt < MAX_RETRIES) {
        const backoff = Math.min(1000 * 2 ** attempt, 16000);
        await sleep(backoff);
        continue;
      }
      return text;
    }
  }
  return text;
}

/** Split long text into chunks at sentence boundaries */
function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK) {
      chunks.push(remaining);
      break;
    }

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
 * Translate a single text string.
 * Returns original text for "en" locale.
 */
export async function translateText(
  text: string,
  targetLang: string,
): Promise<string> {
  if (!text?.trim() || targetLang === "en") return text;

  const key = getCacheKey(text, targetLang);
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const chunks = splitIntoChunks(text);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      const chunkKey = getCacheKey(chunk, targetLang);
      const cachedChunk = cache.get(chunkKey);
      if (cachedChunk) {
        translatedChunks.push(cachedChunk);
      } else {
        const result = await callSarvamApi(chunk, targetLang);
        cache.set(chunkKey, result);
        translatedChunks.push(result);
        await sleep(INTER_REQUEST_DELAY_MS);
      }
    }

    const translated = translatedChunks.join(" ");
    cache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

/**
 * Translate multiple texts in batch.
 * Deduplicates matching strings to minimise API calls.
 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  if (targetLang === "en") return texts;

  // Deduplicate
  const unique = [...new Set(texts.filter((t) => t?.trim()))];
  const map = new Map<string, string>();

  for (const text of unique) {
    map.set(text, await translateText(text, targetLang));
  }

  return texts.map((t) => (t?.trim() ? (map.get(t) ?? t) : t));
}

/**
 * Translate specific fields of an object.
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

/** Cache size (for monitoring) */
export function getTranslationCacheSize(): number {
  return cache.size;
}
