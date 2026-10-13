import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

/** Solid, high-contrast surfaces shared by every organiser screen. */
export function useOrganiserPalette() {
  const { scheme } = useTheme();
  const dark = scheme === "dark";

  return {
    dark,
    canvas: dark ? "#080B10" : "#F4F6F9",
    surface: dark ? "#11161E" : "#FFFFFF",
    surfaceRaised: dark ? "#181F2A" : "#F1F4F8",
    surfacePressed: dark ? "#202B3A" : "#E8EFF7",
    line: dark ? "#29313D" : "#DEE5EE",
    text: dark ? "#F7F9FC" : "#08111F",
    muted: dark ? "#9EABC0" : "#647084",
    blue: dark ? "#087AC1" : "#086EAE",
    accent: dark ? "#70BDF5" : "#086EAE",
    blueDeep: dark ? "#075DA3" : "#075DA3",
    blueSoft: dark ? "#102F4B" : "#E3F3FD",
    cyan: "#62D4FF",
    positive: dark ? "#45D49A" : "#168A5B",
    warning: dark ? "#F5B94C" : "#9A6200",
    danger: dark ? "#FF6B7B" : "#C93348",
    onBlue: "#FFFFFF",
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
