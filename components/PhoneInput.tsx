import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export interface Country {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: "Rwanda", code: "+250", flag: "🇷🇼" },
  { name: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "Uganda", code: "+256", flag: "🇺🇬" },
  { name: "Tanzania", code: "+255", flag: "🇹🇿" },
  { name: "Burundi", code: "+257", flag: "🇧🇮" },
  { name: "DR Congo", code: "+243", flag: "🇨🇩" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
];

export interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  error?: string;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChangeText,
  selectedCountry,
  onSelectCountry,
  error,
  placeholder = "7XX XXX XXX",
}: PhoneInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.destructive : colors.border,
          },
        ]}
      >
        {/* Country Code Selector Pill */}
        <Pressable
          style={styles.countryBtn}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Select country code, current is ${selectedCountry.name} ${selectedCountry.code}`}
        >
          <Text style={styles.flagText}>{selectedCountry.flag}</Text>
          <Text style={[styles.codeText, { color: colors.foreground }]}>
            {selectedCountry.code}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={colors.mutedForeground}
          />
        </Pressable>

        {/* Vertical Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Phone Digits Input */}
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Phone number"
        />
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : null}

      {/* Country Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: Platform.OS === "ios" ? 16 : insets.top + 16,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Select Country
            </Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Search bar in modal */}
          <View style={styles.modalSearchWrap}>
            <View
              style={[
                styles.modalSearchField,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.mutedForeground}
              />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.foreground }]}
                placeholder="Search country or code..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code + item.name}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
            renderItem={({ item }) => {
              const isSelected = item.code === selectedCountry.code && item.name === selectedCountry.name;
              return (
                <Pressable
                  style={[
                    styles.countryItem,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: isSelected
                        ? `${colors.primary}12`
                        : "transparent",
                    },
                  ]}
                  onPress={() => {
                    onSelectCountry(item);
                    setModalVisible(false);
                    setSearch("");
                  }}
                >
                  <Text style={styles.itemFlag}>{item.flag}</Text>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.itemCode,
                      {
                        color: isSelected ? colors.primary : colors.mutedForeground,
                      },
                    ]}
                  >
                    {item.code}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                      style={{ marginLeft: 8 }}
                    />
                  )}
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
  wrapper: {
    marginBottom: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 56,
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingRight: 6,
  },
  flagText: {
    fontSize: 20,
  },
  codeText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 4,
  },
  modalSearchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalSearchField: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    paddingHorizontal: 20,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  itemFlag: {
    fontSize: 24,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  itemCode: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
