"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

const MAX_RECORD_SECONDS = 29; // keep under the 30s API limit

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
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(new Array(20).fill(2));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  const stopVisualizerAndTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    setElapsed(0);
    elapsedRef.current = 0;
    setBars(new Array(20).fill(2));
  }, []);

  const stopRecording = useCallback(() => {
    stopVisualizerAndTimer();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, [stopVisualizerAndTimer]);

  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        const audioFile = new File([audioBlob], "recording.webm", {
          type: "audio/webm",
        });
        formData.append("file", audioFile);
        formData.append("language_code", selectedLanguage);

        const response = await fetch("/api/samadhan/speech-to-text", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success && data.data?.transcript) {
          onTranscript(data.data.transcript);
          toast.success("Speech converted to text");
        } else {
          toast.error(
            data.message ||
              "Could not convert speech to text. Please try again.",
          );
        }
      } catch {
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
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // ── Audio visualizer setup ──
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const BAR_COUNT = 20;

      const drawBars = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / BAR_COUNT);
        const next = Array.from({ length: BAR_COUNT }, (_, i) => {
          const val = dataArray[i * step] ?? 0;
          return Math.max(2, Math.round((val / 255) * 28));
        });
        setBars(next);
        animFrameRef.current = requestAnimationFrame(drawBars);
      };
      drawBars();

      // ── Timer ──
      elapsedRef.current = 0;
      setElapsed(0);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_RECORD_SECONDS) {
          // Auto-stop before hitting the 30s API limit
          stopRecording();
        }
      }, 1000);

      // ── MediaRecorder ──
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        if (audioBlob.size > 0) processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
    } catch {
      toast.error(
        "Could not access microphone. Please allow microphone access in your browser settings.",
      );
    }
  }, [processAudio, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, stopRecording, startRecording]);

  const currentLang = LANGUAGES.find((l) => l.code === selectedLanguage);
  const remaining = MAX_RECORD_SECONDS - elapsed;
  const timerColor = remaining <= 5 ? "text-red-500" : "text-orange-500";

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

      {/* Visualizer + timer — visible while recording */}
      {isRecording && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          {/* Waveform bars */}
          <div className="flex items-center gap-[2px] h-7">
            {bars.map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-red-500 transition-all duration-75"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          {/* Countdown timer */}
          <span
            className={cn(
              "text-xs font-mono font-semibold w-8 text-right",
              timerColor,
            )}
          >
            0:{String(remaining).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Converting…
          </span>
        </div>
      )}

      {/* Record button */}
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size={size}
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={cn("relative transition-all", className)}
        title={
          isRecording ? "Stop recording" : `Speak in ${currentLang?.labelEn}`
        }
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
