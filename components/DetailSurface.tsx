import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

/** A softly raised surface with a fine upper highlight. */
export function DetailSurface({ style, ...props }: ViewProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  return <View {...props} style={[styles.surface, {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopColor: scheme === "dark" ? "#343C50" : "#FFFFFF",
    boxShadow: scheme === "dark"
      ? "5px 5px 14px rgba(0,0,0,0.28), -3px -3px 10px rgba(255,255,255,0.025)"
      : "5px 5px 14px rgba(35,57,89,0.09), -4px -4px 12px rgba(255,255,255,0.85)",
    shadowOpacity: scheme === "dark" ? 0.22 : 0.08,
  }, style]} />;
}
const styles = StyleSheet.create({ surface: {
  borderRadius: 22, borderWidth: 1, shadowColor: "#000000",
  shadowOffset: { width: 0, height: 5 }, shadowRadius: 12, elevation: 3,
} });
