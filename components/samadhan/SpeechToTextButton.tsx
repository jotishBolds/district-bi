"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

const LANGUAGES = [
  { code: "hi-IN", label: "हिन्दी", labelEn: "Hindi" },
  { code: "ne-IN", label: "नेपाली", labelEn: "Nepali" },
  { code: "en-IN", label: "English", labelEn: "English" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

export function SpeechToTextButton({
  onTranscript,
  disabled = false,
  className,
  size = "icon",
}: SpeechToTextButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageCode>("hi-IN");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(async () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        // Convert to wav format for better compatibility
        const audioFile = new File([audioBlob], "recording.wav", {
          type: "audio/wav",
        });
        formData.append("file", audioFile);
        formData.append("language_code", selectedLanguage);

        const response = await fetch("/api/samadhan/speech-to-text", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success && data.data.transcript) {
          onTranscript(data.data.transcript);
          toast.success("Speech converted to text");
        } else {
          toast.error(
            data.message ||
              "Could not convert speech to text. Please try again.",
          );
        }
      } catch (error) {
        console.error("STT error:", error);
        toast.error("Failed to process audio. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedLanguage, onTranscript],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        if (audioBlob.size > 0) {
          processAudio(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access error:", error);
      toast.error(
        "Could not access microphone. Please allow microphone access in your browser settings.",
      );
    }
  }, [processAudio]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  const currentLang = LANGUAGES.find((l) => l.code === selectedLanguage);

  if (isProcessing) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled
        className={cn("relative", className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Language selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isRecording || isProcessing}
            className="h-8 px-2 text-xs text-muted-foreground"
            title="Select language"
          >
            <Languages className="h-3 w-3 mr-1" />
            {currentLang?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={cn(
                "cursor-pointer",
                selectedLanguage === lang.code && "bg-accent font-medium",
              )}
            >
              <span className="mr-2">{lang.label}</span>
              <span className="text-xs text-muted-foreground">
                ({lang.labelEn})
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Record button */}
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size={size}
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "relative transition-all",
          isRecording && "animate-pulse",
          className,
        )}
        title={
          isRecording ? "Stop recording" : `Speak in ${currentLang?.labelEn}`
        }
      >
        {isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
