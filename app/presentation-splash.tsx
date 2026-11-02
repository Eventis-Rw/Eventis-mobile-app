import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function PresentationSplashScreen() {
  const router = useRouter();
  const hasNavigated = useRef(false);

  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const containerOpacity = useSharedValue(1);

  const navigateNext = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace("/onboarding" as any);
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const onComplete = () => {
      if (mounted) {
        navigateNext();
      }
    };

    // 1. Prominent living resting phase (~900ms) so user can see it clearly
    // 2. Anticipation shrink (the iconic X "inhale")
    // 3. Punch-through explosive zoom (scale 36x)
    logoScale.value = withSequence(
      withTiming(1.05, { duration: 450, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.0, { duration: 450, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.88, { duration: 180, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(36, { duration: 420, easing: Easing.bezier(0.65, 0, 0.35, 1) })
    );

    // Fade logo out as it punches through the screen
    logoOpacity.value = withSequence(
      withDelay(
        1100,
        withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) })
      )
    );

    // Fade container to reveal next screen smoothly
    containerOpacity.value = withSequence(
      withDelay(
        1220,
        withTiming(0, { duration: 200, easing: Easing.linear }, (finished) => {
          if (finished) {
            runOnJS(onComplete)();
          }
        })
      )
    );

    // Fallback timer
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        navigateNext();
      }
    }, 1750);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [containerOpacity, logoOpacity, logoScale, navigateNext]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.root, animatedContainerStyle]}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.center, animatedLogoStyle]}>
        <Image
          source={require("../assets/images/logo_splach-mobile.jpeg")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Eventis"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 300,
    height: 527,
  },
});
