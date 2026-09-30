import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryPill } from "@/components/CategoryPill";
import { EventCard } from "@/components/EventCard";
import { FeaturedCardSkeleton } from "@/components/SkeletonLoader";
import { CATEGORIES, MOCK_EVENTS, type EventCategory } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("All");
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
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Floating header */}
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 0}
        tint={colorScheme === "dark" ? "dark" : "light"}
        className="absolute left-0 right-0 z-10 border-b border-border px-5 pb-3 dark:border-border-dark"
        style={{
          top: 0,
          paddingTop: headerTop + 4,
          backgroundColor: Platform.OS !== "ios" ? colors.background : "transparent",
        }}
      >
        <View className="mb-3 flex-row items-start justify-between">
          <View>
            <Text className="font-sans text-[13px] text-muted-foreground dark:text-muted-foreground-dark">
              Good{getTimeGreeting()},
            </Text>
            <Text className="mt-px font-bold text-[22px] text-foreground dark:text-foreground-dark">
              {user?.username ?? "Explorer"}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card dark:border-border-dark dark:bg-card-dark"
              onPress={() => router.push("/auth/otp" as any)}
            >
              <Ionicons name="search-outline" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card dark:border-border-dark dark:bg-card-dark">
              <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <Pressable
          className="flex-row items-center gap-2.5 rounded-[14px] border border-border bg-input px-3.5 py-3 dark:border-border-dark dark:bg-input-dark"
          onPress={() => router.push("/(tabs)/search" as any)}
        >
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <Text className="flex-1 font-sans text-sm text-muted-foreground dark:text-muted-foreground-dark">
            Search events near you...
          </Text>
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Ionicons name="options-outline" size={14} color="#fff" />
          </View>
        </Pressable>
      </BlurView>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: headerTop + 120,
          paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        }}
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
          <View className="mb-3.5 flex-row items-end justify-between">
            <Text className="font-bold text-xl text-foreground dark:text-foreground-dark">
              Featured
            </Text>
            <Pressable>
              <Text className="font-semibold text-sm text-primary">See all</Text>
            </Pressable>
          </View>
          {loading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-0"
            >
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
          className="mt-7"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="pr-5"
          >
            {CATEGORIES.map((cat) => (
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
          className="mt-7"
        >
          <View className="mb-3.5 flex-row items-end justify-between">
            <View>
              <Text className="font-bold text-xl text-foreground dark:text-foreground-dark">
                Nearby
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
                Events close to you
              </Text>
            </View>
            <Pressable>
              <Text className="font-semibold text-sm text-primary">View map</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="pr-5"
          >
            {nearby.map((event) => (
              <EventCard key={event.id} event={event} variant="compact" />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Filtered events */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(300).springify() : undefined}
          className="mt-7"
        >
          <View className="mb-3.5 flex-row items-end justify-between">
            <Text className="font-bold text-xl text-foreground dark:text-foreground-dark">
              {selectedCategory === "All" ? "All Events" : selectedCategory}
            </Text>
            <Text className="font-sans text-[13px] text-muted-foreground dark:text-muted-foreground-dark">
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
