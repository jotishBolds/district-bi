"use client";

import { useState, useCallback } from "react";
import { Languages, Loader2, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en-IN", label: "English", short: "EN" },
  { code: "hi-IN", label: "हिन्दी", short: "HI" },
  { code: "ne-IN", label: "नेपाली", short: "NE" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

interface TranslateMessageProps {
  text: string;
  className?: string;
}

export function TranslateMessage({ text, className }: TranslateMessageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode | null>(
    null,
  );

  const handleTranslate = useCallback(
    async (targetLang: LanguageCode) => {
      if (activeLanguage === targetLang && translatedText) {
        // Toggle off if same language clicked again
        setTranslatedText(null);
        setActiveLanguage(null);
        return;
      }

      setIsLoading(true);
      setActiveLanguage(targetLang);
      setTranslatedText(null);

      try {
        const response = await fetch("/api/samadhan/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            targetLanguage: targetLang,
          }),
        });

        const data = await response.json();

        if (data.success && data.data?.translatedText) {
          setTranslatedText(data.data.translatedText);
        } else {
          toast.error(data.message || "Translation failed");
          setActiveLanguage(null);
        }
      } catch {
        toast.error("Failed to connect to translation service");
        setActiveLanguage(null);
      } finally {
        setIsLoading(false);
      }
    },
    [text, activeLanguage, translatedText],
  );

  const handleClose = () => {
    setTranslatedText(null);
    setActiveLanguage(null);
    setIsOpen(false);
  };

  if (!text || text.trim().length === 0) return null;

  return (
    <div className={cn("mt-1.5", className)}>
      {/* Translate trigger */}
      {!isOpen && !translatedText && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
        >
          <Languages className="h-3 w-3" />
          Translate
        </button>
      )}

      {/* Language selector + result */}
      {(isOpen || translatedText) && (
        <div className="mt-1 rounded-lg border border-blue-100 bg-blue-50/50 p-2.5 space-y-2">
          {/* Language buttons row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Languages className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-xs text-blue-700 font-medium mr-0.5">
              Translate to:
            </span>
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                type="button"
                variant={activeLanguage === lang.code ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded-full",
                  activeLanguage === lang.code
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-blue-200 text-blue-700 hover:bg-blue-100",
                )}
                onClick={() => handleTranslate(lang.code)}
                disabled={isLoading && activeLanguage !== lang.code}
              >
                {isLoading && activeLanguage === lang.code ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  lang.label
                )}
              </Button>
            ))}
            <button
              type="button"
              onClick={handleClose}
              className="ml-auto p-0.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Translation result */}
          {translatedText && (
            <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white rounded-md p-2.5 border border-blue-100">
              {translatedText}
            </div>
          )}

          {/* Loading state */}
          {isLoading && !translatedText && (
            <div className="flex items-center gap-2 text-xs text-blue-600 py-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Translating...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
