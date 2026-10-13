import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

/** Consistent navigation bar for organiser tasks pushed from the portal. */
export function PortalScreenHeader({
  title,
  icon = "chevron-back",
  disabled,
  compact = false,
}: {
  title: string;
  icon?: "chevron-back" | "close";
  disabled?: boolean;
  compact?: boolean;
}) {
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const topPad = insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPad + (compact ? 4 : 8), paddingBottom: compact ? 6 : 12, backgroundColor: palette.canvas, borderBottomColor: palette.line }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/business/dashboard" as any))}
        disabled={disabled}
        style={({ pressed }) => [styles.back, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }, pressed && { backgroundColor: palette.surfacePressed }]}
        accessibilityRole="button"
        accessibilityLabel={icon === "close" ? "Close" : "Go back"}
      >
        <Ionicons name={icon} size={21} color={disabled ? palette.muted : palette.text} />
      </Pressable>
      <View style={styles.copy}>
        {!compact ? <Text style={[styles.eyebrow, { color: palette.accent }]}>ORGANISER</Text> : null}
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>{title}</Text>
      </View>
      <View style={[styles.mark, { backgroundColor: palette.blueSoft }]}>
        <Ionicons name="briefcase-outline" size={17} color={palette.accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7 },
  title: { fontSize: 19, fontFamily: "Inter_700Bold", letterSpacing: -0.25 },
  mark: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
