"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

interface NoInternetProps {
  isVisible: boolean;
  onRetry?: () => void;
}

export default function NoInternet({ isVisible, onRetry }: NoInternetProps) {
  const [dots, setDots] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleRetry = () => {
    setIsRetrying(true);
    // Check connection after a short delay
    setTimeout(() => {
      setIsRetrying(false);
      if (onRetry) {
        onRetry();
      }
    }, 1000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-40 bg-white  flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="relative">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-red-500" />
          </div>
          {/* Animated rings */}
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-red-200 animate-ping" />
            <div
              className="absolute inset-2 rounded-full border-2 border-red-300 animate-ping"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
            No Internet Connection
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Please check your internet connection and try again.
          </p>
        </div>

        {/* Status */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2 text-red-700">
            <span className="text-sm font-medium">
              {isRetrying ? "Checking connection" : "Checking connection"}
            </span>
            <span className="text-sm">{".".repeat(dots)}</span>
          </div>
        </div>

        {/* Retry Button */}
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`w-full font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 ${
              isRetrying
                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
            />
            <span>{isRetrying ? "Retrying..." : "Retry Connection"}</span>
          </button>
        )}

        {/* Tips */}
        <div className="text-left space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Quick fixes:</h3>
          <ul className="space-y-1">
            <li>• Check your WiFi or mobile data</li>
            <li>• Move to an area with better signal</li>
            <li>• Restart your router or device</li>
            <li>• Contact your service provider</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Connection restored notification
export function ConnectionRestored({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (isVisible && onClose) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
        <Wifi className="w-5 h-5" />
        <span className="font-medium">Connection restored!</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 text-green-100 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
