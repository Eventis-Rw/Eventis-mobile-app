import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { MOCK_EVENTS } from "@/constants/mockData";
import { useEvents } from "@/context/EventsContext";
import { useColors } from "@/hooks/useColors";

type SortOption = "relevance" | "date" | "distance" | "price";
type PriceFilter = "all" | "free" | "paid";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const { categories } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const headerTop = Platform.OS === "web" ? 67 : insets.top;

  const results = useMemo(() => {
    let evts = [...MOCK_EVENTS];
    if (query.trim()) {
      const q = query.toLowerCase();
      evts = evts.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
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
  }, [query, selectedCategory, priceFilter, sort]);

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
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: headerTop + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Explore</Text>
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
            placeholder="Search events, organizers, cities..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
          <Pressable
            style={[
              styles.filterToggle,
              { backgroundColor: showFilters ? colors.primary : colors.secondary },
            ]}
            onPress={() => setShowFilters((p) => !p)}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={showFilters ? "#fff" : colors.foreground}
            />
          </Pressable>
        </View>

        {/* Category scroll */}
        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.catPill,
                {
                  backgroundColor:
                    selectedCategory === item ? colors.primary : colors.card,
                  borderColor:
                    selectedCategory === item ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.catText,
                  {
                    color:
                      selectedCategory === item
                        ? "#fff"
                        : colors.mutedForeground,
                    fontFamily:
                      selectedCategory === item
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                  },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          )}
        />

        {/* Filters row */}
        {showFilters && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeIn.duration(200) : undefined}
            style={styles.filtersPanel}
          >
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Sort</Text>
              <View style={styles.filterOptions}>
                {SORT_OPTIONS.map((o) => (
                  <Pressable
                    key={o.value}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: sort === o.value ? colors.primary : colors.secondary,
                        borderColor: sort === o.value ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSort(o.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: sort === o.value ? "#fff" : colors.foreground },
                      ]}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Price</Text>
              <View style={styles.filterOptions}>
                {PRICE_OPTIONS.map((o) => (
                  <Pressable
                    key={o.value}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor:
                          priceFilter === o.value ? colors.primary : colors.secondary,
                        borderColor:
                          priceFilter === o.value ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPriceFilter(o.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: priceFilter === o.value ? "#fff" : colors.foreground },
                      ]}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
            {results.length} {results.length === 1 ? "event" : "events"} found
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No events found
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Try different keywords or adjust your filters
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(index * 60).springify() : undefined}
          >
            <EventCard event={item} variant="standard" />
          </Animated.View>
        )}
        scrollEnabled={!!results.length}
      />
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
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterToggle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryRow: {
    gap: 8,
    paddingRight: 20,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catText: { fontSize: 13 },
  filtersPanel: {
    marginTop: 12,
    gap: 10,
  },
  filterGroup: { gap: 6 },
  filterLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterOptions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  resultsCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
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
    paddingHorizontal: 40,
  },
});
