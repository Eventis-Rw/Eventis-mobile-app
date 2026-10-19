import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useColors } from "@/hooks/useColors";

// National limits exclude the country code and domestic trunk prefix.
// Source: https://www.ituob.org/datasets/994-E.164C/
const MAX_INTERNATIONAL_DIGITS = 15;
const nationalDigitLimit = (country: Country) => Math.min(country.maxDigits, MAX_INTERNATIONAL_DIGITS - country.code.replace(/\D/g, "").length);

export interface Country {
  name: string;
  code: string;
  flag: string;
  maxDigits: number;
}

export const COUNTRIES: Country[] = [
  { name: "Rwanda", code: "+250", flag: "🇷🇼", maxDigits: 9 },
  { name: "Kenya", code: "+254", flag: "🇰🇪", maxDigits: 10 },
  { name: "Uganda", code: "+256", flag: "🇺🇬", maxDigits: 9 },
  { name: "Tanzania", code: "+255", flag: "🇹🇿", maxDigits: 9 },
  { name: "Burundi", code: "+257", flag: "🇧🇮", maxDigits: 8 },
  { name: "DR Congo", code: "+243", flag: "🇨🇩", maxDigits: 9 },
  { name: "United States", code: "+1", flag: "🇺🇸", maxDigits: 10 },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧", maxDigits: 10 },
  { name: "Canada", code: "+1", flag: "🇨🇦", maxDigits: 10 },
  { name: "South Africa", code: "+27", flag: "🇿🇦", maxDigits: 9 },
  { name: "Nigeria", code: "+234", flag: "🇳🇬", maxDigits: 10 },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪", maxDigits: 9 },
  { name: "France", code: "+33", flag: "🇫🇷", maxDigits: 9 },
  { name: "Belgium", code: "+32", flag: "🇧🇪", maxDigits: 9 },
  { name: "Germany", code: "+49", flag: "🇩🇪", maxDigits: 13 },
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
  const insets = useAppSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const maxDigits = nationalDigitLimit(selectedCountry);
  const digits = value.replace(/\D/g, "").slice(0, maxDigits);
  useEffect(() => {
    if (value !== digits) onChangeText(digits);
  }, [value, digits, onChangeText]);

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
          value={digits}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, "").slice(0, maxDigits))}
          maxLength={maxDigits}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Phone number"
        />
      </View>

      <Text style={[styles.limitText, { color: colors.mutedForeground }]}>Up to {maxDigits} digits after {selectedCountry.code}</Text>
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
                    onChangeText(value.replace(/\D/g, "").slice(0, nationalDigitLimit(item)));
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
  limitText: { fontSize: 12, lineHeight: 18, marginTop: 6 },
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
