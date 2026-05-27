"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // useSyncExternalStore: returns true on client, false during SSR
  // Elimina la necessità di useEffect per l'hydration safety
  const hydrated = useSyncExternalStore(
    () => () => {}, // subscribe — no-op (no external store)
    () => true, // getSnapshot — client always returns true
    () => false, // getServerSnapshot — SSR returns false
  );

  if (!hydrated) {
    return (
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background size-8"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background size-8 hover:bg-muted hover:text-foreground transition-colors"
      aria-label={isDark ? "Passa alla modalità chiara" : "Passa alla modalità scura"}
    >
      <Sun
        className={`h-5 w-5 transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
