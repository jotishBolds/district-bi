"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function PWAInstallPrompt() {
  const { isInstallable, installApp } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const pathname = usePathname();

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Don't show again for this session
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  // Don't show on SAMADHAN routes - SAMADHAN has its own PWA install prompt
  const isSamadhanRoute = pathname?.startsWith("/samadhan");

  // Don't show if not installable, dismissed, already dismissed this session, or on SAMADHAN
  if (
    !isInstallable ||
    isDismissed ||
    isSamadhanRoute ||
    sessionStorage.getItem("pwa-prompt-dismissed")
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm w-full animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Install My Application
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Install our app for faster access and offline capabilities.
            </p>

            <div className="flex space-x-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-md flex items-center justify-center space-x-1 transition-colors duration-200"
              >
                <Download className="w-3 h-3" />
                <span>Install</span>
              </button>

              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-2 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
