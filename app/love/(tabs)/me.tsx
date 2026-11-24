import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ChatConfirmDialog } from "@/components/ChatConfirmDialog";
import { LoveHeader } from "@/components/love/LoveHeader";
import { MembershipBadge } from "@/components/love/MembershipBadge";
import { useAuth } from "@/context/AuthContext";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";
import { useColors } from "@/hooks/useColors";
import { USE_FINDLOVE_API } from "@/services/findLoveService";
import { cheapestPlan, formatMembershipPrice } from "@/utils/findLoveMembership";
import { countryName, formatDateOfBirth } from "@/utils/findLoveProfile";

type IconName = keyof typeof Ionicons.glyphMap;

/** FindLove "Me" tab: the member's own profile, membership and settings. Leaving FindLove is the Eventis tab. */
export default function LoveMeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { myProfile, accountType, verification } = useMyLoveProfile();
  const { logout } = useAuth();
  const [photoFailed, setPhotoFailed] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const doLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      setConfirmingLogout(false);
    } catch {
      setConfirmingLogout(false);
      setLogoutError("We couldn't log you out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };
  const photo = myProfile?.photoUrls[0];
  const isPrivate = accountType === "private";
  const expiresAt = myProfile?.membership.expiresAt;
  const runsUntil = expiresAt ? ` Runs until ${formatDateOfBirth(expiresAt.slice(0, 10))}.` : "";
  const privateFrom = cheapestPlan("private");

  const rows: { icon: IconName; label: string; value?: string; onPress: () => void }[] = [
    { icon: "create-outline", label: "Edit profile, bio & photos", onPress: () => router.push("/love/edit" as any) },
    { icon: "sparkles-outline", label: "About FindLove", onPress: () => router.push("/love/onboarding" as any) },
    { icon: "document-text-outline", label: "Terms & privacy", onPress: () => router.push("/love/policies" as any) },
    {
      icon: "shield-checkmark-outline",
      label: "Age verification",
      value: verification.status === "verified" ? "Verified" : "Pending",
      onPress: () => router.push("/love/verify" as any),
    },
    ...(USE_FINDLOVE_API
      ? [{ icon: "receipt-outline" as const, label: "Payment history", onPress: () => router.push("/love/payments" as any) }]
      : []),
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoveHeader title="Me" showExit={false} />
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
            <Text style={[styles.membershipTitle, { color: colors.foreground }]}>{isPrivate ? "Private member" : "Public member"}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {isPrivate
                ? `You can connect with every member.${runsUntil}`
                : `Go Private to connect with Private members, from ${formatMembershipPrice(privateFrom.price)} / ${privateFrom.periodLabel}.${runsUntil}`}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              router.push(
                isPrivate
                  ? ({ pathname: "/love/membership" } as any)
                  : ({ pathname: "/love/membership", params: { from: "upgrade" } } as any),
              )
            }
            style={[styles.upgrade, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            <Text style={styles.upgradeText}>{isPrivate ? "Change plan" : "Upgrade"}</Text>
          </Pressable>
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

        {/* Kept in its own card, apart from the rows above, so it is easy to find but hard to hit by accident. */}
        <Pressable
          onPress={() => setConfirmingLogout(true)}
          style={({ pressed }) => [
            styles.list,
            styles.row,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Log out of Eventis"
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.glass }]}>
            <Ionicons name="log-out-outline" size={19} color={colors.destructive} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.destructive }]}>Log out</Text>
        </Pressable>
        {logoutError ? <Text style={[styles.error, { color: colors.destructive }]}>{logoutError}</Text> : null}
      </ScrollView>

      <ChatConfirmDialog
        visible={confirmingLogout}
        title="Log out of Eventis?"
        description="You'll need to sign in again to use FindLove, see your tickets and bookings."
        confirmLabel="Log out"
        destructive
        busy={loggingOut}
        onConfirm={() => void doLogout()}
        onClose={() => setConfirmingLogout(false)}
      />
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
  error: { fontSize: 12, fontFamily: "Inter_500Medium", paddingHorizontal: 4, marginTop: -6 },
});
