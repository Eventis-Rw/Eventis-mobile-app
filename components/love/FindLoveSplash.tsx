import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

/** How long the animation plays before FindLove opens on its own. */
export const FINDLOVE_SPLASH_MS = 2600;

// Small hearts that float up behind the logo: x offset (px), delay (ms), size.
const FLOATING_HEARTS = [
  { x: -120, delay: 150, size: 18 },
  { x: -60, delay: 600, size: 14 },
  { x: 10, delay: 300, size: 22 },
  { x: 75, delay: 800, size: 16 },
  { x: 130, delay: 450, size: 20 },
];

/**
 * Animated splash played each time FindLove is opened from Eventis. It stands
 * in for a video until one is supplied; tapping anywhere skips it.
 */
export function FindLoveSplash({ onDone }: { onDone: () => void }) {
  const colors = useColors();
  const logo = useSharedValue(0);
  const beat = useSharedValue(1);
  const text = useSharedValue(0);

  useEffect(() => {
    logo.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.6)) });
    beat.value = withDelay(700, withRepeat(withSequence(withTiming(1.12, { duration: 240 }), withTiming(1, { duration: 240 })), 3));
    text.value = withDelay(500, withTiming(1, { duration: 600 }));
    const timer = setTimeout(onDone, FINDLOVE_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ scale: (0.4 + logo.value * 0.6) * beat.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 16 }],
  }));

  return (
    <Animated.View exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
      <Pressable
        onPress={onDone}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Skip intro and open FindLove"
      >
        <LinearGradient colors={[colors.primary, "#7A1F4F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
          {FLOATING_HEARTS.map((heart) => (
            <FloatingHeart key={heart.x} {...heart} />
          ))}
          <Animated.View style={[styles.logo, logoStyle]}>
            <Ionicons name="heart" size={64} color={colors.primary} />
          </Animated.View>
          <Animated.View style={[styles.copy, textStyle]}>
            <Text style={styles.title}>FindLove</Text>
            <Text style={styles.subtitle}>Connect. Discover. Meet.</Text>
          </Animated.View>
          <Text style={styles.skip}>Tap to skip</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function FloatingHeart({ x, delay, size }: { x: number; delay: number; size: number }) {
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withDelay(delay, withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: rise.value < 0.7 ? rise.value * 1.2 : (1 - rise.value) * 2.8,
    transform: [{ translateX: x }, { translateY: 120 - rise.value * 300 }],
  }));
  return (
    <Animated.View style={[styles.floating, style]}>
      <Ionicons name="heart" size={size} color="rgba(255,255,255,0.75)" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 124, height: 124, borderRadius: 62, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  copy: { alignItems: "center", marginTop: 26 },
  title: { color: "#FFFFFF", fontSize: 38, letterSpacing: -1.2, fontFamily: "Inter_700Bold" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 6 },
  skip: { position: "absolute", bottom: 48, color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_500Medium" },
  floating: { position: "absolute" },
});
