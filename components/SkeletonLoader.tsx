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
  height?: number;
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
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function EventCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Skeleton height={150} borderRadius={0} style={styles.imageSkeleton} />
      <View style={styles.content}>
        <Skeleton width={80} height={14} />
        <Skeleton height={20} style={styles.gap} />
        <Skeleton width="60%" height={14} style={styles.gap} />
        <Skeleton width="40%" height={14} style={styles.gap} />
      </View>
    </View>
  );
}

export function FeaturedCardSkeleton() {
  return (
    <View style={styles.featured}>
      <Skeleton width={300} height={200} borderRadius={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
  },
  imageSkeleton: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 14,
  },
  gap: {
    marginTop: 8,
  },
  featured: {
    marginRight: 14,
  },
});
