import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { CategoryPill } from "@/components/CategoryPill";
import { getEventImage } from "@/constants/eventImages";
import type { Event } from "@/constants/events";
import { useFeedAnalytics } from "@/hooks/useFeedAnalytics";
import { useStories } from "@/context/StoriesContext";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";

const RECENT_SEARCHES_KEY = "@eventis_recent_searches";
const MAX_RECENT_SEARCHES = 6;

function ExploreGridCard({
  event,
  cardWidth,
  onPress,
}: {
  event: Event;
  cardWidth: number;
  onPress: () => void;
}) {
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(event.date);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return event.date;
    }
  }, [event.date]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridCard,
        {
          width: cardWidth,
          height: cardWidth,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={event.title}
    >
      <ImageBackground
        source={getEventImage(event.image)}
        style={styles.gridImage}
        imageStyle={styles.gridImageStyle}
        resizeMode="cover"
      >
        {/* Top Free Badge */}
        {!event.isPaid ? (
          <View style={styles.gridFreeBadge}>
            <Text style={styles.gridFreeText}>Free</Text>
          </View>
        ) : (
          <View />
        )}

        {/* Bottom Minimal Scrim & Event Details */}
        <View style={styles.gridBottomScrim}>
          <Text style={styles.gridTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.gridDate} numberOfLines={1}>
            {formattedDate}
          </Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const { viewerOpen } = useStories();
  const feedAnalytics = useFeedAnalytics("search", viewerOpen);
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();

  const { user } = useAuth();
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const savedCount = user?.savedEvents?.length ?? 0;
  const [query, setQuery] = useState("");
  const { events, categories } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const categoryScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const categoryLayouts = useRef<Record<string, { x: number; width: number }>>({});

  // 3-columns per row Instagram Explore grid: (width - 4px total gap) / 3
  const cardWidth = useMemo(() => Math.floor((width - 4) / 3), [width]);

  // Load recent searches from AsyncStorage
  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      } catch {
        // Storage lookup fallback
      }
    })();
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    try {
      setRecentSearches((prev) => {
        const updated = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
        void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Storage save fallback
    }
  }, []);

  const clearRecentSearch = useCallback(async (termToRemove: string) => {
    try {
      setRecentSearches((prev) => {
        const updated = prev.filter((item) => item !== termToRemove);
        void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Storage remove fallback
    }
  }, []);

  const clearAllRecentSearches = useCallback(async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Storage remove fallback
    }
  }, []);

  // Back button strictly returns user to their previous screen in history
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Deduplicate categories list
  const uniqueCategories = useMemo(() => Array.from(new Set(categories)), [categories]);

  const handleSelectCategory = useCallback(
    (category: string) => {
      setSelectedCategory(category);
      const index = uniqueCategories.indexOf(category);
      const layout = categoryLayouts.current[category];
      const fallbackX = index <= 0 ? 0 : Math.max(0, index * 85 - 20);
      const targetX = layout ? (index <= 0 ? 0 : Math.max(0, layout.x - 20)) : fallbackX;
      categoryScrollRef.current?.scrollTo({ x: targetX, animated: true });
    },
    [uniqueCategories]
  );

  const hasActiveQuery = query.trim().length > 0;

  // Filter out recent search terms that are identical to category names (prevents duplication)
  const filteredRecentSearches = useMemo(() => {
    const catSet = new Set(uniqueCategories.map((c) => c.toLowerCase()));
    return recentSearches.filter((term) => !catSet.has(term.toLowerCase()));
  }, [recentSearches, uniqueCategories]);

  const results = useMemo(() => {
    let evts = [...events];
    if (showSavedOnly) {
      const savedSet = new Set(user?.savedEvents ?? []);
      evts = evts.filter((e) => savedSet.has(e.id));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      evts = evts.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== "All") {
      evts = evts.filter((e) => e.category === selectedCategory);
    }
    return evts;
  }, [events, query, selectedCategory, showSavedOnly, user?.savedEvents]);

  const handleSearchSubmit = () => {
    if (query.trim()) {
      void saveRecentSearch(query.trim());
    }
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    void saveRecentSearch(term);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Main Content Area sharing the feed with top header */}
      <FlatList
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        viewabilityConfig={feedAnalytics.viewabilityConfig}
        onViewableItemsChanged={feedAnalytics.onViewableItemsChanged}
        data={results}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Top Search & Category Header integrated directly in the feed (no line dividers) */}
            <View
              style={[
                styles.header,
                {
                  paddingTop: insets.top + 6,
                },
              ]}
            >
              <View style={styles.searchBarRow}>
                <Pressable
                  onPress={handleBack}
                  style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={20} color={colors.foreground} />
                </Pressable>

                <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={showSavedOnly ? "Search saved events..." : "Search events, artists, venues..."}
                    placeholderTextColor={colors.mutedForeground}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoFocus={false}
                  />
                  {query.length > 0 && (
                    <Pressable
                      onPress={() => setQuery("")}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>

                {/* Saved Posts Filter (like Instagram Saved) */}
                <Pressable
                  onPress={() => setShowSavedOnly((s) => !s)}
                  style={[
                    styles.viewToggleBtn,
                    {
                      backgroundColor: showSavedOnly ? `${colors.primary}22` : colors.card,
                      borderColor: showSavedOnly ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={showSavedOnly ? "Show all explore events" : "Show saved events"}
                >
                  <Ionicons
                    name={showSavedOnly ? "bookmark" : "bookmark-outline"}
                    size={18}
                    color={showSavedOnly ? colors.primary : colors.foreground}
                  />
                  {savedCount > 0 && !showSavedOnly && (
                    <View style={[styles.savedBadgeDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              </View>

              {/* Category Filter Scroll */}
              <ScrollView
                ref={categoryScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryRow}
              >
                {uniqueCategories.map((cat) => (
                  <View
                    key={cat}
                    onLayout={(e) => {
                      categoryLayouts.current[cat] = {
                        x: e.nativeEvent.layout.x,
                        width: e.nativeEvent.layout.width,
                      };
                    }}
                  >
                    <CategoryPill
                      category={cat}
                      isSelected={selectedCategory === cat}
                      onPress={handleSelectCategory}
                    />
                  </View>
                ))}
              </ScrollView>

              {/* Saved Events Status Banner */}
              {showSavedOnly && (
                <View style={styles.savedBannerRow}>
                  <View style={styles.savedBannerLeft}>
                    <Ionicons name="bookmark" size={14} color={colors.primary} />
                    <Text style={[styles.savedBannerText, { color: colors.foreground }]}>
                      Saved events ({results.length})
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowSavedOnly(false)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Show all explore events"
                  >
                    <Text style={[styles.savedBannerClear, { color: colors.primary }]}>Show all</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Recent Searches (Instagram Pattern) */}
            {!hasActiveQuery && filteredRecentSearches.length > 0 && selectedCategory === "All" && (
              <View style={styles.recentSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
                  <Pressable onPress={clearAllRecentSearches} hitSlop={6}>
                    <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear all</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentChipsContainer}>
                  {filteredRecentSearches.map((term) => (
                    <View
                      key={term}
                      style={[styles.recentChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Pressable
                        onPress={() => handleSelectRecent(term)}
                        accessibilityRole="button"
                        accessibilityLabel={`Search ${term}`}
                      >
                        <Text style={[styles.recentChipText, { color: colors.foreground }]}>{term}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void clearRecentSearch(term)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${term}`}
                      >
                        <Ionicons name="close" size={14} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons
                name={showSavedOnly ? "bookmark-outline" : "search-outline"}
                size={32}
                color={showSavedOnly ? colors.primary : colors.mutedForeground}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {showSavedOnly ? "No saved events yet" : "No events found"}
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
              {showSavedOnly
                ? "Tap the bookmark icon on any event in your feed to save it here."
                : query.trim()
                ? `No events match "${query.trim()}". Try checking the spelling or searching another word.`
                : "No events available in this category yet."}
            </Text>
            <Pressable
              style={[styles.emptyResetBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                if (showSavedOnly) {
                  setShowSavedOnly(false);
                }
                setQuery("");
                setSelectedCategory("All");
              }}
              accessibilityRole="button"
              accessibilityLabel="Show all events"
            >
              <Text style={[styles.emptyResetBtnText, { color: colors.foreground }]}>
                {showSavedOnly ? "Explore all events" : "Show all events"}
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(Math.min(index * 20, 160)).springify() : undefined}
          >
            <ExploreGridCard
              event={item}
              cardWidth={cardWidth}
              onPress={() => router.push({ pathname: "/event/[id]", params: { id: item.id, source: "search" } })}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  viewToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  savedBadgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  savedBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 2,
  },
  savedBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  savedBannerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  savedBannerClear: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  categoryScroll: {
    marginHorizontal: -16,
  },
  categoryRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  listContainer: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  gridRow: {
    gap: 2,
    marginBottom: 2,
  },
  gridCard: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
  },
  gridImageStyle: {
    borderRadius: 0,
  },
  gridFreeBadge: {
    alignSelf: "flex-start",
    margin: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(16, 185, 129, 0.88)",
  },
  gridFreeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  gridBottomScrim: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: "rgba(7, 8, 20, 0.78)",
    gap: 1,
  },
  gridTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 14,
  },
  gridDate: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "rgba(255, 255, 255, 0.75)",
  },
  recentSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  recentChipsContainer: {
    gap: 8,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  recentChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  emptyMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  emptyResetBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  emptyResetBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
