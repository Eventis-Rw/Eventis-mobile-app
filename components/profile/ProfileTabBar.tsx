import React, { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutRectangle } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ProfileTab, ProfileTabDef } from "@/utils/accountCapabilities";

interface ProfileTabBarProps {
  tabs: ProfileTabDef[];
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}

/** Horizontally scrolling tabs; keeps the active tab in view on narrow screens. */
export function ProfileTabBar({ tabs, active, onChange }: ProfileTabBarProps) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Partial<Record<ProfileTab, LayoutRectangle>>>({});

  useEffect(() => {
    const layout = layouts.current[active];
    if (layout) scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 16), animated: true });
  }, [active]);

  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              onLayout={(e) => {
                layouts.current[tab.key] = e.nativeEvent.layout;
              }}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: selected ? colors.foreground : colors.secondary,
                  borderColor: selected ? colors.foreground : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
            >
              <Text style={[styles.label, { color: selected ? colors.background : colors.foreground }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { marginHorizontal: -16, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
