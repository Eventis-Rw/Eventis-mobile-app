import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { InlineError } from "@/components/profile/ProfileSection";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import { countryFlag, countryName, LOVE_COUNTRIES } from "@/utils/findLoveProfile";

interface Props {
  value?: string;
  onChange: (code: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Country field for the FindLove profile: a button that opens a searchable list. */
export function CountryPicker({ value, onChange, error, disabled }: Props) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const name = countryName(value);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? LOVE_COUNTRIES.filter((country) => country.name.toLowerCase().includes(q)) : LOVE_COUNTRIES;
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        Country <Text style={{ color: colors.destructive }}>*</Text>
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[
          styles.field,
          { backgroundColor: colors.input, borderColor: error ? colors.destructive : colors.border, opacity: disabled ? 0.6 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={name ? `Country: ${name}. Change` : "Select your country"}
      >
        {value && name ? (
          <Text style={styles.flag}>{countryFlag(value)}</Text>
        ) : (
          <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
        )}
        <Text style={[styles.fieldText, { color: name ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
          {name ?? "Select your country"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>
      {error ? <InlineError message={error} /> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        {/* Solid background: the glass `card` colour lets the screen show through and the list is hard to read. */}
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Your country</Text>
          <View style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              autoCorrect={false}
              accessibilityLabel="Search countries"
            />
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>No country matches "{query}".</Text>}
            renderItem={({ item }) => {
              const selected = item.code === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.code);
                    close();
                  }}
                  style={[styles.option, { borderBottomColor: colors.border }]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.flag}>{countryFlag(item.code)}</Text>
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{item.name}</Text>
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  field: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, minHeight: 46 },
  fieldText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  flag: { fontSize: 20 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10, height: "75%" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 10 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 6 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 11 },
  list: { flex: 1 },
  option: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 24 },
});
