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
 *
 * Features:
 * - Batches all strings into a single API call
 * - Caches results per locale in sessionStorage
 * - Returns originals instantly while translations load
 * - No-ops for English locale
 */

const STORAGE_PREFIX = "dt:";

function getCacheKey(locale: string, text: string): string {
  return `${STORAGE_PREFIX}${locale}:${text}`;
}

export function useDynamicTranslation(texts: string[]) {
  const { locale } = useSamadhanI18n();
  const [translations, setTranslations] = useState<Map<string, string>>(
    new Map(),
  );
  const pendingRef = useRef(false);
  const lastLocaleRef = useRef(locale);
  const lastTextsRef = useRef("");

  // Build a stable key from the texts array to detect changes
  const textsKey = texts.filter(Boolean).sort().join("|");

  useEffect(() => {
    // Skip for English — dynamic content is already in English
    if (locale === "en") {
      if (translations.size > 0) setTranslations(new Map());
      return;
    }

    // Skip if nothing changed
    if (
      lastLocaleRef.current === locale &&
      lastTextsRef.current === textsKey &&
      translations.size > 0
    ) {
      return;
    }

    lastLocaleRef.current = locale;
    lastTextsRef.current = textsKey;

    const validTexts = texts.filter((t) => t?.trim());
    if (validTexts.length === 0) return;

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

    // If everything is cached, use it immediately
    if (uncached.length === 0) {
      setTranslations(cached);
      return;
    }

    // Set cached ones right away
    if (cached.size > 0) {
      setTranslations(new Map(cached));
    }

    // Fetch uncached translations
    if (pendingRef.current) return;
    pendingRef.current = true;

    // Deduplicate
    const unique = [...new Set(uncached)];

    fetch("/api/samadhan/translate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: unique, targetLang: locale }),
    })
      .then((res) => res.json())
      .then((data) => {
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
      })
      .finally(() => {
        pendingRef.current = false;
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
