import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { CategoryPill } from "@/components/CategoryPill";
import { GlassSurface } from "@/components/GlassSurface";
import { EventCard } from "@/components/EventCard";
import { useEvents } from "@/context/EventsContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

type SortOption = "relevance" | "date" | "distance" | "price";
type PriceFilter = "all" | "free" | "paid";

const POPULAR_SEARCHES = [
  "Music",
  "Festival",
  "Sports",
  "Tech",
  "Food",
  "Nightlife",
  "Art",
  "Workshop",
];

export default function SearchScreen() {
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { events, categories } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const inputRef = useRef<TextInput>(null);
  const categoryScrollRef = useRef<ScrollView>(null);
  const categoryLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const handleSelectCategory = useCallback(
    (category: string) => {
      setSelectedCategory(category);
      const index = categories.indexOf(category);
      const layout = categoryLayouts.current[category];
      const fallbackX = index <= 0 ? 0 : Math.max(0, index * 85 - 20);
      const targetX = layout ? (index <= 0 ? 0 : Math.max(0, layout.x - 20)) : fallbackX;
      categoryScrollRef.current?.scrollTo({ x: targetX, animated: true });
    },
    [categories]
  );

  const hasActiveSearch = query.trim().length > 0 || selectedCategory !== "All";

  const results = useMemo(() => {
    if (!hasActiveSearch) return [];
    let evts = [...events];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      evts = evts.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== "All") {
      evts = evts.filter((e) => e.category === selectedCategory);
    }
    if (priceFilter === "free") evts = evts.filter((e) => e.price === 0);
    if (priceFilter === "paid") evts = evts.filter((e) => e.price > 0);
    if (sort === "date") evts.sort((a, b) => a.date.localeCompare(b.date));
    if (sort === "distance") evts.sort((a, b) => a.distance - b.distance);
    if (sort === "price") evts.sort((a, b) => a.price - b.price);
    return evts;
  }, [events, query, selectedCategory, priceFilter, sort, hasActiveSearch]);

  const SORT_OPTIONS: { label: string; value: SortOption }[] = [
    { label: "Relevance", value: "relevance" },
    { label: "Date", value: "date" },
    { label: "Nearest", value: "distance" },
    { label: "Price", value: "price" },
  ];

  const PRICE_OPTIONS: { label: string; value: PriceFilter }[] = [
    { label: "All", value: "all" },
    { label: "Free", value: "free" },
    { label: "Paid", value: "paid" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === "dark"
            ? ["#1A2458", "#070814", "#070814"]
            : ["#D9E6FF", "#E8EEF8", "#F7F4FF"]
        }
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <GlassSurface
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderWidth: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            borderRadius: 0,
          },
        ]}
      >
        <View style={styles.titleRow}>
          {/* Search opens from the Events page. */}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Back to events"
          >
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
          {hasActiveSearch && (
            <View
              style={[
                styles.titleBadge,
                { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` },
              ]}
            >
              <View
                style={[
                  styles.titleBadgeDot,
                  { backgroundColor: results.length > 0 ? "#10B981" : colors.mutedForeground },
                ]}
              />
              <Text style={[styles.titleBadgeText, { color: colors.primary }]}>
                {results.length} {results.length === 1 ? "match" : "matches"}
              </Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Search events, artists, venues, cities..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoFocus
          />
          {query.length > 0 && (
            <View style={styles.inputRightCluster}>
              <View
                style={[
                  styles.inputCountPill,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Text style={[styles.inputCountText, { color: colors.primary }]}>
                  {results.length}
                </Text>
              </View>
              <Pressable
                onPress={() => setQuery("")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Category scroll */}
        <ScrollView
          ref={categoryScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((cat) => (
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
      </GlassSurface>

      {/* Search Body: Initial Blank Page OR Live Results */}
      {!hasActiveSearch ? (
        <ScrollView
          style={styles.blankScroll}
          contentContainerStyle={[
            styles.blankContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.blankIconWrap,
              { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}28` },
            ]}
          >
            <Ionicons name="search" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.blankTitle, { color: colors.foreground }]}>
            Search Events
          </Text>
          <Text style={[styles.blankSubtitle, { color: colors.mutedForeground }]}>
            Start typing above to see live matching events and counts in real time.
          </Text>

          <View style={styles.suggestionsCard}>
            <View style={styles.suggestionsHeader}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.suggestionsTitle, { color: colors.foreground }]}>
                Popular Searches
              </Text>
            </View>
            <View style={styles.suggestionsGrid}>
              {POPULAR_SEARCHES.map((term) => (
                <Pressable
                  key={term}
                  style={[
                    styles.suggestionPill,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    setQuery(term);
                    inputRef.current?.focus();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${term}`}
                >
                  <Ionicons name="trending-up" size={12} color={colors.primary} />
                  <Text style={[styles.suggestionPillText, { color: colors.foreground }]}>
                    {term}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <View
                style={[
                  styles.liveCountingTag,
                  {
                    backgroundColor:
                      results.length > 0
                        ? "rgba(16, 185, 129, 0.12)"
                        : `${colors.mutedForeground}14`,
                    borderColor:
                      results.length > 0
                        ? "rgba(16, 185, 129, 0.28)"
                        : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.liveCountingDot,
                    { backgroundColor: results.length > 0 ? "#10B981" : colors.mutedForeground },
                  ]}
                />
                <Text
                  style={[
                    styles.liveCountingText,
                    { color: results.length > 0 ? "#10B981" : colors.mutedForeground },
                  ]}
                >
                  {results.length > 0 ? "Live match" : "No match"}
                </Text>
              </View>
              <Text style={[styles.resultsCountText, { color: colors.mutedForeground }]}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                  {results.length}
                </Text>{" "}
                {results.length === 1 ? "event" : "events"} matching{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                  "{query.trim() || selectedCategory}"
                </Text>
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={44} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No events found
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No events match "{query.trim()}". Try checking your spelling or adjusting your filters.
              </Text>
              <Pressable
                style={[
                  styles.clearSearchBtn,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                onPress={() => {
                  setQuery("");
                  setSelectedCategory("All");
                  inputRef.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="arrow-back" size={14} color={colors.foreground} />
                <Text style={[styles.clearSearchBtnText, { color: colors.foreground }]}>
                  Reset search
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.delay(index * 40).springify() : undefined}
            >
              <EventCard event={item} variant="feed" inset={0} />
            </Animated.View>
          )}
          scrollEnabled={!!results.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  titleBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 48,
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputRightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inputCountText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  // Scrolls edge to edge while the first pill lines up with the header padding.
  categoryScroll: { marginHorizontal: -20 },
  categoryRow: { paddingHorizontal: 20 },
  // Feed cards run edge to edge, so only the header text gets side padding.
  list: { paddingTop: 16 },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
    flexWrap: "wrap",
  },
  liveCountingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveCountingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveCountingText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  resultsCountText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    textAlign: "right",
  },
  blankScroll: {
    flex: 1,
  },
  blankContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  blankIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  blankTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  blankSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 32,
  },
  suggestionsCard: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionPillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  clearSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  clearSearchBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
