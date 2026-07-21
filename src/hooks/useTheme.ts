import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rthc-theme";

export function useTheme() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  // Apply the 'dark' class to <html> so every Tailwind `dark:` utility
  // across the app responds to this single source of truth.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem(STORAGE_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggle = useCallback(() => setDarkMode((d) => !d), []);

  return { darkMode, setDarkMode, toggle };
}
