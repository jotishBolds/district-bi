"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Client-side guard that prevents navigation outside the SAMADHAN module.
 * If a user navigates to a path that doesn't start with /samadhan,
 * they are immediately redirected back to /samadhan.
 */
export default function SamadhanNavigationGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If the current path is outside /samadhan, push back
    if (pathname && !pathname.startsWith("/samadhan")) {
      router.replace("/samadhan");
    }
  }, [pathname, router]);

  // Also intercept browser back/forward that might leave samadhan
  useEffect(() => {
    const handlePopState = () => {
      if (
        window.location.pathname &&
        !window.location.pathname.startsWith("/samadhan")
      ) {
        router.replace("/samadhan");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  return null; // Render nothing – pure side-effect component
}
