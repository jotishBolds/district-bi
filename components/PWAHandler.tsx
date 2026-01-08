"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import SplashScreen from "./SplashScreen";
import NoInternet, { ConnectionRestored } from "./NoInternet";

interface PWAHandlerProps {
  children: React.ReactNode;
  showSplash?: boolean;
}

export default function PWAHandler({
  children,
  showSplash = true,
}: PWAHandlerProps) {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showConnectionRestored, setShowConnectionRestored] = useState(false);
  const [previousOnlineStatus, setPreviousOnlineStatus] = useState<
    boolean | null
  >(null);
  const networkStatus = useNetworkStatus();
  const pathname = usePathname();

  // Check if we're on SAMADHAN routes - SAMADHAN has its own splash screen
  const isSamadhanRoute = pathname?.startsWith("/samadhan");

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setIsAppReady(true);
  };

  // Auto-skip splash for SAMADHAN routes
  useEffect(() => {
    if (isSamadhanRoute) {
      setIsAppReady(true);
    }
  }, [isSamadhanRoute]);

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
