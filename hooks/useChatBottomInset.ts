import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaFrame } from "react-native-safe-area-context";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

/** Reserve only the system inset that actually overlaps this screen's viewport. */
export function useChatBottomInset(keyboardVisible: boolean) {
  const viewport = useRef<View>(null);
  const frame = useSafeAreaFrame();
  const insets = useAppSafeAreaInsets();
  // Some edge-to-edge Android devices report a zero safe-area inset even
  // though the three-button navigation bar still covers the app surface.
  const safeBottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 24 : 0,
  );
  const [overlap, setOverlap] = useState(safeBottomInset);
  const measureViewport = useCallback(() => {
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      if (!height) return;
      const safeBottom = frame.y + frame.height - safeBottomInset;
      // Native stacks can already end above Android's navigation bar.
      // Adding the full provider inset in that case counts that space twice.
      setOverlap(
        Math.max(0, Math.min(safeBottomInset, y + height - safeBottom)),
      );
    });
  }, [frame.y, frame.height, safeBottomInset]);
  useEffect(measureViewport, [measureViewport, keyboardVisible]);
  return {
    viewport,
    measureViewport,
    bottomInset: keyboardVisible ? 0 : overlap,
  };
}
