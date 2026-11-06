import { Platform } from "react-native";

/** Shared by the absolute tab bar and screens with controls floating above it. */
export function mainTabBarHeight(bottomInset: number) {
  return Platform.OS === "web" ? 68 : 58 + bottomInset;
}
