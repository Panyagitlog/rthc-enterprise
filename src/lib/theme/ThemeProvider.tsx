import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemeContextType, ThemeMode } from "./types";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "rthc-theme";

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored ?? "system";
  });
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return resolveTheme((window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system");
  });

  useEffect(() => {
    const next = resolveTheme(mode);
    setResolvedMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const next = resolveTheme("system");
      setResolvedMode(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
    };

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mode]);

  const value = useMemo<ThemeContextType>(
    () => ({
      mode,
      resolvedMode,
      setMode,
      toggleTheme: () => setMode((current) => (current === "dark" ? "light" : "dark")),
      isDark: resolvedMode === "dark",
      isLight: resolvedMode === "light",
      isSystem: mode === "system",
      darkMode: resolvedMode === "dark",
      toggle: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode, resolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
