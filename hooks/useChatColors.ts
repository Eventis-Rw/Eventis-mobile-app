import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

/** Chat surfaces use the shared Eventis palette in both app themes. */
export function useChatColors() {
  const base = useColors();
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  return {
    ...base,
    wallpaper: base.background,
    outgoing: isDark ? "rgba(255, 255, 255, 0.12)" : base.glass,
    incoming: isDark ? "#18181B" : base.card,
    receipt: base.primary,
    highlight: isDark ? "#27272A" : base.border,
  };
}
