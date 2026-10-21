import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import type { DiscoveryFilters as Filters, GenderFilter, PresenceFilter } from "@/utils/findLoveDiscovery";
import type { LOVE_NEIGHBORHOODS } from "@/utils/findLoveProfile";

const GENDERS: { value: GenderFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Woman", label: "Women" },
  { value: "Man", label: "Men" },
];

const PRESENCE: { value: PresenceFilter; label: string }[] = [
  { value: "online", label: "Online now" },
  { value: "recent", label: "Active today" },
];

/**
 * Gender, presence and neighbourhood filters for the discovery list. The area
 * filter only shows when the member's country has neighbourhoods listed.
 */
export function DiscoveryFilters({
  filters,
  onChange,
  neighborhoods,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  neighborhoods: typeof LOVE_NEIGHBORHOODS;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {GENDERS.map(({ value, label }) => (
          <Chip key={value} label={label} selected={filters.gender === value} onPress={() => onChange({ ...filters, gender: value })} />
        ))}
        <View style={styles.divider} />
        {PRESENCE.map(({ value, label }) => {
          const selected = filters.presence === value;
          return (
            <Chip
              key={value}
              label={label}
              icon={value === "online" ? "ellipse" : "time-outline"}
              selected={selected}
              // Tapping the selected one again turns it off.
              onPress={() => onChange({ ...filters, presence: selected ? "any" : value })}
            />
          );
        })}
        {neighborhoods.length ? (
          <Chip
            label={filters.neighborhood ?? "Any area"}
            icon="location-outline"
            trailing="chevron-down"
            selected={!!filters.neighborhood}
            onPress={() => setPicking(true)}
          />
        ) : null}
      </ScrollView>

      <NeighborhoodPicker
        visible={picking}
        neighborhoods={neighborhoods}
        value={filters.neighborhood}
        onClose={() => setPicking(false)}
        onPick={(neighborhood) => {
          setPicking(false);
          onChange({ ...filters, neighborhood });
        }}
      />
    </>
  );
}

function Chip({
  label,
  selected,
  onPress,
  icon,
  trailing,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  trailing?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const colors = useColors();
  const color = selected ? "#FFFFFF" : colors.foreground;
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
      {icon ? <Ionicons name={icon} size={icon === "ellipse" ? 9 : 14} color={selected ? "#FFFFFF" : icon === "ellipse" ? colors.success : colors.mutedForeground} /> : null}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
      {trailing ? <Ionicons name={trailing} size={14} color={color} /> : null}
    </Pressable>
  );
}

function NeighborhoodPicker({
  visible,
  neighborhoods,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  neighborhoods: typeof LOVE_NEIGHBORHOODS;
  value?: string;
  onClose: () => void;
  onPick: (neighborhood: string | undefined) => void;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const options: { name?: string; label: string }[] = [
    { name: undefined, label: "Any area" },
    ...neighborhoods.map(({ name, city }) => ({ name, label: city === "Kigali" ? name : `${name}, ${city}` })),
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      {/* Solid background: the glass `card` colour lets the screen show through and the list is hard to read. */}
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Neighbourhood</Text>
        <ScrollView style={styles.list}>
          {options.map((option) => {
            const selected = option.name === value;
            return (
              <Pressable
                key={option.label}
                onPress={() => onPick(option.name)}
                style={[styles.option, { borderBottomColor: colors.border }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.optionText, { color: colors.foreground }]}>{option.label}</Text>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 14, alignItems: "center" },
  divider: { width: 1, height: 24, backgroundColor: "rgba(127,127,127,0.3)", marginHorizontal: 2 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10, maxHeight: "70%" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  list: { flexGrow: 0 },
  option: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
