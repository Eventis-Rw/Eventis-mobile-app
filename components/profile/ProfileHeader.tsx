import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import type { AccountType, User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Organisation } from "@/services/organiserService";
import type { BusinessVerificationStatus } from "@/services/profileService";

const ACCOUNT_LABELS: Record<AccountType, { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  customer: { label: "Customer", icon: "person-outline" },
  individual: { label: "Event Poster", icon: "megaphone-outline" },
  business: { label: "Business", icon: "business-outline" },
};

const VERIFICATION: Record<
  BusinessVerificationStatus,
  { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; colorKey: "success" | "warning" | "destructive" | "mutedForeground" }
> = {
  verified: { label: "Verified business", icon: "shield-checkmark", colorKey: "success" },
  pending: { label: "Verification pending", icon: "time-outline", colorKey: "warning" },
  rejected: { label: "Verification declined", icon: "alert-circle-outline", colorKey: "destructive" },
  unverified: { label: "Not verified", icon: "shield-outline", colorKey: "mutedForeground" },
};

interface ProfileHeaderProps {
  user: User;
  accountType: AccountType;
  organisation?: Organisation;
  location?: string;
  /** Only shown for business accounts, from the actual verification record. */
  verificationStatus?: BusinessVerificationStatus;
  onEditProfile: () => void;
}

/** Placeholder names given to phone sign-ups before they choose one. */
function isPlaceholderName(name: string) {
  return name.startsWith("Member") || name.startsWith("User ");
}

export function ProfileHeader({
  user,
  accountType,
  organisation,
  location,
  verificationStatus,
  onEditProfile,
}: ProfileHeaderProps) {
  const colors = useColors();
  const isBusiness = accountType === "business" && !!organisation;
  const imageUrl = isBusiness ? organisation.logoUrl : user.avatarUrl;
  const displayName = isBusiness
    ? organisation.name
    : isPlaceholderName(user.username) ? "Eventis Explorer" : user.username;
  // `username` doubles as the display name today, so only render it as a handle when it looks like one.
  const looksLikeHandle = !/\s/.test(user.username) && !isPlaceholderName(user.username);
  const handle = looksLikeHandle ? `@${user.username}` : isBusiness ? user.username : undefined;
  const account = ACCOUNT_LABELS[accountType];
  const verification = isBusiness && verificationStatus ? VERIFICATION[verificationStatus] : undefined;

  return (
    <GlassSurface style={styles.card}>
      <View style={styles.topRow}>
        <Pressable
          onPress={onEditProfile}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={isBusiness ? "Change business logo" : "Change profile photo"}
          style={({ pressed }) => [
            styles.avatar,
            isBusiness && styles.logo,
            { backgroundColor: imageUrl ? colors.card : colors.primary, borderColor: colors.border },
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.avatarImg, isBusiness && styles.logo]}
              accessibilityLabel={isBusiness ? `${displayName} logo` : "Profile photo"}
            />
          ) : (
            <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
        </Pressable>

        <View style={styles.identity}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
          {handle ? (
            <Text style={[styles.handle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {handle}
            </Text>
          ) : null}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: `${colors.primary}1F` }]}>
              <Ionicons name={account.icon} size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>{account.label}</Text>
            </View>
            {verification ? (
              <View style={[styles.badge, { backgroundColor: `${colors[verification.colorKey]}22` }]}>
                <Ionicons name={verification.icon} size={12} color={colors[verification.colorKey]} />
                <Text style={[styles.badgeText, { color: colors[verification.colorKey] }]}>
                  {verification.label}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {user.bio ? (
        <Text style={[styles.bio, { color: colors.foreground }]} numberOfLines={3}>
          {user.bio}
        </Text>
      ) : null}

      {location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {location}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={onEditProfile}
        style={({ pressed }) => [
          styles.editBtn,
          { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
      >
        <Ionicons name="create-outline" size={16} color={colors.foreground} />
        <Text style={[styles.editText, { color: colors.foreground }]}>Edit Profile</Text>
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { borderRadius: 18 },
  avatarImg: { width: "100%", height: "100%", borderRadius: 36 },
  avatarLetter: { color: "#FFFFFF", fontSize: 28, fontFamily: "Inter_700Bold" },
  identity: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 20, fontFamily: "Inter_700Bold" },
  handle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bio: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 1 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  editText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
