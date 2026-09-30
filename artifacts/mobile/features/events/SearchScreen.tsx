import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { CATEGORIES, MOCK_EVENTS, type EventCategory } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

type SortOption = "relevance" | "date" | "distance" | "price";
type PriceFilter = "all" | "free" | "paid";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("All");
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
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View
        className="border-b border-border bg-background px-5 pb-3 dark:border-border-dark dark:bg-background-dark"
        style={{ paddingTop: headerTop + 8 }}
      >
        <Text className="mb-3.5 font-bold text-[28px] text-foreground dark:text-foreground-dark">
          Explore
        </Text>
        <View className="mb-3 flex-row items-center gap-2.5 rounded-[14px] border border-border bg-input px-3.5 py-2.5 dark:border-border-dark dark:bg-input-dark">
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            className="flex-1 font-sans text-[15px] text-foreground dark:text-foreground-dark"
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
            className={`h-[30px] w-[30px] items-center justify-center rounded-lg ${
              showFilters ? "bg-primary" : "bg-secondary dark:bg-secondary-dark"
            }`}
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
          data={CATEGORIES}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-5"
          renderItem={({ item }) => (
            <Pressable
              className={`rounded-[20px] border px-3.5 py-[7px] ${
                selectedCategory === item
                  ? "border-primary bg-primary"
                  : "border-border bg-card dark:border-border-dark dark:bg-card-dark"
              }`}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                className={`text-[13px] ${
                  selectedCategory === item
                    ? "font-semibold text-primary-foreground"
                    : "font-sans text-muted-foreground dark:text-muted-foreground-dark"
                }`}
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
            className="mt-3 gap-2.5"
          >
            <View className="gap-1.5">
              <Text className="font-medium text-xs uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark">
                Sort
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SORT_OPTIONS.map((o) => (
                  <Pressable
                    key={o.value}
                    className={`rounded-lg border px-3 py-1.5 ${
                      sort === o.value
                        ? "border-primary bg-primary"
                        : "border-border bg-secondary dark:border-border-dark dark:bg-secondary-dark"
                    }`}
                    onPress={() => setSort(o.value)}
                  >
                    <Text
                      className={`font-medium text-[13px] ${
                        sort === o.value
                          ? "text-primary-foreground"
                          : "text-foreground dark:text-foreground-dark"
                      }`}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="gap-1.5">
              <Text className="font-medium text-xs uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark">
                Price
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PRICE_OPTIONS.map((o) => (
                  <Pressable
                    key={o.value}
                    className={`rounded-lg border px-3 py-1.5 ${
                      priceFilter === o.value
                        ? "border-primary bg-primary"
                        : "border-border bg-secondary dark:border-border-dark dark:bg-secondary-dark"
                    }`}
                    onPress={() => setPriceFilter(o.value)}
                  >
                    <Text
                      className={`font-medium text-[13px] ${
                        priceFilter === o.value
                          ? "text-primary-foreground"
                          : "text-foreground dark:text-foreground-dark"
                      }`}
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
        contentContainerClassName="px-5 pt-4"
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text className="mb-3 font-sans text-[13px] text-muted-foreground dark:text-muted-foreground-dark">
            {results.length} {results.length === 1 ? "event" : "events"} found
          </Text>
        }
        ListEmptyComponent={
          <View className="items-center gap-3 pt-[60px]">
            <Ionicons name="search-outline" size={40} color={colors.border} />
            <Text className="font-semibold text-lg text-foreground dark:text-foreground-dark">
              No events found
            </Text>
            <Text className="px-10 text-center font-sans text-sm text-muted-foreground dark:text-muted-foreground-dark">
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
