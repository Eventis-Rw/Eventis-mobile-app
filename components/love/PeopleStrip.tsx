import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MembershipBadge } from "@/components/love/MembershipBadge";
import type { LoveProfile } from "@/constants/loveProfiles";
import { useColors } from "@/hooks/useColors";
import { presenceOf } from "@/utils/findLoveDiscovery";

/** A titled horizontal row of round avatars, e.g. "Online now" or "Near you". */
export function PeopleStrip({
  title,
  subtitle,
  profiles,
  onOpen,
  empty,
}: {
  title: string;
  subtitle?: string;
  profiles: LoveProfile[];
  onOpen: (profile: LoveProfile) => void;
  /** Shown instead of the row when there is nobody to show. */
  empty?: React.ReactNode;
}) {
  const colors = useColors();
  if (!profiles.length && !empty) return null;
  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {profiles.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {profiles.map((profile) => (
            <Avatar key={profile.id} profile={profile} onPress={() => onOpen(profile)} />
          ))}
        </ScrollView>
      ) : (
        empty
      )}
    </View>
  );
}

function Avatar({ profile, onPress }: { profile: LoveProfile; onPress: () => void }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const presence = presenceOf(profile);
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={`@${profile.username}${profile.accountType === "private" ? ", Private member" : ""}${presence === "online" ? ", online now" : ""}`}
    >
      <View style={[styles.ring, { borderColor: presence === "online" ? colors.success : colors.border }]}>
        {profile.imageUrl && !failed ? (
          <Image source={{ uri: profile.imageUrl }} style={styles.avatar} onError={() => setFailed(true)} />
        ) : (
          <View style={[styles.avatar, styles.fallback, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        {presence !== "away" ? (
          <View
            style={[
              styles.dot,
              { borderColor: colors.background, backgroundColor: presence === "online" ? colors.success : colors.warning },
            ]}
          />
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.username, { color: colors.foreground }]}>@{profile.username}</Text>
      {profile.neighborhood ? (
        <Text numberOfLines={1} style={[styles.meta, { color: colors.mutedForeground }]}>{profile.neighborhood}</Text>
      ) : null}
      <View style={styles.badge}>
        <MembershipBadge type={profile.accountType} size="sm" iconOnly />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 18 },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { flexShrink: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  row: { gap: 14, paddingRight: 8 },
  item: { width: 78, alignItems: "center" },
  ring: { width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, padding: 2 },
  avatar: { width: "100%", height: "100%", borderRadius: 33 },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 18, fontFamily: "Inter_700Bold" },
  dot: { position: "absolute", right: 1, bottom: 1, width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  username: { marginTop: 6, fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: 78 },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", maxWidth: 78 },
  badge: { marginTop: 4 },
});
