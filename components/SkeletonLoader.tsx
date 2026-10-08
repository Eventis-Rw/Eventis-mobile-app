import React, { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
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
export function EventCardSkeleton({ inset = 20 }: { inset?: number }) {
  const { height: viewportHeight } = useWindowDimensions();
  const posterHeight = Math.min(560, Math.max(430, viewportHeight * 0.6));

  return (
    <View style={[styles.posterSkeleton, { marginHorizontal: inset }]}>
      <Skeleton height={posterHeight} borderRadius={30} />
      <View style={styles.posterTopPlaceholder}>
        <Skeleton width={108} height={30} borderRadius={999} />
        <Skeleton width={44} height={44} borderRadius={22} />
      </View>
      <View style={styles.posterBottomPlaceholder}>
        <Skeleton width={74} height={12} borderRadius={6} />
        <Skeleton width="78%" height={30} borderRadius={8} style={styles.gapLarge} />
        <Skeleton width="54%" height={14} borderRadius={7} style={styles.gap} />
        <View style={styles.posterFooterPlaceholder}>
          <Skeleton width={86} height={18} borderRadius={7} />
          <Skeleton width={132} height={44} borderRadius={999} />
        </View>
      </View>
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.heroSkeleton}>
        <Skeleton height={410} borderRadius={30} />
        <View style={styles.heroTopPlaceholder}>
          <Skeleton width={112} height={32} borderRadius={999} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
        <View style={styles.heroBottomPlaceholder}>
          <Skeleton width={128} height={13} borderRadius={7} />
          <Skeleton width="84%" height={36} borderRadius={9} style={styles.gapLarge} />
          <Skeleton width="62%" height={14} borderRadius={7} style={styles.gap} />
          <View style={styles.posterFooterPlaceholder}>
            <Skeleton width={92} height={18} borderRadius={7} />
            <Skeleton width={124} height={42} borderRadius={999} />
          </View>
        </View>
      </View>

      <View style={styles.quickSkeletonRow}>
        {[0, 1, 2].map((item) => <Skeleton key={item} height={104} borderRadius={20} style={styles.quickSkeleton} />)}
      </View>

      <View style={styles.sectionSkeleton}>
        <Skeleton width={190} height={26} />
        <Skeleton width={250} height={14} style={styles.gap} />
        <View style={styles.storySkeletonRow}>
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} width={66} height={66} borderRadius={33} />)}
        </View>
      </View>

      <View style={styles.organizerSkeleton}><Skeleton height={250} borderRadius={28} /></View>
      <View style={styles.socialSkeleton}><Skeleton height={72} borderRadius={22} /></View>

      <View style={styles.sectionSkeleton}>
        <Skeleton width={164} height={26} />
        <Skeleton width={280} height={14} style={styles.gap} />
        <View style={styles.pillSkeletonRow}>
          <Skeleton width={68} height={38} borderRadius={999} />
          <Skeleton width={84} height={38} borderRadius={999} />
          <Skeleton width={92} height={38} borderRadius={999} />
          <Skeleton width={78} height={38} borderRadius={999} />
        </View>
        <View style={styles.feedHeadingSkeleton}>
          <View style={styles.feedHeadingCopy}>
            <Skeleton width={170} height={18} />
            <Skeleton width={132} height={12} style={styles.gap} />
          </View>
          <Skeleton width={94} height={30} borderRadius={999} />
        </View>
      </View>

      <View style={styles.groupSkeleton}>
        <View>
          <Skeleton width={118} height={26} />
          <Skeleton width={190} height={12} style={styles.gap} />
        </View>
        <Skeleton width={70} height={28} borderRadius={999} />
      </View>
      <EventCardSkeleton inset={10} />
    </View>
  );
}

export function FeaturedCardSkeleton({ width = 300 }: { width?: number }) {
  return <Skeleton width={width} height={220} borderRadius={20} />;
}

const styles = StyleSheet.create({
  posterSkeleton: { position: "relative", marginBottom: 30, overflow: "hidden", borderRadius: 30 },
  posterTopPlaceholder: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  posterBottomPlaceholder: { position: "absolute", left: 20, right: 20, bottom: 20 },
  posterFooterPlaceholder: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  heroSkeleton: { position: "relative", marginHorizontal: 16, marginTop: 10, overflow: "hidden", borderRadius: 30 },
  heroTopPlaceholder: { position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBottomPlaceholder: { position: "absolute", left: 20, right: 20, bottom: 20 },
  quickSkeletonRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  quickSkeleton: { flex: 1, width: "auto" },
  sectionSkeleton: { paddingHorizontal: 16, paddingTop: 30 },
  storySkeletonRow: { flexDirection: "row", gap: 15, marginTop: 18, overflow: "hidden" },
  organizerSkeleton: { marginHorizontal: 16, marginTop: 30 },
  socialSkeleton: { marginHorizontal: 16, marginTop: 24 },
  pillSkeletonRow: { flexDirection: "row", gap: 10, marginTop: 18, overflow: "hidden" },
  feedHeadingSkeleton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22 },
  feedHeadingCopy: { flex: 1 },
  groupSkeleton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 26, paddingBottom: 12 },
  gap: {
    marginTop: 8,
  },
  gapLarge: { marginTop: 12 },
});
