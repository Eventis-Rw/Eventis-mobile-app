import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { getOrganiserDestination, useOrganiserAccess } from "@/hooks/useOrganiserAccess";
import { useOrganiserPalette } from "@/hooks/useOrganiserPalette";
import { USE_ORGANISER_API } from "@/services/organiserService";

const heroArt = require("@/assets/images/organiser-onboarding.jpg");

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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as any);
    }
  };

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
      {/* Hero Visual Area with Vintage Partnership Illustration */}
      <View style={styles.heroWrapper}>
        <Image
          source={heroArt}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel="Eventis organiser collaboration visual"
        />

        {/* Ambient Overlay & Seamless Fade into Canvas Background (Dark or Light) */}
        <LinearGradient
          colors={
            palette.dark
              ? [
                  "rgba(0, 0, 0, 0.45)",
                  "rgba(0, 0, 0, 0.15)",
                  "rgba(0, 0, 0, 0.6)",
                  "rgba(0, 0, 0, 0.92)",
                  palette.canvas,
                ]
              : [
                  "rgba(255, 255, 255, 0.15)",
                  "rgba(255, 255, 255, 0.05)",
                  "rgba(255, 255, 255, 0.55)",
                  "rgba(255, 255, 255, 0.9)",
                  palette.canvas,
                ]
          }
          locations={[0, 0.35, 0.65, 0.88, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Floating Navigation Bar with Chevron Back (No Steps) */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: palette.dark
                  ? "rgba(0, 0, 0, 0.55)"
                  : "rgba(255, 255, 255, 0.88)",
                borderColor: palette.dark
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.12)",
              },
              pressed && {
                backgroundColor: palette.dark
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(0, 0, 0, 0.08)",
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={palette.dark ? "#FFFFFF" : "#111827"}
            />
          </Pressable>
        </View>
      </View>

      {/* Main Bottom Content (Onboarding Layout - No Scrolling) */}
      <View
        style={[
          styles.contentWrapper,
          {
            backgroundColor: palette.canvas,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
      >
        {/* Status Callout if Application is In-Review or Rejected */}
        {application?.status === "IN_REVIEW" ? (
          <Animated.View
            entering={enter(30)}
            style={[
              styles.statusPill,
              {
                backgroundColor: palette.dark
                  ? "rgba(245, 158, 11, 0.14)"
                  : "rgba(245, 158, 11, 0.1)",
                borderColor: "rgba(245, 158, 11, 0.35)",
              },
            ]}
          >
            <Ionicons name="time-outline" size={15} color="#F59E0B" />
            <Text style={styles.statusPillText}>Application under review</Text>
          </Animated.View>
        ) : application?.status === "REJECTED" ? (
          <Animated.View
            entering={enter(30)}
            style={[
              styles.statusPill,
              {
                borderColor: "rgba(239, 68, 68, 0.4)",
                backgroundColor: palette.dark
                  ? "rgba(239, 68, 68, 0.14)"
                  : "rgba(239, 68, 68, 0.08)",
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={15} color={palette.danger} />
            <Text style={[styles.statusPillText, { color: palette.danger }]}>
              Application not approved · Tap to reapply
            </Text>
          </Animated.View>
        ) : from === "create-post" ? (
          <Animated.View
            entering={enter(30)}
            style={[
              styles.statusPill,
              {
                backgroundColor: palette.blueSoft,
                borderColor: `${palette.blue}40`,
              },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={14} color={palette.blue} />
            <Text style={[styles.statusPillText, { color: palette.blue }]}>
              Organiser pass required to publish
            </Text>
          </Animated.View>
        ) : null}

        {/* Text Block */}
        <Animated.View entering={enter(60)} style={styles.textBlock}>
          <Text style={[styles.title, { color: palette.text }]}>
            Give every event a place to grow.
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Publish event pages, share live stories, and manage attendees from one focused workspace.
          </Text>
        </Animated.View>

        {/* Actions Section */}
        <Animated.View entering={enter(100)} style={styles.actionSection}>
          <Pressable
            onPress={continueFlow}
            disabled={isRestoringOrganiser || application?.status === "IN_REVIEW"}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor:
                  isRestoringOrganiser || application?.status === "IN_REVIEW"
                    ? palette.surfaceRaised
                    : palette.blue,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.primaryBtnText,
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
              onPress={handleBack}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={[styles.secondaryBtnText, { color: palette.muted }]}>
                Maybe later
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  heroWrapper: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrapper: {
    paddingHorizontal: 24,
    gap: 24,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusPillText: {
    color: "#F59E0B",
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },
  textBlock: {
    gap: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  actionSection: {
    gap: 12,
    marginTop: 6,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontSize: 15.5,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontFamily: "Inter_600SemiBold",
  },
});
