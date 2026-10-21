import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { LoveHeader, useExitFindLove } from "@/components/love/LoveHeader";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { useFindLoveDemo } from "@/context/FindLoveDemoContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useColors } from "@/hooks/useColors";
import { formatMembershipPrice, PRIVATE_MEMBERSHIP_PLAN } from "@/utils/findLoveMembership";
import { countryName } from "@/utils/findLoveProfile";

type IconName = keyof typeof Ionicons.glyphMap;

/** FindLove "Me" tab: the member's own profile, membership, tokens and settings. */
export default function LoveMeScreen() {
  const colors = useColors();
  const router = useRouter();
  const exit = useExitFindLove();
  const { myProfile, accountType, verification } = useMyLoveProfile();
  const { tokenBalance } = useFindLoveDemo();
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = myProfile?.photoUrls[0];
  const isPrivate = accountType === "private";

  const rows: { icon: IconName; label: string; value?: string; onPress: () => void }[] = [
    { icon: "create-outline", label: "Edit profile", onPress: () => router.push("/love/edit" as any) },
    { icon: "gift-outline", label: "Gift tokens", value: String(tokenBalance), onPress: () => router.push("/love/wallet" as any) },
    {
      icon: "shield-checkmark-outline",
      label: "Age verification",
      value: verification.status === "verified" ? "Verified" : "Pending",
      onPress: () => router.push("/love/verify" as any),
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoveHeader title="Me" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {photo && !photoFailed ? (
            <Image source={{ uri: photo }} style={styles.avatar} onError={() => setPhotoFailed(true)} accessibilityLabel="Your profile photo" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.initials, { color: colors.primary }]}>{(myProfile?.username ?? "?").slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileCopy}>
            <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>{myProfile?.username}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
              {[myProfile?.gender, myProfile?.neighborhood, countryName(myProfile?.country)].filter(Boolean).join(" · ") ||
                "Add your country"}
            </Text>
            <View style={styles.badgeRow}>
              <MembershipBadge type={accountType} size="sm" />
            </View>
          </View>
        </View>

        <View style={[styles.membershipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.rowIcon, { backgroundColor: colors.glass }]}>
            <Ionicons name={isPrivate ? "diamond" : "diamond-outline"} size={20} color={colors.primary} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.membershipTitle, { color: colors.foreground }]}>{isPrivate ? "Private member" : "Public account"}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {isPrivate
                ? "You can connect with every member."
                : `Go Private to connect with Private members. ${formatMembershipPrice()} / ${PRIVATE_MEMBERSHIP_PLAN.periodLabel}.`}
            </Text>
          </View>
          {!isPrivate ? (
            <Pressable
              onPress={() => router.push({ pathname: "/love/membership", params: { from: "upgrade" } } as any)}
              style={[styles.upgrade, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.upgradeText}>Upgrade</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {rows.map((row, index) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              accessibilityRole="button"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.glass }]}>
                <Ionicons name={row.icon} size={19} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{row.label}</Text>
              {row.value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{row.value}</Text> : null}
              <Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={exit}
          style={[styles.list, styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="exit-outline" size={19} color={colors.foreground} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Back to Eventis</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30, gap: 14 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 22, padding: 14 },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 24, fontFamily: "Inter_700Bold" },
  profileCopy: { flex: 1, minWidth: 0 },
  username: { fontSize: 19, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3 },
  badgeRow: { flexDirection: "row", marginTop: 8 },
  membershipCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 20, padding: 14 },
  membershipTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  upgrade: { paddingHorizontal: 14, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  upgradeText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  list: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
