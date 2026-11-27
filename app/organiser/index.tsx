import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OrganiserAtmosphere } from "@/components/OrganiserAtmosphere";
import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { getOrganiserDestination, useOrganiserAccess } from "@/hooks/useOrganiserAccess";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { USE_ORGANISER_API } from "@/services/organiserService";

const TOOLS = [
  {
    icon: "calendar-outline" as const,
    title: "Publish event pages",
    text: "Give every event one clear place for date, venue, details and booking action.",
    tint: "#38BDF8",
    tintBg: "rgba(56, 189, 248, 0.14)",
  },
  {
    icon: "megaphone-outline" as const,
    title: "Promote every moment",
    text: "Share stories and updates to keep your audience engaged and excited.",
    tint: "#F59E0B",
    tintBg: "rgba(245, 158, 11, 0.14)",
  },
  {
    icon: "analytics-outline" as const,
    title: "Manage from one workspace",
    text: "Create content, update event details and track attendance from one account.",
    tint: "#10B981",
    tintBg: "rgba(16, 185, 129, 0.14)",
  },
];

const JOURNEY = [
  {
    title: "Choose access",
    text: "Pick a pass that matches how often you publish, from per-post to yearly plans.",
  },
  {
    title: "Create your profile",
    text: "Add your organiser name, brand identity, logo and contact details.",
  },
  {
    title: "Launch your event",
    text: "Publish tickets, connect with attendees, and promote moments with stories.",
  },
];

const enter = (delay: number) =>
  Platform.OS !== "web" ? FadeInDown.delay(delay).springify() : undefined;

export default function BecomeOrganiserScreen() {
  const palette = useOrganiserPalette();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { step } = useOrganiserAccess();

  const { user, isRestoringOrganiser } = useAuth();
  const application = user?.organiserApplication;

  const continueFlow = () => {
    const destination = getOrganiserDestination(user, USE_ORGANISER_API);
    if (!destination) return;
    if (step === "ready") router.replace(destination as any);
    else router.push({ pathname: destination as any, params: from ? { from } : {} });
  };

  const ctaLabel = isRestoringOrganiser
    ? "Checking access…"
    : application?.status === "IN_REVIEW"
    ? "Application in review"
    : application?.status === "PENDING_PAYMENT"
    ? application.manualPaymentId
      ? "Track payment verification"
      : "Continue to payment"
    : application?.status === "REJECTED"
    ? "Apply again"
    : step === "ready"
    ? "Open organiser workspace"
    : step === "setup"
    ? "Continue profile setup"
    : "Get started";

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <OrganiserAtmosphere />
      <OrganiserFlowHeader title="Become an organiser" step={1} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Context Gate Card when redirected from create-post */}
        {from === "create-post" && step !== "ready" ? (
          <View style={[styles.contextCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.contextIcon, { backgroundColor: palette.blueSoft }]}>
              <Ionicons name="lock-closed-outline" size={18} color={palette.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.contextTitle, { color: palette.text }]}>Organiser access required</Text>
              <Text style={[styles.contextText, { color: palette.muted }]}>
                Complete this flow to publish events and stories.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Application Status Banners */}
        {step === "setup" ? (
          <View style={[styles.statusCard, { backgroundColor: palette.surface, borderColor: palette.positive }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.16)" }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color={palette.positive} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.statusTitle, { color: palette.text }]}>Your pass is active</Text>
              <Text style={[styles.statusText, { color: palette.muted }]}>
                Payment is complete. Finish your public organiser profile to open the workspace.
              </Text>
            </View>
          </View>
        ) : null}

        {application?.status === "IN_REVIEW" ? (
          <View style={[styles.statusCard, { backgroundColor: palette.surface, borderColor: "#F59E0B" }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.16)" }]}>
              <Ionicons name="time-outline" size={22} color="#F59E0B" />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.statusTitle, { color: palette.text }]}>Application under review</Text>
              <Text style={[styles.statusText, { color: palette.muted }]}>
                Your payment and application were submitted successfully. Our team is currently reviewing your details.
              </Text>
            </View>
          </View>
        ) : application?.status === "REJECTED" ? (
          <View style={[styles.statusCard, { backgroundColor: palette.surface, borderColor: palette.danger }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: "rgba(239, 68, 68, 0.16)" }]}>
              <Ionicons name="alert-circle-outline" size={22} color={palette.danger} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.statusTitle, { color: palette.text }]}>Application not approved</Text>
              <Text style={[styles.statusText, { color: palette.muted }]}>
                {application.rejectionReason || "Your application was not approved. You may apply again."}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Hero Section */}
        <Animated.View entering={enter(40)}>
          <LinearGradient
            colors={
              palette.dark
                ? ["#0284C7", "#0369A1", "#022340"]
                : ["#0284C7", "#0369A1", "#075985"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroRing} />
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>CREATE ON EVENTIS</Text>
            </View>
            <Text style={styles.heroTitle}>Give every event a place to grow.</Text>
            <Text style={styles.heroText}>
              Build the event page, share stories and manage attendees from one focused workspace.
            </Text>
            <Pressable
              onPress={continueFlow}
              disabled={isRestoringOrganiser || application?.status === "IN_REVIEW"}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.heroButtonText}>{ctaLabel}</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* Feature Tools */}
        <Animated.View entering={enter(90)} style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>What the workspace gives you</Text>
            <Text style={[styles.sectionText, { color: palette.muted }]}>
              The essentials for publishing and promoting events.
            </Text>
          </View>
          <View style={styles.tools}>
            {TOOLS.map((tool) => (
              <View
                key={tool.title}
                style={[
                  styles.toolCard,
                  { backgroundColor: palette.surface, borderColor: palette.line },
                ]}
              >
                <View style={[styles.toolIcon, { backgroundColor: tool.tintBg }]}>
                  <Ionicons name={tool.icon} size={21} color={tool.tint} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.toolTitle, { color: palette.text }]}>{tool.title}</Text>
                  <Text style={[styles.toolText, { color: palette.muted }]}>{tool.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* 3-Step Journey Stepper */}
        <Animated.View entering={enter(140)} style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>From account to first event</Text>
            <Text style={[styles.sectionText, { color: palette.muted }]}>
              A short setup, then everything lives in your organiser workspace.
            </Text>
          </View>
          <View style={[styles.journey, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            {JOURNEY.map((item, index) => (
              <View key={item.title} style={styles.journeyRow}>
                <View style={styles.journeyRail}>
                  <View
                    style={[
                      styles.journeyNumber,
                      {
                        backgroundColor: index === 0 ? palette.blue : palette.surfaceRaised,
                        borderColor: index === 0 ? palette.blue : palette.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.journeyNumberText,
                        { color: index === 0 ? "#FFFFFF" : palette.muted },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  {index < JOURNEY.length - 1 && (
                    <View style={[styles.journeyLine, { backgroundColor: palette.line }]} />
                  )}
                </View>
                <View style={styles.journeyCopy}>
                  <Text style={[styles.journeyTitle, { color: palette.text }]}>{item.title}</Text>
                  <Text style={[styles.journeyText, { color: palette.muted }]}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Dual Mode Note */}
        <View style={[styles.note, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <Ionicons name="swap-horizontal-outline" size={20} color={palette.accent} />
          <Text style={[styles.noteText, { color: palette.muted }]}>
            Your personal Eventis account stays active. Switch between personal and organiser without signing out.
          </Text>
        </View>

        {/* Payment History Shortcut */}
        {USE_ORGANISER_API ? (
          <Pressable
            onPress={() => router.push("/organiser/payments" as any)}
            style={({ pressed }) => [
              styles.note,
              { backgroundColor: palette.surface, borderColor: palette.line },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Ionicons name="receipt-outline" size={20} color={palette.accent} />
            <View style={styles.flex}>
              <Text style={[styles.noteText, { color: palette.text, fontFamily: "Inter_700Bold" }]}>
                Payment history
              </Text>
              <Text style={[styles.noteText, { color: palette.muted }]}>
                Track plan payments submitted for verification.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </Pressable>
        ) : null}

        {/* Primary Action Button */}
        <Pressable
          onPress={continueFlow}
          disabled={isRestoringOrganiser || application?.status === "IN_REVIEW"}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor:
                isRestoringOrganiser || application?.status === "IN_REVIEW"
                  ? palette.surfaceRaised
                  : palette.blue,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color:
                  isRestoringOrganiser || application?.status === "IN_REVIEW"
                    ? palette.muted
                    : palette.onBlue,
              },
            ]}
          >
            {ctaLabel}
          </Text>
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
  content: { padding: 18, gap: 20 },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  contextIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contextTitle: { fontSize: 13.5, fontFamily: "Inter_700Bold" },
  contextText: { fontSize: 11.5, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statusText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 3 },
  hero: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  heroRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -95,
    top: -90,
    borderWidth: 42,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  heroLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.7,
  },
  heroText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    marginTop: 10,
  },
  heroButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 20,
    marginTop: 22,
  },
  heroButtonText: {
    color: "#0284C7",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  section: { gap: 12 },
  sectionHeading: { gap: 4 },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  sectionText: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  tools: { gap: 10 },
  toolCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toolTitle: { fontSize: 14.5, fontFamily: "Inter_700Bold" },
  toolText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 3 },
  journey: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 4 },
  journeyRow: { flexDirection: "row", gap: 13 },
  journeyRail: { width: 32, alignItems: "center" },
  journeyNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyNumberText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  journeyLine: { width: 1.5, flex: 1, minHeight: 28, marginVertical: 4 },
  journeyCopy: { flex: 1, paddingBottom: 16 },
  journeyTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  journeyText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 3 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  primaryButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 26,
  },
  primaryButtonText: {
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  later: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: -6 },
  laterText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
});
