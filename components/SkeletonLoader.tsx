import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.4, { duration: 700 })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height: height as number,
          borderRadius,
          backgroundColor: colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Matches the full-width "feed" EventCard on the home screen.
export function EventCardSkeleton({ inset = 14 }: { inset?: number }) {
  return (
    <View style={styles.post}>
      <View style={styles.imageSkeleton}>
        <Skeleton height="100%" borderRadius={0} />
      </View>
      <View style={[styles.content, { paddingHorizontal: inset }]}>
        <Skeleton width={80} height={14} />
        <Skeleton height={20} style={styles.gap} />
        <Skeleton width="60%" height={14} style={styles.gap} />
        <Skeleton width="40%" height={14} style={styles.gap} />
      </View>
    </View>
  );
}

export function FeaturedCardSkeleton({ width = 300 }: { width?: number }) {
  return <Skeleton width={width} height={220} borderRadius={20} />;
}

const styles = StyleSheet.create({
  post: {
    marginBottom: 0,
  },
  imageSkeleton: {
    aspectRatio: 1,
    overflow: "hidden",
  },
  content: {
    paddingTop: 14,
  },
  gap: {
    marginTop: 8,
  },
});
