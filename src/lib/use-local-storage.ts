"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Persists a state value in localStorage, restoring it on mount.
 * Useful for admin forms to survive page refreshes.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  // Hydrate from localStorage on mount (deferred to avoid ESLint cascade warning)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const id = setTimeout(() => {
      try {
        const stored = localStorage.getItem(key);
        if (stored !== null) {
          setValue(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(id);
  }, [key]);

  // Persist on change
  const setAndPersist = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch {
        // ignore
      }
    },
    [key],
  );

  return [value, setAndPersist];
}
