import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

/** Solid, high-contrast surfaces shared by every organiser screen. */
export function useOrganiserPalette() {
  const { scheme } = useTheme();
  const colors = useColors();
  const dark = scheme === "dark";

  return {
    dark,
    canvas: colors.background,
    surface: colors.card,
    surfaceRaised: colors.secondary,
    surfacePressed: colors.input,
    line: colors.border,
    text: colors.foreground,
    muted: colors.mutedForeground,
    blue: colors.primary,
    accent: colors.accent,
    blueDeep: colors.primary,
    blueSoft: `${colors.primary}18`,
    cyan: colors.info,
    positive: colors.success,
    warning: colors.warning,
    danger: colors.destructive,
    onBlue: colors.primaryForeground,
  };
}

/** Keep existing form color roles consistent with the organiser workspace. */
export function useOrganiserColors() {
  const base = useColors();
  const palette = useOrganiserPalette();
  return {
    ...base,
    background: palette.canvas,
    foreground: palette.text,
    card: palette.surface,
    secondary: palette.surfaceRaised,
    input: palette.surfaceRaised,
    border: palette.line,
    mutedForeground: palette.muted,
    primary: palette.blue,
    destructive: palette.danger,
    success: palette.positive,
    warning: palette.warning,
  };
}
