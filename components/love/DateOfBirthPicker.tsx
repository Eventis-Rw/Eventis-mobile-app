import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { isAdult, MIN_LOVE_AGE } from "@/utils/findLoveProfile";

const MONTHS = [
  { label: "Jan", full: "January", value: 1 },
  { label: "Feb", full: "February", value: 2 },
  { label: "Mar", full: "March", value: 3 },
  { label: "Apr", full: "April", value: 4 },
  { label: "May", full: "May", value: 5 },
  { label: "Jun", full: "June", value: 6 },
  { label: "Jul", full: "July", value: 7 },
  { label: "Aug", full: "August", value: 8 },
  { label: "Sep", full: "September", value: 9 },
  { label: "Oct", full: "October", value: 10 },
  { label: "Nov", full: "November", value: 11 },
  { label: "Dec", full: "December", value: 12 },
];

const pad = (n: number) => String(n).padStart(2, "0");

const currentYear = new Date().getFullYear();
const MAX_ADULT_YEAR = currentYear - MIN_LOVE_AGE; // e.g. 2008
const MIN_YEAR = 1940;

// All valid adult years descending from max adult year down to 1940
const YEARS = Array.from(
  { length: MAX_ADULT_YEAR - MIN_YEAR + 1 },
  (_, i) => MAX_ADULT_YEAR - i
);

const DECADES = [
  { label: "2000s", year: Math.min(2005, MAX_ADULT_YEAR) },
  { label: "1990s", year: 1995 },
  { label: "1980s", year: 1985 },
  { label: "1970s", year: 1975 },
  { label: "Earlier", year: 1965 },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function calculateAge(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age;
}

export function DateOfBirthPicker({
  value,
  onChange,
  error,
}: {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  error?: string;
}) {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse existing date or default to adult (e.g. 2000-01-01)
  const parsed = useMemo(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return { year: y, month: m, day: d };
    }
    return { year: 2000, month: 1, day: 1 };
  }, [value]);

  const [draftYear, setDraftYear] = useState(parsed.year);
  const [draftMonth, setDraftMonth] = useState(parsed.month);
  const [draftDay, setDraftDay] = useState(parsed.day);

  const daysCount = getDaysInMonth(draftYear, draftMonth);
  const clampedDay = Math.min(draftDay, daysCount);

  const draftDateStr = `${draftYear}-${pad(draftMonth)}-${pad(clampedDay)}`;
  const draftAge = calculateAge(draftYear, draftMonth, clampedDay);
  const isDraftAdult = isAdult(draftDateStr);

  const yearScrollRef = useRef<any>(null);

  const openPicker = () => {
    setDraftYear(parsed.year);
    setDraftMonth(parsed.month);
    setDraftDay(parsed.day);
    setModalVisible(true);
  };

  // Scroll to active year when modal opens
  useEffect(() => {
    if (modalVisible) {
      const yearIndex = YEARS.indexOf(draftYear);
      if (yearIndex > 0) {
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({
            y: Math.max(0, yearIndex * 38 - 50),
            animated: false,
          });
        }, 80);
      }
    }
  }, [modalVisible]);

  const handleSelectDecade = (year: number) => {
    setDraftYear(year);
    const yearIndex = YEARS.indexOf(year);
    if (yearIndex >= 0) {
      yearScrollRef.current?.scrollTo({
        y: Math.max(0, yearIndex * 38 - 50),
        animated: true,
      });
    }
  };

  const confirmDate = () => {
    onChange(draftDateStr);
    setModalVisible(false);
  };

  // Formatted display text for the trigger button
  const displayLabel = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split("-").map(Number);
    const monthObj = MONTHS[m - 1];
    return `${d} ${monthObj?.full ?? m} ${y}`;
  }, [value]);

  const currentAge = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split("-").map(Number);
    return calculateAge(y, m, d);
  }, [value]);

  return (
    <View style={styles.container}>
      {/* Professional Trigger Button */}
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.triggerBtn,
          {
            backgroundColor: colors.card,
            borderColor: error ? "#EF4444" : value ? "rgba(255, 45, 85, 0.5)" : colors.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Date of birth: ${displayLabel || "Select date of birth"}`}
      >
        <View style={styles.iconCircle}>
          <Ionicons
            name="calendar-clear"
            size={18}
            color={value ? "#FF2D55" : colors.mutedForeground}
          />
        </View>

        <View style={styles.triggerCopy}>
          <Text style={[styles.triggerLabel, { color: colors.mutedForeground }]}>
            DATE OF BIRTH
          </Text>
          <Text
            style={[
              styles.triggerValue,
              { color: displayLabel ? colors.foreground : colors.mutedForeground },
            ]}
          >
            {displayLabel || "Tap to select your birth date"}
          </Text>
        </View>

        {currentAge !== null && isAdult(value) ? (
          <View style={styles.agePill}>
            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
            <Text style={styles.agePillText}>{currentAge} yrs</Text>
          </View>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Professional Modal Picker */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.sheet}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={styles.sheetTitle}>Select Date of Birth</Text>
                <Text style={styles.sheetSubtitle}>Must be 18+ to join FindLove</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Selected Date & Live Age Badge */}
            <View
              style={[
                styles.previewBadge,
                {
                  backgroundColor: isDraftAdult
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                  borderColor: isDraftAdult
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(239, 68, 68, 0.3)",
                },
              ]}
            >
              <Ionicons
                name={isDraftAdult ? "shield-checkmark" : "alert-circle"}
                size={16}
                color={isDraftAdult ? "#10B981" : "#EF4444"}
              />
              <Text
                style={[
                  styles.previewText,
                  { color: isDraftAdult ? "#10B981" : "#EF4444" },
                ]}
              >
                {clampedDay} {MONTHS[draftMonth - 1]?.full} {draftYear} · Age {draftAge}{" "}
                {isDraftAdult ? "(Verified 18+)" : "(Under 18)"}
              </Text>
            </View>

            {/* Quick Decade Jumper Chips */}
            <View style={styles.decadesRow}>
              {DECADES.map((decade) => {
                const isActive =
                  decade.label === "2000s"
                    ? draftYear >= 2000
                    : decade.label === "1990s"
                    ? draftYear >= 1990 && draftYear < 2000
                    : decade.label === "1980s"
                    ? draftYear >= 1980 && draftYear < 1990
                    : decade.label === "1970s"
                    ? draftYear >= 1970 && draftYear < 1980
                    : draftYear < 1970;

                return (
                  <Pressable
                    key={decade.label}
                    onPress={() => handleSelectDecade(decade.year)}
                    style={[
                      styles.decadeChip,
                      isActive && styles.decadeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.decadeText,
                        isActive && styles.decadeTextActive,
                      ]}
                    >
                      {decade.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 3 Columns: DAY | MONTH | YEAR */}
            <View style={styles.columnsContainer}>
              {/* Day Column */}
              <View style={styles.column}>
                <View style={styles.colHeaderBox}>
                  <Text style={styles.colHeader}>DAY</Text>
                </View>
                <ScrollView
                  style={styles.colScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.colScrollContent}
                >
                  {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => {
                    const isSelected = clampedDay === d;
                    return (
                      <Pressable
                        key={`day-${d}`}
                        onPress={() => setDraftDay(d)}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextActive,
                          ]}
                        >
                          {d}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.column}>
                <View style={styles.colHeaderBox}>
                  <Text style={styles.colHeader}>MONTH</Text>
                </View>
                <ScrollView
                  style={styles.colScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.colScrollContent}
                >
                  {MONTHS.map((m) => {
                    const isSelected = draftMonth === m.value;
                    return (
                      <Pressable
                        key={`month-${m.value}`}
                        onPress={() => setDraftMonth(m.value)}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextActive,
                          ]}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.column}>
                <View style={styles.colHeaderBox}>
                  <Text style={styles.colHeader}>YEAR</Text>
                </View>
                <ScrollView
                  ref={yearScrollRef}
                  style={styles.colScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.colScrollContent}
                >
                  {YEARS.map((y) => {
                    const isSelected = draftYear === y;
                    return (
                      <Pressable
                        key={`year-${y}`}
                        onPress={() => setDraftYear(y)}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextActive,
                          ]}
                        >
                          {y}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Confirm CTA */}
            <Pressable
              onPress={confirmDate}
              disabled={!isDraftAdult}
              style={({ pressed }) => [
                styles.confirmBtn,
                {
                  backgroundColor: isDraftAdult ? "#FF2D55" : "rgba(255, 45, 85, 0.4)",
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Confirm date of birth"
            >
              <Text style={styles.confirmBtnText}>
                {isDraftAdult ? "Confirm Date" : "Must be 18 or older to confirm"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  triggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 45, 85, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  triggerCopy: {
    flex: 1,
    gap: 2,
  },
  triggerLabel: {
    fontSize: 10.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  triggerValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  agePillText: {
    color: "#10B981",
    fontSize: 11.5,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 11.5,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(7, 8, 20, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "#0D0F1D",
    padding: 18,
    gap: 14,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: -4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sheetTitleBlock: {
    gap: 2,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sheetSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },
  decadesRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  decadeChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  decadeChipActive: {
    backgroundColor: "rgba(255, 45, 85, 0.2)",
    borderWidth: 1,
    borderColor: "#FF2D55",
  },
  decadeText: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  decadeTextActive: {
    color: "#FF2D55",
    fontFamily: "Inter_700Bold",
  },
  columnsContainer: {
    flexDirection: "row",
    height: 185,
    gap: 8,
  },
  column: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  colHeaderBox: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  colHeader: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 10.5,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.6,
  },
  colScroll: {
    flex: 1,
  },
  colScrollContent: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 3,
  },
  optionPill: {
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionPillActive: {
    backgroundColor: "#FF2D55",
  },
  optionText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13.5,
    fontFamily: "Inter_500Medium",
  },
  optionTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  confirmBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
