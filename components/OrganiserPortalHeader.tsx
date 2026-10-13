import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

/** Compact workspace header used by all organiser portal tabs. */
export function OrganiserPortalHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const orgName = user?.organisation?.name ?? user?.businessName ?? "Your organisation";
  const logoUrl = user?.organisation?.logoUrl;
  const topPad = insets.top;

  const leaveWorkspace = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.dismissTo("/(tabs)" as any);
  };

  return (
    <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: palette.canvas, borderBottomColor: palette.line }]}>
      <View style={styles.workspaceRow}>
        <View style={[styles.avatar, { backgroundColor: palette.blueSoft, borderColor: palette.line }]}>
          {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.avatarImage} /> : (
            <Text style={[styles.avatarLetter, { color: palette.accent }]}>{orgName.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text style={[styles.workspaceLabel, { color: palette.muted }]}>Organiser workspace</Text>
          <Text style={[styles.orgName, { color: palette.text }]} numberOfLines={1}>{orgName}</Text>
        </View>
        <Pressable
          onPress={leaveWorkspace}
          style={({ pressed }) => [styles.exitButton, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }, pressed && { backgroundColor: palette.surfacePressed }]}
          accessibilityRole="button"
          accessibilityLabel="Return to personal Eventis"
        >
          <Ionicons name="person-outline" size={16} color={palette.text} />
          <Text style={[styles.exitText, { color: palette.text }]}>Personal</Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth, gap: 20 },
  workspaceRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarLetter: { fontSize: 18, fontFamily: "Inter_700Bold" },
  identity: { flex: 1, minWidth: 0, gap: 2 },
  workspaceLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.1 },
  orgName: { fontSize: 15, lineHeight: 21, fontFamily: "Inter_700Bold" },
  exitButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11 },
  exitText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 28, lineHeight: 35, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
});
