import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useColors } from "@/hooks/useColors";
import {
  ANY_LOVE_AGE_RANGE,
  formatAgeBound,
  formatAgeRange,
  isAnyAgeRange,
  LOVE_AGE_RANGE_MAX,
  LOVE_AGE_RANGE_MIN,
  LOVE_AGE_RANGE_MIN_SPAN,
  sameAgeRange,
  stepAgeRange,
  type LoveAgeRange,
} from "@/utils/findLoveAgeRange";

/**
 * From / To steppers for an age range. `value` undefined means any age. The
 * two ends always stay at least LOVE_AGE_RANGE_MIN_SPAN years apart.
 */
export function AgeRangePicker({
  value,
  onChange,
  disabled,
}: {
  value: LoveAgeRange | undefined;
  onChange: (next: LoveAgeRange | undefined) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const range = value ?? ANY_LOVE_AGE_RANGE;
  const update = (end: "min" | "max", step: number) => {
    const next = stepAgeRange(range, end, step);
    onChange(isAnyAgeRange(next) ? undefined : next);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? 0.6 : 1 }]}>
      <View style={styles.summaryRow}>
        <Text style={[styles.summary, { color: colors.foreground }]}>{formatAgeRange(value)}</Text>
        {!isAnyAgeRange(value) ? (
          <Pressable onPress={() => onChange(undefined)} disabled={disabled} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.reset, { color: colors.primary }]}>Any age</Text>
          </Pressable>
        ) : null}
      </View>
      <Stepper
        label="From"
        value={formatAgeBound(range.min)}
        canDown={!disabled && range.min > LOVE_AGE_RANGE_MIN}
        canUp={!disabled && range.min < LOVE_AGE_RANGE_MAX - LOVE_AGE_RANGE_MIN_SPAN}
        onStep={(step) => update("min", step)}
      />
      <Stepper
        label="To"
        value={formatAgeBound(range.max)}
        canDown={!disabled && range.max > LOVE_AGE_RANGE_MIN + LOVE_AGE_RANGE_MIN_SPAN}
        canUp={!disabled && range.max < LOVE_AGE_RANGE_MAX}
        onStep={(step) => update("max", step)}
      />
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        At least {LOVE_AGE_RANGE_MIN_SPAN} years apart. Ages are never shown on profiles.
      </Text>
    </View>
  );
}

function Stepper({
  label,
  value,
  canDown,
  canUp,
  onStep,
}: {
  label: string;
  value: string;
  canDown: boolean;
  canUp: boolean;
  onStep: (step: number) => void;
}) {
  const colors = useColors();
  const button = (step: number, enabled: boolean) => (
    <Pressable
      onPress={() => onStep(step)}
      disabled={!enabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.stepBtn,
        { borderColor: colors.border, backgroundColor: colors.secondary, opacity: !enabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${step < 0 ? "Lower" : "Raise"} ${label.toLowerCase()} age`}
    >
      <Ionicons name={step < 0 ? "remove" : "add"} size={18} color={colors.foreground} />
    </Pressable>
  );
  return (
    <View style={styles.stepRow} accessibilityLabel={`${label} ${value}`}>
      <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {button(-1, canDown)}
      <Text style={[styles.stepValue, { color: colors.foreground }]}>{value}</Text>
      {button(1, canUp)}
    </View>
  );
}

/**
 * Home's age filter: a bottom sheet over the grid. Changes apply on "Show
 * people", so the grid isn't searched again on every tap.
 */
export function AgeRangeSheet({
  visible,
  value,
  saved,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: LoveAgeRange | undefined;
  /** The range saved on the member's profile, offered as a shortcut. */
  saved: LoveAgeRange | undefined;
  onApply: (next: LoveAgeRange | undefined) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const showSavedShortcut = !isAnyAgeRange(saved) && !sameAgeRange(draft, saved);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Age range</Text>
        <AgeRangePicker value={draft} onChange={setDraft} />
        {showSavedShortcut ? (
          <Pressable onPress={() => setDraft(saved)} hitSlop={6} accessibilityRole="button" style={styles.savedLink}>
            <Text style={[styles.reset, { color: colors.primary }]}>Use my preference ({formatAgeRange(saved)})</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => onApply(draft)}
          style={({ pressed }) => [styles.apply, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.applyText}>Show people</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summary: { fontSize: 17, fontFamily: "Inter_700Bold" },
  reset: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepValue: { minWidth: 40, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  note: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 2 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  savedLink: { alignSelf: "flex-start" },
  apply: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  applyText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
