import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Dimensions,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

const FEATURES = [
  { icon: "location-outline", text: "Discover events near you" },
  { icon: "ticket-outline", text: "Instant digital tickets" },
  { icon: "chatbubbles-outline", text: "Connect with attendees" },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, hasCompletedOnboarding } = useAuth();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)" as any);
    } else if (hasCompletedOnboarding) {
      router.replace("/auth/login" as any);
    }
  }, [isAuthenticated, hasCompletedOnboarding, router]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      false
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../assets/images/onboarding-city.jpg")}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(12,12,26,0.3)", "rgba(12,12,26,0.65)", "rgba(12,12,26,0.97)"]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 20 }]}>
        {/* Logo */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeIn.delay(100) : undefined}
          style={styles.logoSection}
        >
          <Animated.View style={[styles.logoCircle, pulseStyle, { backgroundColor: colors.background }]}>
            <Logo style={styles.logoImage} />
          </Animated.View>
          <Text style={styles.appName}>eventis</Text>
          <Text style={styles.tagline}>The night, before it sells out.</Text>
        </Animated.View>

        {/* Features */}
        <View style={styles.featureList}>
          {FEATURES.map((feat, i) => (
            <Animated.View
              key={feat.icon}
              entering={Platform.OS !== "web" ? FadeInDown.delay(200 + i * 100).springify() : undefined}
              style={[styles.featureItem, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name={feat.icon as any} size={18} color="#fff" />
              </View>
              <Text style={styles.featureText}>{feat.text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* CTA Buttons */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(600).springify() : undefined}
          style={styles.ctas}
        >
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/auth/terms" as any)}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
            onPress={() => router.push("/auth/login" as any)}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </Pressable>
        </Animated.View>

        <Animated.Text
          entering={Platform.OS !== "web" ? FadeIn.delay(800) : undefined}
          style={styles.termsText}
        >
          By continuing, you agree to our{" "}
          <Text style={{ color: "rgba(255,255,255,0.7)" }}>Terms</Text> &{" "}
          <Text style={{ color: "rgba(255,255,255,0.7)" }}>Privacy Policy</Text>
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0c1a" },
  bg: { ...StyleSheet.absoluteFill },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  logoImage: {
    width: 76,
    height: 76,
  },
  appName: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  featureList: { gap: 10 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#fff",
  },
  ctas: { gap: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  termsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 18,
  },
});
