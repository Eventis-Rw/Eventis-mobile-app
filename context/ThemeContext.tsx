import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ColorScheme = "light" | "dark";

const STORAGE_KEY = "@eventis_color_scheme";

interface ThemeContextValue {
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") setSchemeState(stored);
    });
  }, []);

  const setScheme = useCallback((next: ColorScheme) => {
    setSchemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  return <ThemeContext.Provider value={{ scheme, setScheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
