import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { InlineError } from "@/components/profile/ProfileSection";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";

export interface PickerOption {
  value: string;
  label: string;
}

type Props = {
  label: string;
  placeholder: string;
  options: readonly PickerOption[];
  /** Sheet heading; defaults to the label. */
  title?: string;
  /** Adds a search box; worth it for long lists. */
  searchable?: boolean;
  error?: string;
  disabled?: boolean;
} & (
  | { multiple?: false; value?: string; onChange: (value: string | undefined) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void; max?: number }
);

/**
 * A dropdown field for the FindLove profile: a button showing the choice that
 * opens a list. Single choice closes on tap (tap the chosen one again to
 * clear it); multiple choice keeps the list open until Done.
 */
export function OptionPicker(props: Props) {
  const { label, placeholder, options, title, searchable, error, disabled } = props;
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const max = props.multiple ? props.max : undefined;
  const atLimit = max !== undefined && selected.length >= max;
  const summary = options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(", ");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (value: string) => {
    if (props.multiple) {
      const has = props.value.includes(value);
      if (!has && atLimit) return;
      props.onChange(has ? props.value.filter((v) => v !== value) : [...props.value, value]);
      return;
    }
    props.onChange(props.value === value ? undefined : value);
    close();
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[
          styles.field,
          { backgroundColor: colors.input, borderColor: error ? colors.destructive : colors.border, opacity: disabled ? 0.6 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={summary ? `${label}: ${summary}. Change` : `${label}: ${placeholder}`}
      >
        <Text style={[styles.fieldText, { color: summary ? colors.foreground : colors.mutedForeground }]} numberOfLines={2}>
          {summary || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>
      {error ? <InlineError message={error} /> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{title ?? label}</Text>
            {props.multiple ? (
              <Text style={[styles.count, { color: colors.mutedForeground }]}>
                {selected.length}{max !== undefined ? `/${max}` : ""} selected
              </Text>
            ) : null}
          </View>
          {searchable ? (
            <View style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                autoCorrect={false}
                accessibilityLabel={`Search ${label.toLowerCase()}`}
              />
            </View>
          ) : null}
          <FlatList
            data={shown}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>Nothing matches "{query}".</Text>}
            renderItem={({ item }) => {
              const checked = selected.includes(item.value);
              const blocked = !checked && atLimit;
              return (
                <Pressable
                  onPress={() => choose(item.value)}
                  disabled={blocked}
                  style={[styles.option, { borderBottomColor: colors.border, opacity: blocked ? 0.45 : 1 }]}
                  accessibilityRole={props.multiple ? "checkbox" : "radio"}
                  accessibilityState={{ checked, disabled: blocked }}
                >
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{item.label}</Text>
                  {props.multiple ? (
                    <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? colors.primary : colors.mutedForeground} />
                  ) : checked ? (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            }}
          />
          {props.multiple ? (
            <Pressable
              onPress={close}
              style={({ pressed }) => [styles.done, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  field: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, minHeight: 46 },
  fieldText: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: "Inter_400Regular" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10, maxHeight: "75%" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  count: { fontSize: 13, fontFamily: "Inter_500Medium" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 6 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 11 },
  list: { flexGrow: 0 },
  option: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 24 },
  done: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
  doneText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
