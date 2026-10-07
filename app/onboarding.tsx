import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { ONBOARDING_COMPLETE_KEY } from "@/constants/onboarding";
import { useColors } from "@/hooks/useColors";

interface SlideData {
  id: string;
  kicker: string;
  title: string;
  description: string;
  image: any;
  primaryActionLabel: string;
}

const SLIDES: SlideData[] = [
  {
    id: "slide-1",
    kicker: "The night, curated",
    title: "Find the room\nbefore it fills up.",
    description:
      "Concerts, rooftop sets, and the plans people are already making near you.",
    image: require("../assets/images/onboarding-nights.jpg"),
    primaryActionLabel: "Continue",
  },
  {
    id: "slide-2",
    kicker: "Go with someone",
    title: "Meet the people\ngoing too.",
    description:
      "See who's in the crowd, start a chat, and turn a ticket into a night out.",
    image: require("../assets/images/onboarding-people.jpg"),
    primaryActionLabel: "Continue",
  },
  {
    id: "slide-3",
    kicker: "Your city, tonight",
    title: "Kigali doesn't\nsleep quietly.",
    description:
      "From a cooking class tomorrow morning to the match under the lights.",
    image: require("../assets/images/onboarding-city.jpg"),
    primaryActionLabel: "Get started",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const [{ width, height }, setViewport] = useState({ width: 0, height: 0 });
  const pageIndex = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  const finishing = useRef(false);

  const measureViewport = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height },
    );
  }, []);

  useEffect(() => {
    if (width > 0) {
      flatListRef.current?.scrollToOffset({
        offset: pageIndex.current * width,
        animated: false,
      });
    }
  }, [width]);

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      router.replace("/auth/login" as any);
    } catch {
      finishing.current = false;
    }
  }, [router]);

  const handlePrimaryPress = (index: number) => {
    if (index < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: index + 1,
        animated: true,
      });
      pageIndex.current = index + 1;
    } else {
      void finish();
    }
  };

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      if (slideIndex >= 0 && slideIndex < SLIDES.length) {
        pageIndex.current = slideIndex;
      }
    },
    [width]
  );

  return (
    <View style={styles.root} onLayout={measureViewport}>
      {/* Full-bleed Horizontal Pager */}
      {width > 0 && height > 0 ? (
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onScroll}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <View style={[styles.slide, { width, height }]}>
              {/* 100% Full-bleed Background Image */}
              <Image
                source={item.image}
                style={{ position: "absolute", width, height }}
                resizeMode="cover"
              />

              {/* Cinematic Gradient Overlays */}
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0.6)",
                  "rgba(0,0,0,0.15)",
                  "rgba(12,12,26,0.65)",
                  "rgba(12,12,26,0.95)",
                ]}
                locations={[0, 0.3, 0.6, 0.95]}
                style={StyleSheet.absoluteFill}
              />

              {/* Slide Content */}
              <ScrollView
                style={styles.slideScroll}
                contentContainerStyle={[
                  styles.container,
                  {
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                  },
                ]}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
              >
                {/* Top Row with Skip CTA */}
                <View style={styles.topRow}>
                  <Pressable
                    onPress={() => void finish()}
                    accessibilityRole="button"
                    accessibilityLabel="Skip onboarding"
                    hitSlop={16}
                    style={styles.skipBtn}
                  >
                    <Text style={styles.skipBtnText}>Skip</Text>
                  </Pressable>
                </View>

                {/* Bottom Block: Typography & Action Controls */}
                <View style={styles.bottomBlock}>
                <View style={styles.copySection}>
                  <Text style={styles.kicker}>{item.kicker}</Text>
                  <Text style={styles.heading}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.description}>{item.description}</Text>
                  ) : null}
                </View>

                {/* Bottom Actions */}
                <View style={styles.bottomSection}>
                  {/* Pagination Dots */}
                  <View style={styles.dotsRow}>
                    {SLIDES.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i === index
                            ? [styles.activeDot, { backgroundColor: colors.primary }]
                            : styles.inactiveDot,
                        ]}
                      />
                    ))}
                  </View>

                  {/* Primary CTA */}
                  <Pressable
                    style={[styles.primaryPill, { backgroundColor: colors.primary }]}
                    onPress={() => handlePrimaryPress(index)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryPillText}>
                      {item.primaryActionLabel}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0c0c1a",
  },
  slide: {
    overflow: "hidden",
  },
  slideScroll: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    gap: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 8,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  bottomBlock: {
    gap: 20,
    width: "100%",
  },
  copySection: {
    gap: 10,
  },
  kicker: {
    color: "#FFD36A",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.1,
    color: "#FFFFFF",
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "Inter_400Regular",
    color: "rgba(255, 255, 255, 0.82)",
    maxWidth: 340,
  },
  bottomSection: {
    gap: 14,
    alignItems: "center",
    width: "100%",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  activeDot: {
    width: 22,
  },
  inactiveDot: {
    width: 7,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  primaryPill: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryPillText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
