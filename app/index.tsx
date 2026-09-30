import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ONBOARDING_COMPLETE_KEY } from "@/constants/onboarding";
import { useColors } from "@/hooks/useColors";

const SPLASH_DURATION_MS = 1100;

export default function AppEntryScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const logoScale = useSharedValue(0.82);

  React.useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
        withTiming(1.06, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [logoScale]);

  const logoAnimation = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));

  useEffect(() => {
    let mounted = true;

    async function openApp() {
      const [completed] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).catch(() => null),
        new Promise((resolve) => setTimeout(resolve, SPLASH_DURATION_MS)),
      ]);

      if (mounted) {
        router.replace((completed === "true" ? "/(tabs)" : "/onboarding") as any);
      }
    }

    void openApp();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Animated.View entering={FadeInUp.duration(450)} style={logoAnimation}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Eventis logo"
          />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(140).duration(420)} style={[styles.name, { color: colors.primary }]}>eventis</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(260).duration(420)} style={[styles.tagline, { color: colors.mutedForeground }]}>Where moments happen</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  center: { alignItems: "center" },
  logo: { width: 132, height: 132 },
  name: {
    marginTop: 12,
    fontSize: 38,
    letterSpacing: -1.5,
    color: "#1932A6",
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    marginTop: 5,
    color: "#4F4F63",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
