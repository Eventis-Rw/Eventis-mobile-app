import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { LoveAccountType } from "@/utils/findLoveMembership";

const GOLD = "#D4A017";

/**
 * PUBLIC / PRIVATE badge. Pass the member's ACTUAL account type (active
 * membership), never the option they picked at sign-up.
 *
 * `iconOnly` is for showing OTHER members, with no text label: a gold diamond
 * for Private, a globe in the accent colour for Public.
 */
export function MembershipBadge({
  type,
  size = "md",
  onImage,
  iconOnly,
}: {
  type: LoveAccountType;
  size?: "sm" | "md";
  /** Over a photo: solid, high-contrast colours. */
  onImage?: boolean;
  iconOnly?: boolean;
}) {
  const colors = useColors();
  const isPrivate = type === "private";
  const small = size === "sm";

  if (iconOnly) {
    const diameter = small ? 16 : 20;
    return (
      <View
        style={[styles.icon, { width: diameter, height: diameter, backgroundColor: isPrivate ? GOLD : colors.primary }]}
        accessible
        accessibilityLabel={isPrivate ? "Private member" : "Public member"}
      >
        <Ionicons name={isPrivate ? "diamond" : "globe-outline"} size={small ? 9 : 12} color={isPrivate ? "#1A1300" : "#FFFFFF"} />
      </View>
    );
  }

  const background = isPrivate
    ? onImage ? GOLD : "rgba(212,160,23,0.16)"
    : onImage ? "rgba(12,12,26,0.55)" : colors.glass;
  const foreground = isPrivate ? (onImage ? "#1A1300" : "#B8860B") : onImage ? "#FFFFFF" : colors.primary;

  return (
    <View
      style={[styles.badge, small && styles.small, { backgroundColor: background, borderColor: isPrivate ? GOLD : colors.border }]}
      accessible
      accessibilityLabel={isPrivate ? "Private account" : "Public account"}
    >
      <Ionicons name={isPrivate ? "diamond" : "globe-outline"} size={small ? 9 : 12} color={foreground} />
      <Text style={[styles.text, small && styles.smallText, { color: foreground }]}>{isPrivate ? "PRIVATE" : "PUBLIC"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  icon: { alignItems: "center", justifyContent: "center", borderRadius: 99 },
  small: { gap: 3, paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 11, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  smallText: { fontSize: 9, letterSpacing: 0.6 },
});
