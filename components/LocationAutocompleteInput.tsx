import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useOrganiserColors } from "@/hooks/useOrganiserPalette";
import {
  fetchPlaceSuggestions,
  formatPlaceSuggestion,
  placeSuggestionIcon,
  type PlaceSuggestion,
} from "@/services/placeSuggestions";

export interface LocationAutocompleteInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onSelectSuggestion?: (suggestion: PlaceSuggestion) => void;
  placeholder?: string;
  colors: ReturnType<typeof useOrganiserColors>;
}

const SEARCH_DEBOUNCE_MS = 350;

export function LocationAutocompleteInput({
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder,
  colors,
}: LocationAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetchPlaceSuggestions(query, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setOpen(results.length > 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function handleSelect(suggestion: PlaceSuggestion) {
    skipNextSearch.current = true;
    setSuggestions([]);
    setOpen(false);
    onChangeText(formatPlaceSuggestion(suggestion));
    onSelectSuggestion?.(suggestion);
  }

  return (
    <View>
      <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.inputText, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setOpen(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>
      {open && suggestions.length > 0 ? (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => handleSelect(item)}
              accessibilityRole="button"
              accessibilityLabel={formatPlaceSuggestion(item)}
            >
              <Ionicons name={placeSuggestionIcon(item.category) as any} size={16} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.secondaryLabel ? (
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.secondaryLabel}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  dropdown: { marginTop: 6, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
