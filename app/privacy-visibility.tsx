import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import { getAccountType, useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { organiserIdFromName } from "@/services/profileService";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Plain statement of what other people can see. There are no visibility
 * switches because the app has no visibility model yet
 * (PROFILE_FEATURES.accountVisibility); the facts below are how it works today.
 */
export default function PrivacyVisibilityScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  if (!user) return null;

  const accountType = getAccountType(user);
  const isPublisher = accountType !== "customer";
  const publicName = accountType === "business" ? user.organisation?.name ?? user.username : user.username;

  const visible: { icon: IconName; text: string }[] = isPublisher
    ? [
        { icon: "person-circle-outline", text: `Your ${accountType === "business" ? "business name and logo" : "name and photo"}, bio or description` },
        { icon: "pricetags-outline", text: "Your event categories, location, website and social links" },
        { icon: "call-outline", text: "The public contact email and phone you added in Edit profile" },
        { icon: "calendar-outline", text: "Your published events (paused events are hidden)" },
      ]
    : [{ icon: "ticket-outline", text: "When you book, that event's organiser gets your name and ticket code for check-in" }];

  const hidden: { icon: IconName; text: string }[] = [
    { icon: "mail-outline", text: "Your sign-in email and phone number" },
    { icon: "receipt-outline", text: "Your bookings and tickets for other events" },
    { icon: "bookmark-outline", text: "Events and organisers you save; organisers aren't told" },
    ...(accountType === "business"
      ? [{ icon: "document-lock-outline" as const, text: "Your registration number, TIN and verification documents (only you and Eventis reviewers)" }]
      : []),
    ...(!isPublisher ? [{ icon: "person-outline" as const, text: "Your profile: customers don't have a public page" }] : []),
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ProfileSubHeader title="Privacy & visibility" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <GlassSurface style={styles.intro}>
          <Ionicons name="eye-outline" size={22} color={colors.primary} />
          <Text style={[styles.introText, { color: colors.foreground }]}>
            Eventis has no followers, likes or public activity feed. Here's exactly what others can see.
          </Text>
        </GlassSurface>

        <List title="Others can see" items={visible} tone="primary" />
        <List title="Only you can see" items={hidden} tone="success" />

        {isPublisher ? (
          <SettingsGroup title="Your public page">
            <SettingsRow
              icon="open-outline"
              label="Preview your organiser page"
              sublabel="See it the way customers do"
              onPress={() =>
                router.push({
                  pathname: "/organiser-profile/[id]",
                  params: { id: organiserIdFromName(publicName), name: publicName },
                } as any)
              }
            />
            <SettingsRow icon="create-outline" label="Edit what's shown" onPress={() => router.push("/profile/edit" as any)} />
          </SettingsGroup>
        ) : null}
      </ScrollView>
    </View>
  );
}

function List({ title, items, tone }: { title: string; items: { icon: IconName; text: string }[]; tone: "primary" | "success" }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      <GlassSurface style={styles.card}>
        {items.map((item) => (
          <View key={item.text} style={styles.item}>
            <Ionicons name={item.icon} size={18} color={colors[tone]} />
            <Text style={[styles.itemText, { color: colors.foreground }]}>{item.text}</Text>
          </View>
        ))}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 22 },
  intro: { flexDirection: "row", gap: 12, padding: 14, alignItems: "flex-start" },
  introText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_500Medium" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  card: { padding: 14, gap: 14 },
  item: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
