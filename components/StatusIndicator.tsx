"use client";

import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { Wifi, WifiOff, Smartphone, Download } from "lucide-react";

export default function StatusIndicator() {
  const networkStatus = useNetworkStatus();
  const { isStandalone, isInstallable, installApp } = usePWAInstall();

  return (
    <div className="fixed top-4 right-4 z-30 flex flex-col space-y-2">
      {/* Network Status */}
      <div
        className={`flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
          networkStatus.isOnline
            ? "bg-green-100 text-green-700 border border-green-200"
            : "bg-red-100 text-red-700 border border-red-200"
        }`}
      >
        {networkStatus.isOnline ? (
          <>
            <Wifi className="w-3 h-3" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* PWA Status */}
      {isStandalone && (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
          <Smartphone className="w-3 h-3" />
          <span>PWA Mode</span>
        </div>
      )}

      {/* Quick Install Button (only show if installable and not in standalone) */}
      {isInstallable && !isStandalone && (
        <button
          onClick={installApp}
          className="flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-colors duration-200"
        >
          <Download className="w-3 h-3" />
          <span>Install</span>
        </button>
      )}
    </div>
  );
}
