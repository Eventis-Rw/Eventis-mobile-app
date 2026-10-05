import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The root KeyboardProvider renders edge to edge on Android. Use the native
 * safe areas once inside each screen to keep controls clear of system bars.
 */
export function useAppSafeAreaInsets() {
  return useSafeAreaInsets();
}
