"use client";

import { useEffect, useState } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isConnecting: boolean;
  connectionType?: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isConnecting: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setNetworkStatus({
        isOnline,
        isConnecting: false,
        connectionType: connection?.effectiveType || "unknown",
      });
    };

    const handleOnline = () => {
      setNetworkStatus((prev) => ({
        ...prev,
        isOnline: true,
        isConnecting: false,
      }));
    };

    const handleOffline = () => {
      setNetworkStatus((prev) => ({
        ...prev,
        isOnline: false,
        isConnecting: false,
      }));
    };

    // Initial check
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Connection change listener (if supported)
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    // Additional check with a simple fetch to verify actual connectivity
    const checkRealConnectivity = async () => {
      if (navigator.onLine) {
        try {
          const response = await fetch("/favicon.ico", {
            method: "HEAD",
            cache: "no-cache",
            mode: "no-cors",
          });
          setNetworkStatus((prev) => ({ ...prev, isOnline: true }));
        } catch {
          setNetworkStatus((prev) => ({ ...prev, isOnline: false }));
        }
      }
    };

    // Check real connectivity periodically when online
    const connectivityInterval = setInterval(() => {
      if (navigator.onLine) {
        checkRealConnectivity();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
      clearInterval(connectivityInterval);
    };
  }, []);

  return networkStatus;
}
