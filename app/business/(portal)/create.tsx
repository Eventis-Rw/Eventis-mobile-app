import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserPortalHeader } from "@/components/OrganiserPortalHeader";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

export default function PortalCreateScreen() {
  const palette = useOrganiserPalette();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <OrganiserPortalHeader title="Create" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={[styles.introEyebrow, { color: palette.blue }]}>CHOOSE THE RIGHT FORMAT</Text>
          <Text style={[styles.introTitle, { color: palette.text }]}>What do you want people to do?</Text>
          <Text style={[styles.introText, { color: palette.muted }]}>
            Create an event when people need details or tickets. Use a post when you only need to share an update.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/business/create-event" as any)}
          style={({ pressed }) => [styles.primaryCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Create a scheduled event"
        >
          <LinearGradient colors={["#087DC5", "#164CB5", "#172653"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.cardGlow} />
          <View style={styles.cardTopRow}>
            <View style={styles.primaryIcon}><Ionicons name="calendar" size={24} color="#FFFFFF" /></View>
            <View style={styles.recommendedPill}><Text style={styles.recommendedText}>START HERE</Text></View>
          </View>
          <Text style={styles.primaryTitle}>Create an event</Text>
          <Text style={styles.primaryDescription}>
            Make a scheduled page people can discover, save and book.
          </Text>
          <View style={styles.featureRow}>
            <Feature icon="time-outline" label="Date & venue" />
            <Feature icon="ticket-outline" label="Tickets" />
            <Feature icon="compass-outline" label="Discovery" />
          </View>
          <View style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Build event page</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/business/create-post" as any)}
          style={({ pressed }) => [styles.secondaryCard, { backgroundColor: palette.surface, borderColor: palette.line }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Create a feed post"
        >
          <View style={[styles.secondaryIcon, { backgroundColor: palette.blueSoft }]}>
            <Ionicons name="images-outline" size={23} color={palette.blue} />
          </View>
          <View style={styles.cardCopy}>
            <View style={styles.labelRow}>
              <Text style={[styles.secondaryTitle, { color: palette.text }]}>Create a post</Text>
              <View style={[styles.typePill, { backgroundColor: palette.surfaceRaised }]}><Text style={[styles.typePillText, { color: palette.muted }]}>FEED UPDATE</Text></View>
            </View>
            <Text style={[styles.secondaryDescription, { color: palette.muted }]}>
              Share a photo, lineup announcement, reminder or change. A post does not create a bookable event.
            </Text>
            <Text style={[styles.example, { color: palette.blue }]}>Example: “Doors open at 7 PM tonight”</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/business/create-story" as any)}
          style={({ pressed }) => [styles.secondaryCard, { backgroundColor: palette.surface, borderColor: palette.line }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Create a story"
        >
          <View style={[styles.secondaryIcon, { backgroundColor: palette.blueSoft }]}>
            <Ionicons name="aperture-outline" size={23} color={palette.blue} />
          </View>
          <View style={styles.cardCopy}>
            <View style={styles.labelRow}>
              <Text style={[styles.secondaryTitle, { color: palette.text }]}>Create a story</Text>
              <View style={[styles.typePill, { backgroundColor: palette.surfaceRaised }]}><Text style={[styles.typePillText, { color: palette.muted }]}>QUICK MOMENT</Text></View>
            </View>
            <Text style={[styles.secondaryDescription, { color: palette.muted }]}>
              Share a short visual update that appears at the top of the home feed.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Pressable>

        <View style={[styles.tip, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}>
          <Ionicons name="bulb-outline" size={19} color={palette.blue} />
          <Text style={[styles.tipText, { color: palette.muted }]}>
            A strong launch usually starts with an event, followed by posts and stories that promote it.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Feature({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={14} color="#BAE6FD" />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 18, gap: 14, paddingBottom: 110 },
  intro: { gap: 6, marginBottom: 2 },
  introEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.15 },
  introTitle: { fontSize: 23, lineHeight: 29, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  introText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  primaryCard: { borderRadius: 26, padding: 20, overflow: "hidden" },
  cardGlow: { position: "absolute", width: 190, height: 190, borderRadius: 95, right: -50, top: -85, backgroundColor: "rgba(125,211,252,0.17)" },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 44 },
  primaryIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  recommendedPill: { backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  recommendedText: { color: "#FFFFFF", fontSize: 9, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },
  primaryTitle: { color: "#FFFFFF", fontSize: 27, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  primaryDescription: { color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 6 },
  featureRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  feature: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(3,8,24,0.24)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  featureText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  primaryAction: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.22)", paddingTop: 14 },
  primaryActionText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  secondaryCard: { minHeight: 148, flexDirection: "row", alignItems: "flex-start", gap: 13, borderRadius: 22, borderWidth: 1, padding: 16 },
  secondaryIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, gap: 7 },
  labelRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  secondaryTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  typePill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
  typePillText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  secondaryDescription: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  example: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_600SemiBold" },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 17, borderWidth: 1, padding: 14 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
});
