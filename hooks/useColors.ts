import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

/** Light is the default. Dark is only used after the in-app switcher selects it. */
export function useColors() {
  const { scheme } = useTheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
