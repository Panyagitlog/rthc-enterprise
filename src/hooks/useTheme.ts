import { useEffect, useState } from "react";
import { useTheme as useThemeContext } from "../lib/theme/ThemeProvider";

export function useThemeWithSystem() {
  const theme = useThemeContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    ...theme,
    mounted,
    className: (darkClass: string, lightClass: string = "") => (theme.isDark ? darkClass : lightClass),
    style: (darkStyles: React.CSSProperties, lightStyles: React.CSSProperties = {}) =>
      theme.isDark ? darkStyles : lightStyles,
  };
}

export function useTheme() {
  return useThemeContext();
}

export function useDarkMode() {
  const { isDark, toggleTheme } = useThemeContext();
  return { isDark, toggleTheme };
}