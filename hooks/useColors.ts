import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

/** Resolved palette. System follows the device; Light and Dark override it. */
export function useColors() {
  const { scheme } = useTheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
