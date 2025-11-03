"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  console.log("New content available! Please refresh.");
                }
              });
            }
          });

          console.log("Service Worker registered successfully:", registration);
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
      };

      registerSW();
    }
  }, []);

  return null;
}