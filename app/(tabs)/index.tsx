import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryPill } from "@/components/CategoryPill";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton, FeaturedCardSkeleton } from "@/components/SkeletonLoader";
import { MOCK_EVENTS } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { categories, refreshEvents } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const featured = useMemo(
    () => MOCK_EVENTS.filter((e) => e.isFeatured || e.isSponsored),
    []
  );

  const filtered = useMemo(
    () =>
      selectedCategory === "All"
        ? MOCK_EVENTS.filter((e) => !e.isFeatured)
        : MOCK_EVENTS.filter((e) => e.category === selectedCategory),
    [selectedCategory]
  );

  const nearby = useMemo(
    () => [...MOCK_EVENTS].sort((a, b) => a.distance - b.distance).slice(0, 6),
    []
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  }, [refreshEvents]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoPlate}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                Good{getTimeGreeting()},
              </Text>
              <Text style={[styles.userName, { color: colors.foreground }]}>
                {user?.username ?? "Explorer"}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(tabs)/search" as any)}
            >
              <Ionicons name="search-outline" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/search" as any)}
        >
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
            Search events near you...
          </Text>
          <View style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="options-outline" size={14} color="#fff" />
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 16,
            paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Featured / Sponsored */}
        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Featured
            </Text>
            <Pressable>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          {loading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skeletonRow}>
              <FeaturedCardSkeleton />
              <FeaturedCardSkeleton />
            </ScrollView>
          ) : (
            <BannerCarousel events={featured} />
          )}
        </Animated.View>

        {/* Categories */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(180).springify() : undefined}
          style={styles.sectionSpacing}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                category={cat}
                isSelected={selectedCategory === cat}
                onPress={setSelectedCategory}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Nearby events */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(240).springify() : undefined}
          style={styles.sectionSpacing}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Nearby
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                Events close to you
              </Text>
            </View>
            <Pressable>
              <Text style={[styles.seeAll, { color: colors.primary }]}>View map</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyRow}>
            {nearby.map((event) => (
              <EventCard key={event.id} event={event} variant="compact" />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Filtered events */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(300).springify() : undefined}
          style={styles.sectionSpacing}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {selectedCategory === "All" ? "All Events" : selectedCategory}
            </Text>
            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
              {filtered.length} events
            </Text>
          </View>
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} variant="standard" />
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return " morning";
  if (h < 17) return " afternoon";
  return " evening";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoPlate: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 40,
    height: 40,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sectionSpacing: {
    marginTop: 28,
  },
  categoryRow: {
    paddingRight: 20,
  },
  nearbyRow: {
    paddingRight: 20,
  },
  skeletonRow: {
    gap: 0,
  },
});
