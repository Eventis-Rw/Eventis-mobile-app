import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OrganiserFlowHeader } from "@/components/OrganiserFlowHeader";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { useOrganiserAccess } from "@/hooks/useOrganiserAccess";

const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string }[] = [
  { icon: "create-outline", title: "Create posts and events", text: "Publish events to the Eventis feed for people near you." },
  { icon: "radio-outline", title: "Share organiser stories", text: "Post live updates your audience sees at the top of Home." },
  { icon: "stats-chart-outline", title: "Manage bookings", text: "Track attendees and views from your organiser dashboard." },
  { icon: "business-outline", title: "An organisation profile", text: "Your name, logo and website appear on everything you post." },
];

const STEPS = ["Choose a subscription plan", "Set up your organisation", "Start posting"];

const enter = (delay: number) =>
  Platform.OS !== "web" ? FadeInDown.delay(delay).springify() : undefined;

export default function BecomeOrganiserScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { step } = useOrganiserAccess();

  // No automatic redirect here: this screen sits under the later steps in the
  // stack, and redirecting on focus would trap the user when they go back.
  const cta =
    step === "ready"
      ? { label: "Go to organiser dashboard", onPress: () => router.replace("/business/dashboard" as any) }
      : step === "setup"
        ? { label: "Continue organisation setup", onPress: () => router.push({ pathname: "/organiser/setup" as any, params: { from } }) }
        : { label: "Continue to subscription", onPress: () => router.push({ pathname: "/organiser/subscribe" as any, params: { from } }) };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OrganiserFlowHeader title="Become an organiser" step={1} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {from === "create-post" && step !== "ready" && (
          <Animated.View
            entering={enter(40)}
            style={[styles.notice, { backgroundColor: colors.glass, borderColor: colors.primary + "44" }]}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              Creating posts is available to organisers. Set up organiser access to continue.
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={enter(80)} style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="megaphone" size={32} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Host events on Eventis</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Organiser access adds publishing tools to the account you already have. Your personal
            profile, tickets and chats stay exactly as they are.
          </Text>
        </Animated.View>

        <Animated.View entering={enter(140)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>What you get</Text>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "1A" }]}>
                <Ionicons name={b.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.benefitCopy}>
                <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{b.title}</Text>
                <Text style={[styles.benefitText, { color: colors.mutedForeground }]}>{b.text}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={enter(200)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>How it works</Text>
          {STEPS.map((label, i) => {
            const done = (step === "setup" && i === 0) || step === "ready";
            return (
              <View key={label} style={styles.stepRow}>
                <View style={[styles.stepBadge, { backgroundColor: done ? colors.success : colors.secondary }]}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text style={[styles.stepNumber, { color: colors.foreground }]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, { color: colors.foreground }]}>{label}</Text>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View entering={enter(260)} style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            No separate login. You'll manage your organisation from this account and can switch
            back to browsing events at any time.
          </Text>
        </Animated.View>

        <Animated.View entering={enter(300)} style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={cta.onPress}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>{cta.label}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
          {step !== "ready" && (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
              accessibilityRole="button"
              style={styles.secondaryBtn}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>Not now</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 20 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  hero: { alignItems: "center", gap: 12 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23, textAlign: "center" },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitCopy: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  benefitText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  actions: { gap: 4 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  secondaryBtn: { alignItems: "center", paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
