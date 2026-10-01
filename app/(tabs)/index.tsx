import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryPill } from "@/components/CategoryPill";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/SkeletonLoader";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";

const PAGE_PADDING = 20;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { events, categories, isLoading, error, refreshEvents } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh shows its own spinner, so skeletons are for the first load only.
  const showSkeletons = isLoading && !refreshing;

  const featured = useMemo(
    () => events.filter((e) => e.isFeatured || e.isSponsored),
    [events]
  );

  // "All" skips events already shown in Featured so the page doesn't repeat them.
  const filtered = useMemo(
    () =>
      selectedCategory === "All"
        ? events.filter((e) => !e.isFeatured && !e.isSponsored)
        : events.filter((e) => e.category === selectedCategory),
    [events, selectedCategory]
  );

  const nearby = useMemo(
    () => [...events].sort((a, b) => a.distance - b.distance).slice(0, 6),
    [events]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  }, [refreshEvents]);

  const openSearch = useCallback(() => {
    router.push("/(tabs)/search" as any);
  }, [router]);

  const renderBody = () => {
    if (error && !events.length) {
      return (
        <StateMessage
          icon="cloud-offline-outline"
          title="Couldn't load events"
          text="Check your connection and try again."
          actionLabel="Try again"
          onAction={refreshEvents}
        />
      );
    }

    if (!showSkeletons && !events.length) {
      return (
        <StateMessage
          icon="calendar-clear-outline"
          title="No events yet"
          text="New events will show up here as soon as they're published."
          actionLabel="Refresh"
          onAction={refreshEvents}
        />
      );
    }

    return (
      <>
        {/* Featured / Sponsored */}
        {(showSkeletons || featured.length > 0) && (
          <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}>
            <SectionHeader title="Featured" subtitle="Handpicked by Eventis" />
            <BannerCarousel events={featured} loading={showSkeletons} inset={PAGE_PADDING} />
          </Animated.View>
        )}

        {/* Nearby events */}
        {!showSkeletons && nearby.length > 0 && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(180).springify() : undefined}
            style={styles.section}
          >
            <SectionHeader title="Nearby" subtitle="Events close to you" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.bleedContent}
            >
              {nearby.map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Browse: the category filter sits with the list it filters */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(240).springify() : undefined}
          style={styles.section}
        >
          <SectionHeader
            title={selectedCategory === "All" ? "All Events" : selectedCategory}
            trailing={
              showSkeletons ? undefined : (
                <Text style={[styles.countText, { color: colors.mutedForeground }]}>
                  {filtered.length} {filtered.length === 1 ? "event" : "events"}
                </Text>
              )
            }
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.bleed, styles.categoryScroll]}
            contentContainerStyle={styles.bleedContent}
          >
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                category={cat}
                isSelected={selectedCategory === cat}
                onPress={setSelectedCategory}
              />
            ))}
          </ScrollView>

          {showSkeletons ? (
            <View style={styles.bleed}>
              <EventCardSkeleton inset={PAGE_PADDING} />
              <EventCardSkeleton inset={PAGE_PADDING} />
            </View>
          ) : filtered.length ? (
            <View style={styles.bleed}>
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} variant="feed" inset={PAGE_PADDING} />
              ))}
            </View>
          ) : (
            <StateMessage
              icon="search-outline"
              title={`No ${selectedCategory} events`}
              text="Try another category or browse everything."
              actionLabel="Show all events"
              onAction={() => setSelectedCategory("All")}
              compact
            />
          )}
        </Animated.View>
      </>
    );
  };

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
            <Pressable
              onPress={() => router.push("/(tabs)/profile" as any)}
              style={[
                styles.avatarBtn,
                {
                  backgroundColor: user?.avatarUrl ? colors.card : colors.primary,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : user?.username ? (
                <Text style={styles.avatarText}>
                  {user.username.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={20} color="#FFFFFF" />
              )}
            </Pressable>
            <View style={styles.greetingBlock}>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                Good{getTimeGreeting()},
              </Text>
              <Text
                style={[styles.userName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {user?.username ?? "Explorer"}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}
          onPress={openSearch}
          accessibilityRole="search"
          accessibilityLabel="Search events"
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
        {renderBody()}
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

function StateMessage({
  icon,
  title,
  text,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      <Ionicons name={icon} size={40} color={colors.border} />
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{text}</Text>
      <Pressable
        style={[styles.stateBtn, { backgroundColor: colors.primary }]}
        onPress={onAction}
        accessibilityRole="button"
      >
        <Text style={[styles.stateBtnText, { color: colors.primaryForeground }]}>
          {actionLabel}
        </Text>
      </Pressable>
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
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  greetingBlock: {
    flexShrink: 1,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
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
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 20,
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 12,
  },
  sectionHeading: {
    flexShrink: 1,
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
  countText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  // Horizontal rows scroll edge to edge but start aligned with the page padding.
  bleed: {
    marginHorizontal: -PAGE_PADDING,
  },
  bleedContent: {
    paddingHorizontal: PAGE_PADDING,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  state: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  stateCompact: {
    paddingTop: 24,
    paddingBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  stateBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stateBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
