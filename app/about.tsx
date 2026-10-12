import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/GlassSurface";
import { Logo } from "@/components/Logo";
import { ProfileSubHeader } from "@/components/profile/ProfileSubHeader";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsPrimitives";
import { APP_VERSION } from "@/components/settings/SupportSettings";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const PRINCIPLES: { icon: IconName; title: string; text: string }[] = [
  { icon: "compass-outline", title: "Discover freely", text: "Browse nearby, trending and promoted events from the moment you install, with no checks." },
  { icon: "shield-checkmark-outline", title: "Verify only when needed", text: "Identity checks appear only where money, communication or trust are involved." },
  { icon: "card-outline", title: "Organisers own payments", text: "Paid tickets are bought on the organiser's website; Eventis never holds your money." },
];

/** About Eventis: what it is, how it works, version and legal links. */
export default function AboutScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ProfileSubHeader title="About Eventis" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.hero}>
          <Logo variant="primary" style={styles.logo} />
          <Text style={[styles.tagline, { color: colors.foreground }]}>
            Find events near you, book in a tap, and host your own.
          </Text>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>
            Version {APP_VERSION} · {Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}
          </Text>
        </View>

        <GlassSurface style={styles.card}>
          {PRINCIPLES.map((p) => (
            <View key={p.title} style={styles.principle}>
              <View style={[styles.icon, { backgroundColor: `${colors.primary}1A` }]}>
                <Ionicons name={p.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.foreground }]}>{p.title}</Text>
                <Text style={[styles.text, { color: colors.mutedForeground }]}>{p.text}</Text>
              </View>
            </View>
          ))}
        </GlassSurface>

        <SettingsGroup title="Legal">
          <SettingsRow icon="document-text-outline" label="Terms of Service" onPress={() => router.push("/legal/terms" as any)} />
          <SettingsRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push("/legal/privacy" as any)} />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 22 },
  hero: { alignItems: "center", gap: 8, paddingTop: 12 },
  logo: { width: 80, height: 80 },
  tagline: { fontSize: 16, lineHeight: 22, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingHorizontal: 12 },
  version: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { padding: 14, gap: 16 },
  principle: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  text: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
});
