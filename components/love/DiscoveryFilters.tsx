import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { DiscoveryFilters as Filters, GenderFilter } from "@/utils/findLoveDiscovery";

const GENDERS: { value: GenderFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Woman", label: "Women" },
  { value: "Man", label: "Men" },
];

/** Gender filters for the Home grid. */
export function DiscoveryFilters({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {GENDERS.map(({ value, label }) => (
        <Chip key={value} label={label} selected={filters.gender === value} onPress={() => onChange({ ...filters, gender: value })} />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      {icon ? <Ionicons name={icon} size={9} color={selected ? "#FFFFFF" : colors.success} /> : null}
      <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 14, alignItems: "center" },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
