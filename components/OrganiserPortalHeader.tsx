import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useStories } from "@/context/StoriesContext";
import { StoryAvatar } from "@/components/StoryAvatar";
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
  const { collections, openStories, loading } = useStories();
  const mine = collections.find((collection) => collection.ownerId === user?.id);
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
        <Pressable disabled={loading} accessibilityRole="button"
          accessibilityLabel={mine ? `View your stories, ${mine.hasUnwatched ? "unwatched" : "watched"}` : "Add to your story"}
          onPress={() => mine ? openStories(mine.ownerId, true) : router.push("/business/create-story")}>
          <StoryAvatar name={orgName} uri={logoUrl || user?.avatarUrl} size={42} surfaceColor={palette.canvas}
            ring={mine ? mine.hasUnwatched ? "new" : "watched" : undefined} add={!mine && !loading} />
        </Pressable>
        <View style={styles.identity}>
          <Text style={[styles.workspaceLabel, { color: palette.muted }]}>Organiser workspace</Text>
          <Text style={[styles.orgName, { color: palette.text }]} numberOfLines={1}>{orgName}</Text>
        </View>
        <Pressable
          onPress={leaveWorkspace}
          style={({ pressed }) => [styles.exitButton, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }, pressed && { backgroundColor: palette.surfacePressed }]}
          accessibilityRole="button"
          accessibilityLabel="Return to Home"
        >
          <Ionicons name="home-outline" size={16} color={palette.text} />
          <Text style={[styles.exitText, { color: palette.text }]}>Home</Text>
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
  identity: { flex: 1, minWidth: 0, gap: 2 },
  workspaceLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.1 },
  orgName: { fontSize: 15, lineHeight: 21, fontFamily: "Inter_700Bold" },
  exitButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11 },
  exitText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 28, lineHeight: 35, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
});
