import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface CategoryPillProps {
  category: string;
  isSelected: boolean;
  onPress: (category: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CategoryPill({ category, isSelected, onPress }: CategoryPillProps) {
  const colors = useColors();
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
      style={({ pressed }: { pressed: boolean }) => [
        styles.pill,
        animatedStyle,
        {
          backgroundColor: isSelected
            ? colors.primary
            : pressed
            ? "rgba(255,255,255,0.14)"
            : colors.glass,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
      onPress={() => onPress(category)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Text
        style={[
          styles.text,
          {
            color: isSelected ? colors.primaryForeground : colors.mutedForeground,
            fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_500Medium",
          },
        ]}
      >
        {category}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.15,
  },
});
