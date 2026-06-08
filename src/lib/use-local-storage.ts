"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Persists a state value in localStorage, restoring it on mount.
 * Useful for admin forms to survive page refreshes.
 *
 * @param key localStorage key (scoped to the page)
 * @param initialValue fallback if nothing stored
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initialValue);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
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
