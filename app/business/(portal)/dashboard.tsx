import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserPortalHeader } from "@/components/OrganiserPortalHeader";
import { useAuth } from "@/context/AuthContext";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { useOrganiserEvents } from "@/hooks/useOrganiserEvents";

const enter = (delay: number) => Platform.OS !== "web" ? FadeInDown.delay(delay).springify() : undefined;

export default function OrganiserDashboard() {
  const palette = useOrganiserPalette();
  const router = useRouter();
  const { user } = useAuth();
  const { events, hasLoaded, error, refresh } = useOrganiserEvents();
  const organisation = user?.organisation?.name ?? user?.businessName ?? "Your organisation";
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 370 || fontScale > 1.2;

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]} testID="organiser-overview-screen">
      <OrganiserAtmosphere />
      <OrganiserPortalHeader title="Overview" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(30)}>
          <LinearGradient
            colors={palette.dark ? ["#087EC1", "#07568D", "#10243D"] : ["#098BD3", "#0872B4", "#125286"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroOrb} />
            <View style={styles.heroLabelRow}><View style={styles.statusDot} /><Text style={styles.heroLabel}>WORKSPACE READY</Text></View>
            <Text style={styles.heroTitle}>Your next event starts here.</Text>
            <Text style={styles.heroCopy}>Create the event page first, then keep people interested with stories.</Text>
            <Pressable
              onPress={() => router.push("/business/create-event" as any)}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Create an event"
            >
              <Text style={styles.heroButtonText}>Create an event</Text>
              <Ionicons name="arrow-forward" size={18} color="#087EC1" />
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={enter(70)} style={[styles.summaryRow, compact && styles.stack]}>
          <Pressable onPress={() => router.navigate("/business/events")} accessibilityRole="button" accessibilityLabel="View my events" style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.summaryIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name="calendar-outline" size={20} color={palette.accent} /></View>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{hasLoaded ? events.length : "—"}</Text>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Events in workspace</Text>
          </Pressable>
          <Pressable onPress={() => router.navigate("/business/organisation")} accessibilityRole="button" accessibilityLabel="Manage organisation" style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.summaryIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name="business-outline" size={20} color={palette.accent} /></View>
            <Text style={[styles.orgValue, { color: palette.text }]} numberOfLines={1}>{organisation}</Text>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Active organisation</Text>
          </Pressable>
        </Animated.View>

        {error ? <Pressable onPress={() => void refresh()} accessibilityRole="button"><Text style={[styles.actionText, { color: palette.danger }]}>{error} Tap to retry.</Text></Pressable> : null}

        <SectionHeading title="Quick create" text="Choose the format that matches your goal." palette={palette} />
        <Animated.View entering={enter(110)} style={styles.actions}>
          <QuickAction icon="calendar-outline" title="Event" text="A dated, discoverable page with venue and ticket details." onPress={() => router.push("/business/create-event" as any)} palette={palette} />
          <QuickAction icon="aperture-outline" title="Story" text="A short visual update shown at the top of the feed." onPress={() => router.push("/business/create-story" as any)} palette={palette} />
          <QuickAction icon="radio-outline" title="Live" text="Host a conversation and invite your audience on stage." onPress={() => router.push("/(tabs)/live")} palette={palette} />
        </Animated.View>

      </ScrollView>
    </View>
  );
}

type Palette = ReturnType<typeof useOrganiserPalette>;

function SectionHeading({ title, text, palette }: { title: string; text: string; palette: Palette }) {
  return <View style={styles.sectionHeading}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.sectionText, { color: palette.muted }]}>{text}</Text></View>;
}

function QuickAction({ icon, title, text, onPress, palette }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string; onPress: () => void; palette: Palette }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: palette.surface, borderColor: palette.line }, pressed && { backgroundColor: palette.surfacePressed }]} accessibilityRole="button" accessibilityLabel={`Create ${title.toLowerCase()}`}>
    <View style={[styles.actionIcon, { backgroundColor: palette.blueSoft }]}><Ionicons name={icon} size={21} color={palette.accent} /></View>
    <View style={styles.flex}><Text style={[styles.actionTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.actionText, { color: palette.muted }]}>{text}</Text></View>
    <Ionicons name="chevron-forward" size={20} color={palette.muted} />
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, flex: { flex: 1 }, scroll: { flex: 1 }, content: { padding: 20, paddingBottom: 32, gap: 24 },
  hero: { borderRadius: 26, padding: 21, overflow: "hidden" },
  heroOrb: { position: "absolute", width: 210, height: 210, borderRadius: 105, right: -65, top: -105, borderWidth: 36, borderColor: "rgba(255,255,255,0.08)" },
  heroLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7DD3FC" },
  heroLabel: { color: "rgba(255,255,255,0.88)", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.1 },
  heroTitle: { color: "#FFFFFF", fontSize: 29, lineHeight: 35, fontFamily: "Inter_700Bold", letterSpacing: -0.65, marginTop: 24, maxWidth: 340 },
  heroCopy: { color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 8, maxWidth: 320 },
  heroButton: { minHeight: 49, backgroundColor: "#FFFFFF", borderRadius: 15, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 }, heroButtonText: { color: "#087EC1", fontSize: 14, fontFamily: "Inter_700Bold" },
  summaryRow: { flexDirection: "row", gap: 10 }, summaryCard: { flex: 1, minHeight: 139, borderRadius: 19, borderWidth: 1, padding: 14 }, summaryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  summaryValue: { fontSize: 26, lineHeight: 30, fontFamily: "Inter_700Bold" }, orgValue: { fontSize: 17, lineHeight: 22, fontFamily: "Inter_700Bold", marginTop: 3 }, summaryLabel: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 4 },
  sectionHeading: { gap: 5 }, sectionTitle: { fontSize: 19, lineHeight: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 }, sectionText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  actions: { gap: 9 }, action: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 13 }, actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, actionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" }, actionText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 3 },
  stack: { flexDirection: "column" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
