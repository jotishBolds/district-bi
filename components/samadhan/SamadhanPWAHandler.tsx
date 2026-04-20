"use client";

import { useEffect, useState, useCallback } from "react";
import SamadhanSplashScreen from "./SamadhanSplashScreen";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SamadhanPWAHandler() {
  const [showSplash, setShowSplash] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { t } = useSamadhanI18n();

  useEffect(() => {
    // Check if this is a fresh page load (not a navigation)
    const isFirstVisit = !sessionStorage.getItem("samadhan-visited");
    // Check if user already dismissed the install prompt this session
    const isInstallDismissed =
      sessionStorage.getItem("samadhan-install-dismissed") === "true";

    if (isFirstVisit) {
      setShowSplash(true);
      sessionStorage.setItem("samadhan-visited", "true");
    }

    if (isInstallDismissed) {
      setIsDismissed(true);
    }

    // Pick up any beforeinstallprompt that fired before this component mounted.
    // The root layout injects an early <script> that stores it on window.
    const w = window as Window & {
      __pwaInstallPrompt?: BeforeInstallPromptEvent;
    };
    const existingPrompt = w.__pwaInstallPrompt ?? null;
    if (existingPrompt && !isInstallDismissed) {
      setDeferredPrompt(existingPrompt);
      setIsInstallable(true);
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if not dismissed
      if (!isInstallDismissed) {
        setIsInstallable(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleDismiss = () => {
    setIsInstallable(false);
    setIsDismissed(true);
    sessionStorage.setItem("samadhan-install-dismissed", "true");
  };

  return (
    <>
      {showSplash && (
        <SamadhanSplashScreen
          onFinishAction={handleSplashFinish}
          minDuration={2000}
        />
      )}

      {/* PWA Install Banner - shown after splash and only if not dismissed */}
      {!showSplash && isInstallable && !isDismissed && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 animate-slide-up">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {t("pwa.installApp")}
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  {t("pwa.installDesc")}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t("pwa.install")}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-800 transition-colors"
                  >
                    {t("pwa.notNow")}
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
