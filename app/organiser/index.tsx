import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useOrganiserAccess } from "@/hooks/useOrganiserAccess";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";

const TOOLS = [
  {
    icon: "calendar-outline" as const,
    title: "Publish event pages",
    text: "Give every event one clear place for the date, venue, details and booking action.",
  },
  {
    icon: "megaphone-outline" as const,
    title: "Promote every moment",
    text: "Use stories to keep your audience interested.",
  },
  {
    icon: "analytics-outline" as const,
    title: "Manage from one workspace",
    text: "Create content, update event details and review performance without another login.",
  },
];

const JOURNEY = [
  { title: "Choose access", text: "Pick a pass that matches how often you publish." },
  { title: "Create your profile", text: "Add the organiser name, identity and public details." },
  { title: "Launch your event", text: "Create an event first, then promote it with stories." },
];

const enter = (delay: number) =>
  Platform.OS !== "web" ? FadeInDown.delay(delay).springify() : undefined;

export default function BecomeOrganiserScreen() {
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { step } = useOrganiserAccess();

  const continueFlow = () => {
    if (step === "ready") {
      router.replace("/business/dashboard" as any);
    } else if (step === "setup") {
      router.push({ pathname: "/organiser/setup" as any, params: from ? { from } : {} });
    } else {
      router.push({ pathname: "/organiser/subscribe" as any, params: from ? { from } : {} });
    }
  };

  const ctaLabel = step === "ready"
    ? "Open organiser workspace"
    : step === "setup"
      ? "Continue profile setup"
      : "See plans and pricing";

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <OrganiserFlowHeader title="Become an organiser" step={1} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {from === "create-post" && step !== "ready" ? (
          <View style={[styles.contextCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.contextIcon, { backgroundColor: palette.blueSoft }]}>
              <Ionicons name="lock-closed-outline" size={18} color={palette.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.contextTitle, { color: palette.text }]}>Organiser access required</Text>
              <Text style={[styles.contextText, { color: palette.muted }]}>Complete this flow to publish events and stories.</Text>
            </View>
          </View>
        ) : null}

        {step === "setup" ? (
          <View style={[styles.resumeCard, { backgroundColor: palette.blueSoft, borderColor: palette.blue }]}>
            <Ionicons name="checkmark-circle" size={23} color={palette.accent} />
            <View style={styles.flex}>
              <Text style={[styles.resumeTitle, { color: palette.text }]}>Your pass is active</Text>
              <Text style={[styles.resumeText, { color: palette.muted }]}>Your payment step is complete. Finish your public organiser profile to open the workspace.</Text>
            </View>
          </View>
        ) : null}

        <Animated.View entering={enter(40)}>
          <LinearGradient
            colors={palette.dark ? ["#0B74B8", "#09467D", "#10213B"] : ["#0788CE", "#0867A8", "#17477B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroRing} />
            <View style={styles.heroTop}>
              <View style={styles.heroMark}><Ionicons name="briefcase-outline" size={22} color="#FFFFFF" /></View>
              <Text style={styles.heroLabel}>EVENTIS FOR ORGANISERS</Text>
            </View>
            <Text style={styles.heroTitle}>Give every event a place to grow.</Text>
            <Text style={styles.heroText}>
              Build the event page, share the story and manage what your audience sees from one focused workspace.
            </Text>
            <Pressable
              onPress={continueFlow}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.heroButtonText}>{ctaLabel}</Text>
              <Ionicons name="arrow-forward" size={18} color="#087EC1" />
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={enter(90)} style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>What the workspace gives you</Text>
            <Text style={[styles.sectionText, { color: palette.muted }]}>The essentials for publishing and promoting events.</Text>
          </View>
          <View style={styles.tools}>
            {TOOLS.map((tool) => (
              <View key={tool.title} style={[styles.toolCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <View style={[styles.toolIcon, { backgroundColor: palette.blueSoft }]}>
                  <Ionicons name={tool.icon} size={21} color={palette.accent} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.toolTitle, { color: palette.text }]}>{tool.title}</Text>
                  <Text style={[styles.toolText, { color: palette.muted }]}>{tool.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={enter(140)} style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>From account to first event</Text>
            <Text style={[styles.sectionText, { color: palette.muted }]}>A short setup, then everything lives in your organiser workspace.</Text>
          </View>
          <View style={[styles.journey, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            {JOURNEY.map((item, index) => (
              <View key={item.title} style={styles.journeyRow}>
                <View style={styles.journeyRail}>
                  <View style={[styles.journeyNumber, { backgroundColor: index === 0 ? palette.blue : palette.surfaceRaised, borderColor: index === 0 ? palette.blue : palette.line }]}>
                    <Text style={[styles.journeyNumberText, { color: index === 0 ? palette.onBlue : palette.muted }]}>{index + 1}</Text>
                  </View>
                  {index < JOURNEY.length - 1 ? <View style={[styles.journeyLine, { backgroundColor: palette.line }]} /> : null}
                </View>
                <View style={styles.journeyCopy}>
                  <Text style={[styles.journeyTitle, { color: palette.text }]}>{item.title}</Text>
                  <Text style={[styles.journeyText, { color: palette.muted }]}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={[styles.note, { backgroundColor: palette.surfaceRaised, borderColor: palette.line }]}>
          <Ionicons name="swap-horizontal-outline" size={20} color={palette.accent} />
          <Text style={[styles.noteText, { color: palette.muted }]}>Your personal Eventis account stays available. Switch between personal and organiser without signing out.</Text>
        </View>

        <Pressable
          onPress={continueFlow}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.blue }, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
        {step !== "ready" ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
            style={styles.later}
            accessibilityRole="button"
          >
            <Text style={[styles.laterText, { color: palette.muted }]}>Not now</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 18, gap: 22 },
  contextCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 17, borderWidth: 1 },
  contextIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contextTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  contextText: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 2 },
  resumeCard: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 14, borderRadius: 17, borderWidth: 1 },
  resumeTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  resumeText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 2 },
  hero: { borderRadius: 28, padding: 22, overflow: "hidden" },
  heroRing: { position: "absolute", width: 260, height: 260, borderRadius: 130, right: -95, top: -90, borderWidth: 42, borderColor: "rgba(255,255,255,0.07)" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 36 },
  heroMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  heroLabel: { flex: 1, color: "rgba(255,255,255,0.88)", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.25 },
  heroTitle: { color: "#FFFFFF", fontSize: 34, lineHeight: 40, fontFamily: "Inter_700Bold", letterSpacing: -0.9 },
  heroText: { color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginTop: 10 },
  heroButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 16, marginTop: 22 },
  heroButtonText: { flexShrink: 1, paddingVertical: 14, color: "#087EC1", fontSize: 14, fontFamily: "Inter_700Bold" },
  section: { gap: 13 },
  sectionHeading: { gap: 4 },
  sectionTitle: { fontSize: 21, lineHeight: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  sectionText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  tools: { gap: 10 },
  toolCard: { flexDirection: "row", alignItems: "flex-start", gap: 13, padding: 15, borderRadius: 19, borderWidth: 1 },
  toolIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  toolTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  toolText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 3 },
  journey: { padding: 17, borderRadius: 21, borderWidth: 1, gap: 2 },
  journeyRow: { flexDirection: "row", gap: 12 },
  journeyRail: { width: 32, alignItems: "center" },
  journeyNumber: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  journeyNumberText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  journeyLine: { width: 1, flex: 1, minHeight: 28, marginVertical: 5 },
  journeyCopy: { flex: 1, paddingBottom: 18 },
  journeyTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  journeyText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 3 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 17, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  primaryButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 17 },
  primaryButtonText: { flexShrink: 1, paddingVertical: 14, textAlign: "center", color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  later: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: -10 },
  laterText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
});
