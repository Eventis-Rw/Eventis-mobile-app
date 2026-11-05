import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { liveColors as c } from "./LivePrimitives";

/** Animate only while LiveKit detects speech; never open or sample a microphone here. */
function useSpeakingPulse(speaking: boolean) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    pulse.setValue(0);
    if (!speaking || reduceMotion) return;
    const animation = Animated.loop(Animated.timing(pulse, {
      toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web", isInteraction: false,
    }));
    animation.start();
    return () => { animation.stop(); pulse.setValue(0); };
  }, [speaking, reduceMotion, pulse]);
  return { pulse, reduceMotion };
}

export function LiveSpeakingAvatar({ speaking, size = "large", minimal = false, children }: { speaking: boolean; size?: "small" | "large"; minimal?: boolean; children: React.ReactNode }) {
  const { pulse, reduceMotion } = useSpeakingPulse(speaking);
  const small = size === "small";
  return <View style={[styles.avatar, { padding: small ? 4 : 12 }]}>
    {speaking ? <>
      <View pointerEvents="none" style={[styles.glow, { margin: small ? 1 : 4 }]} />
      {!reduceMotion ? <Animated.View testID="live-speaking-halo" pointerEvents="none" style={[styles.halo, {
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, small ? 1.35 : 1.3] }) }],
      }]} /> : null}
    </> : null}
    <View style={[styles.ring, { padding: small ? 2 : 6, borderWidth: small ? 2 : 3 }, minimal && !speaking && { borderColor: "transparent", backgroundColor: "transparent" }, speaking && styles.activeRing]}>{children}</View>
  </View>;
}

export function LiveSpeakingBars({ speaking }: { speaking: boolean }) {
  const { pulse } = useSpeakingPulse(speaking);
  if (!speaking) return null;
  return <View testID="live-speaking-indicator" pointerEvents="none" style={styles.bars}>
    {[0, 1, 2].map(index => <Animated.View key={index} style={[styles.bar, {
      transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: index === 1 ? [1, 0.35, 1] : [0.35, 1, 0.35] }) }],
    }]} />)}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 999, backgroundColor: "#38BDF859" },
  halo: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 999, borderWidth: 3, borderColor: c.blue },
  ring: { borderRadius: 999, borderColor: "#FFFFFF26", backgroundColor: "#101D30" },
  activeRing: { borderColor: c.blue, backgroundColor: "#0B2A40" },
  bars: { width: 15, height: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  bar: { width: 3, height: 12, borderRadius: 2, backgroundColor: c.blue },
});
