import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { getOrganiserDestination, useOrganiserAccess } from "@/hooks/useOrganiserAccess";
import { USE_ORGANISER_API } from "@/services/organiserService";

const heroArt = require("@/assets/images/organiser-onboarding.jpg");

const enter = (delay: number) =>
  Platform.OS !== "web" ? FadeInDown.delay(delay).springify() : undefined;

export default function BecomeOrganiserScreen() {
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
    <View style={styles.root}>
      {/* Hero Visual Area with Vintage Partnership Illustration */}
      <View style={styles.heroWrapper}>
        <Image
          source={heroArt}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel="Eventis organiser collaboration visual"
        />

        {/* Ambient Overlay & Seamless Fade to AMOLED Black */}
        <LinearGradient
          colors={[
            "rgba(0, 0, 0, 0.45)",
            "rgba(0, 0, 0, 0.15)",
            "rgba(0, 0, 0, 0.6)",
            "rgba(0, 0, 0, 0.92)",
            "#000000",
          ]}
          locations={[0, 0.35, 0.65, 0.88, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Floating Navigation Bar with Chevron Back */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1 of 3</Text>
          </View>
        </View>
      </View>

      {/* Main Bottom Content (Onboarding Layout - No Scrolling) */}
      <View
        style={[
          styles.contentWrapper,
          { paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        {/* Status Callout if Application is In-Review or Rejected */}
        {application?.status === "IN_REVIEW" ? (
          <Animated.View entering={enter(30)} style={styles.statusPill}>
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
                backgroundColor: "rgba(239, 68, 68, 0.14)",
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
            <Text style={[styles.statusPillText, { color: "#EF4444" }]}>
              Application not approved · Tap to reapply
            </Text>
          </Animated.View>
        ) : from === "create-post" ? (
          <Animated.View entering={enter(30)} style={styles.statusPill}>
            <Ionicons name="lock-closed-outline" size={14} color="#38BDF8" />
            <Text style={[styles.statusPillText, { color: "#38BDF8" }]}>
              Organiser pass required to publish
            </Text>
          </Animated.View>
        ) : null}

        {/* Text Block */}
        <Animated.View entering={enter(60)} style={styles.textBlock}>
          <Text style={styles.eyebrow}>CREATE ON EVENTIS</Text>
          <Text style={styles.title}>Give every event a place to grow.</Text>
          <Text style={styles.subtitle}>
            Publish event pages, share live stories, and manage attendees from one focused workspace.
          </Text>
        </Animated.View>

        {/* Compact Value Chips Row */}
        <Animated.View entering={enter(100)} style={styles.valueRow}>
          <View style={styles.valueChip}>
            <Ionicons name="calendar-outline" size={14} color="#38BDF8" />
            <Text style={styles.valueChipText}>Event pages</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="megaphone-outline" size={14} color="#F59E0B" />
            <Text style={styles.valueChipText}>Live stories</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="people-outline" size={14} color="#10B981" />
            <Text style={styles.valueChipText}>Smart reach</Text>
          </View>
        </Animated.View>

        {/* Actions Section */}
        <Animated.View entering={enter(140)} style={styles.actionSection}>
          <Pressable
            onPress={continueFlow}
            disabled={isRestoringOrganiser || application?.status === "IN_REVIEW"}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor:
                  isRestoringOrganiser || application?.status === "IN_REVIEW"
                    ? "rgba(255, 255, 255, 0.12)"
                    : "#0284C7",
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
                      ? "rgba(255, 255, 255, 0.45)"
                      : "#FFFFFF",
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
              <Text style={styles.secondaryBtnText}>Maybe later</Text>
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
    backgroundColor: "#000000",
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  stepBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  contentWrapper: {
    paddingHorizontal: 24,
    gap: 20,
    backgroundColor: "#000000",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  statusPillText: {
    color: "#F59E0B",
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },
  textBlock: {
    gap: 8,
  },
  eyebrow: {
    color: "#38BDF8",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 31,
    lineHeight: 37,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.76)",
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  valueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  valueChipText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },
  actionSection: {
    gap: 10,
    marginTop: 4,
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
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13.5,
    fontFamily: "Inter_600SemiBold",
  },
});
