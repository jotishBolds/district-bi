"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  Send,
  Wand2,
  FileEdit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SpeechToTextButton } from "@/components/samadhan/SpeechToTextButton";

interface AIWriteAssistProps {
  field: "subject" | "description";
  currentText: string;
  onApply: (text: string) => void;
  disabled?: boolean;
  className?: string;
  // i18n labels
  labels?: {
    aiAssist?: string;
    askAI?: string;
    promptPlaceholder?: string;
    write?: string;
    improve?: string;
    summarize?: string;
    apply?: string;
    applyTranslation?: string;
    generating?: string;
    generatedText?: string;
    translations?: string;
  };
}

const LANGUAGE_LABELS: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "हिन्दी",
  "ne-IN": "नेपाली",
};

export function AIWriteAssist({
  field,
  currentText,
  onApply,
  disabled = false,
  className,
  labels,
}: AIWriteAssistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    text: string;
    translations: Record<string, string>;
  } | null>(null);
  const [showTranslations, setShowTranslations] = useState(false);

  const l = {
    aiAssist: labels?.aiAssist ?? "AI Assist",
    askAI: labels?.askAI ?? "Ask AI to help you write",
    promptPlaceholder:
      labels?.promptPlaceholder ??
      (field === "subject"
        ? "e.g. My land document is delayed for 3 months..."
        : "e.g. Write about delay in land registration at DC office since January..."),
    write: labels?.write ?? "Write",
    improve: labels?.improve ?? "Improve",
    summarize: labels?.summarize ?? "Summarize",
    apply: labels?.apply ?? "Apply",
    applyTranslation: labels?.applyTranslation ?? "Apply",
    generating: labels?.generating ?? "Generating...",
    generatedText: labels?.generatedText ?? "Generated Text",
    translations: labels?.translations ?? "Translations",
  };

  const handleGenerate = useCallback(
    async (action: "write" | "improve" | "summarize") => {
      if (action === "write" && !prompt.trim()) {
        toast.error("Please describe what you want to write about");
        return;
      }
      if (
        (action === "improve" || action === "summarize") &&
        !currentText.trim()
      ) {
        toast.error("Please write some text first to improve or summarize");
        return;
      }

      setIsLoading(true);
      setResult(null);
      try {
        const response = await fetch("/api/samadhan/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: action === "write" ? prompt : currentText,
            field,
            action,
            currentText: action !== "write" ? currentText : undefined,
            languages: ["en-IN", "hi-IN", "ne-IN"],
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          setResult(data.data);
        } else {
          toast.error(data.message || "AI could not generate text");
        }
      } catch {
        toast.error("Failed to connect to AI service");
      } finally {
        setIsLoading(false);
      }
    },
    [prompt, currentText, field],
  );

  const handleApply = useCallback(
    (text: string) => {
      onApply(text);
      setIsOpen(false);
      setResult(null);
      setPrompt("");
      toast.success("Text applied");
    },
    [onApply],
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-7 px-2 text-xs gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700",
            className,
          )}
        >
          <Sparkles className="h-3 w-3" />
          {l.aiAssist}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-1.5rem)] sm:w-96 p-0 flex flex-col"
        style={{ maxHeight: "min(calc(100dvh - 100px), 560px)" }}
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 p-3 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">
              {l.askAI}
            </span>
          </div>
        </div>

        {/* Fixed prompt + actions */}
        <div className="flex-shrink-0 p-3 space-y-2 border-b">
          {/* Prompt input + speech-to-text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Describe your issue or prompt
              </span>
              <SpeechToTextButton
                onTranscript={(text) =>
                  setPrompt((prev) => (prev ? prev + " " + text : text))
                }
                disabled={isLoading}
                size="icon"
              />
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={l.promptPlaceholder}
              rows={2}
              className="resize-none text-sm"
              disabled={isLoading}
              maxLength={500}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleGenerate("write")}
              disabled={isLoading || !prompt.trim()}
              className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              {isLoading ? l.generating : l.write}
            </Button>
            {currentText.trim() && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate("improve")}
                  disabled={isLoading}
                  className="h-8 text-xs"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  {l.improve}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate("summarize")}
                  disabled={isLoading}
                  className="h-8 text-xs"
                >
                  <FileEdit className="h-3 w-3 mr-1" />
                  {l.summarize}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable result area */}
        {result && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {/* English (primary) */}
            <div className="bg-green-50 rounded-lg p-2.5 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-green-800">
                  {l.generatedText} (English)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApply(result.text)}
                  className="h-6 px-2 text-xs text-green-700 hover:text-green-900 hover:bg-green-100 flex-shrink-0"
                >
                  {l.apply}
                </Button>
              </div>
              <p className="text-xs text-green-900 leading-relaxed whitespace-pre-wrap">
                {result.text}
              </p>
            </div>

            {/* Translations toggle */}
            {Object.keys(result.translations).filter((k) => k !== "en-IN")
              .length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowTranslations((v) => !v)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  {showTranslations ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {l.translations} (
                  {
                    Object.keys(result.translations).filter(
                      (k) => k !== "en-IN",
                    ).length
                  }
                  )
                </button>

                {showTranslations && (
                  <div className="space-y-2 mt-2">
                    {Object.entries(result.translations)
                      .filter(([code]) => code !== "en-IN")
                      .map(([code, text]) => (
                        <div
                          key={code}
                          className="bg-blue-50 rounded-lg p-2.5 border border-blue-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-800">
                              {LANGUAGE_LABELS[code] || code}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApply(text)}
                              className="h-6 px-2 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100 flex-shrink-0"
                            >
                              {l.applyTranslation}
                            </Button>
                          </div>
                          <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">
                            {text}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
