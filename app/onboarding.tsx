import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ONBOARDING_COMPLETE_KEY } from "@/constants/onboarding";

const PAGES = [
  {
    title: "Discover moments worth going out for.",
    description: "Find concerts, festivals, and experiences you'll be talking about long after they're over.",
    image: require("../assets/images/onboarding-concert.jpg"),
    eyebrow: "DISCOVER EVENTS",
    imageLabel: "Concert crowd under colorful stage lights",
    icon: "sparkles-outline" as const,
  },
  {
    title: "See what's happening around you.",
    description: "Explore nearby food, culture, and community events that fit your mood and your schedule.",
    image: require("../assets/images/onboarding-food.jpg"),
    eyebrow: "EXPLORE NEARBY",
    imageLabel: "People enjoying an outdoor food festival",
    icon: "location-outline" as const,
  },
  {
    title: "Find your people. Make it memorable.",
    description: "Connect with fellow attendees and keep all your favorite experiences in one place.",
    image: require("../assets/images/onboarding-tech.jpg"),
    eyebrow: "CONNECT & ENJOY",
    imageLabel: "Audience at a technology conference",
    icon: "people-outline" as const,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  const [error, setError] = useState(false);
  const finishing = useRef(false);
  const page = PAGES[pageIndex];
  const isLast = pageIndex === PAGES.length - 1;
  const compact = height < 650;
  const imageHeight = compact ? Math.min(180, height * 0.29) : Math.min(270, Math.max(210, height * 0.30));
  const horizontalPadding = width < 360 ? 18 : 24;

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setError(false);
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      router.replace("/(tabs)");
    } catch {
      finishing.current = false;
      setError(true);
    }
  }

  function next() {
    if (isLast) {
      void finish();
    } else {
      setPageIndex((current) => current + 1);
      setError(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingHorizontal: horizontalPadding }]}>
        <View style={styles.brand}>
          <Image source={require("../assets/images/icon.png")} style={styles.brandIcon} />
          <Text style={styles.brandName}>eventis</Text>
        </View>
        <Pressable
          onPress={() => void finish()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        key={pageIndex}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: imageHeight }]}>
          <Image
            source={page.image}
            style={styles.heroImage}
            resizeMode="stretch"
            accessibilityLabel={page.imageLabel}
          />
            <LinearGradient
              colors={["rgba(12,12,26,0)", "rgba(12,12,26,0.65)"]}
              style={styles.heroGradient}
            />
            <View style={styles.heroBadge}>
              <Ionicons name={page.icon} size={18} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>{page.eyebrow}</Text>
            </View>
        </View>

        <View style={[styles.copy, compact && styles.copyCompact]}>
          <Text style={styles.kicker}>WELCOME TO EVENTIS</Text>
          <Text style={[styles.title, width < 360 && styles.titleSmall, compact && styles.titleCompact]}>{page.title}</Text>
          <Text style={[styles.description, compact && styles.descriptionCompact]}>{page.description}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.indicators} accessibilityLabel={"Onboarding page " + (pageIndex + 1) + " of " + PAGES.length}>
          {PAGES.map((item, index) => (
            <View
              key={item.eyebrow}
              style={[styles.dot, index === pageIndex && styles.activeDot]}
            />
          ))}
        </View>
        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            Could not save your progress. Please try again.
          </Text>
        )}
        <View style={styles.actions}>
          {pageIndex > 0 ? (
            <Pressable
              onPress={() => setPageIndex((current) => current - 1)}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Previous onboarding page"
            >
              <Ionicons name="arrow-back" size={20} color="#1932A6" />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Pressable
            onPress={next}
            style={styles.nextButton}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Get started" : "Next onboarding page"}
          >
            <Text style={styles.nextText}>{isLast ? "Get Started" : "Next"}</Text>
            <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandIcon: { width: 34, height: 34 },
  brandName: { color: "#1932A6", fontSize: 21, fontFamily: "Inter_700Bold", letterSpacing: -0.7 },
  skipButton: { paddingVertical: 12, paddingLeft: 16 },
  skipText: { color: "#4F4F63", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingTop: 16, paddingBottom: 20 },
  scrollContentCompact: { paddingTop: 8, paddingBottom: 4 },
  hero: { overflow: "hidden", borderRadius: 28, backgroundColor: "#E0E6F7" },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: { ...StyleSheet.absoluteFill },
  heroBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    margin: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(12,12,26,0.55)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroBadgeText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.1 },
  copy: { paddingTop: 27, paddingBottom: 12 },
  copyCompact: { paddingTop: 16, paddingBottom: 0 },
  kicker: { color: "#1932A6", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  title: {
    color: "#0C0C1A",
    fontSize: 31,
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.1,
    marginTop: 12,
  },
  titleSmall: { fontSize: 27, lineHeight: 34 },
  titleCompact: { fontSize: 24, lineHeight: 30, marginTop: 8 },
  description: {
    color: "#4F4F63",
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    marginTop: 14,
  },
  descriptionCompact: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  footer: { paddingTop: 12, backgroundColor: "#FFFFFF" },
  indicators: { flexDirection: "row", justifyContent: "center", gap: 8, paddingBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D4DCF5" },
  activeDot: { width: 28, backgroundColor: "#1932A6" },
  error: { textAlign: "center", color: "#C33434", marginBottom: 10, fontSize: 13 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  backButton: {
    minWidth: 80,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  backPlaceholder: { width: 80 },
  backText: { color: "#1932A6", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nextButton: {
    minHeight: 56,
    minWidth: 160,
    paddingHorizontal: 22,
    borderRadius: 17,
    backgroundColor: "#1932A6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
});
