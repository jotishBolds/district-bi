"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

/**
 * Client-side hook that translates an array of dynamic strings
 * whenever the locale changes.
 *
 * Usage:
 *   const dt = useDynamicTranslation(["Land Registration", "Revenue Section"]);
 *   // dt("Land Registration") → "भूमि पंजीकरण" (when locale is "hi")
 *   // dt("Land Registration") → "भूमि दर्ता" (when locale is "ne")
 *
 * Features:
 * - Batches all strings into a single API call
 * - Caches results per locale in sessionStorage
 * - Returns originals instantly while translations load
 * - No-ops for English locale
 * - Uses generation counter to discard stale responses (prevents
 *   hi→ne race where Hindi translations overwrite Nepali context)
 */

const STORAGE_PREFIX = "dt:v2:";

function getCacheKey(locale: string, text: string): string {
  return `${STORAGE_PREFIX}${locale}:${text}`;
}

export function useDynamicTranslation(texts: string[]) {
  const { locale } = useSamadhanI18n();
  const [translations, setTranslations] = useState<Map<string, string>>(
    new Map(),
  );
  // Incremented every time a new fetch is initiated.
  // Callbacks check this to discard stale responses.
  const generationRef = useRef(0);
  const lastLocaleRef = useRef<string>("");

  // Stable key to detect when the texts array meaningfully changes
  const textsKey = texts.filter(Boolean).sort().join("|");

  useEffect(() => {
    // English: clear any translated map and return originals
    if (locale === "en") {
      setTranslations(new Map());
      return;
    }

    const validTexts = texts.filter((t) => t?.trim());
    if (validTexts.length === 0) return;

    // Locale changed — clear stale translations immediately so we show
    // the original English text rather than the wrong language's translation.
    if (lastLocaleRef.current !== locale) {
      lastLocaleRef.current = locale;
      setTranslations(new Map());
    }

    // Capture the current generation for this effect run
    const generation = ++generationRef.current;

    // Check sessionStorage cache first
    const cached = new Map<string, string>();
    const uncached: string[] = [];

    for (const text of validTexts) {
      try {
        const stored = sessionStorage.getItem(getCacheKey(locale, text));
        if (stored) {
          cached.set(text, stored);
        } else {
          uncached.push(text);
        }
      } catch {
        uncached.push(text);
      }
    }

    // All already cached — apply immediately
    if (uncached.length === 0) {
      if (generationRef.current === generation) {
        setTranslations(cached);
      }
      return;
    }

    // Apply cached entries immediately while we wait for the API
    if (cached.size > 0 && generationRef.current === generation) {
      setTranslations(new Map(cached));
    }

    // Deduplicate before fetching
    const unique = [...new Set(uncached)];

    fetch("/api/samadhan/translate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: unique, targetLang: locale }),
    })
      .then((res) => res.json())
      .then((data) => {
        // Discard if a newer request has already been initiated
        if (generationRef.current !== generation) return;

        if (data.success && data.data?.translations) {
          const newMap = new Map(cached);
          const results: string[] = data.data.translations;

          unique.forEach((text, i) => {
            const translated = results[i] ?? text;
            newMap.set(text, translated);
            try {
              sessionStorage.setItem(getCacheKey(locale, text), translated);
            } catch {
              // sessionStorage full — ignore
            }
          });

          setTranslations(newMap);
        }
      })
      .catch(() => {
        // On error, keep using originals
      });
  }, [locale, textsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Look up translation for a given string.
   * Returns the translation if available, otherwise the original.
   */
  const dt = useCallback(
    (text: string | null | undefined): string => {
      if (!text) return "";
      if (locale === "en") return text;
      return translations.get(text) ?? text;
    },
    [locale, translations],
  );

  return dt;
}
