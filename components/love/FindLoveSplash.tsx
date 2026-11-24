import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/** Duration of the FindLove splash animation (2 seconds). */
export const FINDLOVE_SPLASH_MS = 2000;

/**
 * Twitter/X-style Squeeze & Punch-Through Heart Animation for FindLove:
 * 1. Single heart appears in vibrant Eventis Blue (#00A3FF) with subtle resting pulse.
 * 2. Does the iconic Twitter/X anticipation squeeze (shrink) while morphing from Blue to Pink (#FF2D55).
 * 3. Punch-through explosive zoom (36x) reveals the FindLove interface.
 * 4. Completes in exactly 2.0 seconds. Tapping anywhere immediately skips.
 */
export function FindLoveSplash({ onDone }: { onDone: () => void }) {
  const heartScale = useSharedValue(1);
  const heartOpacity = useSharedValue(1);
  const colorMorph = useSharedValue(0); // 0 = Blue, 1 = Pink
  const containerOpacity = useSharedValue(1);
  const doneCalled = useRef(false);

  const finish = () => {
    if (doneCalled.current) return;
    doneCalled.current = true;
    onDone();
  };

  useEffect(() => {
    // 1. Scale animation (Twitter/X squeeze & punch-through over 2 seconds)
    heartScale.value = withSequence(
      // Gentle living breath in Blue (0 -> 750ms)
      withTiming(1.08, { duration: 380, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.0, { duration: 370, easing: Easing.inOut(Easing.quad) }),
      // Iconic Twitter squeeze / shrink ("inhale") (750ms -> 1250ms)
      withTiming(0.82, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      // Explosive punch-through zoom (1250ms -> 1800ms)
      withTiming(36, { duration: 550, easing: Easing.bezier(0.65, 0, 0.35, 1) })
    );

    // 2. Color morph from Blue to Pink during the anticipation squeeze (600ms -> 1250ms)
    colorMorph.value = withDelay(
      600,
      withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) })
    );

    // 3. Heart opacity fade-out as it punches through (1400ms -> 1750ms)
    heartOpacity.value = withDelay(
      1400,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) })
    );

    // 4. Background container dissolve to seamlessly reveal FindLove (1650ms -> 2000ms)
    containerOpacity.value = withSequence(
      withDelay(
        1650,
        withTiming(0, { duration: 350, easing: Easing.linear }, (finished) => {
          if (finished) {
            runOnJS(finish)();
          }
        })
      )
    );

    // 5. Fallback timer at exactly 2000ms
    const timer = setTimeout(() => {
      finish();
    }, FINDLOVE_SPLASH_MS);

    return () => clearTimeout(timer);
  }, [onDone]);

  // Scaled heart container style
  const heartContainerStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  // Blue heart layer style (fades out as colorMorph -> 1)
  const blueLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - colorMorph.value,
  }));

  // Pink heart layer style (fades in as colorMorph -> 1)
  const pinkLayerStyle = useAnimatedStyle(() => ({
    opacity: colorMorph.value,
  }));

  // Screen container fade
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View exiting={FadeOut.duration(200)} style={[styles.root, containerStyle]}>
      <Pressable
        onPress={finish}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Skip intro and open FindLove"
      >
        <View style={styles.center}>
          <Animated.View style={[styles.heartBox, heartContainerStyle]}>
            {/* Blue Heart Layer (#00A3FF) */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, blueLayerStyle]}>
              <Ionicons name="heart" size={92} color="#00A3FF" />
            </Animated.View>

            {/* Pink Heart Layer (#FF2D55) */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, pinkLayerStyle]}>
              <Ionicons name="heart" size={92} color="#FF2D55" />
            </Animated.View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#070814",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heartBox: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
});
