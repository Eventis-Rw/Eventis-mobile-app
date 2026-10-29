import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { liveColors as c } from "./LivePrimitives";

/** Animate only while LiveKit detects speech; never open or sample a microphone here. */
function useSpeakingPulse(speaking: boolean) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
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
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      Animated.timing(pulse, { toValue: 0, duration: 480, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(0); };
  }, [speaking, reduceMotion, pulse]);
  return pulse;
}

export function LiveSpeakingAvatar({ speaking, children }: { speaking: boolean; children: React.ReactNode }) {
  const pulse = useSpeakingPulse(speaking);
  return <View style={styles.avatar}>
    <Animated.View testID="live-speaking-halo" pointerEvents="none" style={[styles.halo, {
      opacity: speaking ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.5] }) : 0,
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
    }]} />
    <View style={[styles.ring, speaking && styles.activeRing]}>{children}</View>
  </View>;
}

export function LiveSpeakingBars({ speaking }: { speaking: boolean }) {
  const pulse = useSpeakingPulse(speaking);
  if (!speaking) return null;
  return <View testID="live-speaking-indicator" pointerEvents="none" style={styles.bars}>
    {[0, 1, 2].map(index => <Animated.View key={index} style={[styles.bar, {
      transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: index === 1 ? [1, 0.4] : [0.4, 1] }) }],
    }]} />)}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { padding: 10, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 999, backgroundColor: c.blue },
  ring: { padding: 7, borderRadius: 999, borderWidth: 2, borderColor: "#FFFFFF26", backgroundColor: "#101D30" },
  activeRing: { borderColor: c.blue },
  bars: { width: 15, height: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  bar: { width: 3, height: 12, borderRadius: 2, backgroundColor: c.blue },
});
