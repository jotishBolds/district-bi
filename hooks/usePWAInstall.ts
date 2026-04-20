"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  installApp: () => Promise<boolean>;
  isStandalone: boolean;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkStandalone();

    // Pick up any beforeinstallprompt event that fired before this component mounted.
    // The root layout injects an early <script> that stores it on window.
    const w = window as Window & {
      __pwaInstallPrompt?: BeforeInstallPromptEvent;
    };
    const existingPrompt = w.__pwaInstallPrompt ?? null;
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkStandalone();
      }
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error installing PWA:", error);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt && !isInstalled,
    isInstalled,
    deferredPrompt,
    installApp,
    isStandalone,
  };
}
