import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { GlassSurface } from "@/components/GlassSurface";

/** Header for screens pushed from the organiser portal (create/edit). Keeps the organiser badge visible. */
export function PortalScreenHeader({
  title,
  icon = "chevron-back",
  disabled,
}: {
  title: string;
  /** `close` for modal-style screens. */
  icon?: "chevron-back" | "close";
  disabled?: boolean;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <GlassSurface
      style={[
        styles.header,
        {
          paddingTop: topPad + 8,
          borderWidth: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          borderRadius: 0,
        },
      ]}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/business/dashboard" as any))}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={icon === "close" ? "Close" : "Go back"}
        hitSlop={8}
      >
        <Ionicons name={icon} size={24} color={disabled ? colors.disabled : colors.foreground} />
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.pill, { backgroundColor: colors.primary + "1F" }]} accessibilityLabel="Organiser portal">
        <Ionicons name="briefcase" size={11} color={colors.primary} />
        <Text style={[styles.pillText, { color: colors.primary }]}>Organiser</Text>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
