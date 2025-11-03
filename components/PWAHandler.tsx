"use client";

import { useEffect, useState } from "react";
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

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setIsAppReady(true);
  };

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

  // Show splash screen if not ready and splash is enabled
  if (showSplash && !isAppReady) {
    return <SplashScreen onFinishAction={handleSplashComplete} />;
  }

  return (
    <>
      {children}

      {/* No Internet Overlay */}
      <NoInternet isVisible={!networkStatus.isOnline} onRetry={handleRetry} />

      {/* Connection Restored Notification */}
      <ConnectionRestored
        isVisible={showConnectionRestored}
        onClose={() => setShowConnectionRestored(false)}
      />
    </>
  );
}
