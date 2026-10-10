import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GlassSurface } from "@/components/GlassSurface";
import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useOrganiserAccess } from "@/hooks/useOrganiserAccess";

const BENEFITS = [
  {
    icon: "sparkles" as const,
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.15)",
    title: "Publish to Kigali & Beyond",
    text: "Put your festivals, conferences, concerts, and club nights in front of active event-goers across Rwanda.",
  },
  {
    icon: "ticket" as const,
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.15)",
    title: "Instant Mobile Money Ticketing",
    text: "Collect payments seamlessly via MTN MoMo and Airtel Money. Fast check-in with door QR scanner.",
  },
  {
    icon: "radio" as const,
    color: "#EC4899",
    bg: "rgba(236, 72, 153, 0.15)",
    title: "Live Stories & Feed Drops",
    text: "Post behind-the-scenes stories, lineup drops, and schedule updates right at the top of attendee feeds.",
  },
  {
    icon: "analytics" as const,
    color: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.15)",
    title: "Deep Attendee Insights",
    text: "Track real-time RSVP counts, page views, shares, saves, and revenue without cumbersome spreadsheets.",
  },
];

const STEPS = [
  {
    title: "Choose a flexible plan",
    sub: "Daily, Weekly, or Monthly pass designed for events of any scale.",
  },
  {
    title: "Set up organisation profile",
    sub: "Add your brand name, logo, venue, and social links.",
  },
  {
    title: "Start posting & selling",
    sub: "Launch your first event and welcome verified attendees.",
  },
];

const enter = (delay: number) =>
  Platform.OS !== "web" ? FadeInDown.delay(delay).springify() : undefined;

export default function BecomeOrganiserScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { step } = useOrganiserAccess();

  const cta =
    step === "ready"
      ? { label: "Go to Organiser Dashboard", onPress: () => router.replace("/business/dashboard" as any) }
      : step === "setup"
        ? { label: "Continue Organisation Setup", onPress: () => router.push({ pathname: "/organiser/setup" as any, params: { from } }) }
        : { label: "Explore Organiser Plans", onPress: () => router.push({ pathname: "/organiser/subscribe" as any, params: { from } }) };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OrganiserFlowHeader title="Become an Organiser" step={1} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* LOCK NOTICE IF ROUTED FROM CREATE-POST */}
        {from === "create-post" && step !== "ready" && (
          <Animated.View entering={enter(30)}>
            <GlassSurface style={styles.noticeBox}>
              <View style={styles.noticeIconWrap}>
                <Ionicons name="lock-closed" size={16} color="#38BDF8" />
              </View>
              <Text style={[styles.noticeText, { color: colors.foreground }]}>
                Publishing is reserved for verified Eventis organisers. Activate your organiser pass to proceed.
              </Text>
            </GlassSurface>
          </Animated.View>
        )}

        {/* HERO SECTION WITH AMBIENT GLOW */}
        <Animated.View entering={enter(70)} style={styles.hero}>
          <LinearGradient
            colors={["rgba(56, 189, 248, 0.15)", "rgba(139, 92, 246, 0.08)", "transparent"]}
            style={styles.heroGlow}
          />
          <View style={styles.kickerBadge}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>EVENTIS ORGANISER HUB</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Host Unforgettable Events on Eventis
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
            Empower your team with high-impact ticketing, live storytelling, and discovery tools built for Africa's most exciting creators.
          </Text>

          {/* QUICK HIGHLIGHT STATS */}
          <View style={styles.statsRow}>
            <View style={[styles.statBadge, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)" }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>Instant</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>MoMo Payouts</Text>
            </View>
            <View style={[styles.statBadge, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)" }]}>
              <Text style={[styles.statValue, { color: "#10B981" }]}>10K+</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Goers</Text>
            </View>
            <View style={[styles.statBadge, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)" }]}>
              <Text style={[styles.statValue, { color: "#EC4899" }]}>0%</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Setup Delay</Text>
            </View>
          </View>
        </Animated.View>

        {/* VALUE TILES (WHAT YOU GET) */}
        <Animated.View entering={enter(130)}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentLine} />
            <Text style={[styles.sectionHeading, { color: colors.foreground }]}>What You Get</Text>
          </View>

          <View style={styles.benefitsGrid}>
            {BENEFITS.map((b) => (
              <GlassSurface key={b.title} style={styles.benefitCard}>
                <View style={[styles.benefitIconWrap, { backgroundColor: b.bg }]}>
                  <Ionicons name={b.icon} size={20} color={b.color} />
                </View>
                <View style={styles.benefitBody}>
                  <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{b.title}</Text>
                  <Text style={[styles.benefitText, { color: colors.mutedForeground }]}>{b.text}</Text>
                </View>
              </GlassSurface>
            ))}
          </View>
        </Animated.View>

        {/* 3-STEP ROADMAP (HOW IT WORKS) */}
        <Animated.View entering={enter(190)}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentLine} />
            <Text style={[styles.sectionHeading, { color: colors.foreground }]}>How It Works</Text>
          </View>

          <GlassSurface style={styles.roadmapCard}>
            {STEPS.map((stepItem, i) => {
              const isDone = (step === "setup" && i === 0) || step === "ready";
              return (
                <View key={stepItem.title} style={styles.roadmapRow}>
                  <View style={styles.roadmapIndicatorCol}>
                    <View
                      style={[
                        styles.roadmapDot,
                        {
                          backgroundColor: isDone ? "#10B981" : colors.primary,
                        },
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.roadmapNumber}>{i + 1}</Text>
                      )}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[styles.roadmapLine, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                  <View style={styles.roadmapTextCol}>
                    <Text style={[styles.roadmapTitle, { color: colors.foreground }]}>
                      {stepItem.title}
                    </Text>
                    <Text style={[styles.roadmapSub, { color: colors.mutedForeground }]}>
                      {stepItem.sub}
                    </Text>
                  </View>
                </View>
              );
            })}
          </GlassSurface>
        </Animated.View>

        {/* TRUST BANNER */}
        <Animated.View entering={enter(240)}>
          <View style={[styles.trustBanner, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#38BDF8" />
            <Text style={[styles.trustText, { color: colors.mutedForeground }]}>
              No separate credentials. Manage all your events from your existing Eventis login and switch between personal and organiser profiles at any time.
            </Text>
          </View>
        </Animated.View>

        {/* CTA BUTTONS */}
        <Animated.View entering={enter(280)} style={styles.actions}>
          <Pressable
            style={[styles.primaryCtaBtn, { backgroundColor: colors.primary }]}
            onPress={cta.onPress}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.2)", "transparent"]}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.primaryCtaText}>{cta.label}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          {step !== "ready" && (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
              accessibilityRole="button"
              style={styles.cancelBtn}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Maybe Later</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 24 },

  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
  },
  noticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(56,189,248,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingVertical: 14,
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 30,
    opacity: 0.6,
  },
  kickerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(56,189,248,0.12)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.25)",
    marginBottom: 12,
  },
  kickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
  },
  kickerText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#38BDF8",
    letterSpacing: 1.1,
  },
  heroTitle: {
    fontSize: 27,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 10,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    width: "100%",
  },
  statBadge: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // Section heading
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionAccentLine: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },

  // Benefits grid
  benefitsGrid: {
    gap: 10,
  },
  benefitCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 18,
    gap: 14,
    alignItems: "flex-start",
  },
  benefitIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitBody: {
    flex: 1,
    gap: 3,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  benefitText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },

  // Roadmap card
  roadmapCard: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  roadmapRow: {
    flexDirection: "row",
    gap: 14,
  },
  roadmapIndicatorCol: {
    alignItems: "center",
    width: 26,
  },
  roadmapDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roadmapNumber: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  roadmapLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -8,
  },
  roadmapTextCol: {
    flex: 1,
    gap: 2,
    paddingBottom: 8,
  },
  roadmapTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  roadmapSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  // Trust banner
  trustBanner: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  trustText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  // Actions
  actions: {
    gap: 10,
    marginTop: 4,
  },
  primaryCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    borderRadius: 16,
    gap: 10,
    overflow: "hidden",
  },
  primaryCtaText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
