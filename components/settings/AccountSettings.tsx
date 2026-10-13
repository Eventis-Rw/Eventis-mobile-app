import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import type { AccountType, User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useOrganiserAccess } from "@/hooks/useOrganiserAccess";
import type { AccountCapabilities } from "@/utils/accountCapabilities";

const ACCOUNT_LABEL: Record<AccountType, string> = {
  customer: "Customer account",
  individual: "Event poster account",
  business: "Business account",
};

/** Who's signed in; opens the profile. */
export function AccountSummary({ user, accountType }: { user: User; accountType: AccountType }) {
  const colors = useColors();
  const router = useRouter();
  const isBusiness = accountType === "business" && !!user.organisation;
  const name = isBusiness ? user.organisation!.name : user.username;
  const image = isBusiness ? user.organisation!.logoUrl : user.avatarUrl;

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/profile" as any)}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${ACCOUNT_LABEL[accountType]}. Open profile`}
    >
      <GlassSurface style={styles.summary}>
        <View style={[styles.avatar, isBusiness && styles.logo, { backgroundColor: colors.primary }]}>
          {image ? (
            <Image source={{ uri: image }} style={[styles.avatarImg, isBusiness && styles.logo]} />
          ) : (
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.summaryCopy}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {ACCOUNT_LABEL[accountType]} · {user.email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </GlassSurface>
    </Pressable>
  );
}

/** Group 1: profile, business details and organiser access. */
export function AccountSettings({ capabilities }: { capabilities: AccountCapabilities }) {
  const router = useRouter();
  const { hasOrganiserAccess, openOrganiserFlow } = useOrganiserAccess();
  const isBusiness = capabilities.accountType === "business";

  return (
    <SettingsGroup title="Account">
      <SettingsRow
        icon="person-outline"
        label="Edit profile"
        sublabel={
          isBusiness
            ? "Logo, business details, contact and legal identity"
            : capabilities.isPublisher
              ? "Photo, bio, contact, categories and social links"
              : "Photo, name, bio and location"
        }
        onPress={() => router.push("/profile/edit" as any)}
      />
      {capabilities.settings.editBusinessProfile ? (
        <SettingsRow
          icon="business-outline"
          label="Organisation"
          sublabel="Switch or manage your organisations"
          onPress={() => router.push("/business/organisation" as any)}
        />
      ) : null}
      {hasOrganiserAccess ? (
        <SettingsRow
          icon="briefcase-outline"
          label="Organiser portal"
          sublabel="Your events, posts and stories"
          onPress={() => openOrganiserFlow()}
        />
      ) : !capabilities.isPublisher ? (
        <SettingsRow
          icon="megaphone-outline"
          label="Become an organiser"
          sublabel="Publish your own events on Eventis"
          onPress={() => openOrganiserFlow()}
        />
      ) : null}
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { borderRadius: 14 },
  avatarImg: { width: "100%", height: "100%", borderRadius: 26 },
  avatarLetter: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryCopy: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 17, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
