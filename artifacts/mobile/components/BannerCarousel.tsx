import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  ViewToken,
} from "react-native";

import { EventCard } from "./EventCard";
import { useColors } from "@/hooks/useColors";
import type { Event } from "@/constants/mockData";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width - 48;
const ITEM_MARGIN = 8;

interface BannerCarouselProps {
  events: Event[];
}

export function BannerCarousel({ events }: BannerCarouselProps) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={events}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH + ITEM_MARGIN * 2}
        decelerationRate="fast"
        contentContainerStyle={styles.container}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <EventCard event={item} variant="featured" />
          </View>
        )}
        scrollEnabled={!!events.length}
      />
      <View style={styles.dots}>
        {events.map((_, i) => (
          <View
            key={i}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
  },
  slide: {
    width: ITEM_WIDTH,
    marginHorizontal: ITEM_MARGIN,
  },
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
