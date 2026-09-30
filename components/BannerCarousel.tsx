import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";

import { EventCard } from "./EventCard";
import { FeaturedCardSkeleton } from "./SkeletonLoader";
import { useColors } from "@/hooks/useColors";
import type { Event } from "@/constants/mockData";

const ITEM_GAP = 12;
// How much of the next slide stays visible, hinting that the row scrolls.
const PEEK = 28;
const MAX_ITEM_WIDTH = 420;

interface BannerCarouselProps {
  events: Event[];
  loading?: boolean;
  /** Horizontal padding of the parent screen; the carousel bleeds through it. */
  inset?: number;
}

export function BannerCarousel({ events, loading = false, inset = 20 }: BannerCarouselProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const available = width - inset * 2;
  const itemWidth = Math.min(
    events.length > 1 || loading ? available - PEEK : available,
    MAX_ITEM_WIDTH
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const bleed = { marginHorizontal: -inset };
  const contentInset = { paddingHorizontal: inset, gap: ITEM_GAP };

  if (loading) {
    return (
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={bleed}
        contentContainerStyle={contentInset}
      >
        <FeaturedCardSkeleton width={itemWidth} />
        <FeaturedCardSkeleton width={itemWidth} />
      </ScrollView>
    );
  }

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={events}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + ITEM_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        style={bleed}
        contentContainerStyle={contentInset}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }) => (
          <View style={{ width: itemWidth }}>
            <EventCard event={item} variant="featured" />
          </View>
        )}
        scrollEnabled={events.length > 1}
      />
      {events.length > 1 && (
        <View style={styles.dots}>
          {events.map((event, i) => (
            <View
              key={event.id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? colors.primary : colors.border,
                  width: i === activeIndex ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
