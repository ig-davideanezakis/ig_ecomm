"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * SkipNav component:
 * 1. Provides a "Salta al contenuto" link for keyboard users (first tabbable element)
 * 2. Moves focus to the main heading on route change (SPA focus management)
 */
export function SkipNav() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) {
      // Focus the main content area on route change
      main.focus();
    }
  }, [pathname]);

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
    >
      Salta al contenuto principale
    </a>
  );
}
