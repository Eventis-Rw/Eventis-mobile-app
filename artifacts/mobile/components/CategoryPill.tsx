import React, { useCallback } from "react";
import { Pressable, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { EventCategory } from "@/constants/mockData";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CategoryPillProps {
  category: EventCategory;
  isSelected: boolean;
  onPress: (category: EventCategory) => void;
}

export function CategoryPill({ category, isSelected, onPress }: CategoryPillProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.93, { damping: 15 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, [scale]);

  return (
    <AnimatedPressable
      className={`mr-2 rounded-[20px] border px-4 py-2 ${
        isSelected
          ? "border-primary bg-primary"
          : "border-border bg-card dark:border-border-dark dark:bg-card-dark"
      }`}
      style={animatedStyle}
      onPress={() => onPress(category)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Text
        className={`text-[13px] ${
          isSelected
            ? "font-semibold text-primary-foreground"
            : "font-medium text-muted-foreground dark:text-muted-foreground-dark"
        }`}
      >
        {category}
      </Text>
    </AnimatedPressable>
  );
}
