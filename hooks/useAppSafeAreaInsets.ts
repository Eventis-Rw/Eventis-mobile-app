import { Dimensions, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Android can expose a window that already excludes the status and navigation
 * bars while still reporting those bars as safe-area insets. Applying both
 * creates a blank strip above and below every screen. Keep native insets for
 * edge-to-edge windows and iOS, and remove the duplicate Android values only
 * when the system bars are already outside the app window.
 */
export function useAppSafeAreaInsets() {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const screen = Dimensions.get("screen");
  const systemBarsOutsideWindow =
    Platform.OS === "android" && screen.height - window.height > 4;

  if (!systemBarsOutsideWindow) return insets;

  return {
    ...insets,
    top: 0,
    bottom: 0,
  };
}
