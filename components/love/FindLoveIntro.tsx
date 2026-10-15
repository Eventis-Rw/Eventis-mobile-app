import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MOCK_LOVE_PROFILES } from "@/constants/loveProfiles";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { MIN_LOVE_AGE } from "@/utils/findLoveProfile";

const POINTS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string }[] = [
  { icon: "people-outline", title: "Connect", text: "Meet people who go to the same events and places as you." },
  { icon: "compass-outline", title: "Discover", text: "See who is online and who is in your neighbourhood." },
  { icon: "cafe-outline", title: "Meet", text: "Turn a good conversation into coffee, dinner or an event together." },
];

/** First thing a member sees in FindLove until they create a profile. */
export function FindLoveIntro() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const top = Platform.OS === "web" ? 68 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: top + 28, paddingBottom: (Platform.OS === "web" ? 110 : insets.bottom + 108) }]}
      showsVerticalScrollIndicator={false}
    >
      <MatchHero />
      <Text style={[styles.eyebrow, { color: colors.primary }]}>FINDLOVE</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Connect. Discover. Meet.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Create a FindLove profile with a username of your choice. Your Eventis name and phone number stay private.
      </Text>

      <View style={styles.points}>
        {POINTS.map((point) => (
          <View key={point.title} style={[styles.point, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.pointIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name={point.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.pointBody}>
              <Text style={[styles.pointTitle, { color: colors.foreground }]}>{point.title}</Text>
              <Text style={[styles.pointText, { color: colors.mutedForeground }]}>{point.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push("/love/create" as any)}
        style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>Get started</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>
      <View style={styles.adultRow}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.mutedForeground} />
        <Text style={[styles.adultText, { color: colors.mutedForeground }]}>For adults {MIN_LOVE_AGE}+ only.</Text>
      </View>
    </ScrollView>
  );
}

// Two demo members' photos, tilted toward each other with a heart where they meet.
const HERO_PHOTOS = [MOCK_LOVE_PROFILES[1].imageUrl, MOCK_LOVE_PROFILES[0].imageUrl];

function MatchHero() {
  const colors = useColors();
  return (
    <View style={styles.hero} accessibilityRole="image" accessibilityLabel="Two FindLove members matched with a heart">
      <View style={[styles.glow, { backgroundColor: colors.primary }]} />
      {HERO_PHOTOS.map((uri, index) => (
        <View
          key={uri}
          style={[
            styles.photoCard,
            index === 0 ? styles.photoLeft : styles.photoRight,
            { backgroundColor: colors.secondary, borderColor: colors.background },
          ]}
        >
          <Image source={{ uri }} style={styles.photo} />
        </View>
      ))}
      <View style={[styles.heartBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
        <Ionicons name="heart" size={30} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 20, alignItems: "center" },
  hero: { width: 300, maxWidth: "100%", height: 230, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 240, height: 160, borderRadius: 120, opacity: 0.12 },
  photoCard: { position: "absolute", top: 10, width: 140, height: 175, borderRadius: 28, borderWidth: 4, overflow: "hidden" },
  photoLeft: { left: 12, transform: [{ rotate: "-9deg" }] },
  photoRight: { right: 12, top: 26, transform: [{ rotate: "8deg" }] },
  photo: { width: "100%", height: "100%" },
  heartBadge: { position: "absolute", bottom: 4, width: 66, height: 66, borderRadius: 33, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  eyebrow: { marginTop: 18, fontSize: 11, letterSpacing: 1.7, fontFamily: "Inter_700Bold" },
  title: { marginTop: 6, fontSize: 32, letterSpacing: -1.1, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { marginTop: 10, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", textAlign: "center" },
  points: { alignSelf: "stretch", gap: 12, marginTop: 28 },
  point: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, padding: 14 },
  pointIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pointBody: { flex: 1, gap: 2 },
  pointTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pointText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  cta: { alignSelf: "stretch", flexDirection: "row", gap: 8, minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 28 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  adultRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  adultText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
