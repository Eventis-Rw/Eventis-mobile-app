import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

/**
 * Header for every organiser portal tab. Shows whose organisation is active,
 * marks the screen as the organiser experience, and offers the way back to the
 * personal account (same session, no logout).
 */
export function OrganiserPortalHeader({
  title,
  children,
}: {
  title: string;
  /** Optional extra row under the title, e.g. a segmented control. */
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const orgName = user?.organisation?.name ?? user?.businessName ?? "Your organisation";
  const logoUrl = user?.organisation?.logoUrl;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const switchToPersonal = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.dismissTo("/(tabs)" as any);
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.identityRow}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarLetter}>{orgName.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text style={[styles.orgName, { color: colors.foreground }]} numberOfLines={1}>
            {orgName}
          </Text>
          <View
            style={[styles.modePill, { backgroundColor: colors.primary + "1F" }]}
            accessibilityLabel="You are in the organiser portal"
          >
            <Ionicons name="briefcase" size={11} color={colors.primary} />
            <Text style={[styles.modeText, { color: colors.primary }]}>Organiser portal</Text>
          </View>
        </View>
        <Pressable
          onPress={switchToPersonal}
          style={[styles.switchBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          accessibilityRole="button"
          accessibilityLabel="Switch to personal account"
          accessibilityHint="Returns to the regular Eventis experience. You stay signed in."
          hitSlop={6}
        >
          <Ionicons name="swap-horizontal" size={15} color={colors.foreground} />
          <Text style={[styles.switchText, { color: colors.foreground }]}>Personal</Text>
        </Pressable>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarLetter: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  identity: { flex: 1, gap: 4, alignItems: "flex-start" },
  orgName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  modeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  switchText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
});
