import React, { useCallback, useRef, useState } from "react";
import { Dimensions, FlatList, View, ViewToken } from "react-native";

import { EventCard } from "./EventCard";
import type { Event } from "@/constants/mockData";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width - 48;
const ITEM_MARGIN = 8;

interface BannerCarouselProps {
  events: Event[];
}

export function BannerCarousel({ events }: BannerCarouselProps) {
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
        contentContainerClassName="px-6"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }) => (
          <View style={{ width: ITEM_WIDTH, marginHorizontal: ITEM_MARGIN }}>
            <EventCard event={item} variant="featured" />
          </View>
        )}
        scrollEnabled={!!events.length}
      />
      <View className="mt-3 flex-row items-center justify-center gap-[5px]">
        {events.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 rounded-sm ${
              i === activeIndex
                ? "w-5 bg-primary"
                : "w-1.5 bg-border dark:bg-border-dark"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
