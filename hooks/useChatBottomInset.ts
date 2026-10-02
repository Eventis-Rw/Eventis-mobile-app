import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/** Reserve only the system inset that actually overlaps this screen's viewport. */
export function useChatBottomInset(keyboardVisible: boolean) {
  const viewport = useRef<View>(null);
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const [overlap, setOverlap] = useState(insets.bottom);
  const measureViewport = useCallback(() => {
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      if (!height) return;
      const safeBottom = frame.y + frame.height - insets.bottom;
      // Native stacks can already end above Android's navigation bar.
      // Adding the full provider inset in that case counts that space twice.
      setOverlap(Math.max(0, Math.min(insets.bottom, y + height - safeBottom)));
    });
  }, [frame.y, frame.height, insets.bottom]);
  useEffect(measureViewport, [measureViewport, keyboardVisible]);
  return {
    viewport,
    measureViewport,
    bottomInset: keyboardVisible ? 0 : overlap,
  };
}
