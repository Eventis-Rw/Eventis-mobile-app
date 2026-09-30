import React, { useEffect } from "react";
import { View } from "react-native";
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
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  className,
}: SkeletonProps) {
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
      className={className}
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        animatedStyle,
      ]}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <View className="mb-3.5 overflow-hidden rounded-xl border border-border bg-card dark:border-border-dark dark:bg-card-dark">
      <Skeleton height={150} borderRadius={0} className="rounded-t-xl" />
      <View className="p-3.5">
        <Skeleton width={80} height={14} />
        <Skeleton height={20} className="mt-2" />
        <Skeleton width="60%" height={14} className="mt-2" />
        <Skeleton width="40%" height={14} className="mt-2" />
      </View>
    </View>
  );
}

export function FeaturedCardSkeleton() {
  return (
    <View className="mr-3.5">
      <Skeleton width={300} height={200} borderRadius={20} />
    </View>
  );
}
