import { useTheme } from "@/context/ThemeContext";

/** Solid, high-contrast surfaces shared by every organiser screen. */
export function useOrganiserPalette() {
  const { scheme } = useTheme();
  const dark = scheme === "dark";

  return {
    dark,
    canvas: dark ? "#060B14" : "#F3F6FA",
    surface: dark ? "#0C1626" : "#FFFFFF",
    surfaceRaised: dark ? "#111E31" : "#F8FAFD",
    surfacePressed: dark ? "#16263D" : "#EDF3FA",
    line: dark ? "#22324A" : "#DCE4EF",
    text: dark ? "#F7F9FC" : "#08111F",
    muted: dark ? "#9EABC0" : "#647084",
    blue: dark ? "#1EA7FD" : "#087EC1",
    blueDeep: dark ? "#075DA3" : "#075DA3",
    blueSoft: dark ? "#102F4B" : "#E3F3FD",
    cyan: "#62D4FF",
    positive: dark ? "#45D49A" : "#168A5B",
    warning: dark ? "#F5B94C" : "#9A6200",
    danger: dark ? "#FF6B7B" : "#C93348",
    onBlue: "#FFFFFF",
  };
}
