import { createContext, useContext } from "react";

import colors, { lovePalette } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export type ColorScope = "eventis" | "love";

/** Screens inside a scope get its accent on top of the Eventis palette (FindLove is pink). */
export const ColorScopeContext = createContext<ColorScope>("eventis");

/** Resolved palette. System follows the device; Light and Dark override it. */
export function useColors() {
  const { scheme } = useTheme();
  const scope = useContext(ColorScopeContext);
  const palette = scheme === "dark" ? colors.dark : colors.light;
  const accent = scope === "love" ? (scheme === "dark" ? lovePalette.dark : lovePalette.light) : null;
  return { ...palette, ...accent, radius: colors.radius };
}
