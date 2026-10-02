import { useColors } from "@/hooks/useColors";

/** Chat surfaces use the shared Eventis palette in both app themes. */
export function useChatColors() {
  const base = useColors();
  return {
    ...base,
    wallpaper: base.background,
    outgoing: base.glass,
    incoming: base.card,
    receipt: base.primary,
    highlight: base.border,
  };
}
