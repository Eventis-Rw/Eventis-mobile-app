import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

/** Opaque panels keep text readable without platform-specific blur layers. */
export function OrganiserSurface({ style, ...props }: ViewProps) {
  const palette = useOrganiserPalette();
  return <View {...props} style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.line }, style]} />;
}

const styles = StyleSheet.create({
  panel: { borderRadius: 22, borderWidth: 1, overflow: "hidden" },
});
