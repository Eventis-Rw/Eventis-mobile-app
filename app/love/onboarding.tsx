import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useMyLoveProfile } from "@/context/MyLoveProfileContext";

export const FINDLOVE_ONBOARDING_KEY = "@findlove_onboarding_seen_v1";

// Minimalist line art downloaded from Pinterest, rendered in glowing white on dark theme
const heroArt = require("@/assets/images/findlove-onboarding-dark.png");

export default function FindLoveOnboardingScreen({ onDone }: { onDone?: () => void } = {}) {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { myProfile } = useMyLoveProfile();

  const handleFinish = async (target: "create" | "browse") => {
    try {
      await AsyncStorage.setItem(FINDLOVE_ONBOARDING_KEY, "true");
    } catch {
      // Storage failure is non-blocking
    }

    if (onDone) {
      onDone();
    }

    if (target === "create" && !myProfile) {
      router.push("/love/create" as any);
    } else if (!onDone) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/love/(tabs)" as any);
      }
    }
  };

  const handleExitToEventis = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.root}>
      {/* Subtle brand ambient lighting in center & top */}
      <LinearGradient
        colors={[
          "rgba(0, 163, 255, 0.08)",
          "rgba(255, 45, 85, 0.12)",
          "rgba(0, 0, 0, 0.6)",
          "#000000",
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Hero Line Art Illustration */}
      <View style={[styles.illustrationWrapper, { paddingTop: Math.max(insets.top, 16) + 40 }]}>
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.duration(600) : undefined}
          style={styles.artFrame}
        >
          <Image
            source={heroArt}
            style={styles.artImage}
            resizeMode="contain"
            accessibilityLabel="Two lovers line art illustration"
          />
        </Animated.View>
      </View>

      {/* Top Header: Left Back to Eventis Button */}
      <View style={[styles.topRow, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Pressable
          onPress={handleExitToEventis}
          hitSlop={12}
          style={styles.backEventisBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to Eventis"
        >
          <Ionicons name="chevron-back" size={17} color="#FFFFFF" />
          <Text style={styles.backEventisText}>Eventis</Text>
        </Pressable>
      </View>

      {/* Main Bottom Content: Heading, Summarized Subheading & Action Buttons */}
      <View
        style={[
          styles.contentWrapper,
          { paddingBottom: Math.max(insets.bottom, 16) + 20 },
        ]}
      >
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).duration(450) : undefined}
          style={styles.textBlock}
        >
          <Text style={styles.title}>Find love where moments happen.</Text>
          <Text style={styles.subtitle}>
            Connect with people who share your vibe at concerts, festivals, and nights out.
          </Text>
        </Animated.View>

        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(200).duration(450) : undefined}
          style={styles.actionSection}
        >
          {/* Primary CTA Button (Solid Brand Pink, No Gradient, No Arrow) */}
          <Pressable
            onPress={() => void handleFinish("create")}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.88 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Get started with FindLove"
          >
            <Text style={styles.primaryBtnText}>Get started</Text>
          </Pressable>

          {/* Secondary Action */}
          <Pressable
            onPress={() => void handleFinish("browse")}
            hitSlop={8}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Browse profiles first"
          >
            <Text style={styles.secondaryBtnText}>Browse people first</Text>
          </Pressable>
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
  topRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
    paddingBottom: 8,
  },
  backEventisBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  backEventisText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  illustrationWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  artFrame: {
    width: "100%",
    maxWidth: 340,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  artImage: {
    width: "100%",
    height: "100%",
  },
  contentWrapper: {
    paddingHorizontal: 24,
    gap: 26,
    zIndex: 5,
  },
  textBlock: {
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  actionSection: {
    gap: 14,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FF2D55",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  secondaryBtnText: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
