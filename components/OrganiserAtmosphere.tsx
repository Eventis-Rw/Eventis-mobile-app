import React from "react";
import { StyleSheet, View } from "react-native";

import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

/** Quiet background depth shared by every organiser screen. */
export function OrganiserAtmosphere() {
  const palette = useOrganiserPalette();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.canvas }]} />;
}
