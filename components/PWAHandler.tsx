"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import SplashScreen from "./SplashScreen";
import NoInternet, { ConnectionRestored } from "./NoInternet";

interface PWAHandlerProps {
  children: React.ReactNode;
  showSplash?: boolean;
  /** Passed from the server layout – true when the request host is a SAMADHAN domain */
  isSamadhan?: boolean;
}

export default function PWAHandler({
  children,
  showSplash = true,
  isSamadhan = false,
}: PWAHandlerProps) {
  // Initialise as ready immediately when the server told us this is a SAMADHAN domain.
  // This prevents a single-frame flash of the main app splash before useEffect fires.
  const [isAppReady, setIsAppReady] = useState(() => isSamadhan);
  const [showConnectionRestored, setShowConnectionRestored] = useState(false);
  const [previousOnlineStatus, setPreviousOnlineStatus] = useState<
    boolean | null
  >(null);
  const networkStatus = useNetworkStatus();
  const pathname = usePathname();

  // Pathname-based check (works for direct /samadhan/* navigation)
  const isPathSamadhan = pathname?.startsWith("/samadhan") ?? false;

  // Combine: either the server told us it's samadhan, or the current path is /samadhan/*
  const isSamadhanRoute = isSamadhan || isPathSamadhan;

  // Auto-skip when navigating to /samadhan/* client-side after initial load
  useEffect(() => {
    if (isPathSamadhan) {
      setIsAppReady(true);
    }
  }, [isPathSamadhan]);

  // Handle connection status changes
  useEffect(() => {
    if (
      previousOnlineStatus !== null &&
      !previousOnlineStatus &&
      networkStatus.isOnline
    ) {
      setShowConnectionRestored(true);
    }
    setPreviousOnlineStatus(networkStatus.isOnline);
  }, [networkStatus.isOnline, previousOnlineStatus]);

  // Handle retry - just trigger a connection check without page reload
  const handleRetry = () => {
    // Force a network status check by dispatching online/offline events
    if (navigator.onLine) {
      window.dispatchEvent(new Event("online"));
    } else {
      window.dispatchEvent(new Event("offline"));
    }
  };

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setIsAppReady(true);
  };

  // Show splash screen if not ready, splash is enabled, and NOT on SAMADHAN route
  // SAMADHAN has its own dedicated splash screen in SamadhanPWAHandler
  if (showSplash && !isAppReady && !isSamadhanRoute) {
    return <SplashScreen onFinishAction={handleSplashComplete} />;
  }

  return (
    <>
      {children}

      {/* No Internet Overlay - Skip for SAMADHAN routes (SAMADHAN has its own handling) */}
      {!isSamadhanRoute && (
        <NoInternet isVisible={!networkStatus.isOnline} onRetry={handleRetry} />
      )}

      {/* Connection Restored Notification - Skip for SAMADHAN routes */}
      {!isSamadhanRoute && (
        <ConnectionRestored
          isVisible={showConnectionRestored}
          onClose={() => setShowConnectionRestored(false)}
        />
      )}
    </>
  );
}
